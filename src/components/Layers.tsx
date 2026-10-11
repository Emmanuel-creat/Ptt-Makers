import { ChevronRight, Component, EyeOff, Repeat, Variable, Zap } from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { EVENT_FIELDS, countActions } from '../model/actions'
import { isContainer } from '../model/bricks'
import { canDrop } from '../model/tree'
import type { BrickNode, DropPosition } from '../model/types'
import { useEditor } from '../store/editor'
import { BrickBadge } from './BrickIcon'
import { useRowWindow } from './virtual'

/** Hauteur d'une ligne de calque (voir .pm-layer). */
const ROW = 30

interface LayerRow {
  id: string
  depth: number
}

/** Les lignes visibles de l'arbre, dans l'ordre : on ne descend pas dans les conteneurs repliés. */
function layerRows(nodes: Record<string, BrickNode>, rootId: string, closed: Set<string>): LayerRow[] {
  const rows: LayerRow[] = []
  const walk = (id: string, depth: number) => {
    const node = nodes[id]
    if (!node) return
    rows.push({ id, depth })
    if (isContainer(node.type) && !closed.has(id)) for (const c of node.children) walk(c, depth + 1)
  }
  walk(rootId, 0)
  return rows
}

/**
 * Arbre des calques : la structure du projet, réorganisable par glisser-déposer.
 * L'arbre est mis à plat et fenêtré : il reste fluide avec des milliers de briques.
 */
export function Layers() {
  const rootId = useEditor((s) => s.currentPage)
  const nodes = useEditor((s) => s.project.nodes)
  const selectedId = useEditor((s) => s.selectedId)
  const [closed, setClosed] = useState<Set<string>>(() => new Set())
  const rows = useMemo(() => layerRows(nodes, rootId, closed), [nodes, rootId, closed])
  const ref = useRef<HTMLDivElement>(null)
  const win = useRowWindow(ref, rows.length, ROW)

  const toggle = (id: string) =>
    setClosed((c) => {
      const next = new Set(c)
      if (!next.delete(id)) next.add(id)
      return next
    })

  // La brique choisie sur le canevas : on ouvre ses conteneurs et on l'amène à l'écran.
  useEffect(() => {
    if (!selectedId) return
    const { nodes } = useEditor.getState().project
    const parents: string[] = []
    for (let p = nodes[selectedId]?.parent; p; p = nodes[p]?.parent ?? null) parents.push(p)
    if (parents.some((p) => closed.has(p))) {
      setClosed((c) => new Set([...c].filter((id) => !parents.includes(id))))
      return
    }
    const el = ref.current
    const i = rows.findIndex((r) => r.id === selectedId)
    if (!el || i < 0) return
    const top = i * ROW
    if (top < el.scrollTop || top + ROW > el.scrollTop + el.clientHeight) el.scrollTop = Math.max(0, top - el.clientHeight / 3)
    // Seulement quand la sélection change (ou qu'un conteneur vient de s'ouvrir pour elle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, closed])

  return (
    <div className="pm-layers" role="tree" aria-label="Calques du projet" ref={ref}>
      {win.before > 0 && <div aria-hidden="true" style={{ height: win.before }} />}
      {rows.slice(win.start, win.end).map((r) => (
        <LayerItem key={r.id} id={r.id} depth={r.depth} open={!closed.has(r.id)} onToggle={toggle} />
      ))}
      {win.after > 0 && <div aria-hidden="true" style={{ height: win.after }} />}
    </div>
  )
}

const LayerItem = memo(function LayerItem({ id, depth, open, onToggle }: { id: string; depth: number; open: boolean; onToggle: (id: string) => void }) {
  const node = useEditor((s) => s.project.nodes[id])
  const selected = useEditor((s) => s.selectedId === id || s.selection.includes(id))
  const hovered = useEditor((s) => s.hoveredId === id)
  const drop = useEditor((s) => (s.dropTarget?.id === id ? s.dropTarget.position : null))
  const { select, toggleSelect, hover, setDragging, setDropTarget, updateNode } = useEditor.getState()
  const [editing, setEditing] = useState(false)
  if (!node) return null
  const actionCount = EVENT_FIELDS.reduce((n, f) => n + countActions(node[f]), 0)
  const container = isContainer(node.type)
  const hasChildren = node.children.length > 0

  const onDragOver = (e: React.DragEvent) => {
    const { dragging, project } = useEditor.getState()
    if (!dragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = (e.clientY - rect.top) / rect.height
    let position: DropPosition
    if (!node.parent) position = 'inside'
    else if (container) position = y < 0.28 ? 'before' : y > 0.72 ? 'after' : 'inside'
    else position = y < 0.5 ? 'before' : 'after'
    const target = { id, position }
    if (!canDrop(project.nodes, dragging.kind === 'move' ? dragging.id : null, target)) {
      setDropTarget(null)
      return
    }
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = dragging.kind === 'new' ? 'copy' : 'move'
    setDropTarget(target)
  }

  return (
    <div role="treeitem" aria-level={depth + 1} aria-selected={selected} aria-expanded={container && hasChildren ? open : undefined}>
      <div
        className={`pm-layer ${selected ? 'is-selected' : ''} ${hovered ? 'is-hovered' : ''} ${drop ? `drop-${drop}` : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable={!!node.parent && !editing}
        onDragStart={(e) => {
          e.stopPropagation()
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', `ptt-move:${id}`)
          setDragging({ kind: 'move', id })
        }}
        onDragEnd={() => setDragging(null)}
        onDragOver={onDragOver}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const t = useEditor.getState().dropTarget
          if (t) useEditor.getState().drop(t)
        }}
        onClick={(e) => (e.shiftKey || e.ctrlKey || e.metaKey ? toggleSelect(id) : select(id))}
        onMouseEnter={() => hover(id)}
        onMouseLeave={() => hover(null)}
        onDoubleClick={() => node.parent && setEditing(true)}
      >
        <button
          type="button"
          className={`pm-layer-toggle ${hasChildren ? '' : 'is-empty'}`}
          aria-label={open ? 'Replier' : 'Déplier'}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(id)
          }}
        >
          {hasChildren && <ChevronRight size={13} className={open ? 'is-open' : ''} />}
        </button>
        <BrickBadge type={node.type} size="sm" />
        {editing ? (
          <input
            className="pm-layer-rename"
            autoFocus
            defaultValue={node.name}
            aria-label="Renommer la brique"
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== node.name) updateNode(id, { name: v })
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span className="pm-layer-name">
            {node.name}
            {typeof node.props.text === 'string' && node.props.text.trim() && (
              <span className="pm-layer-text"> · {node.props.text}</span>
            )}
          </span>
        )}
        <span className="pm-layer-flags">
          {node.instanceOf && (
            <span data-tip="Copie liée d’un composant">
              <Component size={13} aria-label="Copie liée" />
            </span>
          )}
          {node.showIf && (
            <span data-tip={`Visible si « ${node.showIf} » est vrai`}>
              <Variable size={13} aria-label="Affichage conditionnel" />
            </span>
          )}
          {node.hidden && (
            <span data-tip="Masquée au démarrage">
              <EyeOff size={13} aria-label="Masquée au démarrage" />
            </span>
          )}
          {node.type === 'repeat' && (
            <span data-tip={node.props.source ? `Une copie par élément de « ${node.props.source} »` : 'Choisis une liste à parcourir'}>
              <Repeat size={13} aria-label="Répétition" />
            </span>
          )}
          {actionCount > 0 && (
            <span data-tip={`${actionCount} action(s)`}>
              <Zap size={13} aria-label="Interactions" />
            </span>
          )}
        </span>
      </div>
    </div>
  )
})
