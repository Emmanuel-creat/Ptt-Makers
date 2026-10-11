import { placeEntries } from '../model/freeGrid'
import type { BrickNode, BrickStyle, ProjectTheme, StyleOverride } from '../model/types'

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
export function styleEntries(node: BrickNode, style: BrickStyle = node.style): [string, string][] {
  const s = style
  const out: [string, string][] = []
  const add = (prop: string, value: string | null | undefined) => {
    if (value != null && value !== '') out.push([prop, value])
  }

  const cols = Math.max(1, Math.min(12, Math.round(Number(node.props.columns) || 1)))
  if (node.type === 'grid') {
    add('grid-template-columns', `repeat(${cols}, minmax(0, 1fr))`)
  } else if (node.type === 'repeat' && cols > 1) {
    add('display', 'grid')
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
  // Brique posée sur une page en grille : sa case.
  for (const [k, v] of placeEntries(node.place)) add(k, v)
  return out
}

/** Formats plus petits que l'ordinateur, du plus grand au plus petit, avec leur largeur maximale. */
export const BREAKPOINTS = [
  { scope: 'tablet', maxWidth: 900, label: 'Tablette et mobile' },
  { scope: 'mobile', maxWidth: 600, label: 'Mobile' },
] as const

/** Déclarations d'un réglage propre à un format (seulement ce qui change). */
export function overrideEntries(node: BrickNode, o: StyleOverride | undefined): [string, string][] {
  if (!o) return []
  const { hide, ...style } = o
  const base = new Set(['grid-template-columns', 'display', 'grid-column', 'grid-row'])
  const out = styleEntries({ ...node, type: 'stack', props: {} }, style).filter(([k]) => !base.has(k))
  if (hide) out.push(['display', 'none !important'])
  return out
}

/** Style vu sur un format donné : le style de base, puis tablette, puis mobile. */
export function effectiveStyle(node: BrickNode, device: 'desktop' | 'tablet' | 'mobile'): { style: BrickStyle; hidden: boolean } {
  if (device === 'desktop' || !node.responsive) return { style: node.style, hidden: false }
  const layers = device === 'mobile' ? [node.responsive.tablet, node.responsive.mobile] : [node.responsive.tablet]
  let style = node.style
  let hidden = false
  for (const o of layers) {
    if (!o) continue
    const { hide, ...rest } = o
    style = { ...style, ...rest }
    hidden = hidden || !!hide
  }
  return { style, hidden }
}

export const FONT_STACKS: Record<NonNullable<ProjectTheme['font']>, string> = {
  inter: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  arrondie: 'ui-rounded, "Nunito", "Quicksand", "Segoe UI", system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
}

/** Variables CSS du thème (couleur principale, arrondi, police). */
export function themeEntries(theme: ProjectTheme | undefined): [string, string][] {
  if (!theme) return []
  const out: [string, string][] = []
  const color = sanitizeColor(theme.primary)
  if (color) out.push(['--couleur', color])
  if (typeof theme.radius === 'number' && Number.isFinite(theme.radius)) out.push(['--arrondi', `${Math.max(0, Math.min(40, theme.radius))}px`])
  if (theme.font && theme.font !== 'inter' && FONT_STACKS[theme.font]) out.push(['--police', FONT_STACKS[theme.font]])
  return out
}

/** Version objet pour React (propriétés en camelCase). */
export function reactStyle(node: BrickNode, style: BrickStyle = node.style): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [prop, value] of styleEntries(node, style)) {
    out[prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = value
  }
  return out
}
