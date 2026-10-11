import { ChevronRight, EyeOff, Repeat, Variable, Zap } from 'lucide-react'
import { useState } from 'react'
import { isContainer } from '../model/bricks'
import { canDrop } from '../model/tree'
import type { DropPosition } from '../model/types'
import { useEditor } from '../store/editor'
import { BrickBadge } from './BrickIcon'

/** Arbre des calques : la structure du projet, réorganisable par glisser-déposer. */
export function Layers() {
  const rootId = useEditor((s) => s.currentPage)
  return (
    <div className="pm-layers" role="tree" aria-label="Calques du projet">
      <LayerItem id={rootId} depth={0} />
    </div>
  )
}

function LayerItem({ id, depth }: { id: string; depth: number }) {
  const node = useEditor((s) => s.project.nodes[id])
  const selected = useEditor((s) => s.selectedId === id)
  const hovered = useEditor((s) => s.hoveredId === id)
  const drop = useEditor((s) => (s.dropTarget?.id === id ? s.dropTarget.position : null))
  const { select, hover, setDragging, setDropTarget, updateNode } = useEditor.getState()
  const [open, setOpen] = useState(true)
  const [editing, setEditing] = useState(false)
  if (!node) return null
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
    <div role="treeitem" aria-selected={selected} aria-expanded={container && hasChildren ? open : undefined}>
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
        onClick={() => select(id)}
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
            setOpen(!open)
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
          {node.onClick.length > 0 && (
            <span data-tip={`${node.onClick.length} action(s) au clic`}>
              <Zap size={13} aria-label="Interactions" />
            </span>
          )}
        </span>
      </div>
      {container && open && hasChildren && (
        <div role="group">
          {node.children.map((c) => (
            <LayerItem key={c} id={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
