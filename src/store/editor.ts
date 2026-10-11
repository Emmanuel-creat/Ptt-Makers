import { create } from 'zustand'
import { mapNodeActions } from '../model/actions'
import { VAR_NAME_RE } from '../model/variables'
import { isContainer } from '../model/bricks'
import { clampPlace, defaultSize, fixPlacements, isFreeGrid, setFreeGrid } from '../model/freeGrid'
import { PAGE_TEMPLATES, addPageTemplate } from '../model/pageTemplates'
import { bumpVersion } from '../model/migrate'
import { alignSelfFor, arrangePlaces, type ArrangeMode } from '../model/arrange'
import { detachAll, instanceRoots, syncInstances, withVariant } from '../model/instances'
import { renameFunctionCalls, renameVariableInFunctions, renameVariableInNodes } from '../model/refactor'
import { scaffoldCollection } from '../model/scaffold'
import { adoptStyle, stylePreset, type StyleTokens } from '../model/styles'
import { createDefaultProject } from '../model/templates'
import {
  currentProjectId,
  listProjects,
  migrateLegacy,
  newProjectId,
  readProject,
  removeStoredProject,
  setCurrentProjectId,
  writeProject,
} from './library'
import { removeAllVersions, saveVersion } from './versions'
import {
  cloneSubtree,
  collectSubtree,
  duplicateNode,
  groupNodes,
  topLevel,
  ungroupNode,
  insertSubtree,
  makeBrick,
  makeNode,
  moveNode,
  moveSibling,
  pageOf,
  removeNode,
  resolveDrop,
  canDrop,
  type Nodes,
} from '../model/tree'
import { isStateScope, type Action, type BrickNode, type BrickStyle, type BrickType, type DropTarget, type EventField, type GridPlace, type Project, type ProjectTheme, type PropValue, type ResponsiveScope, type StateScope, type StyleOverride, type Variable } from '../model/types'

const HISTORY_LIMIT = 120
/** Les modifications successives d'un même champ sont regroupées dans une seule étape d'annulation. */
const COALESCE_MS = 800

type Snapshot = Pick<Project, 'nodes' | 'variables' | 'name' | 'rootId' | 'pages' | 'theme' | 'components' | 'functions'>

export type Dragging = { kind: 'new'; type: BrickType } | { kind: 'component'; id: string } | { kind: 'move'; id: string } | null

interface EditorState {
  project: Project
  /** Identifiant du projet dans « Mes projets ». */
  projectId: string
  /** Page affichée dans la zone de création. */
  currentPage: string
  selectedId: string | null
  /** Sélection multiple (Maj ou Ctrl + clic) : toutes les briques choisies, la dernière est selectedId. Vide sinon. */
  selection: string[]
  hoveredId: string | null
  past: Snapshot[]
  future: Snapshot[]
  lastEdit: { key: string; at: number } | null
  clipboard: { nodes: Nodes; rootId: string } | null
  dragging: Dragging
  dropTarget: DropTarget | null
  /** Brique dont le texte est en cours d'édition directe dans la zone de création. */
  editingId: string | null
  /** Message court affiché en bas de l'écran. */
  toast: { id: number; text: string } | null

  select: (id: string | null) => void
  /** Ajoute ou retire une brique de la sélection (Maj ou Ctrl + clic). */
  toggleSelect: (id: string) => void
  /** Supprime, duplique ou groupe toutes les briques sélectionnées. */
  removeSelection: () => void
  duplicateSelection: () => void
  groupSelection: () => void
  /** Sort le contenu d'un conteneur et le supprime. */
  ungroup: (id: string) => void
  hover: (id: string | null) => void
  notify: (text: string) => void
  setEditing: (id: string | null) => void

  addBrick: (type: BrickType, at?: { parentId: string; index: number }) => string
  addBrickNearSelection: (type: BrickType) => string
  setDragging: (d: Dragging) => void
  setDropTarget: (t: DropTarget | null) => void
  drop: (target: DropTarget) => void
  move: (id: string, parentId: string, index: number, cell?: DropTarget['cell']) => void
  moveBy: (id: string, delta: -1 | 1) => void
  remove: (id: string) => void
  duplicate: (id: string) => void
  copy: (id: string) => void
  paste: () => void

  updateProps: (id: string, patch: Record<string, PropValue>) => void
  /** Modifie le style de base (« all ») ou celui d'un format plus petit. */
  /** Change le style de base, celui d'un format (tablette, mobile) ou celui d'un état (survol, focus, appui, désactivé). */
  updateStyle: (id: string, patch: Partial<StyleOverride>, scope?: 'all' | ResponsiveScope | StateScope) => void
  /** Page en grille : change la case ou la taille d'une brique. */
  setPlace: (id: string, patch: Partial<GridPlace>) => void
  /** Passe une page en placement libre sur la grille, ou la remet en pile. */
  setLayout: (pageId: string, grid: boolean, measuredRows?: Record<string, number>) => void
  updateNode: (id: string, patch: Partial<Pick<BrickNode, 'name' | 'hidden' | 'showIf' | 'disabledIf'>>) => void
  setActions: (id: string, actions: Action[], field?: EventField) => void
  /** Fonctions réutilisables : créer (false si le nom est pris ou invalide), renommer, changer les actions, supprimer. */
  addFunction: (name: string) => boolean
  renameFunction: (from: string, to: string) => boolean
  setFunctionActions: (name: string, actions: Action[]) => void
  removeFunction: (name: string) => void

  updateTheme: (patch: Partial<ProjectTheme>) => void
  /** Choisit un style prêt à l'emploi (les réglages du Studio repartent de zéro). Sans id : retour au thème simple. */
  chooseStyle: (id: string | null) => void
  /** Change des réglages du Studio de style (undefined = revenir à la valeur du style). */
  updateTokens: (patch: Partial<StyleTokens>) => void
  /** Fait suivre le style à toutes les briques (retire leurs couleurs, bordures, ombres et arrondis propres). */
  adoptStyle: () => void
  saveComponent: (id: string, name?: string) => void
  insertComponent: (componentId: string, at?: { parentId: string; index: number; cell?: DropTarget['cell'] }) => void
  removeComponent: (componentId: string) => void
  /** La copie liée devient un bloc ordinaire, qui ne suit plus son composant. */
  detachInstance: (id: string) => void
  /** Aligne ou répartit les briques sélectionnées (sur une page en grille : leurs cases ; sinon leur alignement propre). */
  arrangeSelection: (mode: ArrangeMode) => void
  /** Variantes d'un composant : en créer une (la copie la prend), choisir celle d'une copie, régler son style, la supprimer. */
  addVariant: (copyId: string, name: string) => boolean
  setVariant: (copyId: string, name: string | undefined) => void
  updateVariantStyle: (componentId: string, name: string, patch: Partial<BrickStyle>) => void
  removeVariant: (componentId: string, name: string) => void

  setPage: (id: string) => void
  addPage: (name?: string) => string
  /** Ajoute les pages d'un gabarit (tableau de bord, paramètres, connexion, liste et détail) et ouvre la première. */
  addPageTemplate: (templateId: string) => void
  duplicatePage: (id: string) => void
  removePage: (id: string) => void
  setHomePage: (id: string) => void
  movePage: (id: string, delta: -1 | 1) => void

  addVariable: (v: Variable) => void
  updateVariable: (name: string, patch: Partial<Variable>) => void
  removeVariable: (name: string) => void
  /** Ajoute à la page un formulaire et un tableau reliés à une collection. */
  scaffoldCollection: (name: string) => void

  renameProject: (name: string) => void
  /** Passe au numéro de version suivant et garde une photo du projet sous ce numéro (Versions). */
  bumpAppVersion: (kind: 'correctif' | 'evolution' | 'majeure') => string
  /** Remplace le contenu du projet ouvert (annulable). */
  loadProject: (p: Project) => void
  /** Crée un nouveau projet dans « Mes projets » et l'ouvre. */
  createProject: (p: Project) => void
  openProject: (id: string) => void
  duplicateProject: (id: string) => void
  deleteProject: (id: string) => void
  /** Enregistre tout de suite (sinon, la sauvegarde se fait peu après chaque modification). */
  saveNow: () => void
  undo: () => void
  redo: () => void
}

function loadInitial(): { id: string; project: Project } {
  migrateLegacy()
  const id = currentProjectId()
  const project = id ? readProject(id) : null
  if (id && project) return { id, project }
  // Projet introuvable : on ouvre le plus récent, sinon on en crée un.
  for (const meta of listProjects()) {
    const p = readProject(meta.id)
    if (p) {
      setCurrentProjectId(meta.id)
      return { id: meta.id, project: p }
    }
  }
  const fresh = { id: newProjectId(), project: createDefaultProject() }
  writeProject(fresh.id, fresh.project)
  setCurrentProjectId(fresh.id)
  return fresh
}

const snapshot = (p: Project): Snapshot => ({
  nodes: p.nodes,
  variables: p.variables,
  name: p.name,
  rootId: p.rootId,
  pages: p.pages,
  theme: p.theme,
  components: p.components,
  functions: p.functions,
})

let toastCounter = 0
let saveTimer: ReturnType<typeof setTimeout> | undefined

export const useEditor = create<EditorState>((rawSet, get) => {
  // Choisir une seule brique (ou aucune) annule la sélection multiple.
  const set = (patch: Partial<EditorState>) =>
    rawSet('selectedId' in patch && !('selection' in patch) ? { ...patch, selection: [] } : patch)

  /** Applique une modification au projet en l'enregistrant dans l'historique. */
  const commit = (change: (p: Project) => Partial<Project> | null, coalesceKey?: string) => {
    const { project, past, lastEdit } = get()
    const patch = change(project)
    if (!patch) return
    // Les briques d'une page en grille gardent toujours une case valide.
    if (patch.nodes) patch.nodes = fixPlacements(patch.nodes)
    // Une copie liée modifiée entraîne le composant et toutes ses autres copies.
    if (patch.nodes) Object.assign(patch, syncInstances(project, { ...project, ...patch }) ?? {})
    const now = Date.now()
    const merge = coalesceKey && lastEdit?.key === coalesceKey && now - lastEdit.at < COALESCE_MS
    set({
      project: { ...project, ...patch },
      past: merge ? past : [...past, snapshot(project)].slice(-HISTORY_LIMIT),
      future: [],
      lastEdit: coalesceKey ? { key: coalesceKey, at: now } : null,
    })
  }

  const insertAt = (type: BrickType, parentId: string, index: number, cell?: DropTarget['cell']) => {
    let newId = ''
    commit((p) => {
      const brick = makeBrick(p.nodes, type)
      newId = brick.rootId
      if (cell && isFreeGrid(p.nodes[parentId])) {
        brick.nodes[newId] = { ...brick.nodes[newId], place: clampPlace({ ...cell, ...defaultSize(type) }) }
      }
      return { nodes: insertSubtree(p.nodes, brick.nodes, brick.rootId, parentId, index) }
    })
    set({ selectedId: newId })
    return newId
  }

  /** Après annuler / rétablir, la page affichée doit encore exister. */
  const fixPage = () => {
    const { project, currentPage, selectedId } = get()
    if (!project.pages.includes(currentPage)) set({ currentPage: project.rootId })
    if (selectedId && !project.nodes[selectedId]) set({ selectedId: null })
    const kept = get().selection.filter((id) => project.nodes[id])
    if (kept.length !== get().selection.length) rawSet({ selection: kept.length > 1 ? kept : [] })
  }

  /** Ouvre un projet : nouvel historique, rien de sélectionné. */
  const switchTo = (id: string, project: Project) => {
    setCurrentProjectId(id)
    set({
      project,
      projectId: id,
      currentPage: project.rootId,
      selectedId: null,
      hoveredId: null,
      editingId: null,
      past: [],
      future: [],
      lastEdit: null,
    })
  }

  const initial = loadInitial()
  return {
    project: initial.project,
    projectId: initial.id,
    currentPage: initial.project.rootId,
    selectedId: null,
    selection: [],
    hoveredId: null,
    past: [],
    future: [],
    lastEdit: null,
    clipboard: null,
    dragging: null,
    dropTarget: null,
    editingId: null,
    toast: null,

    select: (id) => {
      const page = id ? pageOf(get().project.nodes, id) : null
      set(page && page !== get().currentPage ? { selectedId: id, currentPage: page } : { selectedId: id })
    },
    toggleSelect: (id) => {
      const { project, selectedId, selection, currentPage } = get()
      const node = project.nodes[id]
      // Seules des briques de la page affichée se sélectionnent ensemble (pas la page elle-même).
      if (!node?.parent || pageOf(project.nodes, id) !== currentPage) return get().select(id)
      const current = (selection.length ? selection : selectedId ? [selectedId] : []).filter(
        (x) => project.nodes[x]?.parent && pageOf(project.nodes, x) === currentPage,
      )
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
      rawSet({ selection: next.length > 1 ? next : [], selectedId: next[next.length - 1] ?? null })
    },

    removeSelection: () => {
      const { project, selection, selectedId } = get()
      const ids = topLevel(project.nodes, selection.length ? selection : selectedId ? [selectedId] : [])
      if (!ids.length) return
      const parent = project.nodes[ids[0]].parent
      commit((p) => ({ nodes: ids.reduce((acc, id) => removeNode(acc, id), p.nodes) }))
      set({ selectedId: parent && get().project.nodes[parent] ? parent : null })
    },

    duplicateSelection: () => {
      const { project, selection, selectedId } = get()
      const ids = topLevel(project.nodes, selection.length ? selection : selectedId ? [selectedId] : [])
      if (!ids.length) return
      const copies: string[] = []
      commit((p) => {
        let nodes = p.nodes
        for (const id of ids) {
          const r = duplicateNode(nodes, id)
          if (r) {
            nodes = r.nodes
            copies.push(r.newId)
          }
        }
        return copies.length ? { nodes } : null
      })
      if (copies.length > 1) rawSet({ selection: copies, selectedId: copies[copies.length - 1] })
      else if (copies.length) set({ selectedId: copies[0] })
    },

    groupSelection: () => {
      const { project, selection, selectedId, notify } = get()
      const ids = selection.length ? selection : selectedId ? [selectedId] : []
      const r = groupNodes(project.nodes, ids)
      if (!r) {
        if (ids.length) notify('Pour grouper, choisis des briques rangées dans le même conteneur.')
        return
      }
      commit(() => ({ nodes: r.nodes }))
      set({ selectedId: r.groupId })
    },

    ungroup: (id) => {
      const r = ungroupNode(get().project.nodes, id)
      if (!r) return
      commit(() => ({ nodes: r.nodes }))
      if (r.childIds.length > 1) rawSet({ selection: r.childIds, selectedId: r.childIds[r.childIds.length - 1] })
      else set({ selectedId: r.childIds[0] ?? null })
    },

    hover: (id) => set({ hoveredId: id }),
    notify: (text) => set({ toast: { id: ++toastCounter, text } }),
    setEditing: (editingId) => set({ editingId }),

    addBrick: (type, at) => {
      const { project, currentPage } = get()
      const parentId = at?.parentId ?? currentPage
      const index = at?.index ?? project.nodes[parentId].children.length
      return insertAt(type, parentId, index)
    },

    addBrickNearSelection: (type) => {
      const { project, selectedId, currentPage } = get()
      const sel = selectedId ? project.nodes[selectedId] : null
      if (sel && isContainer(sel.type)) return insertAt(type, sel.id, sel.children.length)
      if (sel?.parent) {
        const parent = project.nodes[sel.parent]
        return insertAt(type, parent.id, parent.children.indexOf(sel.id) + 1)
      }
      return insertAt(type, currentPage, project.nodes[currentPage].children.length)
    },

    setDragging: (dragging) => set({ dragging, dropTarget: dragging ? get().dropTarget : null }),
    setDropTarget: (dropTarget) => {
      const cur = get().dropTarget
      if (
        cur?.id === dropTarget?.id &&
        cur?.position === dropTarget?.position &&
        cur?.cell?.col === dropTarget?.cell?.col &&
        cur?.cell?.row === dropTarget?.cell?.row
      )
        return
      set({ dropTarget })
    },

    drop: (target) => {
      const { dragging, project } = get()
      set({ dragging: null, dropTarget: null })
      if (!dragging) return
      const dragId = dragging.kind === 'move' ? dragging.id : null
      if (!canDrop(project.nodes, dragId, target)) return
      const spot = resolveDrop(project.nodes, target)!
      if (dragging.kind === 'new') insertAt(dragging.type, spot.parentId, spot.index, target.cell)
      else if (dragging.kind === 'component') get().insertComponent(dragging.id, { ...spot, cell: target.cell })
      else get().move(dragging.id, spot.parentId, spot.index, target.cell)
    },

    move: (id, parentId, index, cell) => {
      commit((p) => {
        let next = moveNode(p.nodes, id, parentId, index)
        if (cell && isFreeGrid(next[parentId])) {
          const node = next[id]
          // Même parent : la brique garde sa taille ; sinon, elle prend la taille de départ de son type.
          const size = node.place ?? defaultSize(node.type)
          next = { ...next, [id]: { ...node, place: clampPlace({ ...cell, w: size.w, h: size.h }) } }
        }
        return next === p.nodes ? null : { nodes: next }
      })
      set({ selectedId: id })
    },

    moveBy: (id, delta) =>
      commit((p) => {
        const node = p.nodes[id]
        // Sur une page en grille, monter ou descendre déplace la brique d'une rangée.
        if (node?.place) {
          const row = node.place.row + delta
          if (row < 1) return null
          return { nodes: { ...p.nodes, [id]: { ...node, place: { ...node.place, row } } } }
        }
        const next = moveSibling(p.nodes, id, delta)
        return next === p.nodes ? null : { nodes: next }
      }),

    remove: (id) => {
      const { project, selectedId } = get()
      const node = project.nodes[id]
      if (!node?.parent) return
      const removed = new Set(collectSubtree(project.nodes, id))
      commit((p) => ({ nodes: removeNode(p.nodes, id) }))
      if (selectedId && removed.has(selectedId)) set({ selectedId: node.parent })
    },

    duplicate: (id) => {
      let newId: string | null = null
      commit((p) => {
        const r = duplicateNode(p.nodes, id)
        if (!r) return null
        newId = r.newId
        return { nodes: r.nodes }
      })
      if (newId) set({ selectedId: newId })
    },

    copy: (id) => {
      const { project } = get()
      if (!project.nodes[id]?.parent) return
      const subtree: Nodes = {}
      for (const d of collectSubtree(project.nodes, id)) subtree[d] = project.nodes[d]
      set({ clipboard: { nodes: structuredClone(subtree), rootId: id } })
      get().notify('Brique copiée')
    },

    paste: () => {
      const { clipboard, project, selectedId, currentPage } = get()
      if (!clipboard) return
      const sel = selectedId ? project.nodes[selectedId] : null
      let parentId = currentPage
      let index = project.nodes[currentPage].children.length
      if (sel && isContainer(sel.type)) {
        parentId = sel.id
        index = sel.children.length
      } else if (sel?.parent) {
        parentId = sel.parent
        index = project.nodes[sel.parent].children.indexOf(sel.id) + 1
      }
      let newId = ''
      commit((p) => {
        const clone = cloneSubtree(clipboard.nodes, clipboard.rootId, p.nodes)
        newId = clone.rootId
        return { nodes: insertSubtree(p.nodes, clone.nodes, clone.rootId, parentId, index) }
      })
      set({ selectedId: newId })
    },

    updateProps: (id, patch) =>
      commit(
        (p) => ({ nodes: { ...p.nodes, [id]: { ...p.nodes[id], props: { ...p.nodes[id].props, ...patch } } } }),
        `props:${id}:${Object.keys(patch).join(',')}`,
      ),

    updateStyle: (id, patch, scope = 'all') =>
      commit((p) => {
        const node = p.nodes[id]
        if (isStateScope(scope)) {
          const style: Partial<BrickStyle> = { ...node.states?.[scope], ...(patch as Partial<BrickStyle>) }
          for (const k of Object.keys(patch) as (keyof BrickStyle)[]) if (patch[k] === undefined || patch[k] === '') delete style[k]
          delete (style as StyleOverride).hide
          const states = { ...node.states, [scope]: style }
          if (!Object.keys(style).length) delete states[scope]
          const next: BrickNode = { ...node, states }
          if (!Object.keys(states).length) delete next.states
          return { nodes: { ...p.nodes, [id]: next } }
        }
        const current: StyleOverride = scope === 'all' ? node.style : (node.responsive?.[scope] ?? {})
        const style: StyleOverride = { ...current, ...patch }
        for (const k of Object.keys(patch) as (keyof StyleOverride)[]) {
          if (patch[k] === undefined || patch[k] === '' || (k === 'hide' && !patch[k])) delete style[k]
        }
        if (scope === 'all') {
          const { hide: _hide, ...base } = style
          return { nodes: { ...p.nodes, [id]: { ...node, style: base as BrickStyle } } }
        }
        const responsive = { ...node.responsive, [scope]: style }
        if (!Object.keys(style).length) delete responsive[scope]
        const next: BrickNode = { ...node, responsive }
        if (!Object.keys(responsive).length) delete next.responsive
        return { nodes: { ...p.nodes, [id]: next } }
      }, `style:${scope}:${id}:${Object.keys(patch).join(',')}`),

    setPlace: (id, patch) =>
      commit((p) => {
        const node = p.nodes[id]
        if (!node?.place) return null
        const place = clampPlace({ ...node.place, ...patch }, node.place)
        const same = (Object.keys(place) as (keyof GridPlace)[]).every((k) => place[k] === node.place![k])
        return same ? null : { nodes: { ...p.nodes, [id]: { ...node, place } } }
      }, `place:${id}:${Object.keys(patch).join(',')}`),

    setLayout: (pageId, grid, measuredRows) =>
      commit((p) => {
        const next = setFreeGrid(p.nodes, pageId, grid, measuredRows)
        return next === p.nodes ? null : { nodes: next }
      }),

    updateTheme: (patch) =>
      commit((p) => {
        const theme: ProjectTheme = { ...p.theme, ...patch }
        for (const k of Object.keys(patch) as (keyof ProjectTheme)[]) if (patch[k] === undefined) delete theme[k]
        return { theme: Object.keys(theme).length ? theme : undefined }
      }, `theme:${Object.keys(patch).join(',')}`),

    chooseStyle: (id) =>
      commit((p) => {
        if (id === null) return p.theme ? { theme: undefined } : null
        if (!stylePreset(id) || (p.theme?.style === id && !p.theme.tokens && !p.theme.primary && p.theme.radius === undefined && !p.theme.font)) return null
        return { theme: { style: id } }
      }),

    updateTokens: (patch) =>
      commit((p) => {
        const tokens: Partial<StyleTokens> = { ...p.theme?.tokens, ...patch }
        for (const k of Object.keys(patch) as (keyof StyleTokens)[]) if (patch[k] === undefined) delete tokens[k]
        const theme: ProjectTheme = { ...p.theme, tokens }
        // Les anciens réglages équivalents laissent la place à ceux du Studio.
        if ('accent' in patch) delete theme.primary
        if ('radius' in patch) delete theme.radius
        if ('font' in patch) delete theme.font
        if (!Object.keys(tokens).length) delete theme.tokens
        return { theme: Object.keys(theme).length ? theme : undefined }
      }, `tokens:${Object.keys(patch).join(',')}`),

    adoptStyle: () =>
      commit((p) => {
        const nodes = adoptStyle(p.nodes)
        return JSON.stringify(nodes) === JSON.stringify(p.nodes) ? null : { nodes }
      }),

    saveComponent: (id, name) => {
      const { project, notify } = get()
      const node = project.nodes[id]
      if (!node?.parent) return
      const subtree: Nodes = {}
      for (const d of collectSubtree(project.nodes, id)) subtree[d] = project.nodes[d]
      const component = {
        id: `composant-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name: name?.trim() || node.name,
        rootId: id,
        nodes: structuredClone({ ...subtree, [id]: { ...subtree[id], parent: null } }),
      }
      // Le bloc d'origine devient la première copie liée du composant.
      commit((p) => ({ components: [...(p.components ?? []), component], nodes: { ...p.nodes, [id]: { ...p.nodes[id], instanceOf: component.id } } }))
      notify(`« ${component.name} » est un composant : ses copies resteront identiques`)
    },

    insertComponent: (componentId, at) => {
      const { project, selectedId, currentPage } = get()
      const component = project.components?.find((c) => c.id === componentId)
      if (!component) return
      let spot = at
      if (!spot) {
        const sel = selectedId ? project.nodes[selectedId] : null
        if (sel && isContainer(sel.type)) spot = { parentId: sel.id, index: sel.children.length }
        else if (sel?.parent) spot = { parentId: sel.parent, index: project.nodes[sel.parent].children.indexOf(sel.id) + 1 }
        else spot = { parentId: currentPage, index: project.nodes[currentPage].children.length }
      }
      let newId = ''
      commit((p) => {
        const clone = cloneSubtree(component.nodes, component.rootId, p.nodes)
        newId = clone.rootId
        // Le bloc inséré garde le nom du composant (sans « (copie) »).
        clone.nodes[newId] = { ...clone.nodes[newId], name: component.name, instanceOf: component.id }
        if (spot.cell && isFreeGrid(p.nodes[spot.parentId])) {
          const size = clone.nodes[newId].place ?? defaultSize(clone.nodes[newId].type)
          clone.nodes[newId].place = clampPlace({ ...spot.cell, w: size.w, h: size.h })
        }
        return { nodes: insertSubtree(p.nodes, clone.nodes, clone.rootId, spot.parentId, spot.index) }
      })
      set({ selectedId: newId })
    },

    removeComponent: (componentId) =>
      commit((p) => ({ components: (p.components ?? []).filter((c) => c.id !== componentId), nodes: detachAll(p.nodes, componentId, p.components) })),

    detachInstance: (id) =>
      commit((p) => {
        const node = p.nodes[id]
        if (!node?.instanceOf) return null
        // La copie détachée garde l'allure de sa variante.
        const { instanceOf: _gone, variant: _variant, ...rest } = withVariant(node, p.components)
        return { nodes: { ...p.nodes, [id]: rest } }
      }),

    arrangeSelection: (mode) => {
      const { project, selection } = get()
      const chosen = selection.map((id) => project.nodes[id]).filter(Boolean)
      if (chosen.length < 2) return
      const onGrid = chosen.every((n) => n.place && isFreeGrid(project.nodes[n.parent ?? '']))
      if (onGrid) {
        const places = arrangePlaces(Object.fromEntries(chosen.map((n) => [n.id, n.place!])), mode)
        commit((p) => {
          const nodes = { ...p.nodes }
          for (const [id, place] of Object.entries(places)) nodes[id] = { ...nodes[id], place: clampPlace(place) }
          return { nodes }
        })
        return
      }
      if (mode === 'distributeH' || mode === 'distributeV') return
      commit((p) => {
        const nodes = { ...p.nodes }
        for (const n of chosen) nodes[n.id] = { ...nodes[n.id], style: { ...nodes[n.id].style, alignSelf: alignSelfFor(mode) } }
        return { nodes }
      })
    },

    addVariant: (copyId, name) => {
      const label = name.trim()
      const node = get().project.nodes[copyId]
      const component = node?.instanceOf ? get().project.components?.find((c) => c.id === node.instanceOf) : undefined
      if (!label || !component || component.variants?.some((v) => v.name === label)) return false
      commit((p) => ({
        components: (p.components ?? []).map((c) => (c.id === component.id ? { ...c, variants: [...(c.variants ?? []), { name: label, style: {} }] } : c)),
        nodes: { ...p.nodes, [copyId]: { ...p.nodes[copyId], variant: label } },
      }))
      return true
    },

    setVariant: (copyId, name) =>
      commit((p) => {
        const node = p.nodes[copyId]
        if (!node?.instanceOf) return null
        const next = { ...node, variant: name }
        if (!name) delete next.variant
        return { nodes: { ...p.nodes, [copyId]: next } }
      }),

    updateVariantStyle: (componentId, name, patch) =>
      commit(
        (p) => ({
          components: (p.components ?? []).map((c) => {
            if (c.id !== componentId) return c
            const variants = (c.variants ?? []).map((v) => {
              if (v.name !== name) return v
              const style: Partial<BrickStyle> = { ...v.style, ...patch }
              for (const k of Object.keys(patch) as (keyof BrickStyle)[]) if (patch[k] === undefined || patch[k] === '') delete style[k]
              return { ...v, style }
            })
            return { ...c, variants }
          }),
        }),
        `variant:${componentId}:${name}:${Object.keys(patch).join(',')}`,
      ),

    removeVariant: (componentId, name) =>
      commit((p) => {
        const nodes = { ...p.nodes }
        for (const r of instanceRoots(p.nodes, componentId)) {
          if (r.variant !== name) continue
          const { variant: _gone, ...rest } = r
          nodes[r.id] = rest
        }
        const components = (p.components ?? []).map((c) => (c.id === componentId ? { ...c, variants: (c.variants ?? []).filter((v) => v.name !== name) } : c))
        return { nodes, components }
      }),

    updateNode: (id, patch) =>
      commit(
        (p) => ({ nodes: { ...p.nodes, [id]: { ...p.nodes[id], ...patch } } }),
        `node:${id}:${Object.keys(patch).join(',')}`,
      ),

    setActions: (id, actions, field = 'onClick') =>
      commit((p) => ({ nodes: { ...p.nodes, [id]: { ...p.nodes[id], [field]: actions } } }), `actions:${field}:${id}`),

    setPage: (id) => {
      if (get().project.pages.includes(id)) set({ currentPage: id, selectedId: null, editingId: null })
    },

    addPage: (name) => {
      let id = ''
      commit((p) => {
        const label = name?.trim() || `Page ${p.pages.length + 1}`
        const node = makeNode(p.nodes, 'page', { name: label, props: { title: label } })
        id = node.id
        return { nodes: { ...p.nodes, [id]: node }, pages: [...p.pages, id] }
      })
      set({ currentPage: id, selectedId: null })
      return id
    },

    addPageTemplate: (templateId) => {
      const template = PAGE_TEMPLATES.find((t) => t.id === templateId)
      if (!template) return
      let first = ''
      commit((p) => {
        const r = addPageTemplate(p, template)
        first = r.firstPage
        return { nodes: r.project.nodes, pages: r.project.pages, variables: r.project.variables }
      })
      if (first) {
        set({ currentPage: first, selectedId: null })
        get().notify(`Gabarit « ${template.name} » ajouté`)
      }
    },

    duplicatePage: (id) => {
      let newId = ''
      commit((p) => {
        if (!p.nodes[id]) return null
        const clone = cloneSubtree(p.nodes, id, p.nodes)
        newId = clone.rootId
        const pages = [...p.pages]
        pages.splice(pages.indexOf(id) + 1, 0, newId)
        return { nodes: { ...p.nodes, ...clone.nodes }, pages }
      })
      if (newId) set({ currentPage: newId, selectedId: null })
    },

    removePage: (id) => {
      const { project, currentPage } = get()
      if (project.pages.length < 2 || !project.pages.includes(id)) return
      const pages = project.pages.filter((x) => x !== id)
      commit((p) => {
        const nodes = { ...p.nodes }
        for (const d of collectSubtree(p.nodes, id)) delete nodes[d]
        return { nodes, pages, rootId: p.rootId === id ? pages[0] : p.rootId }
      })
      if (currentPage === id) set({ currentPage: get().project.rootId, selectedId: null })
    },

    setHomePage: (id) =>
      commit((p) => (p.pages.includes(id) && p.rootId !== id ? { rootId: id, pages: [id, ...p.pages.filter((x) => x !== id)] } : null)),

    movePage: (id, delta) =>
      commit((p) => {
        const i = p.pages.indexOf(id)
        const j = i + delta
        if (i < 0 || j < 0 || j >= p.pages.length) return null
        const pages = [...p.pages]
        ;[pages[i], pages[j]] = [pages[j], pages[i]]
        return { pages }
      }),

    addVariable: (v) =>
      commit((p) => (p.variables.some((x) => x.name === v.name) ? null : { variables: [...p.variables, v] })),

    updateVariable: (name, patch) =>
      commit((p) => {
        const renaming = patch.name && patch.name !== name
        if (renaming && p.variables.some((x) => x.name === patch.name)) return null
        return {
          variables: p.variables.map((v) => (v.name === name ? { ...v, ...patch } : v)),
          nodes: renaming ? renameVariableInNodes(p.nodes, name, patch.name!) : p.nodes,
          functions: renaming ? renameVariableInFunctions(p.functions, name, patch.name!) : p.functions,
        }
      }, `var:${name}:${Object.keys(patch).join(',')}`),

    addFunction: (name) => {
      const p = get().project
      if (!VAR_NAME_RE.test(name) || p.functions?.some((f) => f.name === name)) return false
      commit((q) => ({ functions: [...(q.functions ?? []), { name, actions: [] }] }))
      return true
    },

    renameFunction: (from, to) => {
      const p = get().project
      if (from === to) return true
      if (!VAR_NAME_RE.test(to) || p.functions?.some((f) => f.name === to)) return false
      commit((q) => ({
        functions: (q.functions ?? []).map((f) => ({ name: f.name === from ? to : f.name, actions: renameFunctionCalls(f.actions, from, to) })),
        nodes: Object.fromEntries(
          Object.entries(q.nodes).map(([id, n]) => [id, mapNodeActions(n, (a) => (a.type === 'call' && a.name === from ? { ...a, name: to } : a))]),
        ),
      }))
      return true
    },

    setFunctionActions: (name, actions) =>
      commit((p) => ({ functions: (p.functions ?? []).map((f) => (f.name === name ? { ...f, actions } : f)) }), `function:${name}`),

    removeFunction: (name) => commit((p) => ({ functions: (p.functions ?? []).filter((f) => f.name !== name) })),

    removeVariable: (name) => commit((p) => ({ variables: p.variables.filter((v) => v.name !== name) })),

    scaffoldCollection: (name) => {
      let rootId = ''
      commit((p) => {
        const made = scaffoldCollection(p, name, get().currentPage)
        if (!made) return null
        rootId = made.rootId
        return { variables: [...p.variables, ...made.variables], nodes: made.nodes }
      })
      if (rootId) {
        set({ selectedId: rootId })
        get().notify(`Formulaire et tableau de « ${name} » ajoutés à la page`)
      }
    },

    bumpAppVersion: (kind) => {
      const next = bumpVersion(get().project.appVersion, kind)
      commit(() => ({ appVersion: next }))
      saveVersion(get().projectId, `Version ${next}`, get().project)
      get().notify(`Version ${next} : une photo du projet est gardée dans Versions`)
      return next
    },

    renameProject: (name) => commit(() => ({ name }), 'project-name'),

    loadProject: (next) => {
      commit(() => ({ ...next }))
      set({ selectedId: null, hoveredId: null, currentPage: next.rootId })
    },

    createProject: (p) => {
      get().saveNow()
      const id = newProjectId()
      writeProject(id, p)
      switchTo(id, p)
    },

    openProject: (id) => {
      if (id === get().projectId) return
      const p = readProject(id)
      if (!p) return get().notify('Ce projet est introuvable')
      get().saveNow()
      switchTo(id, p)
    },

    duplicateProject: (id) => {
      get().saveNow()
      const p = id === get().projectId ? get().project : readProject(id)
      if (!p) return
      writeProject(newProjectId(), { ...structuredClone(p), name: `${p.name} (copie)` })
    },

    deleteProject: (id) => {
      removeStoredProject(id)
      removeAllVersions(id)
      if (id !== get().projectId) return
      const next = listProjects().find((m) => readProject(m.id))
      if (next) switchTo(next.id, readProject(next.id)!)
      else get().createProject(createDefaultProject())
    },

    saveNow: () => {
      clearTimeout(saveTimer)
      writeProject(get().projectId, get().project)
    },

    undo: () => {
      const { past, future, project } = get()
      const prev = past[past.length - 1]
      if (!prev) return
      set({
        project: { ...project, ...prev },
        past: past.slice(0, -1),
        future: [snapshot(project), ...future],
        lastEdit: null,
      })
      fixPage()
    },

    redo: () => {
      const { past, future, project } = get()
      const next = future[0]
      if (!next) return
      set({ project: { ...project, ...next }, past: [...past, snapshot(project)], future: future.slice(1), lastEdit: null })
      fixPage()
    },
  }
})

/* Sauvegarde automatique (avec un léger délai pour ne pas écrire à chaque frappe). */
useEditor.subscribe((state, prev) => {
  if (state.project === prev.project || state.projectId !== prev.projectId) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => writeProject(state.projectId, state.project), 300)
})
