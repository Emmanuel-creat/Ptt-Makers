import { beforeEach, describe, expect, it } from 'vitest'
import { buildProject } from '../model/templates'
import { useEditor } from './editor'
import { listProjects } from './library'

const reset = () =>
  useEditor.setState({ project: buildProject('Test', {}, []), currentPage: 'page', past: [], future: [], selectedId: null, selection: [], clipboard: null, lastEdit: null })

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

  it('fonctions réutilisables : création, renommage partout, variables suivies, annulation', () => {
    const { addVariable, addBrick, setActions, addFunction, setFunctionActions, renameFunction, updateVariable, undo } = useEditor.getState()
    addVariable({ name: 'score', kind: 'number', initial: 0 })
    expect(addFunction('remise')).toBe(true)
    expect(addFunction('remise')).toBe(false)
    expect(addFunction('deux mots')).toBe(false)
    setFunctionActions('remise', [{ type: 'set', variable: 'score', value: '0' }])
    const b = addBrick('button')
    setActions(b, [{ type: 'call', name: 'remise' }])
    expect(renameFunction('remise', 'zero')).toBe(true)
    updateVariable('score', { name: 'points' })
    const p = useEditor.getState().project
    expect(p.nodes[b].onClick).toEqual([{ type: 'call', name: 'zero' }])
    expect(p.functions).toEqual([{ name: 'zero', actions: [{ type: 'set', variable: 'points', value: '0' }] }])
    undo()
    undo()
    expect(useEditor.getState().project.functions?.[0].name).toBe('remise')
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

describe('page en grille', () => {
  beforeEach(reset)

  it('pose une brique déposée sur la case visée, puis la déplace, la décale et l’agrandit', () => {
    const ed = useEditor.getState()
    ed.setLayout('page', true)
    ed.setDragging({ kind: 'new', type: 'button' })
    ed.drop({ id: 'page', position: 'inside', cell: { col: 11, row: 1 } })
    const id = useEditor.getState().selectedId!
    // Un bouton fait 3 colonnes : posé trop à droite, il est ramené dans la grille.
    expect(useEditor.getState().project.nodes[id].place).toEqual({ col: 10, row: 1, w: 3, h: 1 })

    ed.setDragging({ kind: 'move', id })
    ed.drop({ id: 'page', position: 'inside', cell: { col: 1, row: 4 } })
    expect(useEditor.getState().project.nodes[id].place).toEqual({ col: 1, row: 4, w: 3, h: 1 })

    ed.moveBy(id, -1)
    ed.setPlace(id, { w: 5, h: 2 })
    expect(useEditor.getState().project.nodes[id].place).toEqual({ col: 1, row: 3, w: 5, h: 2 })

    ed.undo()
    ed.undo()
    expect(useEditor.getState().project.nodes[id].place).toEqual({ col: 1, row: 4, w: 3, h: 1 })
  })

  it('une brique sortie de la grille perd sa case, une brique ajoutée au clic se pose dessous', () => {
    const ed = useEditor.getState()
    ed.setLayout('page', true)
    const card = ed.addBrick('card')
    const btn = ed.addBrick('button')
    const nodes = () => useEditor.getState().project.nodes
    expect(nodes()[btn].place).toEqual({ col: 1, row: 6, w: 3, h: 1 })
    ed.move(btn, card, 0)
    expect(nodes()[btn].place).toBeUndefined()
    ed.setLayout('page', false)
    expect(nodes()[card].place).toBeUndefined()
  })
})

describe('studio de style', () => {
  beforeEach(reset)

  it('choisit un style, le règle, puis revient en arrière', () => {
    const ed = () => useEditor.getState()
    ed().updateTheme({ primary: '#ff0000' })
    ed().chooseStyle('neo-sombre')
    expect(ed().project.theme).toEqual({ style: 'neo-sombre' })
    ed().updateTokens({ accent: '#00ff00', blur: 6 })
    expect(ed().project.theme).toEqual({ style: 'neo-sombre', tokens: { accent: '#00ff00', blur: 6 } })
    ed().updateTokens({ accent: undefined, blur: undefined })
    expect(ed().project.theme).toEqual({ style: 'neo-sombre' })
    ed().chooseStyle(null)
    expect(ed().project.theme).toBeUndefined()
    ed().undo()
    expect(ed().project.theme).toEqual({ style: 'neo-sombre' })
  })

  it('adapte toutes les briques au style, et s’annule', () => {
    const ed = () => useEditor.getState()
    const id = ed().addBrick('card')
    ed().updateStyle(id, { background: '#ff0000' })
    ed().adoptStyle()
    expect(ed().project.nodes[id].style.background).toBeUndefined()
    ed().undo()
    expect(ed().project.nodes[id].style.background).toBe('#ff0000')
  })

  it('sélectionne plusieurs briques, les groupe puis les dégroupe', () => {
    const { addBrick, select, toggleSelect } = useEditor.getState()
    const a = addBrick('heading')
    const b = addBrick('text')
    const c = addBrick('button')
    select(a)
    toggleSelect(c)
    toggleSelect(b)
    expect(useEditor.getState().selection).toEqual([a, c, b])
    // La page elle-même ne rejoint pas la sélection.
    toggleSelect('page')
    expect(useEditor.getState().selection).toEqual([])
    select(a)
    toggleSelect(c)
    useEditor.getState().groupSelection()
    const { project, selectedId, selection } = useEditor.getState()
    const group = project.nodes[selectedId!]
    expect(selection).toEqual([])
    expect(group.type).toBe('stack')
    // Le groupe prend la place de la première brique et garde l'ordre du document.
    expect(project.nodes.page.children).toEqual([group.id, b])
    expect(group.children).toEqual([a, c])
    useEditor.getState().ungroup(group.id)
    expect(useEditor.getState().project.nodes.page.children).toEqual([a, c, b])
    expect(useEditor.getState().selection).toEqual([a, c])
    useEditor.getState().undo()
    expect(useEditor.getState().project.nodes.page.children).toEqual([group.id, b])
  })

  it('supprime et duplique toute la sélection', () => {
    const { addBrick, select, toggleSelect } = useEditor.getState()
    const card = addBrick('card')
    const inside = useEditor.getState().addBrickNearSelection('text')
    const other = addBrick('button')
    select(card)
    toggleSelect(inside)
    toggleSelect(other)
    useEditor.getState().duplicateSelection()
    // La brique dans la carte est copiée avec la carte, pas une seconde fois.
    expect(useEditor.getState().project.nodes.page.children).toHaveLength(4)
    expect(useEditor.getState().selection).toHaveLength(2)
    useEditor.getState().removeSelection()
    expect(useEditor.getState().project.nodes.page.children).toEqual([card, other])
  })

  it('les copies liées d’un composant restent identiques', () => {
    const { addBrick, addBrickNearSelection, saveComponent, insertComponent, select } = useEditor.getState()
    const card = addBrick('card')
    const text = addBrickNearSelection('text')
    saveComponent(card, 'Fiche')
    const componentId = useEditor.getState().project.components![0].id
    select(null)
    insertComponent(componentId)
    const copy = useEditor.getState().selectedId!
    const copyText = useEditor.getState().project.nodes[copy].children[0]
    expect(useEditor.getState().project.nodes[copy].instanceOf).toBe(componentId)
    // Modifier l'intérieur d'une copie change l'autre copie et le composant.
    useEditor.getState().updateProps(copyText, { text: 'Bonjour' })
    let { project } = useEditor.getState()
    // Les briques gardent leur identifiant.
    expect(project.nodes[text].props.text).toBe('Bonjour')
    const master = project.components![0]
    expect(master.nodes[master.nodes[master.rootId].children[0]].props.text).toBe('Bonjour')
    // Le nom de la racine reste propre à chaque copie.
    useEditor.getState().updateNode(copy, { name: 'Autre' })
    expect(useEditor.getState().project.nodes[card].name).not.toBe('Autre')
    // Annuler revient en arrière sur les deux copies en une étape.
    useEditor.getState().undo()
    useEditor.getState().undo()
    project = useEditor.getState().project
    expect(project.nodes[text].props.text).not.toBe('Bonjour')
    expect(project.nodes[copyText].props.text).not.toBe('Bonjour')
    // Une copie détachée ne suit plus.
    useEditor.getState().detachInstance(copy)
    useEditor.getState().updateProps(copyText, { text: 'Seule' })
    expect(useEditor.getState().project.nodes[text].props.text).not.toBe('Seule')
  })
})
