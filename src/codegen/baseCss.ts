import type { BrickNode } from '../model/types'

/** Classes CSS de base de chaque brique (partagées par le code généré et la zone de création). */
export function brickClass(node: BrickNode): string {
  switch (node.type) {
    case 'page':
      return node.props.layout === 'grille' ? 'page grille' : 'page'
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
  background: var(--fond, #ffffff);
  color: var(--texte, #1b1d29);
}
.page h1, .page h2, .page h3 { font-family: var(--police-titre, inherit); }
.page *, .page *::before, .page *::after { box-sizing: border-box; }
.page h1, .page h2, .page h3, .page p { margin: 0; }
.page h1 { font-size: 2.4rem; line-height: 1.15; font-weight: 800; letter-spacing: -0.02em; }
.page h2 { font-size: 1.65rem; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; }
.page h3 { font-size: 1.2rem; line-height: 1.3; font-weight: 600; }
.page p { line-height: 1.65; }
.page a { color: var(--couleur, #5b4ff5); font-weight: 500; }
.page ul, .page ol { margin: 0; padding-left: 1.4em; line-height: 1.75; }
.page img { display: block; max-width: 100%; object-fit: cover; }
.page hr { width: 100%; margin: 0; border: 0; border-top: 1px solid var(--trait, #e4e6ef); }
.page[hidden], .page [hidden] { display: none !important; }

.page .section, .page .row, .page .stack, .page .card { display: flex; flex-direction: column; min-width: 0; }
.page .row { flex-direction: row; }
.page .grid { display: grid; }
/* Carte : fond, bordure, arrondi et ombre viennent du style du projet. */
.page .card {
  background: var(--surface, #ffffff);
  border: var(--bordure, 1px solid #e4e6ef);
  border-radius: var(--arrondi-carte, 14px);
  box-shadow: var(--ombre, 0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.05));
  -webkit-backdrop-filter: blur(var(--flou, 0px));
  backdrop-filter: blur(var(--flou, 0px));
}
/* Une répétition affiche une copie de son contenu par élément de la liste. */
.page .repeat { display: flex; flex-direction: column; min-width: 0; }
.page .repeat-item { display: contents; }
.page .repeat-empty { color: var(--texte-doux, #6b7083); }
.page .spacer { flex-shrink: 0; }

.page .badge {
  display: inline-flex;
  width: fit-content;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--badge, #ede9fe);
  color: var(--sur-badge, #5b21b6);
  font-size: 0.8rem;
  font-weight: 600;
}

.page .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 10px 18px;
  border: var(--bordure-bouton, 1px solid transparent);
  border-radius: var(--arrondi, 10px);
  box-shadow: var(--ombre-bouton, none);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, filter 0.15s ease, background 0.15s ease;
}
.page .btn:hover { filter: brightness(1.06); }
.page .btn:active { transform: translateY(1px); }
.page .btn:focus-visible { outline: 3px solid color-mix(in srgb, var(--couleur, #6c5ce7) 45%, transparent); outline-offset: 2px; }
.page .btn-primary { background: var(--couleur, #6c5ce7); color: var(--sur-couleur, #ffffff); }
.page .btn-secondary { background: var(--surface, #ffffff); color: var(--texte, #1b1d29); border: var(--bordure, 1px solid #d6d9e4); }
.page .btn-ghost { background: transparent; color: var(--couleur, #6c5ce7); }

.page .field { display: flex; flex-direction: column; gap: 6px; font-size: 0.9rem; font-weight: 500; }
.page .field input, .page .field textarea, .page .field select {
  width: 100%;
  padding: 10px 12px;
  border: var(--bordure, 1px solid #d6d9e4);
  border-radius: var(--arrondi, 10px);
  background: var(--surface, #ffffff);
  box-shadow: var(--ombre-champ, none);
  color: var(--texte, #1b1d29);
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
.page .tabs-bar { display: flex; gap: 4px; border-bottom: 1px solid var(--trait, #e4e6ef); overflow-x: auto; }
.page .tabs-bar button {
  margin-bottom: -1px;
  padding: 10px 14px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--texte-doux, #6b7083);
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.page .tabs-bar button[aria-selected="true"] { color: var(--couleur, #6c5ce7); border-bottom-color: var(--couleur, #6c5ce7); }

/* Accordéon : des volets <details> qui s'ouvrent sans JavaScript */
.page .accordion-item { border: var(--bordure, 1px solid #e4e6ef); border-radius: var(--arrondi, 10px); background: var(--surface, #ffffff); color: var(--texte, #1b1d29); box-shadow: var(--ombre, none); }
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
  background: var(--surface, #ffffff);
  color: var(--texte, #1b1d29);
  border-radius: var(--arrondi-carte, 16px);
  box-shadow: 0 24px 60px rgba(17, 19, 28, 0.3);
  -webkit-backdrop-filter: blur(var(--flou, 0px));
  backdrop-filter: blur(var(--flou, 0px));
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
.page .navbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  background: var(--barre, #1b1d29);
  color: var(--sur-barre, #ffffff);
  -webkit-backdrop-filter: blur(var(--flou, 0px));
  backdrop-filter: blur(var(--flou, 0px));
}
.page .navbar-brand { margin-right: auto; font-weight: 800; }
.page .navbar-links { display: flex; flex-wrap: wrap; gap: inherit; }
.page .navbar a { color: inherit; font-weight: 500; text-decoration: none; opacity: 0.8; }
.page .navbar a:hover, .page .navbar a.is-active { opacity: 1; text-decoration: underline; text-underline-offset: 5px; }

/* Médias */
.page .video { display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; background: #11131c; object-fit: cover; }
.page .icon { display: inline-block; width: fit-content; line-height: 1; color: var(--icone, inherit); }
.page .icon svg { display: block; width: 1em; height: 1em; }

/* Sur petit écran, les grilles passent sur une seule colonne. */
@container (max-width: 640px) {
  .page .grid, .page .repeat { grid-template-columns: 1fr !important; }
}

/* Page en grille : 12 colonnes et des rangées de 40 px ; chaque brique occupe sa case. */
.page.grille {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-rows: minmax(40px, auto);
  align-content: start;
}
.page.grille > * { min-width: 0; }
/* Sur un petit écran, les briques de la grille s'empilent dans l'ordre (de haut en bas, de gauche à droite). */
@container (max-width: 600px) {
  .page.grille > * { grid-column: 1 / -1 !important; grid-row: auto !important; }
}
`

/** Image de remplacement quand aucune adresse n'est renseignée. */
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#eef0f7"/><path d="M250 230l60-70 50 55 30-30 60 75H190z" fill="#c9cde0"/><circle cx="400" cy="130" r="26" fill="#c9cde0"/></svg>',
  )
