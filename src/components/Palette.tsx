import { Lightbulb, Package, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BRICKS, CATEGORIES, PALETTE_ORDER } from '../model/bricks'
import type { BrickType } from '../model/types'
import { useEditor } from '../store/editor'
import { useWorkspace } from '../store/workspace'
import { MOBILE_QUERY } from '../hooks/useIsMobile'
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
        <ComponentsGroup query={normalize(query.trim())} />
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
                    onClick={() => {
                      addBrickNearSelection(type)
                      // Sur mobile, on montre tout de suite la brique ajoutée.
                      if (window.matchMedia(MOBILE_QUERY).matches) useWorkspace.getState().set({ mobileView: 'create' })
                    }}
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

/** Blocs enregistrés par l'utilisateur : on en insère une copie, au clic ou par glisser-déposer. */
function ComponentsGroup({ query }: { query: string }) {
  const components = useEditor((s) => s.project.components)
  const { insertComponent, removeComponent, setDragging } = useEditor.getState()
  const list = (components ?? []).filter((c) => !query || normalize(c.name).includes(query))
  if (!list.length) return null
  return (
    <section className="pm-palette-group" data-cat="composants">
      <h3 className="pm-palette-title">
        <span className="pm-cat-dot" aria-hidden="true" />
        Mes composants
      </h3>
      <div className="pm-palette-grid">
        {list.map((c) => (
          <div key={c.id} className="pm-tile-wrap">
            <button
              type="button"
              className="pm-tile"
              data-cat="composants"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy'
                e.dataTransfer.setData('text/plain', `ptt-composant:${c.id}`)
                setDragging({ kind: 'component', id: c.id })
              }}
              onDragEnd={() => setDragging(null)}
              onClick={() => {
                insertComponent(c.id)
                if (window.matchMedia(MOBILE_QUERY).matches) useWorkspace.getState().set({ mobileView: 'create' })
              }}
              aria-label={`Ajouter le composant ${c.name}`}
              data-tip={`${Object.keys(c.nodes).length} brique(s) · copies liées`}
              data-tip-side="right"
            >
              <span className="pm-brick-badge pm-brick-badge-md" data-cat="composants">
                <Package size={16} aria-hidden="true" />
              </span>
              <span className="pm-tile-label">{c.name}</span>
            </button>
            <button
              type="button"
              className="pm-tile-remove"
              aria-label={`Retirer le composant ${c.name}`}
              onClick={() => {
                if (confirm(`Retirer « ${c.name} » de Mes composants ? Les copies déjà placées restent, mais ne seront plus liées.`)) removeComponent(c.id)
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
