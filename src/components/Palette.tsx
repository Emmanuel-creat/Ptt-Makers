import { Lightbulb, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BRICKS, CATEGORIES, PALETTE_ORDER } from '../model/bricks'
import type { BrickType } from '../model/types'
import { useEditor } from '../store/editor'
import { useWorkspace } from '../store/workspace'
import { BrickBadge } from './BrickIcon'

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Bibliothèque des briques : glisser vers la zone de création, ou cliquer pour ajouter. */
export function Palette() {
  const [query, setQuery] = useState('')
  const beginner = useWorkspace((s) => s.beginner)
  const addBrickNearSelection = useEditor((s) => s.addBrickNearSelection)
  const setDragging = useEditor((s) => s.setDragging)

  const groups = useMemo(() => {
    const q = normalize(query.trim())
    return CATEGORIES.map((cat) => ({
      cat,
      items: PALETTE_ORDER.filter((t) => {
        const def = BRICKS[t]
        if (def.category !== cat.id) return false
        return !q || normalize(`${def.label} ${def.description}`).includes(q)
      }),
    })).filter((g) => g.items.length)
  }, [query])

  const onDragStart = (e: React.DragEvent, type: BrickType) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', `ptt:${type}`)
    setDragging({ kind: 'new', type })
  }

  return (
    <div className="pm-palette">
      <div className="pm-search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          placeholder="Rechercher une brique…"
          aria-label="Rechercher une brique"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="pm-search-clear" aria-label="Effacer la recherche" onClick={() => setQuery('')}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="pm-palette-scroll">
        {beginner && (
          <p className="pm-hint">
            <Lightbulb size={15} aria-hidden="true" />
            <span>
              <strong>Glisse</strong> une brique dans la zone de création, ou <strong>clique</strong> dessus pour l'ajouter dans la
              brique sélectionnée.
            </span>
          </p>
        )}
        {groups.map(({ cat, items }) => (
          <section key={cat.id} className="pm-palette-group" data-cat={cat.id}>
            <h3 className="pm-palette-title">
              <span className="pm-cat-dot" aria-hidden="true" />
              {cat.label}
            </h3>
            {beginner && <p className="pm-palette-desc">{cat.description}</p>}
            <div className="pm-palette-grid">
              {items.map((type) => {
                const def = BRICKS[type]
                return (
                  <button
                    key={type}
                    type="button"
                    className="pm-tile"
                    data-cat={def.category}
                    draggable
                    onDragStart={(e) => onDragStart(e, type)}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => addBrickNearSelection(type)}
                    data-tip={def.description}
                    data-tip-side="right"
                    aria-label={`Ajouter : ${def.label}. ${def.description}`}
                  >
                    <BrickBadge type={type} />
                    <span className="pm-tile-label">{def.label}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
        {!groups.length && <p className="pm-empty-small">Aucune brique ne correspond à « {query} ».</p>}
      </div>
    </div>
  )
}
