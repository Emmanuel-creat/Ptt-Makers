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
    case 'table':
      return node.props.striped ? 'table is-striped' : 'table'
    case 'chart':
      return `chart chart-${node.props.kind === 'courbe' || node.props.kind === 'anneau' ? node.props.kind : 'barres'}`
    case 'calendar':
    case 'kanban':
    case 'chat':
    case 'tabbar':
    case 'stat':
    case 'progress':
      return node.type
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

/* Briques pro : surfaces qui suivent le style du projet */
.page .table, .page .chart, .page .calendar, .page .chat, .page .stat, .page .kanban-col {
  min-width: 0;
  background: var(--surface, #ffffff);
  color: var(--texte, #1b1d29);
  border: var(--bordure, 1px solid #e4e6ef);
  border-radius: var(--arrondi-carte, 14px);
  box-shadow: var(--ombre, 0 1px 3px rgba(16, 24, 40, 0.08));
  -webkit-backdrop-filter: blur(var(--flou, 0px));
  backdrop-filter: blur(var(--flou, 0px));
}

/* Tableau */
.page .table { overflow-x: auto; }
.page .table table, .page .calendar table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
.page .table th, .page .table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--trait, #e4e6ef); white-space: nowrap; }
.page .table th { color: var(--texte-doux, #6b7083); font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.page .table tbody tr:last-child td { border-bottom: 0; }
.page .table.is-striped tbody tr:nth-child(even) { background: color-mix(in srgb, var(--texte, #1b1d29) 4%, transparent); }
.page .table tbody tr:hover { background: color-mix(in srgb, var(--couleur, #6c5ce7) 7%, transparent); }
.page .table th button { padding: 0; border: 0; background: none; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
.page .table th button::after { content: " ↕"; opacity: 0.45; }
.page .table th[aria-sort="ascending"] button::after { content: " ↑"; opacity: 1; }
.page .table th[aria-sort="descending"] button::after { content: " ↓"; opacity: 1; }
.page .table-img { display: block; width: 40px; height: 40px; object-fit: cover; border-radius: 8px; }
.page .table td a { color: var(--couleur, #6c5ce7); }
.page .table-delete { padding: 4px 10px; border: 1px solid var(--trait, #e4e6ef); border-radius: 999px; background: transparent; color: #c2363b; font: inherit; font-size: 0.82rem; cursor: pointer; }
.page .table-delete:hover { background: color-mix(in srgb, #c2363b 10%, transparent); border-color: color-mix(in srgb, #c2363b 40%, transparent); }
.page .table-actions-title { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.page .table-empty { margin: 0; padding: 18px 14px; color: var(--texte-doux, #6b7083); font-size: 0.92rem; }

/* Graphique */
.page .chart { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 16px; }
.page .chart svg { display: block; flex: 1 1 260px; width: 100%; max-width: 100%; height: auto; max-height: 300px; overflow: visible; }
.page .chart-anneau svg { flex: 0 1 200px; }
.page .chart-grid { stroke: var(--trait, #e4e6ef); stroke-width: 1; }
.page .chart-axis { fill: var(--texte-doux, #6b7083); font-size: 11px; }
.page .chart-value { fill: var(--texte, #1b1d29); font-size: 11px; font-weight: 600; }
.page .chart-total { fill: var(--texte, #1b1d29); font-size: 20px; font-weight: 800; }
.page .chart-line { fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.page .chart-area { opacity: 0.14; stroke: none; }
.page .chart-dot { stroke: var(--surface, #ffffff); stroke-width: 2; }
.page .chart-track { fill: none; stroke: var(--trait, #e4e6ef); stroke-width: 26; }
.page .chart-slice { fill: none; stroke-width: 26; }
.page .chart .serie-1 { --serie: var(--couleur, #6c5ce7); }
.page .chart .serie-2 { --serie: #0ea5e9; }
.page .chart .serie-3 { --serie: #10b981; }
.page .chart .serie-4 { --serie: #f59e0b; }
.page .chart .serie-5 { --serie: #ef4444; }
.page .chart .serie-6 { --serie: #8b5cf6; }
.page .chart-bar, .page .chart-area, .page .chart-dot, .page .chart-key { fill: var(--serie); background: var(--serie); }
.page .chart-line, .page .chart-slice { stroke: var(--serie); }
.page .chart-legend { display: flex; flex: 1 1 160px; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; font-size: 0.9rem; }
.page .chart-legend li { display: flex; align-items: center; gap: 8px; }
.page .chart-legend strong { margin-left: auto; }
.page .chart-key { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

/* Chiffre clé et progression */
.page .stat { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 4px 12px; }
.page .stat-icon { grid-column: 2; grid-row: 1; display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--arrondi, 10px); background: color-mix(in srgb, var(--couleur, #6c5ce7) 14%, transparent); color: var(--couleur, #6c5ce7); font-size: 20px; }
.page .stat-label { grid-column: 1; align-self: center; color: var(--texte-doux, #6b7083); font-size: 0.85rem; font-weight: 500; }
.page .stat-value { grid-column: 1 / -1; font-family: var(--police-titre, inherit); font-size: 1.9rem; line-height: 1.1; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.page .stat-delta { grid-column: 1 / -1; width: fit-content; font-size: 0.8rem; font-weight: 700; }
.page .stat-delta.is-up { color: #0f9d63; }
.page .stat-delta.is-down { color: #dc3545; }
.page .progress { display: flex; flex-direction: column; gap: 6px; }
.page .progress-head { display: flex; justify-content: space-between; gap: 12px; font-size: 0.9rem; font-weight: 600; }
.page .progress-value { color: var(--texte-doux, #6b7083); font-variant-numeric: tabular-nums; }
.page .progress progress { width: 100%; height: 10px; border: 0; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--texte, #1b1d29) 10%, transparent); accent-color: var(--couleur, #6c5ce7); -webkit-appearance: none; appearance: none; }
.page .progress progress::-webkit-progress-bar { background: color-mix(in srgb, var(--texte, #1b1d29) 10%, transparent); }
.page .progress progress::-webkit-progress-value { background: var(--couleur, #6c5ce7); border-radius: 999px; transition: width 0.3s ease; }
.page .progress progress::-moz-progress-bar { background: var(--couleur, #6c5ce7); border-radius: 999px; }

/* Calendrier */
.page .calendar { padding: 14px; }
.page .calendar-title { margin-bottom: 8px; font-weight: 700; font-size: 1.05rem; text-transform: capitalize; }
.page .calendar table { table-layout: fixed; }
.page .calendar th { padding: 4px; color: var(--texte-doux, #6b7083); font-size: 0.75rem; font-weight: 600; text-align: left; }
.page .calendar td { height: 64px; padding: 4px; vertical-align: top; border-top: 1px solid var(--trait, #e4e6ef); }
.page .calendar-day { display: block; font-size: 0.8rem; font-weight: 600; color: var(--texte-doux, #6b7083); }
.page .calendar td.has-event .calendar-day { color: var(--couleur, #6c5ce7); }
.page .calendar-event { display: block; margin-top: 3px; padding: 2px 6px; overflow: hidden; border-radius: 6px; background: color-mix(in srgb, var(--couleur, #6c5ce7) 14%, transparent); color: var(--texte, #1b1d29); font-size: 0.72rem; line-height: 1.3; overflow-wrap: break-word; hyphens: auto; }

/* Kanban */
.page .kanban { display: grid; grid-auto-columns: minmax(200px, 1fr); grid-auto-flow: column; overflow-x: auto; align-items: start; }
.page .kanban-col { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
.page .kanban-title { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.page .kanban-count { padding: 0 8px; border-radius: 999px; background: color-mix(in srgb, var(--texte, #1b1d29) 8%, transparent); color: var(--texte-doux, #6b7083); font-size: 0.75rem; }
.page .kanban-cards { display: flex; flex-direction: column; gap: 8px; min-height: 48px; margin: 0; padding: 0; list-style: none; }
.page .kanban-card { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-radius: var(--arrondi, 10px); background: var(--fond, #f6f7fb); border: var(--bordure, 1px solid #e4e6ef); font-size: 0.9rem; cursor: grab; }
.page .kanban-card.is-dragging { opacity: 0.5; }
.page .kanban-move { flex-shrink: 0; width: 26px; height: 26px; border: 0; border-radius: 50%; background: transparent; color: var(--texte-doux, #6b7083); font: inherit; cursor: pointer; }
.page .kanban-move:hover { background: color-mix(in srgb, var(--couleur, #6c5ce7) 14%, transparent); color: var(--couleur, #6c5ce7); }

/* Discussion */
.page .chat { display: flex; flex-direction: column; }
.page .chat-messages { display: flex; flex-direction: column; gap: 10px; max-height: 420px; overflow-y: auto; }
.page .chat-msg { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; max-width: 80%; }
.page .chat-msg.is-me { align-self: flex-end; align-items: flex-end; }
.page .chat-author { color: var(--texte-doux, #6b7083); font-size: 0.75rem; font-weight: 600; }
.page .chat-bubble { padding: 8px 12px; border-radius: 16px 16px 16px 4px; background: color-mix(in srgb, var(--texte, #1b1d29) 7%, transparent); line-height: 1.45; }
.page .chat-msg.is-me .chat-bubble { border-radius: 16px 16px 4px 16px; background: var(--couleur, #6c5ce7); color: var(--sur-couleur, #ffffff); }
.page .chat-form { display: flex; gap: 8px; }
.page .chat-form input { flex: 1; min-width: 0; padding: 10px 14px; border: var(--bordure, 1px solid #d6d9e4); border-radius: 999px; background: var(--fond, #ffffff); color: var(--texte, #1b1d29); font: inherit; }
.page .chat-form .btn { border-radius: 999px; }

/* Barre d'onglets mobile : collée en bas de l'écran */
.page .tabbar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  justify-content: space-around;
  margin-top: auto;
  padding: 8px 6px calc(8px + env(safe-area-inset-bottom, 0px));
  background: var(--barre, #1b1d29);
  color: var(--sur-barre, #ffffff);
  -webkit-backdrop-filter: blur(var(--flou, 0px));
  backdrop-filter: blur(var(--flou, 0px));
}
.page .tabbar a { display: flex; flex: 1; flex-direction: column; align-items: center; gap: 2px; padding: 4px; color: inherit; font-size: 0.7rem; font-weight: 600; text-decoration: none; opacity: 0.6; }
.page .tabbar a.is-active { opacity: 1; color: var(--couleur, #6c5ce7); }
.page .tabbar svg { width: 22px; height: 22px; }

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
