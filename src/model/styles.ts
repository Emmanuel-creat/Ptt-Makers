import type { BrickNode, BrickStyle, ProjectTheme, StyleOverride } from './types'

/**
 * Moteur de styles : un style est un jeu de réglages (couleurs, surfaces, relief, flou,
 * arrondis, polices) appliqué à toutes les briques à travers des variables CSS.
 * Le projet garde le nom du style choisi et seulement les réglages que l'on a changés.
 */

export type ShadowKind = 'aucune' | 'douce' | 'portee' | 'relief' | 'decalee' | 'verre'
export const FONT_IDS = ['inter', 'system', 'arrondie', 'serif', 'mono', 'grotesque', 'editoriale', 'manuscrite', 'geometrique'] as const
export type FontId = (typeof FONT_IDS)[number]

export interface StyleTokens {
  /** Ambiance sombre : sert à calculer le relief et à choisir les couleurs des contrôles. */
  dark: boolean
  /** Couleur principale (boutons, liens, onglets actifs). */
  accent: string
  /** Texte posé sur la couleur principale. */
  onAccent: string
  /** Fond de la page : une couleur ou un dégradé. */
  background: string
  /** Fond des cartes, champs et fenêtres. */
  surface: string
  text: string
  muted: string
  /** Fond et texte de la barre de menu. */
  bar: string
  onBar: string
  border: string
  borderWidth: number
  /** Arrondi des boutons et des champs. */
  radius: number
  /** Arrondi des cartes et fenêtres. */
  cardRadius: number
  shadow: ShadowKind
  /** Intensité du relief, de 1 à 3. */
  depth: number
  /** Flou derrière les surfaces (verre), en px. */
  blur: number
  font: FontId
  headingFont: FontId
}

export interface StylePreset {
  id: string
  name: string
  /** D'où vient le style (un exemple de l'utilisateur ou une tendance). */
  origin: string
  tags: string[]
  tokens: StyleTokens
}

const base = (t: Partial<StyleTokens>): StyleTokens => ({
  dark: false,
  accent: '#6c5ce7',
  onAccent: '#ffffff',
  background: '#ffffff',
  surface: '#ffffff',
  text: '#1b1d29',
  muted: '#6b7083',
  bar: '#1b1d29',
  onBar: '#ffffff',
  border: '#e4e6ef',
  borderWidth: 1,
  radius: 10,
  cardRadius: 14,
  shadow: 'douce',
  depth: 1,
  blur: 0,
  font: 'inter',
  headingFont: 'inter',
  ...t,
})

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'neo-sombre',
    name: 'Néomorphisme sombre',
    origin: 'Messagerie sombre et rouge',
    tags: ['sombre', 'relief'],
    tokens: base({ dark: true, accent: '#e8473f', background: '#25272c', surface: '#25272c', text: '#f1f1f3', muted: '#9a9ca3', bar: '#25272c', onBar: '#f1f1f3', border: '#2f3238', borderWidth: 0, radius: 16, cardRadius: 20, shadow: 'relief', depth: 2 }),
  },
  {
    id: 'nuit-jaune',
    name: 'Nuit et jaune',
    origin: 'Application de VTC',
    tags: ['sombre', 'pro'],
    tokens: base({ dark: true, accent: '#f6c419', onAccent: '#111215', background: '#111215', surface: '#1d1f24', text: '#f4f4f5', muted: '#8d9099', bar: '#111215', onBar: '#f4f4f5', border: '#2b2e35', radius: 12, cardRadius: 16, shadow: 'aucune' }),
  },
  {
    id: 'verre-givre',
    name: 'Verre givré clair',
    origin: 'Profil et abonnement givrés',
    tags: ['clair', 'verre'],
    tokens: base({ accent: '#141414', background: 'linear-gradient(140deg, #e6e2de, #a8a39f 55%, #efece9)', surface: 'rgba(255, 255, 255, 0.4)', text: '#141414', muted: '#4c4a48', bar: 'rgba(255, 255, 255, 0.35)', onBar: '#141414', border: 'rgba(255, 255, 255, 0.65)', radius: 999, cardRadius: 24, shadow: 'verre', blur: 14 }),
  },
  {
    id: 'photo-verre',
    name: 'Photo et tuiles de verre',
    origin: 'Randonnée et surf',
    tags: ['sombre', 'verre'],
    tokens: base({ dark: true, accent: '#3f7d58', background: 'linear-gradient(180deg, #7b8a96 0%, #4d6152 45%, #1d2a22 100%)', surface: 'rgba(18, 22, 20, 0.5)', text: '#ffffff', muted: '#cfd6d1', bar: 'rgba(18, 22, 20, 0.45)', onBar: '#ffffff', border: 'rgba(255, 255, 255, 0.14)', radius: 999, cardRadius: 24, shadow: 'verre', depth: 2, blur: 12 }),
  },
  {
    id: 'verre-halos',
    name: 'Verre de nuit à halos',
    origin: 'Tendance',
    tags: ['sombre', 'verre'],
    tokens: base({ dark: true, accent: '#8b7bff', background: 'radial-gradient(circle at 15% 20%, #7b3cff 0, transparent 45%), radial-gradient(circle at 85% 75%, #ff3d9a 0, transparent 40%), radial-gradient(circle at 70% 10%, #2f7bff 0, transparent 35%), #0d0b1e', surface: 'rgba(255, 255, 255, 0.08)', text: '#ffffff', muted: '#c9c4ea', bar: 'rgba(255, 255, 255, 0.06)', onBar: '#ffffff', border: 'rgba(255, 255, 255, 0.18)', radius: 12, cardRadius: 20, shadow: 'verre', blur: 16 }),
  },
  {
    id: 'verre-liquide',
    name: 'Verre liquide',
    origin: 'Tendance',
    tags: ['verre', 'graphique'],
    tokens: base({ accent: '#ffffff', onAccent: '#2a2140', background: 'linear-gradient(135deg, #ffb36b, #ff5fa2 45%, #5d7bff)', surface: 'rgba(255, 255, 255, 0.22)', text: '#ffffff', muted: 'rgba(255, 255, 255, 0.82)', bar: 'rgba(255, 255, 255, 0.18)', onBar: '#ffffff', border: 'rgba(255, 255, 255, 0.4)', radius: 999, cardRadius: 28, shadow: 'verre', depth: 2, blur: 20 }),
  },
  {
    id: 'neo-clair',
    name: 'Néomorphisme clair',
    origin: 'Tendance',
    tags: ['clair', 'relief'],
    tokens: base({ accent: '#4d6bfe', background: '#e0e5ec', surface: '#e0e5ec', text: '#2d3440', muted: '#6b7686', bar: '#e0e5ec', onBar: '#2d3440', borderWidth: 0, radius: 14, cardRadius: 20, shadow: 'relief', depth: 2 }),
  },
  {
    id: 'pate-a-modeler',
    name: 'Pâte à modeler',
    origin: 'Tendance',
    tags: ['clair', 'relief'],
    tokens: base({ accent: '#ff7aa2', background: '#f1e8ff', surface: '#ffffff', text: '#2b2140', muted: '#7a6e92', bar: '#ffffff', onBar: '#2b2140', borderWidth: 0, radius: 22, cardRadius: 28, shadow: 'portee', depth: 2, font: 'arrondie', headingFont: 'arrondie' }),
  },
  {
    id: 'neobrutal',
    name: 'Néobrutalisme',
    origin: 'Tendance',
    tags: ['clair', 'graphique'],
    tokens: base({ accent: '#ff5c39', onAccent: '#111111', background: '#fff3cf', surface: '#ffffff', text: '#111111', muted: '#333333', bar: '#ffffff', onBar: '#111111', border: '#111111', borderWidth: 3, radius: 4, cardRadius: 6, shadow: 'decalee', depth: 2, headingFont: 'grotesque' }),
  },
  {
    id: 'editorial',
    name: 'Éditorial minimal',
    origin: 'Tendance',
    tags: ['clair', 'graphique'],
    tokens: base({ accent: '#111111', background: '#fbfaf6', surface: '#fbfaf6', text: '#111111', muted: '#5c5a55', bar: '#fbfaf6', onBar: '#111111', border: '#111111', borderWidth: 1, radius: 0, cardRadius: 0, shadow: 'aucune', headingFont: 'editoriale' }),
  },
  {
    id: 'typo-geante',
    name: 'Typographie géante',
    origin: 'Tendance',
    tags: ['clair', 'graphique'],
    tokens: base({ accent: '#1430ff', background: '#f1efe8', surface: '#f1efe8', text: '#1430ff', muted: '#4a5cff', bar: '#1430ff', onBar: '#f1efe8', border: '#1430ff', borderWidth: 2, radius: 0, cardRadius: 0, shadow: 'aucune', font: 'grotesque', headingFont: 'grotesque' }),
  },
  {
    id: 'utilitaire',
    name: 'Utilitaire dense',
    origin: 'Tendance',
    tags: ['clair', 'pro'],
    tokens: base({ accent: '#0b6bcb', background: '#f6f7f9', surface: '#ffffff', text: '#1d2430', muted: '#677284', bar: '#ffffff', onBar: '#1d2430', border: '#dfe3e8', radius: 6, cardRadius: 8, shadow: 'aucune', font: 'system', headingFont: 'system' }),
  },
  {
    id: 'bento',
    name: 'Grille bento',
    origin: 'Tendance',
    tags: ['clair', 'pro'],
    tokens: base({ accent: '#ff8a3d', background: '#efeff3', surface: '#ffffff', text: '#15151a', muted: '#6e6e78', bar: '#15151a', onBar: '#ffffff', borderWidth: 0, radius: 14, cardRadius: 22, shadow: 'aucune', headingFont: 'geometrique' }),
  },
  {
    id: 'degrade-vif',
    name: 'Dégradé vif',
    origin: 'Tendance',
    tags: ['graphique'],
    tokens: base({ dark: true, accent: '#ffffff', onAccent: '#c4206f', background: 'linear-gradient(160deg, #ff6a3d, #ff2d87 50%, #7a2cff)', surface: 'rgba(255, 255, 255, 0.16)', text: '#ffffff', muted: 'rgba(255, 255, 255, 0.82)', bar: 'rgba(255, 255, 255, 0.12)', onBar: '#ffffff', border: 'rgba(255, 255, 255, 0.3)', radius: 999, cardRadius: 20, shadow: 'aucune', blur: 8, headingFont: 'geometrique' }),
  },
  {
    id: 'pastel',
    name: 'Pastel doux',
    origin: 'Tendance',
    tags: ['clair'],
    tokens: base({ accent: '#5fa889', background: '#fdf5ee', surface: '#ffffff', text: '#3b3540', muted: '#8a8190', bar: '#ffffff', onBar: '#3b3540', borderWidth: 0, radius: 18, cardRadius: 22, shadow: 'portee', font: 'arrondie', headingFont: 'arrondie' }),
  },
  {
    id: 'chrome',
    name: 'Chrome et métal',
    origin: 'Tendance',
    tags: ['sombre', 'graphique'],
    tokens: base({ dark: true, accent: '#d9dde2', onAccent: '#16181c', background: 'linear-gradient(#1c1e23, #0d0e11)', surface: '#22252b', text: '#e9ebee', muted: '#a0a5ad', bar: '#16181c', onBar: '#e9ebee', border: '#5b616a', radius: 12, cardRadius: 16, shadow: 'portee', depth: 2, headingFont: 'geometrique' }),
  },
  {
    id: 'y2k',
    name: 'Y2K brillant',
    origin: 'Tendance',
    tags: ['clair', 'graphique'],
    tokens: base({ accent: '#d92cc0', background: 'linear-gradient(180deg, #d4ecff, #f6d4ff)', surface: 'rgba(255, 255, 255, 0.85)', text: '#1d2b5a', muted: '#5571a8', bar: '#1d2b5a', onBar: '#ffffff', border: '#8bb8ea', radius: 14, cardRadius: 16, shadow: 'verre' }),
  },
  {
    id: 'nature',
    name: 'Nature',
    origin: 'Tendance',
    tags: ['clair'],
    tokens: base({ accent: '#4f7a4a', background: '#eef1e7', surface: '#ffffff', text: '#26331f', muted: '#6d7b62', bar: '#26331f', onBar: '#eef1e7', borderWidth: 0, radius: 18, cardRadius: 24, shadow: 'douce', depth: 2, headingFont: 'editoriale' }),
  },
  {
    id: 'terminal',
    name: 'Terminal rétro',
    origin: 'Tendance',
    tags: ['sombre', 'pro'],
    tokens: base({ dark: true, accent: '#6cff8f', onAccent: '#0a0e0a', background: '#0a0e0a', surface: '#0f170f', text: '#6cff8f', muted: '#3a9f55', bar: '#0f170f', onBar: '#6cff8f', border: '#1f3b24', radius: 0, cardRadius: 0, shadow: 'aucune', font: 'mono', headingFont: 'mono' }),
  },
  {
    id: 'carnet',
    name: 'Carnet papier',
    origin: 'Tendance',
    tags: ['clair', 'relief'],
    tokens: base({ accent: '#b5482c', background: 'repeating-linear-gradient(#f7f1e3 0 27px, #e6dcc4 27px 28px)', surface: '#fffaf0', text: '#3a2e1f', muted: '#8a7656', bar: '#3a2e1f', onBar: '#fffaf0', border: '#c9b994', radius: 4, cardRadius: 4, shadow: 'douce', font: 'serif', headingFont: 'editoriale' }),
  },
  {
    id: 'pro-sobre',
    name: 'Pro sobre',
    origin: 'Tendance',
    tags: ['clair', 'pro'],
    tokens: base({ accent: '#1a56db', background: '#f5f6fa', surface: '#ffffff', text: '#141a2a', muted: '#5d667a', bar: '#ffffff', onBar: '#141a2a', border: '#e3e6ee', radius: 8, cardRadius: 12, shadow: 'douce' }),
  },
  {
    id: 'spatial',
    name: 'Spatial',
    origin: 'Tendance',
    tags: ['verre'],
    tokens: base({ dark: true, accent: 'rgba(255, 255, 255, 0.92)', onAccent: '#24303c', background: 'radial-gradient(ellipse at 50% 0, #c9d6e2, #6d7f8f 70%)', surface: 'rgba(255, 255, 255, 0.2)', text: '#ffffff', muted: 'rgba(255, 255, 255, 0.82)', bar: 'rgba(255, 255, 255, 0.16)', onBar: '#ffffff', border: 'rgba(255, 255, 255, 0.3)', radius: 999, cardRadius: 32, shadow: 'portee', depth: 2, blur: 24 }),
  },
  {
    id: 'dessin',
    name: 'Dessiné à la main',
    origin: 'Tendance',
    tags: ['clair', 'graphique'],
    tokens: base({ accent: '#ffe066', onAccent: '#222222', background: '#fffdf7', surface: '#fffdf7', text: '#222222', muted: '#555555', bar: '#fffdf7', onBar: '#222222', border: '#222222', borderWidth: 2, radius: 12, cardRadius: 14, shadow: 'decalee', depth: 1, font: 'manuscrite', headingFont: 'manuscrite' }),
  },
  {
    id: 'collage',
    name: 'Collage et stickers',
    origin: 'Tendance',
    tags: ['clair', 'graphique'],
    tokens: base({ accent: '#ff6b4a', background: '#e9e1d3', surface: '#fffef9', text: '#2b2620', muted: '#6e6252', bar: '#2b2620', onBar: '#fffef9', borderWidth: 0, radius: 6, cardRadius: 4, shadow: 'decalee', depth: 1, headingFont: 'manuscrite' }),
  },
]

export const STYLE_IDS = STYLE_PRESETS.map((s) => s.id)

export const stylePreset = (id: string | undefined): StylePreset | undefined => STYLE_PRESETS.find((s) => s.id === id)

/**
 * Réglages effectifs du thème : ceux du style choisi, puis l'ancien thème (couleur, arrondi,
 * police), puis les réglages changés à la main. Sans style, seuls les réglages donnés comptent.
 */
export function resolveTokens(theme: ProjectTheme | undefined): Partial<StyleTokens> {
  if (!theme) return {}
  const out: Partial<StyleTokens> = { ...stylePreset(theme.style)?.tokens }
  if (theme.primary) out.accent = theme.primary
  if (typeof theme.radius === 'number') out.radius = theme.radius
  if (theme.font) out.font = theme.font
  for (const [k, v] of Object.entries(theme.tokens ?? {})) if (v !== undefined) (out as Record<string, unknown>)[k] = v
  return out
}

/* --------------------------- Briques qui suivent le style --------------------------- */

/** Réglages de style qui masquent le thème : on les retire pour que la brique suive le style. */
const THEMED_KEYS: (keyof BrickStyle)[] = ['background', 'color', 'borderColor', 'borderWidth', 'shadow', 'borderRadius']
const KEEP_RADIUS = new Set(['image', 'video'])

function stripStyle<T extends Partial<BrickStyle>>(type: string, style: T): T {
  const next = { ...style }
  for (const k of THEMED_KEYS) {
    if (k === 'borderRadius' && KEEP_RADIUS.has(type)) continue
    delete next[k]
  }
  return next
}

/** Fait suivre le style à toutes les briques : leurs couleurs, bordures, ombres et arrondis propres sont retirés. */
export function adoptStyle(nodes: Record<string, BrickNode>): Record<string, BrickNode> {
  const out: Record<string, BrickNode> = {}
  for (const [id, n] of Object.entries(nodes)) {
    const responsive = n.responsive
      ? (Object.fromEntries(Object.entries(n.responsive).map(([k, o]) => [k, o && stripStyle<StyleOverride>(n.type, o)])) as BrickNode['responsive'])
      : undefined
    out[id] = { ...n, style: stripStyle(n.type, n.style), ...(responsive ? { responsive } : {}) }
  }
  return out
}
