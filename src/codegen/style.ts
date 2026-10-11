import type { BrickNode } from '../model/types'

const ALIGN: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' }
const JUSTIFY: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
}
export const SHADOWS: Record<string, string> = {
  sm: '0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.05)',
  md: '0 8px 20px rgba(16, 24, 40, 0.10)',
  lg: '0 18px 44px rgba(16, 24, 40, 0.16)',
}

const LENGTH_RE = /^(auto|0|\d+(\.\d+)?(px|%|rem|em|vw|vh)?)$/
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|[a-zA-Z]+)$/

/** Accepte « 200 », « 200px », « 50% », « auto »… et refuse le reste (évite l'injection de CSS). */
export function sanitizeLength(v: string | undefined): string | null {
  if (v == null) return null
  const t = String(v).trim()
  if (!t || !LENGTH_RE.test(t)) return null
  return /^\d+(\.\d+)?$/.test(t) && t !== '0' ? `${t}px` : t
}

export function sanitizeColor(v: string | undefined): string | null {
  if (!v) return null
  const t = v.trim()
  return COLOR_RE.test(t) ? t : null
}

const px = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? `${n}px` : null)

/**
 * Liste des déclarations CSS d'une brique, dans un ordre stable.
 * Sert à la fois au code généré et au rendu de la zone de création : les deux sont donc identiques.
 */
export function styleEntries(node: BrickNode): [string, string][] {
  const s = node.style
  const out: [string, string][] = []
  const add = (prop: string, value: string | null | undefined) => {
    if (value != null && value !== '') out.push([prop, value])
  }

  if (node.type === 'grid') {
    const cols = Math.max(1, Math.min(12, Math.round(Number(node.props.columns) || 1)))
    add('grid-template-columns', `repeat(${cols}, minmax(0, 1fr))`)
  } else if (s.direction) {
    add('flex-direction', s.direction)
  }
  if (s.wrap) add('flex-wrap', 'wrap')
  if (s.align) add('align-items', ALIGN[s.align])
  if (s.justify) add('justify-content', JUSTIFY[s.justify])
  add('gap', px(s.gap))
  add('padding', px(s.padding))
  add('margin', px(s.margin))
  add('width', sanitizeLength(s.width))
  add('max-width', sanitizeLength(s.maxWidth))
  add('height', sanitizeLength(s.height))
  add('background', sanitizeColor(s.background))
  add('color', sanitizeColor(s.color))
  add('font-size', px(s.fontSize))
  add('font-weight', s.fontWeight)
  add('text-align', s.textAlign)
  add('border-radius', px(s.borderRadius))
  if (s.borderWidth) {
    add('border', `${s.borderWidth}px solid ${sanitizeColor(s.borderColor) ?? '#e4e6ef'}`)
  }
  if (s.shadow && s.shadow !== 'none') add('box-shadow', SHADOWS[s.shadow])
  if (typeof s.opacity === 'number' && s.opacity < 1) add('opacity', String(s.opacity))
  return out
}

/** Version objet pour React (propriétés en camelCase). */
export function reactStyle(node: BrickNode): Record<string, string> {
  const style: Record<string, string> = {}
  for (const [prop, value] of styleEntries(node)) {
    style[prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = value
  }
  return style
}
