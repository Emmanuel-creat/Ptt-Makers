import { readFileSync } from 'node:fs'
import { defineConfig, mergeConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import base from './vite.config'

/** L'icône de l'onglet est rangée dans la page elle-même. */
const inlineFavicon = (): Plugin => ({
  name: 'icone-integree',
  transformIndexHtml: (html) =>
    html.replace('href="./favicon.svg"', `href="data:image/svg+xml;base64,${readFileSync('public/favicon.svg').toString('base64')}"`),
})

// Version locale : tout tient dans un seul fichier index.html, qui s'ouvre sans serveur ni internet.
export default mergeConfig(
  base,
  defineConfig({
    plugins: [inlineFavicon(), viteSingleFile({ removeViteModuleLoader: true })],
    publicDir: false,
    build: { outDir: 'dist-local', assetsInlineLimit: () => true, chunkSizeWarningLimit: 100000 },
  }),
)
