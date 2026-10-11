import { describe, expect, it } from 'vitest'
import { arrangePlaces } from './arrange'

const places = {
  a: { col: 2, row: 1, w: 2, h: 1 },
  b: { col: 5, row: 3, w: 4, h: 2 },
  c: { col: 10, row: 6, w: 2, h: 1 },
}

describe('aligner et répartir une sélection sur la grille', () => {
  it('aligne les bords et les centres', () => {
    expect(Object.values(arrangePlaces(places, 'left')).map((p) => p.col)).toEqual([2, 2, 2])
    expect(Object.values(arrangePlaces(places, 'right')).map((p) => p.col + p.w - 1)).toEqual([11, 11, 11])
    expect(Object.values(arrangePlaces(places, 'top')).map((p) => p.row)).toEqual([1, 1, 1])
    expect(Object.values(arrangePlaces(places, 'bottom')).map((p) => p.row + p.h - 1)).toEqual([6, 6, 6])
    // Centre de la sélection : colonnes 2 à 11 ; une brique de 4 colonnes va de 5 à 8.
    expect(arrangePlaces(places, 'centerH').b.col).toBe(5)
  })

  it('répartit avec le même écart, sans sortir de la grille', () => {
    const out = arrangePlaces(places, 'distributeH')
    // De 2 à 11 : 10 colonnes, 8 occupées, donc un écart d'une colonne.
    expect([out.a.col, out.b.col, out.c.col]).toEqual([2, 5, 10])
    const tight = arrangePlaces({ a: { col: 1, row: 1, w: 6, h: 1 }, b: { col: 2, row: 1, w: 6, h: 1 }, c: { col: 3, row: 1, w: 6, h: 1 } }, 'distributeH')
    expect(Object.values(tight).every((p) => p.col >= 1 && p.col + p.w - 1 <= 12)).toBe(true)
    expect(arrangePlaces(places, 'distributeV').b.row).toBe(3)
  })
})
