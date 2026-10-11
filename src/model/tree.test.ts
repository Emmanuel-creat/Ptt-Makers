import { describe, expect, it } from 'vitest'
import { buildProject } from './templates'
import { canDrop, cloneSubtree, duplicateNode, makeNode, moveNode, nextId, removeNode, resolveDrop } from './tree'

const sample = () =>
  buildProject('Test', {}, [
    {
      type: 'section',
      children: [{ type: 'heading' }, { type: 'text' }, { type: 'button', ref: 'b', onClick: [{ type: 'toggle', target: '@b' }] }],
    },
    { type: 'card', children: [{ type: 'text' }] },
  ])

describe('identifiants lisibles', () => {
  it('numérote les briques par type', () => {
    const p = sample()
    expect(Object.keys(p.nodes).sort()).toEqual(
      ['bouton-1', 'carte-1', 'page', 'section-1', 'texte-1', 'texte-2', 'titre-1'].sort(),
    )
    expect(nextId(p.nodes, 'text')).toBe('texte-3')
    expect(makeNode(p.nodes, 'button').id).toBe('bouton-2')
  })
})

describe('déplacements', () => {
  it('déplace une brique plus loin dans le même parent', () => {
    const p = sample()
    const spot = resolveDrop(p.nodes, { id: 'bouton-1', position: 'after' })!
    const next = moveNode(p.nodes, 'titre-1', spot.parentId, spot.index)
    expect(next['section-1'].children).toEqual(['texte-1', 'bouton-1', 'titre-1'])
  })

  it('déplace une brique dans un autre conteneur', () => {
    const p = sample()
    const next = moveNode(p.nodes, 'titre-1', 'carte-1', 0)
    expect(next['carte-1'].children).toEqual(['titre-1', 'texte-2'])
    expect(next['titre-1'].parent).toBe('carte-1')
    expect(next['section-1'].children).not.toContain('titre-1')
  })

  it('refuse de déposer un conteneur dans lui-même ou un descendant', () => {
    const p = sample()
    expect(canDrop(p.nodes, 'section-1', { id: 'section-1', position: 'inside' })).toBe(false)
    expect(canDrop(p.nodes, 'section-1', { id: 'titre-1', position: 'after' })).toBe(false)
    expect(canDrop(p.nodes, 'section-1', { id: 'carte-1', position: 'inside' })).toBe(true)
  })

  it('refuse de déposer « dans » une brique qui n’est pas un conteneur', () => {
    const p = sample()
    expect(canDrop(p.nodes, null, { id: 'titre-1', position: 'inside' })).toBe(false)
    expect(canDrop(p.nodes, null, { id: 'page', position: 'before' })).toBe(false)
  })
})

describe('suppression et duplication', () => {
  it('supprime une brique et tout son contenu', () => {
    const p = sample()
    const next = removeNode(p.nodes, 'section-1')
    expect(next['titre-1']).toBeUndefined()
    expect(next['bouton-1']).toBeUndefined()
    expect(next.page.children).toEqual(['carte-1'])
  })

  it('duplique un sous-arbre avec de nouveaux identifiants et redirige les actions internes', () => {
    const p = sample()
    const r = duplicateNode(p.nodes, 'section-1')!
    expect(r.newId).toBe('section-2')
    expect(r.nodes.page.children).toEqual(['section-1', 'section-2', 'carte-1'])
    const copy = r.nodes['section-2']
    expect(copy.children).toEqual(['titre-2', 'texte-3', 'bouton-2'])
    expect(r.nodes['bouton-2'].onClick).toEqual([{ type: 'toggle', target: 'bouton-2' }])
    expect(r.nodes['bouton-1'].onClick).toEqual([{ type: 'toggle', target: 'bouton-1' }])
  })

  it('clone sans modifier la source', () => {
    const p = sample()
    const before = JSON.stringify(p.nodes)
    cloneSubtree(p.nodes, 'carte-1', p.nodes)
    expect(JSON.stringify(p.nodes)).toBe(before)
  })
})
