import { GRID_COLUMNS, GRID_ROW } from '../model/freeGrid'
import type { GridPlace } from '../model/types'

/** Mesure d'une page en grille à l'écran : position et taille de chaque colonne et rangée (en px, coordonnées de la fenêtre). */
export interface GridMetrics {
  cols: { start: number; size: number }[]
  rows: { start: number; size: number }[]
  rowGap: number
  /** Haut de la zone utile de la page. */
  top: number
  /** Bas de la zone utile de la page. */
  bottom: number
}

const tracks = (value: string) =>
  value
    .split(/\s+/)
    .map((t) => parseFloat(t))
    .filter((n) => Number.isFinite(n))

const lay = (start: number, sizes: number[], gap: number) => {
  const out: { start: number; size: number }[] = []
  let at = start
  for (const size of sizes) {
    out.push({ start: at, size })
    at += size + gap
  }
  return out
}

export function measureGrid(page: HTMLElement): GridMetrics {
  const cs = getComputedStyle(page)
  const rect = page.getBoundingClientRect()
  const left = rect.left + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.paddingLeft) || 0)
  const top = rect.top + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.paddingTop) || 0)
  const right = rect.right - (parseFloat(cs.borderRightWidth) || 0) - (parseFloat(cs.paddingRight) || 0)
  const bottom = rect.bottom - (parseFloat(cs.borderBottomWidth) || 0) - (parseFloat(cs.paddingBottom) || 0)
  const colGap = parseFloat(cs.columnGap) || 0
  const rowGap = parseFloat(cs.rowGap) || 0
  let colSizes = tracks(cs.gridTemplateColumns)
  if (colSizes.length !== GRID_COLUMNS) {
    // Navigateur qui ne donne pas les pistes : colonnes égales.
    const size = Math.max(0, (right - left - colGap * (GRID_COLUMNS - 1)) / GRID_COLUMNS)
    colSizes = Array.from({ length: GRID_COLUMNS }, () => size)
  }
  const rowSizes = tracks(cs.gridTemplateRows)
  return { cols: lay(left, colSizes, colGap), rows: lay(top, rowSizes, rowGap), rowGap, top, bottom }
}

/** Début et taille de la rangée n (à partir de 1), même au-delà des rangées déjà utilisées. */
export function rowTrack(m: GridMetrics, n: number): { start: number; size: number } {
  if (n <= m.rows.length) return m.rows[n - 1]
  const last = m.rows[m.rows.length - 1]
  const first = last ? last.start + last.size + m.rowGap : m.top
  return { start: first + (n - m.rows.length - 1) * (GRID_ROW + m.rowGap), size: GRID_ROW }
}

/** Nombre de rangées à dessiner pour couvrir toute la page. */
export function visibleRows(m: GridMetrics): number {
  let n = Math.max(1, m.rows.length)
  while (n < 300) {
    const t = rowTrack(m, n + 1)
    if (t.start + t.size > m.bottom) break
    n++
  }
  return n
}

/** Case sous le pointeur. */
export function cellAt(m: GridMetrics, x: number, y: number): { col: number; row: number } {
  let col = m.cols.length
  for (let i = 0; i < m.cols.length; i++) {
    const c = m.cols[i]
    const next = m.cols[i + 1]
    if (x < (next ? (c.start + c.size + next.start) / 2 : Infinity)) {
      col = i + 1
      break
    }
  }
  let row = 1
  for (let n = 1; n < 1000; n++) {
    const t = rowTrack(m, n)
    if (y < t.start + t.size + m.rowGap / 2) {
      row = n
      break
    }
  }
  return { col: Math.max(1, col), row }
}

/** Rectangle (coordonnées de la fenêtre) d'une case et de sa taille. */
export function placeRect(m: GridMetrics, p: GridPlace) {
  const c0 = m.cols[p.col - 1] ?? m.cols[0]
  const c1 = m.cols[Math.min(m.cols.length, p.col + p.w - 1) - 1] ?? c0
  const r0 = rowTrack(m, p.row)
  const r1 = rowTrack(m, p.row + p.h - 1)
  return { left: c0.start, top: r0.start, width: c1.start + c1.size - c0.start, height: r1.start + r1.size - r0.start }
}
