import { describe, expect, it } from 'vitest'
import { generate } from '../codegen/generate'
import { TEMPLATES } from '../model/templates'
import { aiToProject, brickCatalog, PROJECT_SCHEMA, projectToAi, type AiProject } from './format'

const roundTrip = (id: string) => {
  const p = TEMPLATES.find((t) => t.id === id)!.create()
  return { before: p, after: aiToProject(JSON.parse(JSON.stringify(projectToAi(p))) as AiProject) }
}

describe('format d’échange avec l’IA', () => {
  it.each(TEMPLATES.map((t) => t.id))('le modèle %s fait l’aller-retour sans changer le code', (id) => {
    const { before, after } = roundTrip(id)
    expect(after.pages).toHaveLength(before.pages.length)
    expect(after.variables).toEqual(before.variables)
    expect(generate(after).html).toBe(generate(before).html)
    expect(generate(after).js).toBe(generate(before).js)
  })

  it('construit un projet à partir d’une réponse, en ignorant ce qui est invalide', () => {
    const ai: AiProject = {
      name: 'Quiz',
      summary: 'Un quiz.',
      theme: { primary: '#e11d48', radius: 6, font: 'arrondie' },
      variables: [
        { name: 'score', kind: 'number', initial: '0' },
        { name: 'mauvais nom', kind: 'text', initial: '' },
        { name: 'reponses', kind: 'list', initial: 'A\nB\n' },
      ],
      pages: [
        { ref: 'accueil', name: 'Accueil', title: 'Quiz', style: [{ key: 'gap', value: '20' }], onLoad: [] },
        { ref: 'fin', name: 'Fin', title: '', style: [], onLoad: [] },
      ],
      bricks: [
        { ref: 'carte', parent: 'accueil', type: 'card', name: 'Question', props: [], style: [{ key: 'padding', value: '24px' }], hidden: false, showIf: '', onClick: [] },
        {
          ref: 'ok',
          parent: 'carte',
          type: 'button',
          name: '',
          props: [{ key: 'text', value: 'Bonne réponse' }, { key: 'inconnu', value: 'x' }],
          style: [{ key: 'pasUnStyle', value: '1' }],
          hidden: false,
          showIf: '',
          onClick: [
            { type: 'add', variable: 'score', value: '', amount: 1, target: '', message: '', url: '', page: '', which: '', path: '', op: '', then: [], else: [] },
            { type: 'navigate', variable: '', value: '', amount: 0, target: '', message: '', url: '', page: 'fin', which: '', path: '', op: '', then: [], else: [] },
          ],
        },
        { ref: 'perdu', parent: 'nulle-part', type: 'text', name: '', props: [{ key: 'text', value: 'Score : {{score}}' }], style: [], hidden: false, showIf: '', onClick: [] },
      ],
    }
    const p = aiToProject(ai)
    expect(p.variables.map((v) => v.name)).toEqual(['score', 'reponses'])
    expect(p.variables[1].initial).toEqual(['A', 'B'])
    expect(p.theme).toEqual({ primary: '#e11d48', radius: 6, font: 'arrondie' })
    expect(p.nodes.page.style.gap).toBe(20)
    const card = Object.values(p.nodes).find((n) => n.type === 'card')!
    expect(card.style.padding).toBe(24)
    const btn = p.nodes[card.children[0]]
    expect(btn.props.text).toBe('Bonne réponse')
    expect(btn.props.inconnu).toBeUndefined()
    expect(btn.onClick).toEqual([
      { type: 'add', variable: 'score', amount: 1 },
      { type: 'navigate', page: p.pages[1] },
    ])
    // Parent inconnu : la brique va sur la première page.
    expect(p.nodes.page.children).toHaveLength(2)
    expect(() => new Function(generate(p).js)).not.toThrow()
  })

  it('le schéma n’est pas récursif et tous les objets sont fermés', () => {
    const walk = (s: unknown): void => {
      if (!s || typeof s !== 'object') return
      const o = s as Record<string, unknown>
      expect(o.$ref).toBeUndefined()
      if (o.type === 'object') {
        expect(o.additionalProperties).toBe(false)
        expect(o.required).toEqual(Object.keys(o.properties as object))
      }
      Object.values(o).forEach(walk)
    }
    walk(PROJECT_SCHEMA)
    expect(brickCatalog()).toContain('- tabs (conteneur)')
  })
})
