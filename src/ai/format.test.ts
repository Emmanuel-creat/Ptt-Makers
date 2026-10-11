import { describe, expect, it } from 'vitest'
import { generate } from '../codegen/generate'
import { buildApp, TEMPLATES } from '../model/templates'
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

  it('garde les événements (survol, saisie, touche) et la minuterie d’une page', () => {
    const before = buildApp(
      'Evenements',
      [
        {
          name: 'Accueil',
          onTimer: [{ type: 'add', variable: 'n', amount: 1 }],
          timerMs: 2000,
          children: [
            { type: 'input', props: { bind: 't', eventKey: 'Escape' }, on: { onKey: [{ type: 'set', variable: 't', value: '' }], onChange: [{ type: 'alert', message: 'ok' }] } },
            { type: 'button', on: { onHover: [{ type: 'add', variable: 'n', amount: 2 }] } },
          ],
        },
      ],
      [
        { name: 't', kind: 'text', initial: '' },
        { name: 'n', kind: 'number', initial: 0 },
      ],
    )
    const ai = JSON.parse(JSON.stringify(projectToAi(before))) as AiProject
    expect(ai.pages[0].timerMs).toBe(2000)
    expect(ai.bricks[0].events?.map((e) => [e.on, e.key])).toEqual([
      ['changement', ''],
      ['touche', 'Escape'],
    ])
    const after = aiToProject(ai)
    expect(generate(after).js).toBe(generate(before).js)
  })

  it('garde la méthode, les en-têtes et le corps d’un appel d’API, et les conditions et/ou', () => {
    const before = buildApp(
      'Api',
      [
        {
          name: 'Accueil',
          children: [
            {
              type: 'button',
              onClick: [
                { type: 'fetch', method: 'PUT', url: 'https://api.exemple.fr/x', variable: '', path: '', headers: 'Authorization: Bearer {{t}}', body: 'nom: {{t}}' },
                { type: 'if', variable: 'n', op: 'gt', value: '{{m}}', join: 'or', more: [{ variable: 't', op: 'empty', value: '' }], then: [{ type: 'alert', message: 'a' }], else: [] },
              ],
            },
          ],
        },
      ],
      [
        { name: 't', kind: 'text', initial: '' },
        { name: 'n', kind: 'number', initial: 0 },
        { name: 'm', kind: 'number', initial: 1 },
      ],
    )
    const after = aiToProject(JSON.parse(JSON.stringify(projectToAi(before))) as AiProject)
    expect(Object.values(after.nodes).find((n) => n.type === 'button')!.onClick).toEqual(Object.values(before.nodes).find((n) => n.type === 'button')!.onClick)
    expect(generate(after).js).toBe(generate(before).js)
  })

  it('garde les fonctions réutilisables et leurs appels', () => {
    const before = buildApp(
      'Fonctions',
      [{ name: 'Accueil', children: [{ type: 'button', ref: 'b', onClick: [{ type: 'call', name: 'cacher' }] }, { type: 'text', ref: 'msg' }] }],
      [],
      [{ name: 'cacher', actions: [{ type: 'hide', target: '@msg' }] }],
    )
    expect(before.functions?.[0].actions).toEqual([{ type: 'hide', target: 'texte-1' }])
    const after = aiToProject(JSON.parse(JSON.stringify(projectToAi(before))) as AiProject)
    expect(after.functions).toEqual(before.functions)
    expect(generate(after).js).toBe(generate(before).js)
  })

  const NO_PLACE = { col: 0, row: 0, w: 0, h: 0 }

  it('construit un projet à partir d’une réponse, en ignorant ce qui est invalide', () => {
    const ai: AiProject = {
      name: 'Quiz',
      summary: 'Un quiz.',
      theme: { style: '', primary: '#e11d48', radius: 6, font: 'arrondie' },
      variables: [
        { name: 'score', kind: 'number', initial: '0' },
        { name: 'mauvais nom', kind: 'text', initial: '' },
        { name: 'reponses', kind: 'list', initial: 'A\nB\n' },
      ],
      pages: [
        { ref: 'accueil', name: 'Accueil', title: 'Quiz', style: [{ key: 'gap', value: '20' }], onLoad: [], layout: 'pile' },
        { ref: 'fin', name: 'Fin', title: '', style: [], onLoad: [], layout: 'grille' },
      ],
      bricks: [
        { ref: 'carte', parent: 'accueil', type: 'card', name: 'Question', props: [], style: [{ key: 'padding', value: '24px' }], hidden: false, showIf: '', onClick: [], place: NO_PLACE },
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
          place: NO_PLACE,
        },
        { ref: 'perdu', parent: 'nulle-part', type: 'text', name: '', props: [{ key: 'text', value: 'Score : {{score}}' }], style: [], hidden: false, showIf: '', onClick: [], place: { col: 2, row: 1, w: 3, h: 1 } },
        { ref: 'bravo', parent: 'fin', type: 'heading', name: '', props: [{ key: 'text', value: 'Bravo' }], style: [], hidden: false, showIf: '', onClick: [], place: { col: 3, row: 2, w: 20, h: 2 } },
        { ref: 'retour', parent: 'fin', type: 'button', name: '', props: [], style: [], hidden: false, showIf: '', onClick: [], place: NO_PLACE },
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
    // Une case donnée sur une page en pile est ignorée.
    expect(Object.values(p.nodes).some((n) => n.parent === 'page' && n.place)).toBe(false)
    // Page en grille : la case est ramenée dans les 12 colonnes, et une brique sans case est posée dessous.
    const fin = p.nodes[p.pages[1]]
    expect(fin.props.layout).toBe('grille')
    const [bravo, retour] = fin.children.map((id) => p.nodes[id])
    expect(bravo.place).toEqual({ col: 1, row: 2, w: 12, h: 2 })
    expect(retour.place).toEqual({ col: 1, row: 4, w: 3, h: 1 })
    expect(projectToAi(p).pages[1].layout).toBe('grille')
    expect(() => new Function(generate(p).js)).not.toThrow()
  })

  it('garde le style choisi par l’IA et ignore un style inconnu', () => {
    const base: AiProject = { name: 'X', summary: '', theme: { style: 'nuit-jaune', primary: '', radius: 0, font: '' }, variables: [], pages: [], bricks: [] }
    const p = aiToProject(base)
    expect(p.theme).toEqual({ style: 'nuit-jaune' })
    expect(projectToAi(p).theme.style).toBe('nuit-jaune')
    expect(aiToProject({ ...base, theme: { style: 'inconnu', primary: '', radius: 0, font: 'grotesque' } }).theme).toEqual({ font: 'grotesque' })
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
