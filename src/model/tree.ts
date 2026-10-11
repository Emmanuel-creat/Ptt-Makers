import { mapNodeActions } from './actions'
import { BRICKS, isContainer, type StarterSpec } from './bricks'
import type { Action, BrickNode, BrickType, DropTarget, PropValue, BrickStyle } from './types'

export type Nodes = Record<string, BrickNode>

/** Crée un identifiant lisible et unique : « bouton-1 », « bouton-2 »… */
export function nextId(nodes: Nodes, type: BrickType, reserved: Set<string> = new Set()): string {
  const prefix = BRICKS[type].idPrefix
  let n = 1
  for (const id of Object.keys(nodes)) {
    const m = id.match(/^(.*)-(\d+)$/)
    if (m && m[1] === prefix) n = Math.max(n, Number(m[2]) + 1)
  }
  while (nodes[`${prefix}-${n}`] || reserved.has(`${prefix}-${n}`)) n++
  return `${prefix}-${n}`
}

export function makeNode(
  nodes: Nodes,
  type: BrickType,
  init: { props?: Record<string, PropValue>; style?: BrickStyle; name?: string } = {},
): BrickNode {
  const def = BRICKS[type]
  const id = nextId(nodes, type)
  return {
    id,
    type,
    name: init.name ?? `${def.label} ${id.split('-').pop()}`,
    props: { ...def.defaultProps, ...init.props },
    style: { ...def.defaultStyle, ...init.style },
    children: [],
    parent: null,
    onClick: [],
  }
}

export function isDescendant(nodes: Nodes, id: string, ancestorId: string): boolean {
  let cur: string | null = id
  while (cur) {
    if (cur === ancestorId) return true
    cur = nodes[cur]?.parent ?? null
  }
  return false
}

/** Ancêtres de la racine jusqu'au nœud inclus. */
export function getPath(nodes: Nodes, id: string): BrickNode[] {
  const path: BrickNode[] = []
  let cur: string | null = id
  while (cur && nodes[cur]) {
    path.unshift(nodes[cur])
    cur = nodes[cur].parent
  }
  return path
}

/** Transforme une cible de dépôt en (parent, position). */
export function resolveDrop(nodes: Nodes, target: DropTarget): { parentId: string; index: number } | null {
  const node = nodes[target.id]
  if (!node) return null
  if (target.position === 'inside') {
    if (!isContainer(node.type)) return null
    return { parentId: node.id, index: node.children.length }
  }
  if (!node.parent) return null
  const parent = nodes[node.parent]
  const i = parent.children.indexOf(node.id)
  return { parentId: parent.id, index: target.position === 'before' ? i : i + 1 }
}

export function canDrop(nodes: Nodes, dragId: string | null, target: DropTarget): boolean {
  const spot = resolveDrop(nodes, target)
  if (!spot) return false
  if (dragId && isDescendant(nodes, spot.parentId, dragId)) return false
  return true
}

export function insertNode(nodes: Nodes, node: BrickNode, parentId: string, index: number): Nodes {
  const parent = nodes[parentId]
  const children = [...parent.children]
  children.splice(Math.max(0, Math.min(index, children.length)), 0, node.id)
  return { ...nodes, [node.id]: { ...node, parent: parentId }, [parentId]: { ...parent, children } }
}

/** Ajoute un sous-arbre entier (nœuds déjà reliés entre eux) sous un parent. */
export function insertSubtree(nodes: Nodes, subtree: Nodes, rootId: string, parentId: string, index: number): Nodes {
  const next = { ...nodes, ...subtree }
  return insertNode(next, subtree[rootId], parentId, index)
}

export function moveNode(nodes: Nodes, id: string, parentId: string, index: number): Nodes {
  const node = nodes[id]
  if (!node?.parent || isDescendant(nodes, parentId, id)) return nodes
  const oldParent = nodes[node.parent]
  const oldIndex = oldParent.children.indexOf(id)
  // Retirer d'abord : l'index cible se décale si on reste dans le même parent.
  let target = index
  if (oldParent.id === parentId && oldIndex < index) target--
  const without = { ...nodes, [oldParent.id]: { ...oldParent, children: oldParent.children.filter((c) => c !== id) } }
  return insertNode(without, node, parentId, target)
}

export function moveSibling(nodes: Nodes, id: string, delta: -1 | 1): Nodes {
  const node = nodes[id]
  if (!node?.parent) return nodes
  const parent = nodes[node.parent]
  const i = parent.children.indexOf(id)
  const j = i + delta
  if (j < 0 || j >= parent.children.length) return nodes
  const children = [...parent.children]
  ;[children[i], children[j]] = [children[j], children[i]]
  return { ...nodes, [parent.id]: { ...parent, children } }
}

export function collectSubtree(nodes: Nodes, id: string): string[] {
  const out: string[] = []
  const walk = (cur: string) => {
    if (!nodes[cur]) return
    out.push(cur)
    nodes[cur].children.forEach(walk)
  }
  walk(id)
  return out
}

export function removeNode(nodes: Nodes, id: string): Nodes {
  const node = nodes[id]
  if (!node?.parent) return nodes
  const next = { ...nodes }
  for (const d of collectSubtree(nodes, id)) delete next[d]
  const parent = nodes[node.parent]
  next[parent.id] = { ...parent, children: parent.children.filter((c) => c !== id) }
  return next
}

/**
 * Copie un sous-arbre (venant de `source`) avec de nouveaux identifiants libres dans `target`.
 * Les actions qui visent une brique du sous-arbre sont redirigées vers sa copie.
 */
export function cloneSubtree(source: Nodes, rootId: string, target: Nodes): { nodes: Nodes; rootId: string } {
  const ids = collectSubtree(source, rootId)
  const map = new Map<string, string>()
  const reserved = new Set<string>()
  for (const id of ids) {
    const fresh = nextId(target, source[id].type, reserved)
    reserved.add(fresh)
    map.set(id, fresh)
  }
  const retarget = (a: Action): Action => ('target' in a && map.has(a.target) ? { ...a, target: map.get(a.target)! } : { ...a })
  const out: Nodes = {}
  for (const id of ids) {
    const n = source[id]
    const newId = map.get(id)!
    out[newId] = {
      ...mapNodeActions(structuredClone(n), retarget),
      id: newId,
      name: n.name.endsWith(' (copie)') ? n.name : `${n.name} (copie)`,
      parent: n.parent && map.has(n.parent) ? map.get(n.parent)! : null,
      children: n.children.map((c) => map.get(c)!),
    }
  }
  // Seule la racine copiée garde le suffixe « (copie) ».
  for (const id of ids.slice(1)) out[map.get(id)!].name = source[id].name
  return { nodes: out, rootId: map.get(rootId)! }
}

export function duplicateNode(nodes: Nodes, id: string): { nodes: Nodes; newId: string } | null {
  const node = nodes[id]
  if (!node?.parent) return null
  const clone = cloneSubtree(nodes, id, nodes)
  const parent = nodes[node.parent]
  const next = insertSubtree(nodes, clone.nodes, clone.rootId, parent.id, parent.children.indexOf(id) + 1)
  return { nodes: next, newId: clone.rootId }
}

/** Parcours en profondeur (ordre du document). */
export function walk(nodes: Nodes, rootId: string, fn: (node: BrickNode, depth: number) => void, depth = 0) {
  const node = nodes[rootId]
  if (!node) return
  fn(node, depth)
  node.children.forEach((c) => walk(nodes, c, fn, depth + 1))
}

/** Page qui contient une brique (la racine de son arbre). */
export function pageOf(nodes: Nodes, id: string): string | null {
  let cur: string | null = id
  while (cur && nodes[cur]?.parent) cur = nodes[cur].parent
  return cur && nodes[cur] ? cur : null
}

/** Répétition la plus proche qui contient la brique (sans compter la brique elle-même). */
export function repeatOf(nodes: Nodes, id: string): string | null {
  let cur = nodes[id]?.parent ?? null
  while (cur) {
    if (nodes[cur]?.type === 'repeat') return cur
    cur = nodes[cur]?.parent ?? null
  }
  return null
}

/** Crée une brique avec son contenu de départ (ex. deux volets pour un accordéon). */
export function makeBrick(nodes: Nodes, type: BrickType): { nodes: Nodes; rootId: string } {
  let all: Nodes = { ...nodes }
  const sub: Nodes = {}
  const create = (spec: StarterSpec, parent: string | null): string => {
    const node = makeNode(all, spec.type, { props: spec.props, style: spec.style, name: spec.name })
    node.parent = parent
    all = { ...all, [node.id]: node }
    sub[node.id] = node
    node.children = (spec.children ?? []).map((c) => create(c, node.id))
    return node.id
  }
  const rootId = create({ type, children: BRICKS[type].starter }, null)
  return { nodes: sub, rootId }
}

/** Garde seulement les briques les plus hautes : une brique dont un ancêtre est aussi choisi est déjà incluse. */
export function topLevel(nodes: Nodes, ids: string[]): string[] {
  const set = new Set(ids)
  return ids.filter((id) => {
    let cur = nodes[id]?.parent ?? null
    while (cur) {
      if (set.has(cur)) return false
      cur = nodes[cur]?.parent ?? null
    }
    return !!nodes[id]?.parent
  })
}

/**
 * Range des briques sœurs dans un nouveau conteneur, à la place de la première.
 * Le groupe garde leur sens : une ligne si elles étaient côte à côte, une colonne sinon.
 */
export function groupNodes(nodes: Nodes, ids: string[]): { nodes: Nodes; groupId: string } | null {
  const chosen = topLevel(nodes, ids)
  if (!chosen.length) return null
  const parentId = nodes[chosen[0]].parent!
  if (chosen.some((id) => nodes[id].parent !== parentId)) return null
  const parent = nodes[parentId]
  const ordered = parent.children.filter((c) => chosen.includes(c))
  const horizontal = (parent.style.direction ?? BRICKS[parent.type].defaultStyle.direction) === 'row'
  const group = makeNode(nodes, horizontal ? 'row' : 'stack', { name: 'Groupe' })
  // Sur une page en grille, le groupe occupe la case qui englobe toutes les briques.
  const places = ordered.map((id) => nodes[id].place).filter((p): p is NonNullable<typeof p> => !!p)
  if (places.length) {
    const col = Math.min(...places.map((p) => p.col))
    const row = Math.min(...places.map((p) => p.row))
    group.place = {
      col,
      row,
      w: Math.max(...places.map((p) => p.col + p.w)) - col,
      h: Math.max(...places.map((p) => p.row + p.h)) - row,
    }
  }
  let next = insertNode(nodes, group, parentId, parent.children.indexOf(ordered[0]))
  ordered.forEach((id, i) => {
    next = moveNode(next, id, group.id, i)
    const { place: _place, ...rest } = next[id]
    next[id] = rest
  })
  return { nodes: next, groupId: group.id }
}

/** Sort le contenu d'un conteneur à sa place, puis supprime le conteneur vide. */
export function ungroupNode(nodes: Nodes, id: string): { nodes: Nodes; childIds: string[] } | null {
  const node = nodes[id]
  if (!node?.parent || !isContainer(node.type) || node.type === 'repeat') return null
  const parentId = node.parent
  const childIds = [...node.children]
  let next = nodes
  const at = nodes[parentId].children.indexOf(id)
  childIds.forEach((c, i) => {
    next = moveNode(next, c, parentId, at + 1 + i)
  })
  next = removeNode(next, id)
  return { nodes: next, childIds }
}
