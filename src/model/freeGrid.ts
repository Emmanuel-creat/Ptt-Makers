import type { BrickNode, BrickType, GridPlace } from './types'

type Nodes = Record<string, BrickNode>

/**
 * Placement libre : une page « en grille » range ses briques sur 12 colonnes et des rangées de 40 px.
 * Chaque brique posée garde sa case (colonne, rangée) et sa taille (en colonnes et en rangées).
 */
export const GRID_COLUMNS = 12
export const GRID_ROW = 40

/** La brique range-t-elle ses enfants sur la grille de placement libre ? */
export const isFreeGrid = (node: BrickNode | undefined | null): boolean => node?.type === 'page' && node.props.layout === 'grille'

const SIZES: Partial<Record<BrickType, { w: number; h: number }>> = {
  navbar: { w: 12, h: 2 },
  section: { w: 12, h: 4 },
  row: { w: 12, h: 2 },
  stack: { w: 6, h: 4 },
  grid: { w: 12, h: 4 },
  card: { w: 4, h: 5 },
  repeat: { w: 12, h: 4 },
  tabs: { w: 12, h: 5 },
  accordion: { w: 12, h: 4 },
  modal: { w: 6, h: 4 },
  heading: { w: 8, h: 2 },
  text: { w: 6, h: 2 },
  link: { w: 3, h: 1 },
  badge: { w: 2, h: 1 },
  list: { w: 6, h: 3 },
  button: { w: 3, h: 1 },
  input: { w: 4, h: 2 },
  textarea: { w: 6, h: 3 },
  checkbox: { w: 4, h: 1 },
  select: { w: 4, h: 2 },
  image: { w: 4, h: 5 },
  video: { w: 6, h: 6 },
  icon: { w: 1, h: 1 },
  divider: { w: 12, h: 1 },
  spacer: { w: 12, h: 1 },
  table: { w: 12, h: 6 },
  chart: { w: 6, h: 7 },
  calendar: { w: 8, h: 11 },
  kanban: { w: 12, h: 7 },
  chat: { w: 6, h: 9 },
  tabbar: { w: 12, h: 2 },
  stat: { w: 3, h: 3 },
  progress: { w: 6, h: 2 },
}

/** Taille de départ d'une brique posée sur la grille. */
export const defaultSize = (type: BrickType) => SIZES[type] ?? { w: 4, h: 2 }

const int = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback)

/** Ramène une position dans la grille (taille d'au moins une case, jamais au-delà de la 12e colonne). */
export function clampPlace(p: Partial<GridPlace>, fallback: GridPlace = { col: 1, row: 1, w: 4, h: 2 }): GridPlace {
  const w = Math.max(1, Math.min(GRID_COLUMNS, int(p.w, fallback.w)))
  const h = Math.max(1, Math.min(60, int(p.h, fallback.h)))
  const col = Math.max(1, Math.min(GRID_COLUMNS - w + 1, int(p.col, fallback.col)))
  const row = Math.max(1, Math.min(500, int(p.row, fallback.row)))
  return { col, row, w, h }
}

/** Première rangée libre sous toutes les briques déjà posées. */
export function nextFreeRow(nodes: Nodes, parentId: string, except?: string): number {
  let row = 1
  for (const c of nodes[parentId]?.children ?? []) {
    const p = nodes[c]?.place
    if (p && c !== except) row = Math.max(row, p.row + p.h)
  }
  return row
}

const samePlace = (a: GridPlace, b: GridPlace) => a.col === b.col && a.row === b.row && a.w === b.w && a.h === b.h

/**
 * Garde les positions cohérentes après chaque modification :
 * - une brique posée sur une page en grille reçoit une case si elle n'en a pas (sous les autres) ;
 * - une brique sortie de la grille perd sa case ;
 * - deux briques posées exactement au même endroit (copie, collage) sont séparées ;
 * - l'ordre des enfants suit la grille (de haut en bas, puis de gauche à droite), ce qui donne
 *   aussi le bon ordre sur mobile, où les briques s'empilent.
 */
export function fixPlacements(nodes: Nodes): Nodes {
  let out = nodes
  const write = (n: BrickNode) => {
    if (out === nodes) out = { ...nodes }
    out[n.id] = n
  }
  for (const node of Object.values(nodes)) {
    if (node.place && !isFreeGrid(node.parent ? nodes[node.parent] : null)) {
      const { place: _place, ...rest } = node
      write(rest)
    }
  }
  for (const parent of Object.values(nodes)) {
    if (!isFreeGrid(parent)) continue
    const seen: GridPlace[] = []
    for (const c of parent.children) {
      const child = out[c]
      if (!child) continue
      let place = child.place ? clampPlace(child.place) : null
      if (!place || seen.some((s) => samePlace(s, place!))) {
        const size = place ?? defaultSize(child.type)
        const row = Math.max(nextFreeRow(out, parent.id, c), ...seen.map((s) => s.row + s.h))
        place = clampPlace({ col: place?.col ?? 1, row, w: size.w, h: size.h })
      }
      if (!child.place || !samePlace(child.place, place)) write({ ...child, place })
      seen.push(place)
    }
    const sorted = [...parent.children].sort((a, b) => {
      const pa = out[a]?.place
      const pb = out[b]?.place
      if (!pa || !pb) return 0
      return pa.row - pb.row || pa.col - pb.col
    })
    if (sorted.some((id, i) => id !== parent.children[i])) write({ ...out[parent.id], children: sorted })
  }
  return out
}

/**
 * Passe une page en grille (ou la remet en pile). Les briques déjà présentes sont posées
 * les unes sous les autres, sur toute la largeur, avec la hauteur mesurée si on la connaît.
 */
export function setFreeGrid(nodes: Nodes, pageId: string, on: boolean, measuredRows?: Record<string, number>): Nodes {
  const page = nodes[pageId]
  if (!page || isFreeGrid(page) === on) return nodes
  const props = { ...page.props }
  if (on) props.layout = 'grille'
  else delete props.layout
  const next: Nodes = { ...nodes, [pageId]: { ...page, props } }
  if (on) {
    let row = 1
    for (const c of page.children) {
      const child = next[c]
      if (!child) continue
      const h = Math.max(1, measuredRows?.[c] ?? defaultSize(child.type).h)
      next[c] = { ...child, place: { col: 1, row, w: GRID_COLUMNS, h } }
      row += h
    }
  }
  return fixPlacements(next)
}

/** Déclarations CSS qui posent une brique dans sa case. */
export function placeEntries(place: GridPlace | undefined): [string, string][] {
  if (!place) return []
  const p = clampPlace(place)
  return [
    ['grid-column', `${p.col} / span ${p.w}`],
    ['grid-row', `${p.row} / span ${p.h}`],
  ]
}
