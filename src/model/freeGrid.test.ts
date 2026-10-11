import { describe, expect, it } from 'vitest'
import { generate } from '../codegen/generate'
import { clampPlace, fixPlacements, setFreeGrid } from './freeGrid'
import { buildApp } from './templates'

const app = () =>
  buildApp('Grille', [
    {
      name: 'Accueil',
      children: [
        { type: 'button', ref: 'menu', props: { text: 'Menu' } },
        { type: 'heading', ref: 'titre', props: { text: 'Bienvenue' } },
        { type: 'card', ref: 'carte', children: [{ type: 'text', props: { text: 'Dans la carte' } }] },
      ],
    },
  ])

describe('placement libre sur une grille', () => {
  it('ramène une case dans les 12 colonnes', () => {
    expect(clampPlace({ col: 11, row: 0, w: 4, h: 0 })).toEqual({ col: 9, row: 1, w: 4, h: 1 })
    expect(clampPlace({ col: 3, row: 2, w: 40, h: 2 })).toEqual({ col: 1, row: 2, w: 12, h: 2 })
  })

  it('passe une page en grille en gardant l’ordre, puis la remet en pile', () => {
    const p = app()
    const [menu, titre, carte] = p.nodes.page.children
    const grid = setFreeGrid(p.nodes, 'page', true, { [titre]: 3 })
    expect(grid.page.props.layout).toBe('grille')
    expect(grid[menu].place).toEqual({ col: 1, row: 1, w: 12, h: 1 })
    expect(grid[titre].place).toEqual({ col: 1, row: 2, w: 12, h: 3 })
    expect(grid[carte].place).toEqual({ col: 1, row: 5, w: 12, h: 5 })
    // Seuls les enfants directs de la page ont une case.
    expect(grid[grid[carte].children[0]].place).toBeUndefined()

    const back = setFreeGrid(grid, 'page', false)
    expect(back.page.props.layout).toBeUndefined()
    expect(Object.values(back).some((n) => n.place)).toBe(false)
  })

  it('range les enfants de haut en bas puis de gauche à droite, et sépare les copies superposées', () => {
    const p = app()
    let nodes = setFreeGrid(p.nodes, 'page', true)
    const [menu, titre, carte] = nodes.page.children
    // Le titre monte tout en haut à droite, la carte prend exactement la case du menu.
    nodes = { ...nodes, [titre]: { ...nodes[titre], place: { col: 7, row: 1, w: 6, h: 2 } } }
    nodes = { ...nodes, [carte]: { ...nodes[carte], place: { ...nodes[menu].place! } } }
    nodes = fixPlacements(nodes)
    expect(nodes.page.children).toEqual([menu, titre, carte])
    expect(nodes[carte].place!.row).toBeGreaterThan(nodes[menu].place!.row)
  })

  it('le code généré pose chaque brique dans sa case et empile tout sur mobile', () => {
    const p = app()
    const nodes = setFreeGrid(p.nodes, 'page', true)
    const [menu] = nodes.page.children
    nodes[menu] = { ...nodes[menu], place: { col: 1, row: 1, w: 3, h: 1 } }
    const code = generate({ ...p, nodes })
    expect(code.html).toContain('class="page grille"')
    expect(code.css).toContain(`#${menu} {`)
    expect(code.css).toContain('grid-column: 1 / span 3;')
    expect(code.css).toContain('grid-row: 1 / span 1;')
    expect(code.css).toContain('.page.grille > * { grid-column: 1 / -1 !important; grid-row: auto !important; }')
  })
})
