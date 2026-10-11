import { mapActions } from './actions'
import { collectSubtree, nextId, type Nodes } from './tree'
import type { Action, BrickNode, Project, SavedComponent } from './types'

/*
 * Composants maîtres et copies liées.
 * Une copie liée est un bloc dont la racine porte `instanceOf` (l'identifiant du composant).
 * Quand on modifie l'intérieur d'une copie, le composant et toutes ses autres copies suivent.
 * Ce qui reste propre à chaque copie : le nom de sa racine, sa place sur la grille,
 * « masquée au départ » et « afficher seulement si ».
 */

/** Racines des copies liées d'un composant (ou de tous les composants). */
export function instanceRoots(nodes: Nodes, componentId?: string): BrickNode[] {
  return Object.values(nodes).filter((n) => n.instanceOf && (componentId ? n.instanceOf === componentId : true))
}

/** La copie liée qui contient une brique (la brique elle-même si c'est une racine). */
export function instanceOfNode(nodes: Nodes, id: string): BrickNode | null {
  let cur: BrickNode | undefined = nodes[id]
  while (cur) {
    if (cur.instanceOf) return cur
    cur = cur.parent ? nodes[cur.parent] : undefined
  }
  return null
}

/** Le contenu d'un bloc sans ses identifiants : deux copies identiques donnent le même texte. */
export function canonical(nodes: Nodes, rootId: string): string {
  const ids = collectSubtree(nodes, rootId)
  const index = new Map(ids.map((id, i) => [id, i]))
  const target = (a: Action): Action => ('target' in a && index.has(a.target) ? { ...a, target: `#${index.get(a.target)}` } : a)
  return JSON.stringify(
    ids.map((id, i) => {
      const n = nodes[id]
      const own = i === 0 ? {} : { name: n.name, place: n.place, hidden: n.hidden, showIf: n.showIf }
      return {
        ...own,
        type: n.type,
        props: n.props,
        style: n.style,
        responsive: n.responsive,
        onClick: mapActions(n.onClick, target),
        onLoad: n.onLoad && mapActions(n.onLoad, target),
        children: n.children.map((c) => index.get(c)),
      }
    }),
  )
}

/** Le composant tel qu'il est enregistré : le bloc seul, sans parent. */
function masterFrom(nodes: Nodes, rootId: string, component: SavedComponent): SavedComponent {
  const subtree: Nodes = {}
  for (const id of collectSubtree(nodes, rootId)) subtree[id] = nodes[id]
  const root = { ...subtree[rootId], parent: null, name: component.name }
  delete root.place
  delete root.instanceOf
  return { ...component, rootId, nodes: structuredClone({ ...subtree, [rootId]: root }) }
}

/**
 * Remplace le contenu de la copie `targetId` par celui de `sourceId`, en gardant ce qui est propre à la copie.
 * Les briques qui sont à la même place dans les deux blocs gardent leur identifiant :
 * la sélection et les actions qui les visent depuis l'extérieur restent valables.
 */
export function replaceInstance(nodes: Nodes, sourceId: string, targetId: string): Nodes {
  const old = nodes[targetId]
  const map = new Map<string, string>()
  const pair = (s: string, t: string | undefined) => {
    if (t) map.set(s, t)
    nodes[s].children.forEach((c, i) => pair(c, t ? nodes[t].children[i] : undefined))
  }
  pair(sourceId, targetId)
  const next: Nodes = { ...nodes }
  const kept = new Set(map.values())
  for (const id of collectSubtree(nodes, targetId)) if (!kept.has(id)) delete next[id]
  const reserved = new Set<string>()
  const ids = collectSubtree(nodes, sourceId)
  for (const id of ids) {
    if (map.has(id)) continue
    const fresh = nextId(next, nodes[id].type, reserved)
    reserved.add(fresh)
    map.set(id, fresh)
  }
  const retarget = (a: Action): Action => ('target' in a && map.has(a.target) ? { ...a, target: map.get(a.target)! } : { ...a })
  for (const id of ids) {
    const n = nodes[id]
    const newId = map.get(id)!
    next[newId] = {
      ...structuredClone(n),
      id: newId,
      parent: id === sourceId ? old.parent : map.get(n.parent!)!,
      children: n.children.map((c) => map.get(c)!),
      onClick: mapActions(n.onClick, retarget),
      ...(n.onLoad ? { onLoad: mapActions(n.onLoad, retarget) } : {}),
    }
  }
  const root = { ...next[targetId], name: old.name, instanceOf: old.instanceOf, hidden: old.hidden, showIf: old.showIf, place: old.place }
  if (!old.place) delete root.place
  if (old.hidden === undefined) delete root.hidden
  if (old.showIf === undefined) delete root.showIf
  next[targetId] = root
  return next
}

/**
 * Après une modification : si l'intérieur d'une copie liée a changé, le composant
 * et toutes ses autres copies prennent le même contenu. Renvoie null s'il n'y a rien à faire.
 */
export function syncInstances(prev: Project, next: Project): Pick<Project, 'nodes' | 'components'> | null {
  if (prev.nodes === next.nodes) return null
  const components = next.components ?? []
  if (!components.length) return null
  const roots = instanceRoots(next.nodes)
  if (!roots.length) return null
  let nodes = next.nodes
  let list = components
  let changed = false
  for (const component of components) {
    const mine = roots.filter((r) => r.instanceOf === component.id)
    const source = mine.find((r) => prev.nodes[r.id]?.instanceOf === component.id && canonical(prev.nodes, r.id) !== canonical(next.nodes, r.id))
    if (!source) continue
    changed = true
    for (const other of mine) if (other.id !== source.id) nodes = replaceInstance(nodes, source.id, other.id)
    list = list.map((c) => (c.id === component.id ? masterFrom(nodes, source.id, c) : c))
  }
  return changed ? { nodes, components: list } : null
}

/** Détache les copies d'un composant supprimé : elles deviennent des blocs ordinaires. */
export function detachAll(nodes: Nodes, componentId: string): Nodes {
  const out = { ...nodes }
  for (const r of instanceRoots(nodes, componentId)) {
    const { instanceOf: _gone, ...rest } = r
    out[r.id] = rest
  }
  return out
}
