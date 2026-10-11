import { GRID_COLUMNS } from './freeGrid'
import type { Align, GridPlace } from './types'

/** Aligner une sélection : bords gauches, centres, bords droits, hauts, milieux ou bas. */
export type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom'
/** Répartir une sélection : le même écart entre chaque brique, en largeur ou en hauteur. */
export type DistributeMode = 'distributeH' | 'distributeV'
export type ArrangeMode = AlignMode | DistributeMode

const clampCol = (col: number, w: number) => Math.max(1, Math.min(GRID_COLUMNS - w + 1, Math.round(col)))
const clampRow = (row: number) => Math.max(1, Math.round(row))

/** Nouvelles cases des briques d'une page en grille, alignées ou réparties. */
export function arrangePlaces(places: Record<string, GridPlace>, mode: ArrangeMode): Record<string, GridPlace> {
  const list = Object.entries(places)
  if (list.length < 2) return places
  const out: Record<string, GridPlace> = {}
  const left = Math.min(...list.map(([, p]) => p.col))
  const right = Math.max(...list.map(([, p]) => p.col + p.w - 1))
  const top = Math.min(...list.map(([, p]) => p.row))
  const bottom = Math.max(...list.map(([, p]) => p.row + p.h - 1))
  if (mode === 'distributeH' || mode === 'distributeV') {
    const horizontal = mode === 'distributeH'
    const start = (p: GridPlace) => (horizontal ? p.col : p.row)
    const size = (p: GridPlace) => (horizontal ? p.w : p.h)
    const sorted = [...list].sort((a, b) => start(a[1]) - start(b[1]))
    const span = (horizontal ? right - left : bottom - top) + 1
    const used = sorted.reduce((n, [, p]) => n + size(p), 0)
    // Les briques se chevauchent déjà toutes : elles se suivent sans écart.
    const gap = sorted.length > 1 ? Math.max(0, (span - used) / (sorted.length - 1)) : 0
    let cursor = horizontal ? left : top
    for (const [id, p] of sorted) {
      out[id] = horizontal ? { ...p, col: clampCol(cursor, p.w) } : { ...p, row: clampRow(cursor) }
      cursor += size(p) + gap
    }
    return out
  }
  for (const [id, p] of list) {
    switch (mode) {
      case 'left':
        out[id] = { ...p, col: left }
        break
      case 'right':
        out[id] = { ...p, col: clampCol(right - p.w + 1, p.w) }
        break
      case 'centerH':
        out[id] = { ...p, col: clampCol((left + right + 1 - p.w) / 2, p.w) }
        break
      case 'top':
        out[id] = { ...p, row: top }
        break
      case 'bottom':
        out[id] = { ...p, row: clampRow(bottom - p.h + 1) }
        break
      case 'centerV':
        out[id] = { ...p, row: clampRow((top + bottom + 1 - p.h) / 2) }
        break
    }
  }
  return out
}

/** Hors grille, aligner revient à donner le même alignement propre à chaque brique dans son conteneur. */
export function alignSelfFor(mode: AlignMode): Align {
  return mode === 'left' || mode === 'top' ? 'start' : mode === 'right' || mode === 'bottom' ? 'end' : 'center'
}
