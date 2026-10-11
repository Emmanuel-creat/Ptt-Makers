import { placeEntries } from '../model/freeGrid'
import { resolveTokens, type FontId, type ShadowKind } from '../model/styles'
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

const AREA_NAME_RE = /^[a-zA-Z][\w-]*$/
const TRACK_RE = /^(auto|min-content|max-content|\d+(\.\d+)?(px|fr|%|rem|em)|minmax\(\d+(\.\d+)?(px|fr|%|rem|em)?, ?\d+(\.\d+)?(px|fr|%|rem|em)\))$/

/** Colonnes d'une grille écrites à la main (« 240px 1fr 1fr »), vérifiées une par une. */
export function gridTemplate(v: unknown): string | null {
  const t = String(v ?? '').trim()
  if (!t) return null
  const tracks = t.replace(/,\s+/g, ',').split(/\s+/).map((x) => x.replace(/,/g, ', '))
  return tracks.length <= 12 && tracks.every((x) => TRACK_RE.test(x)) ? tracks.join(' ') : null
}

/** Zones nommées d'une grille : une ligne par rangée, un nom (ou « . » pour une case vide) par colonne. */
export function gridAreas(v: unknown): string | null {
  const rows = String(v ?? '')
    .split('\n')
    .map((r) => r.trim().split(/\s+/).filter(Boolean))
    .filter((r) => r.length)
  if (!rows.length || rows.some((r) => r.length !== rows[0].length || r.some((n) => n !== '.' && !AREA_NAME_RE.test(n)))) return null
  return rows.map((r) => `"${r.join(' ')}"`).join(' ')
}

/** Les noms de zones d'une grille, dans l'ordre (pour le menu « Zone » de ses briques). */
export function areaNames(v: unknown): string[] {
  const css = gridAreas(v)
  if (!css) return []
  return [...new Set(css.replace(/"/g, '').split(/\s+/).filter((n) => n !== '.'))]
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
    // Avec des zones nommées, il faut autant de colonnes que de noms par rangée.
    const areaCols = gridAreas(node.props.areas)?.split('" "')[0].replace(/"/g, '').split(' ').length
    add('grid-template-columns', gridTemplate(node.props.template) ?? `repeat(${areaCols ?? cols}, minmax(0, 1fr))`)
    add('grid-template-areas', gridAreas(node.props.areas))
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
  // Place de la brique dans son parent.
  if (s.grow) add('flex', '1 1 0')
  if (s.alignSelf) add('align-self', ALIGN[s.alignSelf])
  if (typeof s.order === 'number' && Number.isFinite(s.order) && s.order !== 0) add('order', String(Math.round(s.order)))
  if (s.area && AREA_NAME_RE.test(s.area)) add('grid-area', s.area)
  else if (typeof s.span === 'number' && s.span > 1) add('grid-column', `span ${Math.min(12, Math.round(s.span))}`)
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

export const FONT_STACKS: Record<FontId, string> = {
  inter: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  arrondie: 'ui-rounded, "Nunito", "Quicksand", "Segoe UI", system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  grotesque: '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
  editoriale: '"Fraunces", Georgia, "Times New Roman", serif',
  manuscrite: '"Caveat", "Comic Sans MS", cursive',
  geometrique: '"Outfit", "Inter", system-ui, sans-serif',
}

/** Polices chargées depuis Google Fonts (les autres sont déjà sur l'appareil). */
const GOOGLE_FONTS: Partial<Record<FontId, string>> = {
  grotesque: 'Bricolage+Grotesque:opsz,wght@12..96,400..800',
  editoriale: 'Fraunces:opsz,wght@9..144,400..800',
  manuscrite: 'Caveat:wght@400..700',
  geometrique: 'Outfit:wght@400..800',
}

/** Adresse de la feuille Google Fonts du thème, ou null si le thème n'utilise que des polices de l'appareil. */
export function themeFontsUrl(theme: ProjectTheme | undefined): string | null {
  const t = resolveTokens(theme)
  const families = [...new Set([t.font, t.headingFont])].map((f) => (f ? GOOGLE_FONTS[f] : undefined)).filter(Boolean)
  return families.length ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap` : null
}

/** Couleur ou dégradé pour un fond (pas d'image ni de code CSS). */
export function sanitizeBackground(v: string | undefined): string | null {
  if (!v) return null
  const t = v.trim()
  if (sanitizeColor(t)) return t
  if (t.length > 400 || !/^(repeating-)?(linear|radial|conic)-gradient\(/.test(t)) return null
  if (!/^[\w\s#.,%()-]+$/.test(t) || /url|expression|var\(/i.test(t)) return null
  // Parenthèses équilibrées.
  let depth = 0
  for (const c of t) {
    depth += c === '(' ? 1 : c === ')' ? -1 : 0
    if (depth < 0) return null
  }
  return depth === 0 ? t : null
}

const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : null)

/** Ombres calculées à partir du type de relief et de son intensité. */
function shadows(kind: ShadowKind | undefined, depth: number, dark: boolean): { card: string; button: string; field: string } | null {
  const d = Math.round(depth)
  switch (kind) {
    case 'aucune':
      return { card: 'none', button: 'none', field: 'none' }
    case 'douce':
      return { card: `0 ${d * 2}px ${d * 6}px rgba(16, 24, 40, ${(0.05 + 0.03 * d).toFixed(2)})`, button: 'none', field: 'none' }
    case 'portee': {
      const a = (dark ? 0.3 : 0.1) + 0.05 * d
      return { card: `0 ${d * 6}px ${d * 14}px rgba(0, 0, 0, ${a.toFixed(2)})`, button: `0 ${d * 3}px ${d * 6}px rgba(0, 0, 0, ${(a * 0.7).toFixed(2)})`, field: 'none' }
    }
    case 'relief': {
      const low = `color-mix(in srgb, var(--surface) ${dark ? 55 : 72}%, #000)`
      const high = `color-mix(in srgb, var(--surface) ${dark ? 88 : 15}%, #fff)`
      const o = d * 3
      const b = d * 2
      return {
        card: `${o}px ${o}px ${o * 2}px ${low}, -${o}px -${o}px ${o * 2}px ${high}`,
        button: `${b}px ${b}px ${b * 2}px ${low}, -${b}px -${b}px ${b * 2}px ${high}`,
        field: `inset ${b}px ${b}px ${b * 2}px ${low}, inset -${b}px -${b}px ${b * 2}px ${high}`,
      }
    }
    case 'decalee': {
      const o = d * 2 + 1
      return { card: `${o}px ${o}px 0 var(--texte)`, button: `${o}px ${o}px 0 var(--texte)`, field: 'none' }
    }
    case 'verre':
      return {
        card: `inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 ${d * 4}px ${d * 10}px rgba(0, 0, 0, ${(dark ? 0.25 : 0.12).toFixed(2)})`,
        button: 'inset 0 1px 0 rgba(255, 255, 255, 0.45)',
        field: 'none',
      }
    default:
      return null
  }
}

/** Variables CSS du thème : couleurs, surfaces, relief, flou, arrondis et polices. */
export function themeEntries(theme: ProjectTheme | undefined): [string, string][] {
  if (!theme) return []
  const t = resolveTokens(theme)
  const out: [string, string][] = []
  const add = (k: string, v: string | null | undefined) => {
    if (v) out.push([k, v])
  }
  const accent = sanitizeColor(t.accent)
  add('--couleur', accent)
  const radius = num(t.radius, 0, 999)
  if (radius !== null) add('--arrondi', `${radius}px`)
  if (t.font && t.font !== 'inter' && FONT_STACKS[t.font]) add('--police', FONT_STACKS[t.font])
  // Le reste n'existe que pour un style ou des réglages du Studio.
  if (!theme.style && !theme.tokens) return out
  if (t.headingFont && FONT_STACKS[t.headingFont]) add('--police-titre', FONT_STACKS[t.headingFont])
  add('--sur-couleur', sanitizeColor(t.onAccent))
  add('--fond', sanitizeBackground(t.background))
  add('--surface', sanitizeColor(t.surface))
  add('--texte', sanitizeColor(t.text))
  add('--texte-doux', sanitizeColor(t.muted))
  add('--barre', sanitizeBackground(t.bar))
  add('--sur-barre', sanitizeColor(t.onBar))
  const border = sanitizeColor(t.border)
  const bw = num(t.borderWidth, 0, 8)
  if (border || bw !== null) {
    add('--bordure', bw === 0 ? 'none' : `${bw ?? 1}px solid ${border ?? '#e4e6ef'}`)
    add('--trait', border ?? '#e4e6ef')
  }
  const cardRadius = num(t.cardRadius, 0, 60)
  if (cardRadius !== null) add('--arrondi-carte', `${cardRadius}px`)
  const sh = shadows(t.shadow, num(t.depth, 1, 3) ?? 1, !!t.dark)
  if (sh) {
    add('--ombre', sh.card)
    add('--ombre-bouton', sh.button)
    add('--ombre-champ', sh.field)
    if (t.shadow === 'decalee' && bw) add('--bordure-bouton', `${bw}px solid ${border ?? '#111111'}`)
  }
  const blur = num(t.blur, 0, 40)
  if (blur !== null) add('--flou', `${blur}px`)
  if (accent) {
    add('--badge', `color-mix(in srgb, ${accent} 18%, transparent)`)
    add('--sur-badge', t.dark ? sanitizeColor(t.text) ?? accent : accent)
    add('--icone', accent)
  }
  if (t.dark !== undefined) add('color-scheme', t.dark ? 'dark' : 'light')
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
