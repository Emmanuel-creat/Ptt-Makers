import { beforeEach, describe, expect, it } from 'vitest'
import { buildProject } from '../model/templates'
import { useEditor } from './editor'

const reset = () => useEditor.setState({ project: buildProject('Test', {}, []), past: [], future: [], selectedId: null, clipboard: null, lastEdit: null })

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
})
