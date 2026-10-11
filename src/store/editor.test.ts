import { beforeEach, describe, expect, it } from 'vitest'
import { buildProject } from '../model/templates'
import { useEditor } from './editor'
import { listProjects } from './library'

const reset = () =>
  useEditor.setState({ project: buildProject('Test', {}, []), currentPage: 'page', past: [], future: [], selectedId: null, clipboard: null, lastEdit: null })

describe('éditeur', () => {
  beforeEach(reset)

  it('ajoute dans la brique sélectionnée et sélectionne la nouvelle', () => {
    const { addBrick, addBrickNearSelection } = useEditor.getState()
    const card = addBrick('card')
    const btn = addBrickNearSelection('button')
    const { project, selectedId } = useEditor.getState()
    expect(project.nodes[card].children).toEqual([btn])
    expect(selectedId).toBe(btn)
  })

  it('regroupe les frappes successives dans une seule étape d’annulation', () => {
    const { addBrick, updateProps, undo } = useEditor.getState()
    const id = addBrick('heading')
    updateProps(id, { text: 'B' })
    updateProps(id, { text: 'Bo' })
    updateProps(id, { text: 'Bon' })
    expect(useEditor.getState().past).toHaveLength(2)
    undo()
    expect(useEditor.getState().project.nodes[id].props.text).toBe('Un titre accrocheur')
    undo()
    expect(useEditor.getState().project.nodes[id]).toBeUndefined()
    useEditor.getState().redo()
    expect(useEditor.getState().project.nodes[id]).toBeDefined()
  })

  it('copie et colle un sous-arbre avec de nouveaux identifiants', () => {
    const { addBrick, addBrickNearSelection, copy, paste, select } = useEditor.getState()
    const card = addBrick('card')
    addBrickNearSelection('text')
    copy(card)
    select(null)
    paste()
    const { project, selectedId } = useEditor.getState()
    expect(selectedId).toBe('carte-2')
    expect(project.nodes['carte-2'].children).toEqual(['texte-2'])
    expect(project.nodes.page.children).toEqual(['carte-1', 'carte-2'])
  })

  it('renommer une variable met à jour ses utilisations', () => {
    const { addVariable, addBrick, updateProps, updateVariable } = useEditor.getState()
    addVariable({ name: 'a', kind: 'number', initial: 1 })
    const t = addBrick('text')
    updateProps(t, { text: 'Valeur : {{a}}' })
    updateVariable('a', { name: 'score' })
    const { project } = useEditor.getState()
    expect(project.variables[0].name).toBe('score')
    expect(project.nodes[t].props.text).toBe('Valeur : {{score}}')
  })

  it('ne supprime jamais la page', () => {
    useEditor.getState().remove('page')
    expect(useEditor.getState().project.nodes.page).toBeDefined()
  })

  it('gère plusieurs pages : ajout, ajout de briques, accueil, suppression et annulation', () => {
    const { addPage, addBrick, setHomePage, removePage, undo } = useEditor.getState()
    const p2 = addPage('Contact')
    expect(useEditor.getState().currentPage).toBe(p2)
    const btn = addBrick('button')
    expect(useEditor.getState().project.nodes[p2].children).toEqual([btn])
    expect(useEditor.getState().project.pages).toEqual(['page', p2])

    setHomePage(p2)
    expect(useEditor.getState().project.rootId).toBe(p2)
    expect(useEditor.getState().project.pages[0]).toBe(p2)

    removePage(p2)
    let s = useEditor.getState()
    expect(s.project.pages).toEqual(['page'])
    expect(s.project.rootId).toBe('page')
    expect(s.project.nodes[btn]).toBeUndefined()
    expect(s.currentPage).toBe('page')

    undo()
    s = useEditor.getState()
    expect(s.project.pages).toEqual([p2, 'page'])
    expect(s.project.nodes[btn]).toBeDefined()
  })

  it('sélectionner une brique d’une autre page affiche cette page', () => {
    const { addPage, addBrick, setPage, select } = useEditor.getState()
    const p2 = addPage()
    const t = addBrick('heading')
    setPage('page')
    select(t)
    expect(useEditor.getState().currentPage).toBe(p2)
  })

  it('renomme une variable jusque dans les conditions', () => {
    const { addVariable, addBrick, setActions, updateVariable } = useEditor.getState()
    addVariable({ name: 'score', kind: 'number', initial: 0 })
    const b = addBrick('button')
    setActions(b, [
      { type: 'if', variable: 'score', op: 'gt', value: '3', then: [{ type: 'alert', message: 'Score {{score}}' }], else: [] },
    ])
    updateVariable('score', { name: 'points' })
    const a = useEditor.getState().project.nodes[b].onClick[0]
    expect(a.type === 'if' && a.variable).toBe('points')
    expect(a.type === 'if' && a.then[0].type === 'alert' && a.then[0].message).toBe('Score {{points}}')
  })
})

describe('style par format, composants et projets', () => {
  beforeEach(reset)

  it('garde un style propre au mobile et le retire quand il est vide', () => {
    const { addBrick, updateStyle } = useEditor.getState()
    const id = addBrick('heading')
    updateStyle(id, { fontSize: 20 }, 'mobile')
    updateStyle(id, { hide: true }, 'tablet')
    let node = useEditor.getState().project.nodes[id]
    expect(node.responsive).toEqual({ mobile: { fontSize: 20 }, tablet: { hide: true } })
    expect(node.style.fontSize).not.toBe(20)
    updateStyle(id, { fontSize: undefined }, 'mobile')
    updateStyle(id, { hide: false }, 'tablet')
    node = useEditor.getState().project.nodes[id]
    expect(node.responsive).toBeUndefined()
  })

  it('enregistre un bloc dans Mes composants et l’insère avec de nouveaux identifiants', () => {
    const { addBrick, addBrickNearSelection, saveComponent, select } = useEditor.getState()
    const card = addBrick('card')
    addBrickNearSelection('text')
    saveComponent(card, 'Carte prix')
    const [component] = useEditor.getState().project.components ?? []
    expect(component.name).toBe('Carte prix')
    expect(Object.keys(component.nodes)).toHaveLength(2)

    select(null)
    useEditor.getState().insertComponent(component.id)
    const { project, selectedId } = useEditor.getState()
    expect(selectedId).not.toBe(card)
    expect(project.nodes[selectedId!].name).toBe('Carte prix')
    expect(project.nodes[selectedId!].children).toHaveLength(1)
    expect(project.nodes.page.children).toEqual([card, selectedId])

    useEditor.getState().removeComponent(component.id)
    expect(useEditor.getState().project.components).toEqual([])
  })

  it('crée, ouvre et supprime des projets enregistrés dans le navigateur', () => {
    const first = useEditor.getState().projectId
    useEditor.getState().renameProject('Premier')
    useEditor.getState().createProject(buildProject('Second', {}, []))
    const second = useEditor.getState().projectId
    expect(second).not.toBe(first)
    expect(useEditor.getState().project.name).toBe('Second')
    expect(listProjects().map((m) => m.name)).toEqual(expect.arrayContaining(['Premier', 'Second']))

    useEditor.getState().openProject(first)
    expect(useEditor.getState().project.name).toBe('Premier')
    expect(useEditor.getState().past).toEqual([])

    useEditor.getState().deleteProject(first)
    expect(useEditor.getState().projectId).toBe(second)
    expect(listProjects().map((m) => m.id)).not.toContain(first)
  })
})
