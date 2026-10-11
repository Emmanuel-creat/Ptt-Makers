import { create } from 'zustand'
import { isContainer } from '../model/bricks'
import { renameVariableInNodes } from '../model/refactor'
import { createDefaultProject, isProject } from '../model/templates'
import {
  cloneSubtree,
  collectSubtree,
  duplicateNode,
  insertNode,
  insertSubtree,
  makeNode,
  moveNode,
  moveSibling,
  removeNode,
  resolveDrop,
  canDrop,
  type Nodes,
} from '../model/tree'
import type { Action, BrickNode, BrickStyle, BrickType, DropTarget, Project, PropValue, Variable } from '../model/types'

export const STORAGE_KEY = 'ptt-makers:projet'
const HISTORY_LIMIT = 120
/** Les modifications successives d'un même champ sont regroupées dans une seule étape d'annulation. */
const COALESCE_MS = 800

type Snapshot = Pick<Project, 'nodes' | 'variables' | 'name' | 'rootId'>

export type Dragging = { kind: 'new'; type: BrickType } | { kind: 'move'; id: string } | null

interface EditorState {
  project: Project
  selectedId: string | null
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
  hover: (id: string | null) => void
  notify: (text: string) => void
  setEditing: (id: string | null) => void

  addBrick: (type: BrickType, at?: { parentId: string; index: number }) => string
  addBrickNearSelection: (type: BrickType) => string
  setDragging: (d: Dragging) => void
  setDropTarget: (t: DropTarget | null) => void
  drop: (target: DropTarget) => void
  move: (id: string, parentId: string, index: number) => void
  moveBy: (id: string, delta: -1 | 1) => void
  remove: (id: string) => void
  duplicate: (id: string) => void
  copy: (id: string) => void
  paste: () => void

  updateProps: (id: string, patch: Record<string, PropValue>) => void
  updateStyle: (id: string, patch: Partial<BrickStyle>) => void
  updateNode: (id: string, patch: Partial<Pick<BrickNode, 'name' | 'hidden' | 'showIf'>>) => void
  setActions: (id: string, actions: Action[]) => void

  addVariable: (v: Variable) => void
  updateVariable: (name: string, patch: Partial<Variable>) => void
  removeVariable: (name: string) => void

  renameProject: (name: string) => void
  loadProject: (p: Project) => void
  undo: () => void
  redo: () => void
}

function loadInitial(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (isProject(parsed)) return parsed
    }
  } catch {
    /* stockage indisponible : on repart du modèle par défaut */
  }
  return createDefaultProject()
}

const snapshot = (p: Project): Snapshot => ({ nodes: p.nodes, variables: p.variables, name: p.name, rootId: p.rootId })

let toastCounter = 0

export const useEditor = create<EditorState>((set, get) => {
  /** Applique une modification au projet en l'enregistrant dans l'historique. */
  const commit = (change: (p: Project) => Partial<Project> | null, coalesceKey?: string) => {
    const { project, past, lastEdit } = get()
    const patch = change(project)
    if (!patch) return
    const now = Date.now()
    const merge = coalesceKey && lastEdit?.key === coalesceKey && now - lastEdit.at < COALESCE_MS
    set({
      project: { ...project, ...patch },
      past: merge ? past : [...past, snapshot(project)].slice(-HISTORY_LIMIT),
      future: [],
      lastEdit: coalesceKey ? { key: coalesceKey, at: now } : null,
    })
  }

  const insertAt = (type: BrickType, parentId: string, index: number) => {
    let newId = ''
    commit((p) => {
      const node = makeNode(p.nodes, type)
      newId = node.id
      return { nodes: insertNode(p.nodes, node, parentId, index) }
    })
    set({ selectedId: newId })
    return newId
  }

  return {
    project: loadInitial(),
    selectedId: null,
    hoveredId: null,
    past: [],
    future: [],
    lastEdit: null,
    clipboard: null,
    dragging: null,
    dropTarget: null,
    editingId: null,
    toast: null,

    select: (id) => set({ selectedId: id }),
    hover: (id) => set({ hoveredId: id }),
    notify: (text) => set({ toast: { id: ++toastCounter, text } }),
    setEditing: (editingId) => set({ editingId }),

    addBrick: (type, at) => {
      const { project } = get()
      const parentId = at?.parentId ?? project.rootId
      const index = at?.index ?? project.nodes[parentId].children.length
      return insertAt(type, parentId, index)
    },

    addBrickNearSelection: (type) => {
      const { project, selectedId } = get()
      const sel = selectedId ? project.nodes[selectedId] : null
      if (sel && isContainer(sel.type)) return insertAt(type, sel.id, sel.children.length)
      if (sel?.parent) {
        const parent = project.nodes[sel.parent]
        return insertAt(type, parent.id, parent.children.indexOf(sel.id) + 1)
      }
      return insertAt(type, project.rootId, project.nodes[project.rootId].children.length)
    },

    setDragging: (dragging) => set({ dragging, dropTarget: dragging ? get().dropTarget : null }),
    setDropTarget: (dropTarget) => {
      const cur = get().dropTarget
      if (cur?.id === dropTarget?.id && cur?.position === dropTarget?.position) return
      set({ dropTarget })
    },

    drop: (target) => {
      const { dragging, project } = get()
      set({ dragging: null, dropTarget: null })
      if (!dragging) return
      const dragId = dragging.kind === 'move' ? dragging.id : null
      if (!canDrop(project.nodes, dragId, target)) return
      const spot = resolveDrop(project.nodes, target)!
      if (dragging.kind === 'new') insertAt(dragging.type, spot.parentId, spot.index)
      else get().move(dragging.id, spot.parentId, spot.index)
    },

    move: (id, parentId, index) => {
      commit((p) => {
        const next = moveNode(p.nodes, id, parentId, index)
        return next === p.nodes ? null : { nodes: next }
      })
      set({ selectedId: id })
    },

    moveBy: (id, delta) =>
      commit((p) => {
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
      const { clipboard, project, selectedId } = get()
      if (!clipboard) return
      const sel = selectedId ? project.nodes[selectedId] : null
      let parentId = project.rootId
      let index = project.nodes[project.rootId].children.length
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

    updateStyle: (id, patch) =>
      commit((p) => {
        const style = { ...p.nodes[id].style, ...patch }
        for (const k of Object.keys(patch) as (keyof BrickStyle)[]) {
          if (patch[k] === undefined || patch[k] === '') delete style[k]
        }
        return { nodes: { ...p.nodes, [id]: { ...p.nodes[id], style } } }
      }, `style:${id}:${Object.keys(patch).join(',')}`),

    updateNode: (id, patch) =>
      commit(
        (p) => ({ nodes: { ...p.nodes, [id]: { ...p.nodes[id], ...patch } } }),
        `node:${id}:${Object.keys(patch).join(',')}`,
      ),

    setActions: (id, actions) =>
      commit((p) => ({ nodes: { ...p.nodes, [id]: { ...p.nodes[id], onClick: actions } } }), `actions:${id}`),

    addVariable: (v) =>
      commit((p) => (p.variables.some((x) => x.name === v.name) ? null : { variables: [...p.variables, v] })),

    updateVariable: (name, patch) =>
      commit((p) => {
        const renaming = patch.name && patch.name !== name
        if (renaming && p.variables.some((x) => x.name === patch.name)) return null
        return {
          variables: p.variables.map((v) => (v.name === name ? { ...v, ...patch } : v)),
          nodes: renaming ? renameVariableInNodes(p.nodes, name, patch.name!) : p.nodes,
        }
      }, `var:${name}:${Object.keys(patch).join(',')}`),

    removeVariable: (name) => commit((p) => ({ variables: p.variables.filter((v) => v.name !== name) })),

    renameProject: (name) => commit(() => ({ name }), 'project-name'),

    loadProject: (next) => {
      commit(() => ({ ...next }))
      set({ selectedId: null, hoveredId: null })
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
      const sel = get().selectedId
      if (sel && !prev.nodes[sel]) set({ selectedId: null })
    },

    redo: () => {
      const { past, future, project } = get()
      const next = future[0]
      if (!next) return
      set({ project: { ...project, ...next }, past: [...past, snapshot(project)], future: future.slice(1), lastEdit: null })
      const sel = get().selectedId
      if (sel && !next.nodes[sel]) set({ selectedId: null })
    },
  }
})

/* Sauvegarde automatique (avec un léger délai pour ne pas écrire à chaque frappe). */
let saveTimer: ReturnType<typeof setTimeout> | undefined
useEditor.subscribe((state, prev) => {
  if (state.project === prev.project) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project))
    } catch {
      /* quota dépassé ou stockage bloqué : on ignore */
    }
  }, 300)
})
