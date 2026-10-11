import { ICON_DATA, type IconNode } from './iconData'

/** Icônes proposées par la brique « Icône », dessinées en SVG (pas d'emoji). */
export const ICON_NAMES = Object.keys(ICON_DATA)
export const DEFAULT_ICON = 'etoile'

const BY_EMOJI = new Map(Object.entries(ICON_DATA).map(([name, d]) => [d.emoji.replace(/\u{fe0f}/gu, ''), name]))

/** Nom d'icône à utiliser : un nom connu, l'icône équivalente d'un ancien emoji, sinon l'étoile. */
export function resolveIcon(symbol: unknown): string {
  const s = String(symbol ?? '').trim()
  if (ICON_DATA[s]) return s
  return BY_EMOJI.get(s.replace(/\u{fe0f}/gu, '')) ?? DEFAULT_ICON
}

export const iconLabel = (name: string) => ICON_DATA[resolveIcon(name)].label
export const iconNode = (name: string): IconNode => ICON_DATA[resolveIcon(name)].node

/** Attributs communs du dessin : 1em de côté (suit la taille du texte), couleur du texte, trait arrondi. */
export const SVG_ATTRS: [string, string][] = [
  ['xmlns', 'http://www.w3.org/2000/svg'],
  ['viewBox', '0 0 24 24'],
  ['width', '1em'],
  ['height', '1em'],
  ['fill', 'none'],
  ['stroke', 'currentColor'],
  ['stroke-width', '2'],
  ['stroke-linecap', 'round'],
  ['stroke-linejoin', 'round'],
]

const attr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/** Le SVG de l'icône, en HTML (pour le code généré). */
export function iconSvg(name: string): string {
  const head = SVG_ATTRS.map(([k, v]) => `${k}="${attr(v)}"`).join(' ')
  const body = iconNode(name)
    .map(([tag, a]) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${attr(v)}"`).join(' ')}/>`)
    .join('')
  return `<svg ${head} aria-hidden="true">${body}</svg>`
}
