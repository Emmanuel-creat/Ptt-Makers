import { BRICKS } from '../model/bricks'
import { mapActions, mapNodeActions } from '../model/actions'
import { collectSubtree, nextId, type Nodes } from '../model/tree'
import type { Action, BrickNode, Project } from '../model/types'

/*
 * Relecture des changements proposés par l'assistant.
 * L'assistant reçoit les briques avec leur identifiant comme « ref » : la table `refs`
 * (ref de l'IA vers identifiant dans le projet proposé) relie donc chaque brique
 * d'avant à sa version d'après. On s'en sert pour résumer les changements,
 * et pour ne garder que la brique visée lors d'une retouche ciblée.
 */

export interface ProjectChanges {
  added: string[]
  removed: string[]
  changed: string[]
}

export const changeCount = (c: ProjectChanges) => c.added.length + c.removed.length + c.changed.length

/** « Bouton « Envoyer » » : de quoi reconnaître une brique dans une liste. */
export function brickTitle(node: BrickNode): string {
  if (node.type === 'page') return `Page « ${node.name} »`
  const label = BRICKS[node.type]?.label ?? node.type
  return node.name && node.name !== label ? `${label} « ${node.name} »` : label
}

/** Remplace des identifiants dans les actions (cibles, pages visées) et dans les liens. */
function renameIds(node: BrickNode, rename: (id: string) => string): BrickNode {
  const fn = (a: Action): Action =>
    'target' in a ? { ...a, target: rename(a.target) } : a.type === 'navigate' ? { ...a, page: rename(a.page) } : a
  const out = mapNodeActions(node, fn)
  if (node.onLoad) out.onLoad = mapActions(node.onLoad, fn)
  if (node.type === 'link' && typeof node.props.page === 'string' && node.props.page) out.props = { ...node.props, page: rename(node.props.page) }
  if (node.type === 'page' && typeof node.props.loginPage === 'string' && node.props.loginPage)
    out.props = { ...out.props, loginPage: rename(node.props.loginPage) }
  return out
}

/** JSON aux clés triées : l'ordre des clés ne compte pas comme un changement. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(v) ?? 'null'
}

/** Une valeur vide (liste sans action, texte vide, faux) compte comme absente. */
const empty = (v: unknown) => v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && v.length === 0)

/** Ce qui compte pour dire qu'une brique a changé (sans son identifiant ni ses enfants). */
function signature(node: BrickNode, parent: string | null): string {
  const { id: _id, children: _children, parent: _parent, responsive: _r, instanceOf: _i, variant: _v, ...rest } = node
  const clean = (o: object) => Object.fromEntries(Object.entries(o).filter(([, v]) => !empty(v)))
  return stable({ ...clean(rest), props: clean(node.props), style: clean(node.style), parent })
}

const invert = (refs: Map<string, string>) => new Map([...refs].map(([before, after]) => [after, before]))

/** Résume les changements entre le projet ouvert et celui proposé par l'assistant. */
export function diffProjects(before: Project, after: Project, refs: Map<string, string>): ProjectChanges {
  const back = invert(refs)
  const toBefore = (id: string) => back.get(id) ?? id
  const changes: ProjectChanges = { added: [], removed: [], changed: [] }

  for (const node of Object.values(before.nodes)) {
    const twin = after.nodes[refs.get(node.id) ?? '']
    if (!twin || twin.type !== node.type) changes.removed.push(brickTitle(node))
    else {
      const parent = twin.parent ? toBefore(twin.parent) : null
      if (signature(renameIds(twin, toBefore), parent) !== signature(node, node.parent)) changes.changed.push(brickTitle(twin))
    }
  }
  for (const node of Object.values(after.nodes)) {
    const old = back.get(node.id)
    if (!old || before.nodes[old]?.type !== node.type) changes.added.push(brickTitle(node))
  }

  const vars = (p: Project) => new Map(p.variables.map((v) => [v.name, stable(v)]))
  const vb = vars(before)
  const va = vars(after)
  for (const [name, v] of va) {
    if (!vb.has(name)) changes.added.push(`Variable ${name}`)
    else if (vb.get(name) !== v) changes.changed.push(`Variable ${name}`)
  }
  for (const name of vb.keys()) if (!va.has(name)) changes.removed.push(`Variable ${name}`)

  const fb = new Set((before.functions ?? []).map((f) => f.name))
  const fa = new Set((after.functions ?? []).map((f) => f.name))
  for (const name of fa) if (!fb.has(name)) changes.added.push(`Fonction ${name}`)
  for (const name of fb) if (!fa.has(name)) changes.removed.push(`Fonction ${name}`)

  const theme = (p: Project) => JSON.stringify({ style: p.theme?.style, primary: p.theme?.primary, radius: p.theme?.radius, font: p.theme?.font, darkMode: p.theme?.darkMode })
  if (theme(before) !== theme(after)) changes.changed.push('Style du projet')
  return changes
}

/**
 * Retouche ciblée : ne garde de la proposition que la brique visée et son contenu,
 * remis à la même place dans le projet ouvert. Le reste du projet ne bouge pas.
 * Renvoie null si la proposition ne contient plus la brique.
 */
export function graftBrick(current: Project, proposed: Project, refs: Map<string, string>, nodeId: string): Project | null {
  const target = current.nodes[nodeId]
  const fromId = refs.get(nodeId)
  const from = fromId ? proposed.nodes[fromId] : undefined
  if (!target?.parent || !from || from.type !== target.type) return null

  // Sans la brique visée, pour choisir des identifiants libres.
  const old = collectSubtree(current.nodes, nodeId)
  const kept: Nodes = { ...current.nodes }
  for (const id of old) delete kept[id]

  const back = invert(refs)
  const ids = collectSubtree(proposed.nodes, from.id)
  const map = new Map<string, string>([[from.id, nodeId]])
  const reserved = new Set<string>([nodeId])
  for (const id of ids.slice(1)) {
    // Une brique qui existait déjà garde son identifiant ; une nouvelle en reçoit un libre.
    const before = back.get(id)
    const keep = before && old.includes(before) && !reserved.has(before) ? before : nextId(kept, proposed.nodes[id].type, reserved)
    reserved.add(keep)
    map.set(id, keep)
  }
  const rename = (id: string) => map.get(id) ?? back.get(id) ?? id

  const nodes: Nodes = { ...kept }
  for (const id of ids) {
    const n = renameIds(proposed.nodes[id], rename)
    const newId = map.get(id)!
    const was = current.nodes[newId]
    const node: BrickNode = { ...n, id: newId, parent: id === from.id ? target.parent : map.get(n.parent!)!, children: n.children.map((c) => map.get(c)!) }
    // Ce que l'assistant ne voit pas reste tel quel : réglages par taille d'écran et variante.
    if (was?.responsive) node.responsive = was.responsive
    if (was?.variant) node.variant = was.variant
    delete node.instanceOf
    if (id === from.id && target.place) node.place = target.place
    nodes[newId] = node
  }

  const names = new Set(current.variables.map((v) => v.name))
  const variables = [...current.variables, ...proposed.variables.filter((v) => !names.has(v.name))]
  const fnames = new Set((current.functions ?? []).map((f) => f.name))
  const extra = (proposed.functions ?? []).filter((f) => !fnames.has(f.name)).map((f) => ({ ...f, actions: mapActions(f.actions, (a) => ('target' in a ? { ...a, target: rename(a.target) } : a)) }))
  const out: Project = { ...current, nodes, variables }
  if (extra.length) out.functions = [...(current.functions ?? []), ...extra]
  return out
}
