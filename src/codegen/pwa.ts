import { resolveTokens } from '../model/styles'
import type { Project } from '../model/types'
import type { ZipEntry } from '../utils/zip'
import { escapeHtml } from './escape'
import { bundle, generate } from './generate'

/*
 * Application installable (PWA) : la page exportée, un manifeste (nom, couleurs, icônes)
 * et un petit service worker qui garde l'application pour l'ouvrir sans internet.
 * Le dossier contient aussi de quoi l'emballer pour Android et iOS avec Capacitor.
 */

export const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'application'

/** Couleur pleine (pas un dégradé) utilisable dans le manifeste. */
const solid = (c: string | undefined, fallback: string) => (c && /^#[0-9a-f]{3,8}$/i.test(c.trim()) ? c.trim() : fallback)

export function appColors(project: Project): { accent: string; background: string; onAccent: string } {
  const t = resolveTokens(project.theme)
  return { accent: solid(t.accent, '#6c5ce7'), background: solid(t.background, '#ffffff'), onAccent: solid(t.onAccent, '#ffffff') }
}

/** L'icône de l'application : la première lettre du nom sur la couleur du projet. */
export function appIconSvg(project: Project): string {
  const { accent, onAccent } = appColors(project)
  const letter = escapeHtml((project.name.trim()[0] ?? 'A').toUpperCase())
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${accent}"/><text x="256" y="256" dy="0.35em" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="300" font-weight="700" fill="${onAccent}">${letter}</text></svg>`
}

/**
 * Les fichiers de l'application installable.
 * `pngs` : l'icône aux tailles 192 et 512 (dessinées par le navigateur au moment de l'export).
 */
export function pwaFiles(project: Project, pngs: { 192?: Uint8Array; 512?: Uint8Array } = {}): ZipEntry[] {
  const name = project.name.trim() || 'Mon application'
  const id = slug(name)
  const { accent, background } = appColors(project)
  const icons = [
    ...([192, 512] as const).filter((s) => pngs[s]).map((s) => ({ src: `icone-${s}.png`, sizes: `${s}x${s}`, type: 'image/png', purpose: 'any' })),
    { src: 'icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ]
  const manifest = {
    name,
    short_name: name.length > 12 ? name.slice(0, 12).trim() : name,
    lang: 'fr',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: background,
    theme_color: accent,
    icons,
  }
  const cached = ['./', 'index.html', 'manifest.webmanifest', ...icons.map((i) => i.src)]
  const head = [
    '  <link rel="manifest" href="manifest.webmanifest">',
    `  <meta name="theme-color" content="${accent}">`,
    '  <link rel="icon" href="icone.svg" type="image/svg+xml">',
    `  <link rel="apple-touch-icon" href="${pngs[192] ? 'icone-192.png' : 'icone.svg'}">`,
    '  <meta name="apple-mobile-web-app-capable" content="yes">',
  ].join('\n')
  const register = [
    '  <script>',
    '    // Garde l’application pour l’ouvrir sans internet (seulement depuis une adresse https:// ou localhost).',
    '    if ("serviceWorker" in navigator && location.protocol !== "file:") {',
    '      navigator.serviceWorker.register("sw.js");',
    '    }',
    '  </script>',
  ].join('\n')
  const html = bundle(generate(project))
    .replace('</head>', () => `${head}\n</head>`)
    .replace('</body>', () => `${register}\n</body>`)
  const sw = `// Service worker de « ${name.replace(/[\r\n]/g, ' ')} » : garde les fichiers de l'application pour l'ouvrir sans internet.
const CACHE = ${JSON.stringify(`${id}-${Date.now().toString(36)}`)};
const FICHIERS = ${JSON.stringify(cached)};

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

// Une nouvelle version efface l'ancienne.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour avoir la dernière version), puis la copie gardée si internet manque.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie));
        return reponse;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))),
  );
});
`
  const appId = `fr.pttmakers.${id.replace(/-/g, '').replace(/^(\d)/, 'app$1') || 'application'}`
  const packageJson = {
    name: id,
    version: '1.0.0',
    private: true,
    scripts: {
      android: 'cap add android && cap sync && cap open android',
      ios: 'cap add ios && cap sync && cap open ios',
      sync: 'cap sync',
    },
    dependencies: { '@capacitor/android': '^7.0.0', '@capacitor/core': '^7.0.0', '@capacitor/ios': '^7.0.0' },
    devDependencies: { '@capacitor/cli': '^7.0.0' },
  }
  const capacitor = { appId, appName: name, webDir: 'www' }
  const readme = `${name} : application installable
${'='.repeat(Math.min(60, name.length + 27))}

Créée avec Ptt-Makers.

1. Sur un téléphone ou un ordinateur (PWA)
   Mets le contenu du dossier « www » en ligne sur une adresse https://
   (GitHub Pages, Netlify, ton hébergeur...). Ouvre l'adresse : le navigateur
   propose « Installer l'application » ou « Ajouter à l'écran d'accueil ».
   Une fois ouverte une première fois, elle marche aussi sans internet.

   Pour essayer sur ton ordinateur : dans le dossier « www », lance
   « npx serve » puis ouvre http://localhost:3000

2. Sur Android et iOS (Capacitor)
   Il faut Node.js, puis Android Studio (Android) ou Xcode sur un Mac (iOS).
   Dans ce dossier :
     npm install
     npm run android     (ou : npm run ios)
   Le projet natif s'ouvre : lance-le sur un téléphone ou un simulateur.
   Après une modification dans Ptt-Makers, exporte à nouveau, remplace
   le dossier « www » puis lance : npm run sync

Identifiant de l'application : ${appId}
`
  return [
    { path: 'www/index.html', data: html },
    { path: 'www/manifest.webmanifest', data: JSON.stringify(manifest, null, 2) },
    { path: 'www/sw.js', data: sw },
    { path: 'www/icone.svg', data: appIconSvg(project) },
    ...([192, 512] as const).filter((s) => pngs[s]).map((s) => ({ path: `www/icone-${s}.png`, data: pngs[s]! })),
    { path: 'package.json', data: JSON.stringify(packageJson, null, 2) },
    { path: 'capacitor.config.json', data: JSON.stringify(capacitor, null, 2) },
    { path: 'LISEZ-MOI.txt', data: readme },
  ]
}
