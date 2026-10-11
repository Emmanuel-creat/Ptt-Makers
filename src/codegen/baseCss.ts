import type { BrickNode } from '../model/types'

/** Classes CSS de base de chaque brique (partagées par le code généré et la zone de création). */
export function brickClass(node: BrickNode): string {
  switch (node.type) {
    case 'page':
      return 'page'
    case 'section':
    case 'row':
    case 'stack':
    case 'grid':
    case 'card':
    case 'repeat':
    case 'tabs':
    case 'accordion':
    case 'modal':
    case 'navbar':
    case 'video':
    case 'icon':
    case 'badge':
    case 'spacer':
      return node.type
    case 'button':
      return `btn btn-${node.props.variant || 'primary'}`
    case 'input':
    case 'textarea':
    case 'select':
      return 'field'
    case 'checkbox':
      return 'check'
    default:
      return ''
  }
}

/**
 * Styles de base. Tout est rangé sous « .page » pour ne pas déborder sur l'éditeur,
 * et les requêtes de conteneur adaptent la page à la largeur disponible (mobile, tablette…).
 */
export const BASE_CSS = `/* Styles de base Ptt-Makers */
.page {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: var(--police, "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  line-height: 1.5;
}
.page *, .page *::before, .page *::after { box-sizing: border-box; }
.page h1, .page h2, .page h3, .page p { margin: 0; }
.page h1 { font-size: 2.4rem; line-height: 1.15; font-weight: 800; letter-spacing: -0.02em; }
.page h2 { font-size: 1.65rem; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; }
.page h3 { font-size: 1.2rem; line-height: 1.3; font-weight: 600; }
.page p { line-height: 1.65; }
.page a { color: var(--couleur, #5b4ff5); font-weight: 500; }
.page ul, .page ol { margin: 0; padding-left: 1.4em; line-height: 1.75; }
.page img { display: block; max-width: 100%; object-fit: cover; }
.page hr { width: 100%; margin: 0; border: 0; border-top: 1px solid #e4e6ef; }
.page[hidden], .page [hidden] { display: none !important; }

.page .section, .page .row, .page .stack, .page .card { display: flex; flex-direction: column; min-width: 0; }
.page .row { flex-direction: row; }
.page .grid { display: grid; }
/* Une répétition affiche une copie de son contenu par élément de la liste. */
.page .repeat { display: flex; flex-direction: column; min-width: 0; }
.page .repeat-item { display: contents; }
.page .repeat-empty { color: #6b7083; }
.page .spacer { flex-shrink: 0; }

.page .badge {
  display: inline-flex;
  width: fit-content;
  padding: 3px 10px;
  border-radius: 999px;
  background: #ede9fe;
  color: #5b21b6;
  font-size: 0.8rem;
  font-weight: 600;
}

.page .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 10px 18px;
  border: 1px solid transparent;
  border-radius: var(--arrondi, 10px);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, filter 0.15s ease, background 0.15s ease;
}
.page .btn:hover { filter: brightness(1.06); }
.page .btn:active { transform: translateY(1px); }
.page .btn:focus-visible { outline: 3px solid color-mix(in srgb, var(--couleur, #6c5ce7) 45%, transparent); outline-offset: 2px; }
.page .btn-primary { background: var(--couleur, #6c5ce7); color: #ffffff; }
.page .btn-secondary { background: #ffffff; color: #1b1d29; border-color: #d6d9e4; }
.page .btn-ghost { background: transparent; color: var(--couleur, #6c5ce7); }

.page .field { display: flex; flex-direction: column; gap: 6px; font-size: 0.9rem; font-weight: 500; }
.page .field input, .page .field textarea, .page .field select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d6d9e4;
  border-radius: var(--arrondi, 10px);
  background: #ffffff;
  color: #1b1d29;
  font: inherit;
  font-weight: 400;
}
.page .field textarea { min-height: 96px; resize: vertical; }
.page .field input:focus, .page .field textarea:focus, .page .field select:focus {
  outline: none;
  border-color: var(--couleur, #6c5ce7);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--couleur, #6c5ce7) 20%, transparent);
}
.page .check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.page .check input { width: 18px; height: 18px; accent-color: var(--couleur, #6c5ce7); }

/* Onglets */
.page .tabs, .page .accordion { display: flex; flex-direction: column; min-width: 0; }
.page .tabs-bar { display: flex; gap: 4px; border-bottom: 1px solid #e4e6ef; overflow-x: auto; }
.page .tabs-bar button {
  margin-bottom: -1px;
  padding: 10px 14px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: #6b7083;
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.page .tabs-bar button[aria-selected="true"] { color: var(--couleur, #6c5ce7); border-bottom-color: var(--couleur, #6c5ce7); }

/* Accordéon : des volets <details> qui s'ouvrent sans JavaScript */
.page .accordion-item { border: 1px solid #e4e6ef; border-radius: var(--arrondi, 10px); background: #ffffff; color: #1b1d29; }
.page .accordion-item > summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  font-weight: 600;
  list-style: none;
  cursor: pointer;
}
.page .accordion-item > summary::-webkit-details-marker { display: none; }
.page .accordion-item > summary::after { content: "+"; color: var(--couleur, #6c5ce7); font-weight: 700; }
.page .accordion-item[open] > summary::after { content: "−"; }
.page .accordion-item > :not(summary) { margin: 0 16px 14px; }

/* Fenêtre : un fond sombre et une boîte au centre */
.page .modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(17, 19, 28, 0.55);
}
.page .modal-box {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 24px 60px rgba(17, 19, 28, 0.3);
}
.page .modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: #f0f1f7;
  color: #1b1d29;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

/* Barre de menu */
.page .navbar { display: flex; align-items: center; flex-wrap: wrap; }
.page .navbar-brand { margin-right: auto; font-weight: 800; }
.page .navbar-links { display: flex; flex-wrap: wrap; gap: inherit; }
.page .navbar a { color: inherit; font-weight: 500; text-decoration: none; opacity: 0.8; }
.page .navbar a:hover, .page .navbar a.is-active { opacity: 1; text-decoration: underline; text-underline-offset: 5px; }

/* Médias */
.page .video { display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; background: #11131c; object-fit: cover; }
.page .icon { display: inline-block; width: fit-content; line-height: 1; }

/* Sur petit écran, les grilles passent sur une seule colonne. */
@container (max-width: 640px) {
  .page .grid, .page .repeat { grid-template-columns: 1fr !important; }
}
`

/** Image de remplacement quand aucune adresse n'est renseignée. */
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#eef0f7"/><path d="M250 230l60-70 50 55 30-30 60 75H190z" fill="#c9cde0"/><circle cx="400" cy="130" r="26" fill="#c9cde0"/></svg>',
  )
