import { ArrowDown, ArrowUp, ChevronRight, Copy, CornerLeftUp, LayoutTemplate, MousePointerClick, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BRICKS, isContainer } from '../model/bricks'
import { canDrop, getPath } from '../model/tree'
import type { DropPosition, DropTarget } from '../model/types'
import { useEditor } from '../store/editor'
import { DEVICE_WIDTH, useWorkspace } from '../store/workspace'
import { BrickIcon } from './BrickIcon'
import { CanvasNode, INLINE_EDITABLE } from './CanvasNode'
import { IconButton } from './ui'

type Rect = { top: number; left: number; width: number; height: number; horizontal: boolean }

const closestNode = (el: EventTarget | null): HTMLElement | null =>
  el instanceof Element ? (el.closest('[data-ptt-id]') as HTMLElement | null) : null

/** Zone de création : rendu éditable du projet. */
export function Canvas() {
  const rootId = useEditor((s) => s.project.rootId)
  const isEmpty = useEditor((s) => s.project.nodes[s.project.rootId].children.length === 0)
  const device = useWorkspace((s) => s.device)
  const beginner = useWorkspace((s) => s.beginner)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [, force] = useState(0)

  // Les cadres (sélection, survol, dépôt) suivent le contenu quand il change de taille.
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => force((n) => n + 1))
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  const onClick = (e: React.MouseEvent) => {
    const el = closestNode(e.target)
    if (!el) return
    if (useEditor.getState().editingId === el.dataset.pttId) return
    e.preventDefault()
    useEditor.getState().select(el.dataset.pttId!)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const el = closestNode(e.target)
    const { project, setEditing } = useEditor.getState()
    const node = el && project.nodes[el.dataset.pttId!]
    if (node && INLINE_EDITABLE.has(node.type)) {
      e.preventDefault()
      setEditing(node.id)
    }
  }

  const onMouseOver = (e: React.MouseEvent) => {
    const el = closestNode(e.target)
    const id = el?.dataset.pttId ?? null
    if (useEditor.getState().hoveredId !== id) useEditor.getState().hover(id)
  }

  const onDragStart = (e: React.DragEvent) => {
    const el = closestNode(e.target)
    if (!el || !el.draggable) return
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `ptt-move:${el.dataset.pttId}`)
    useEditor.getState().setDragging({ kind: 'move', id: el.dataset.pttId! })
  }

  const onDragOver = (e: React.DragEvent) => {
    const { dragging, project, setDropTarget } = useEditor.getState()
    if (!dragging) return
    const el = closestNode(e.target)
    const target = el ? computeDrop(el, e.clientX, e.clientY, project.nodes[el.dataset.pttId!]?.parent == null) : { id: rootId, position: 'inside' as const }
    const dragId = dragging.kind === 'move' ? dragging.id : null
    if (!target || !canDrop(project.nodes, dragId, target) || (dragId && target.id === dragId)) {
      setDropTarget(null)
      return
    }
    e.preventDefault()
    e.dataTransfer.dropEffect = dragging.kind === 'new' ? 'copy' : 'move'
    setDropTarget(target)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const { dropTarget, drop, setDragging } = useEditor.getState()
    if (dropTarget) drop(dropTarget)
    else setDragging(null)
  }

  const width = DEVICE_WIDTH[device]

  return (
    <div className="pm-canvas">
      <div
        className="pm-canvas-scroll"
        onClick={(e) => {
          if (e.target === e.currentTarget) useEditor.getState().select(null)
        }}
        onDragOver={(e) => {
          // Déposer dans le vide autour de la page = ajouter à la fin de la page.
          if (e.target !== e.currentTarget) return
          const { dragging, setDropTarget } = useEditor.getState()
          if (!dragging) return
          e.preventDefault()
          setDropTarget({ id: rootId, position: 'inside' })
        }}
        onDrop={onDrop}
      >
        <div className={`pm-frame-wrap device-${device}`} ref={wrapRef} style={{ width: width ? width : undefined }}>
          <div
            className="pm-frame"
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onMouseOver={onMouseOver}
            onMouseLeave={() => useEditor.getState().hover(null)}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={() => useEditor.getState().setDragging(null)}
          >
            <CanvasNode id={rootId} />
            {isEmpty && <EmptyState beginner={beginner} />}
          </div>
          <Overlays wrapRef={wrapRef} />
        </div>
      </div>
      <Breadcrumb />
    </div>
  )
}

/** Le parent range-t-il ses enfants de gauche à droite (ligne ou grille) ? */
function isHorizontalParent(el: HTMLElement): boolean {
  const parent = el.parentElement?.closest('[data-ptt-id]') as HTMLElement | null
  if (!parent) return false
  const ps = getComputedStyle(parent)
  return ps.display === 'grid' || ps.flexDirection.startsWith('row')
}

/** Calcule où déposer selon la position du pointeur dans la brique survolée. */
function computeDrop(el: HTMLElement, x: number, y: number, isRoot: boolean): DropTarget | null {
  const id = el.dataset.pttId!
  if (isRoot) return { id, position: 'inside' }
  const rect = el.getBoundingClientRect()
  const horizontal = isHorizontalParent(el)
  const ratio = horizontal ? (x - rect.left) / rect.width : (y - rect.top) / rect.height
  const node = useEditor.getState().project.nodes[id]
  let position: DropPosition
  if (node && isContainer(node.type)) {
    const edge = Math.min(0.25, 18 / Math.max(1, horizontal ? rect.width : rect.height))
    position = ratio < edge ? 'before' : ratio > 1 - edge ? 'after' : 'inside'
  } else {
    position = ratio < 0.5 ? 'before' : 'after'
  }
  return { id, position }
}

function useRectOf(id: string | null, wrapRef: React.RefObject<HTMLDivElement | null>): Rect | null {
  const project = useEditor((s) => s.project)
  const device = useWorkspace((s) => s.device)
  const [rect, setRect] = useState<Rect | null>(null)
  const measure = useCallback(() => {
    const wrap = wrapRef.current
    const el = id && wrap ? (wrap.querySelector(`[data-ptt-id="${CSS.escape(id)}"]`) as HTMLElement | null) : null
    if (!wrap || !el) {
      setRect(null)
      return
    }
    const w = wrap.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    setRect({ top: r.top - w.top, left: r.left - w.left, width: r.width, height: r.height, horizontal: isHorizontalParent(el) })
  }, [id, wrapRef])
  useLayoutEffect(measure, [measure, project, device])
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, wrapRef])
  return rect
}

function Overlays({ wrapRef }: { wrapRef: React.RefObject<HTMLDivElement | null> }) {
  const selectedId = useEditor((s) => s.selectedId)
  const hoveredId = useEditor((s) => s.hoveredId)
  const dropTarget = useEditor((s) => s.dropTarget)
  const dragging = useEditor((s) => s.dragging)
  const editingId = useEditor((s) => s.editingId)
  const sel = useRectOf(selectedId, wrapRef)
  const hov = useRectOf(hoveredId !== selectedId ? hoveredId : null, wrapRef)
  const drop = useRectOf(dropTarget?.id ?? null, wrapRef)
  const nodes = useEditor((s) => s.project.nodes)
  const selNode = selectedId ? nodes[selectedId] : null
  const hovNode = hoveredId ? nodes[hoveredId] : null

  return (
    <div className="pm-overlays" aria-hidden={dragging ? true : undefined}>
      {hov && hovNode && !dragging && (
        <div className="pm-ov-hover" style={box(hov)} data-cat={BRICKS[hovNode.type].category}>
          <span className="pm-ov-tag">{hovNode.name}</span>
        </div>
      )}
      {sel && selNode && !dragging && (
        <div className={`pm-ov-select ${sel.top < 30 ? 'is-top' : ''} ${narrow(sel)}`} style={box(sel)} data-cat={BRICKS[selNode.type].category}>
          <span className="pm-ov-tag">
            <BrickIcon type={selNode.type} size={12} />
            {selNode.name}
          </span>
          {selNode.parent && !editingId && <SelectionToolbar id={selNode.id} />}
        </div>
      )}
      {drop && dropTarget && dragging && <DropIndicator rect={drop} target={dropTarget} />}
    </div>
  )
}

const box = (r: Rect) => ({ top: r.top, left: r.left, width: r.width, height: r.height })
const narrow = (r: Rect) => (r.width < 240 ? 'is-narrow' : '')

function DropIndicator({ rect, target }: { rect: Rect; target: DropTarget }) {
  const name = useEditor((s) => s.project.nodes[target.id]?.name)
  if (target.position === 'inside') {
    return (
      <div className="pm-ov-drop-inside" style={box(rect)}>
        <span className="pm-ov-tag">Dans « {name} »</span>
      </div>
    )
  }
  const horizontal = rect.horizontal
  const before = target.position === 'before'
  const style = horizontal
    ? { top: rect.top, left: before ? rect.left - 2 : rect.left + rect.width - 1, width: 3, height: rect.height }
    : { top: before ? rect.top - 2 : rect.top + rect.height - 1, left: rect.left, width: rect.width, height: 3 }
  return <div className={`pm-ov-drop-line ${horizontal ? 'is-vertical' : ''}`} style={style} />
}

function SelectionToolbar({ id }: { id: string }) {
  const node = useEditor((s) => s.project.nodes[id])
  const siblings = useEditor((s) => (node?.parent ? s.project.nodes[node.parent].children : []))
  const { moveBy, duplicate, remove, select } = useEditor.getState()
  const i = siblings.indexOf(id)
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }
  return (
    <div className="pm-ov-toolbar" role="toolbar" aria-label="Actions sur la brique" onMouseDown={(e) => e.stopPropagation()}>
      <IconButton label="Sélectionner le parent" shortcut="Échap" tipSide="top" onClick={stop(() => select(node.parent))}>
        <CornerLeftUp size={14} />
      </IconButton>
      <IconButton label="Monter" shortcut="Alt+↑" tipSide="top" disabled={i <= 0} onClick={stop(() => moveBy(id, -1))}>
        <ArrowUp size={14} />
      </IconButton>
      <IconButton label="Descendre" shortcut="Alt+↓" tipSide="top" disabled={i >= siblings.length - 1} onClick={stop(() => moveBy(id, 1))}>
        <ArrowDown size={14} />
      </IconButton>
      <IconButton label="Dupliquer" shortcut="Ctrl+D" tipSide="top" onClick={stop(() => duplicate(id))}>
        <Copy size={14} />
      </IconButton>
      <IconButton label="Supprimer" shortcut="Suppr" tipSide="top" className="is-danger" onClick={stop(() => remove(id))}>
        <Trash2 size={14} />
      </IconButton>
    </div>
  )
}

function EmptyState({ beginner }: { beginner: boolean }) {
  const setWs = useWorkspace((s) => s.set)
  return (
    <div className="pm-empty-page">
      <div className="pm-empty-illu" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2>Ta page est prête à être construite</h2>
      <p>
        <MousePointerClick size={15} aria-hidden="true" /> Glisse une brique depuis la gauche, ou clique dessus pour l'ajouter.
      </p>
      {beginner && (
        <button type="button" className="pm-btn pm-btn-secondary" onClick={() => setWs({ dialog: 'templates' })}>
          <LayoutTemplate size={15} /> Partir d'un modèle
        </button>
      )}
    </div>
  )
}

function Breadcrumb() {
  const selectedId = useEditor((s) => s.selectedId)
  const nodes = useEditor((s) => s.project.nodes)
  const select = useEditor((s) => s.select)
  const path = selectedId ? getPath(nodes, selectedId) : []
  return (
    <nav className="pm-breadcrumb" aria-label="Emplacement de la brique sélectionnée">
      {path.length === 0 ? (
        <span className="pm-muted">Aucune brique sélectionnée · double-clique un texte pour le modifier directement</span>
      ) : (
        path.map((n, i) => (
          <span key={n.id} className="pm-crumb">
            {i > 0 && <ChevronRight size={12} aria-hidden="true" />}
            <button type="button" className={i === path.length - 1 ? 'is-current' : ''} onClick={() => select(n.id)}>
              <BrickIcon type={n.type} size={12} />
              {n.name}
            </button>
          </span>
        ))
      )}
    </nav>
  )
}
