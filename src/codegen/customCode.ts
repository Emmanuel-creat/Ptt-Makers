import type { PropValue } from '../model/types'

/*
 * Brique « Code personnalisé » : du HTML, du CSS et du JavaScript écrits à la main.
 * Dans l'éditeur, elle tourne dans un cadre isolé (sans accès à l'éditeur ni à tes projets) ;
 * dans l'application générée, son HTML est posé dans la brique et son script lancé une fois la page prête.
 */

/** Empêche un texte de fermer la balise <script> ou <style> qui le contient. */
export const closeSafe = (text: string, tag: 'script' | 'style') => text.replace(new RegExp(`</(${tag})`, 'gi'), '<\\/$1')

/** La page complète affichée dans le cadre isolé de la zone de création. */
export function codeDocument(p: Record<string, PropValue>, variables: Record<string, unknown> = {}): string {
  const css = closeSafe(String(p.css ?? ''), 'style')
  const js = closeSafe(String(p.js ?? ''), 'script')
  const etat = closeSafe(JSON.stringify(variables), 'script')
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>html,body{margin:0}body{font-family:system-ui,sans-serif;color:#1b1d29}.pm-code-erreur{margin:8px;padding:8px 10px;border-radius:8px;background:#fde8e8;color:#9b1c1c;font:12px/1.4 ui-monospace,monospace}</style><style>${css}</style></head><body>${String(p.html ?? '')}<script>
const bloc = document.body;
const etat = ${etat};
try {
${js}
} catch (erreur) {
  const p = document.createElement("p");
  p.className = "pm-code-erreur";
  p.textContent = "Erreur dans ton JavaScript : " + erreur.message;
  document.body.append(p);
}
</script></body></html>`
}
