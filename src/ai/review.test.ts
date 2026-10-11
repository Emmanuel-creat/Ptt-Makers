import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '../model/templates'
import type { Project } from '../model/types'
import { aiToProject, projectToAi, type AiProject } from './format'
import { changeCount, diffProjects, graftBrick } from './review'

const project = (id: string) => TEMPLATES.find((t) => t.id === id)!.create()

/** Ce que renverrait l'assistant après la retouche `edit`. */
function propose(p: Project, edit: (ai: AiProject) => void) {
  const ai = projectToAi(p)
  edit(ai)
  const refs = new Map<string, string>()
  return { after: aiToProject(ai, refs), refs }
}

const firstOf = (p: Project, type: string) => Object.values(p.nodes).find((n) => n.type === type)!

describe('relecture des changements de l’assistant', () => {
  it('un aller-retour sans modification ne montre aucun changement, pour tous les modèles', () => {
    for (const t of TEMPLATES) {
      const p = t.create()
      const { after, refs } = propose(p, () => {})
      expect(changeCount(diffProjects(p, after, refs)), t.id).toBe(0)
    }
  })

  it('liste les briques ajoutées, retirées et modifiées', () => {
    const p = project('compteur')
    const button = firstOf(p, 'button')
    const text = firstOf(p, 'text')
    const { after, refs } = propose(p, (ai) => {
      const b = ai.bricks.find((x) => x.ref === button.id)!
      b.props = b.props.map((kv) => (kv.key === 'text' ? { ...kv, value: 'Encore !' } : kv))
      ai.bricks = ai.bricks.filter((x) => x.ref !== text.id)
      ai.bricks.push({ ...b, ref: 'nouveau', name: 'Remise à zéro', onClick: [] })
      ai.variables.push({ name: 'record', kind: 'number', initial: '0', persist: false })
    })
    const c = diffProjects(p, after, refs)
    expect(c.changed).toContain(`Bouton « ${button.name} »`)
    expect(c.removed.length).toBeGreaterThanOrEqual(1)
    expect(c.added).toEqual(expect.arrayContaining(['Bouton « Remise à zéro »', 'Variable record']))
  })
})

describe('retouche ciblée', () => {
  it('ne garde que la brique visée et laisse le reste du projet intact', () => {
    const p = project('compteur')
    const button = firstOf(p, 'button')
    const text = firstOf(p, 'text')
    const { after, refs } = propose(p, (ai) => {
      for (const b of ai.bricks) b.props = b.props.map((kv) => (kv.key === 'text' ? { ...kv, value: 'Changé' } : kv))
    })
    const out = graftBrick(p, after, refs, button.id)!
    expect(out.nodes[button.id].props.text).toBe('Changé')
    expect(out.nodes[text.id]).toEqual(p.nodes[text.id])
    expect(out.nodes[button.parent!].children).toEqual(p.nodes[button.parent!].children)
    // Les actions du bouton visent toujours les mêmes briques et variables.
    expect(out.nodes[button.id].onClick).toEqual(p.nodes[button.id].onClick)
  })

  it('les briques ajoutées dans un conteneur reçoivent des identifiants libres', () => {
    const p = project('accueil')
    const box = Object.values(p.nodes).find((n) => n.parent && n.children.length && n.type !== 'page')!
    const { after, refs } = propose(p, (ai) => {
      const child = ai.bricks.find((b) => b.parent === box.id)!
      ai.bricks.push({ ...child, ref: 'ajout', name: 'Ajout' })
    })
    const out = graftBrick(p, after, refs, box.id)!
    const kids = out.nodes[box.id].children
    expect(kids).toHaveLength(box.children.length + 1)
    expect(new Set(Object.keys(out.nodes)).size).toBe(Object.keys(p.nodes).length + 1)
    const added = out.nodes[kids[kids.length - 1]]
    expect(added.name).toBe('Ajout')
    expect(added.parent).toBe(box.id)
    expect(p.nodes[added.id]).toBeUndefined()
  })

  it('renvoie null si la brique a disparu de la proposition', () => {
    const p = project('compteur')
    const button = firstOf(p, 'button')
    const { after, refs } = propose(p, (ai) => {
      ai.bricks = ai.bricks.filter((b) => b.ref !== button.id)
    })
    expect(graftBrick(p, after, refs, button.id)).toBeNull()
  })
})
