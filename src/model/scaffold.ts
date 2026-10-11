import { fieldsOf, isCollection } from './collections'
import { insertSubtree, makeNode, type Nodes } from './tree'
import type { Action, BrickNode, BrickType, Project, PropValue, Variable, VariableKind } from './types'
import { RESERVED_NAMES, defaultValue } from './variables'

/**
 * « Créer un formulaire et un tableau » pour une collection : un champ de saisie par champ
 * (chacun relié à une nouvelle variable), un bouton qui ajoute la fiche puis vide les champs,
 * et un tableau relié à la collection avec un bouton « Supprimer » par ligne.
 */
export function scaffoldCollection(project: Project, name: string, parentId: string): { variables: Variable[]; nodes: Nodes; rootId: string } | null {
  const v = project.variables.find((x) => x.name === name)
  const parent = project.nodes[parentId]
  if (!isCollection(v) || !parent) return null

  const taken = new Set([...project.variables.map((x) => x.name), ...RESERVED_NAMES])
  const unique = (base: string) => {
    let n = base
    for (let i = 2; taken.has(n); i++) n = `${base}_${i}`
    taken.add(n)
    return n
  }

  const variables: Variable[] = []
  const values: Record<string, string> = {}
  const resets: Action[] = []
  const inputs: { type: BrickType; props: Record<string, PropValue> }[] = []
  for (const f of fieldsOf(v)) {
    const kind: VariableKind = f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'text'
    const varName = unique(`${v.name}_${f.name}`)
    variables.push({ name: varName, kind, initial: defaultValue(kind) })
    values[f.name] = `{{${varName}}}`
    resets.push({ type: 'set', variable: varName, value: kind === 'boolean' ? 'false' : kind === 'number' ? '0' : '' })
    if (f.type === 'boolean') inputs.push({ type: 'checkbox', props: { label: f.label, bind: varName } })
    else {
      const inputType = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'
      const placeholder = f.type === 'image' || f.type === 'link' ? 'https://…' : f.type === 'number' ? '0' : f.label
      inputs.push({ type: 'input', props: { label: f.label, placeholder, inputType, bind: varName } })
    }
  }

  let all: Nodes = { ...project.nodes }
  const sub: Nodes = {}
  const make = (type: BrickType, parent: string | null, init: Parameters<typeof makeNode>[2] = {}): BrickNode => {
    const node = makeNode(all, type, init)
    node.parent = parent
    all = { ...all, [node.id]: node }
    sub[node.id] = node
    if (parent) sub[parent] = { ...sub[parent], children: [...sub[parent].children, node.id] }
    return node
  }

  const title = v.name.charAt(0).toUpperCase() + v.name.slice(1).replace(/_/g, ' ')
  const section = make('section', null, { name: `Gestion de ${v.name}`, style: { padding: 0 } })
  make('heading', section.id, { name: `Titre ${v.name}`, props: { text: title, level: '2' } })
  const card = make('card', section.id, { name: `Formulaire ${v.name}` })
  make('heading', card.id, { name: 'Titre du formulaire', props: { text: 'Nouvelle fiche', level: '3' } })
  // Les champs se rangent sur deux colonnes quand il y en a plusieurs.
  const holder = inputs.length > 2 ? make('grid', card.id, { name: 'Champs du formulaire', props: { columns: 2 }, style: { gap: 12 } }).id : card.id
  for (const input of inputs) make(input.type, holder, { props: input.props, name: `Champ ${String(input.props.label)}` })
  const button = make('button', card.id, { name: `Ajouter à ${v.name}`, props: { text: 'Ajouter', variant: 'primary' } })
  sub[button.id] = { ...sub[button.id], onClick: [{ type: 'addRecord', variable: v.name, values }, ...resets] }
  make('table', section.id, {
    name: `Tableau ${v.name}`,
    props: { source: v.name, rowDelete: true, sortable: true, striped: true, empty: `Aucune fiche dans ${v.name} pour le moment.` },
  })

  return { variables, nodes: insertSubtree(project.nodes, sub, section.id, parentId, parent.children.length), rootId: section.id }
}
