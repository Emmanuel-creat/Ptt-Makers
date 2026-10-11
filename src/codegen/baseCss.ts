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
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.5;
}
.page *, .page *::before, .page *::after { box-sizing: border-box; }
.page h1, .page h2, .page h3, .page p { margin: 0; }
.page h1 { font-size: 2.4rem; line-height: 1.15; font-weight: 800; letter-spacing: -0.02em; }
.page h2 { font-size: 1.65rem; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; }
.page h3 { font-size: 1.2rem; line-height: 1.3; font-weight: 600; }
.page p { line-height: 1.65; }
.page a { color: #5b4ff5; font-weight: 500; }
.page ul, .page ol { margin: 0; padding-left: 1.4em; line-height: 1.75; }
.page img { display: block; max-width: 100%; object-fit: cover; }
.page hr { width: 100%; margin: 0; border: 0; border-top: 1px solid #e4e6ef; }
.page [hidden] { display: none !important; }

.page .section, .page .row, .page .stack, .page .card { display: flex; flex-direction: column; min-width: 0; }
.page .row { flex-direction: row; }
.page .grid { display: grid; }
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
  border-radius: 10px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, filter 0.15s ease, background 0.15s ease;
}
.page .btn:hover { filter: brightness(1.06); }
.page .btn:active { transform: translateY(1px); }
.page .btn:focus-visible { outline: 3px solid rgba(108, 92, 231, 0.45); outline-offset: 2px; }
.page .btn-primary { background: #6c5ce7; color: #ffffff; }
.page .btn-secondary { background: #ffffff; color: #1b1d29; border-color: #d6d9e4; }
.page .btn-ghost { background: transparent; color: #6c5ce7; }

.page .field { display: flex; flex-direction: column; gap: 6px; font-size: 0.9rem; font-weight: 500; }
.page .field input, .page .field textarea, .page .field select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d6d9e4;
  border-radius: 10px;
  background: #ffffff;
  color: #1b1d29;
  font: inherit;
  font-weight: 400;
}
.page .field textarea { min-height: 96px; resize: vertical; }
.page .field input:focus, .page .field textarea:focus, .page .field select:focus {
  outline: none;
  border-color: #6c5ce7;
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.2);
}
.page .check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.page .check input { width: 18px; height: 18px; accent-color: #6c5ce7; }

/* Sur petit écran, les grilles passent sur une seule colonne. */
@container (max-width: 640px) {
  .page .grid { grid-template-columns: 1fr !important; }
}
`

/** Image de remplacement quand aucune adresse n'est renseignée. */
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#eef0f7"/><path d="M250 230l60-70 50 55 30-30 60 75H190z" fill="#c9cde0"/><circle cx="400" cy="130" r="26" fill="#c9cde0"/></svg>',
  )
