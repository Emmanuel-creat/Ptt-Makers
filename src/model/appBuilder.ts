import { mapActions } from './actions'
import { fixPlacements } from './freeGrid'
import { makeNode, type Nodes } from './tree'
import type { Action, AppFunction, BrickStyle, BrickType, EventField, GridPlace, Project, PropValue, Variable } from './types'

/** Description compacte d'un arbre de briques pour écrire les modèles. */
export interface Spec {
  type: BrickType
  ref?: string
  name?: string
  props?: Record<string, PropValue>
  style?: BrickStyle
  hidden?: boolean
  showIf?: string
  /** Les cibles peuvent s'écrire « @ref » pour viser une autre brique du modèle. */
  onClick?: Action[]
  /** Les autres événements : survol, saisie, changement, touche. */
  on?: Partial<Record<'onHover' | 'onInput' | 'onChange' | 'onKey' | 'onSubmit', Action[]>>
  /** Case sur une page en grille. */
  place?: GridPlace
  children?: Spec[]
}

export const ROOT_ID = 'page'

/** Une page d'un modèle. */
export interface PageSpec {
  ref?: string
  name: string
  title?: string
  style?: BrickStyle
  /** Actions lancées quand la page s'affiche. */
  onLoad?: Action[]
  /** Actions répétées toutes les `timerMs` millisecondes. */
  onTimer?: Action[]
  timerMs?: number
  /** Briques posées librement sur une grille plutôt qu'empilées. */
  grid?: boolean
  /** Variable qui reçoit la valeur envoyée par « Aller sur une page ». */
  paramVar?: string
  /** Page réservée aux personnes connectées : la variable de la personne connectée et la page de connexion (« @ref »). */
  login?: { variable: string; page: string }
  children: Spec[]
}

/** Construit un projet de plusieurs pages ; la première est la page d'accueil. */
export function buildApp(name: string, pages: PageSpec[], variables: Variable[] = [], functions?: AppFunction[]): Project {
  let nodes: Nodes = {}
  const refs = new Map<string, string>()
  const pending: { id: string; key: EventField; actions: Action[] }[] = []
  const pageIds: string[] = []

  const add = (spec: Spec, parentId: string) => {
    const node = makeNode(nodes, spec.type, { props: spec.props, style: spec.style, name: spec.name })
    node.parent = parentId
    node.hidden = spec.hidden
    node.showIf = spec.showIf
    if (spec.place) node.place = spec.place
    nodes = { ...nodes, [node.id]: node, [parentId]: { ...nodes[parentId], children: [...nodes[parentId].children, node.id] } }
    if (spec.ref) refs.set(spec.ref, node.id)
    if (spec.onClick) pending.push({ id: node.id, key: 'onClick', actions: spec.onClick })
    for (const [key, actions] of Object.entries(spec.on ?? {})) if (actions) pending.push({ id: node.id, key: key as EventField, actions })
    spec.children?.forEach((c) => add(c, node.id))
  }

  pages.forEach((page, i) => {
    const props: Record<string, PropValue> = { title: page.title ?? (i === 0 ? name : page.name) }
    if (page.grid) props.layout = 'grille'
    if (page.paramVar) props.paramVar = page.paramVar
    if (page.timerMs) props.timerMs = page.timerMs
    if (page.login) {
      props.loginVar = page.login.variable
      props.loginPage = page.login.page
    }
    const made = makeNode(nodes, 'page', { props, style: page.style, name: page.name })
    const id = i === 0 ? ROOT_ID : made.id
    nodes = { ...nodes, [id]: { ...made, id } }
    pageIds.push(id)
    if (page.ref) refs.set(page.ref, id)
    if (page.onLoad) pending.push({ id, key: 'onLoad', actions: page.onLoad })
    if (page.onTimer) pending.push({ id, key: 'onTimer', actions: page.onTimer })
    page.children.forEach((c) => add(c, id))
  })

  const resolve = (ref: string) => (ref.startsWith('@') ? (refs.get(ref.slice(1)) ?? ref) : ref)
  const resolveActions = (actions: Action[]) =>
    mapActions(actions, (a) => ('target' in a ? { ...a, target: resolve(a.target) } : a.type === 'navigate' ? { ...a, page: resolve(a.page) } : a))
  for (const { id, key, actions } of pending) nodes[id] = { ...nodes[id], [key]: resolveActions(actions) }
  for (const node of Object.values(nodes)) {
    if (node.type === 'link' && typeof node.props.page === 'string' && node.props.page) {
      nodes[node.id] = { ...node, props: { ...node.props, page: resolve(node.props.page) } }
    }
    if (node.type === 'page' && typeof node.props.loginPage === 'string' && node.props.loginPage) {
      nodes[node.id] = { ...node, props: { ...node.props, loginPage: resolve(node.props.loginPage) } }
    }
  }
  const project: Project = { version: 1, name, rootId: ROOT_ID, pages: pageIds, nodes: fixPlacements(nodes), variables }
  if (functions?.length) project.functions = functions.map((f) => ({ name: f.name, actions: resolveActions(f.actions) }))
  return project
}

export function buildProject(
  name: string,
  page: { title?: string; style?: BrickStyle; onLoad?: Action[] },
  children: Spec[],
  variables: Variable[] = [],
): Project {
  return buildApp(name, [{ name: 'Page', title: page.title ?? name, style: page.style, onLoad: page.onLoad, children }], variables)
}

export interface Template {
  id: string
  name: string
  description: string
  /** Couleur d'accent de la vignette. */
  accent: string
  /** Famille de la galerie. */
  family: TemplateFamily
  create: () => Project
}

export type TemplateFamily = 'depart' | 'sites' | 'applications' | 'gestion' | 'pilotage'

/** Les familles de la galerie de modèles, dans l'ordre d'affichage. */
export const TEMPLATE_FAMILIES: { id: TemplateFamily; label: string }[] = [
  { id: 'depart', label: 'Pour démarrer' },
  { id: 'sites', label: 'Sites et pages' },
  { id: 'applications', label: 'Applications' },
  { id: 'gestion', label: 'Gestion et métiers' },
  { id: 'pilotage', label: 'Pilotage et équipe' },
]
