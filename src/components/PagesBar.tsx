import { ArrowLeft, ArrowRight, Copy, FileText, Home, LayoutTemplate, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { PAGE_TEMPLATES } from '../model/pageTemplates'
import { useState } from 'react'
import { useEditor } from '../store/editor'
import { Popover } from './fields'

/** Onglets des pages du projet, au-dessus de la zone de création. */
export function PagesBar() {
  const pages = useEditor((s) => s.project.pages)
  const nodes = useEditor((s) => s.project.nodes)
  const rootId = useEditor((s) => s.project.rootId)
  const current = useEditor((s) => s.currentPage)
  const { setPage, addPage, updateNode } = useEditor.getState()
  const [renaming, setRenaming] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [templates, setTemplates] = useState(false)

  return (
    <div className="pm-pages" role="tablist" aria-label="Pages du projet">
      <div className="pm-pages-scroll">
        {pages.map((id) => {
          const page = nodes[id]
          if (!page) return null
          const active = id === current
          return (
            <div key={id} className={`pm-page-tab ${active ? 'is-active' : ''}`}>
              {renaming === id ? (
                <input
                  className="pm-page-rename"
                  autoFocus
                  defaultValue={page.name}
                  aria-label="Nom de la page"
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== page.name) updateNode(id, { name: v })
                    setRenaming(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                />
              ) : (
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className="pm-page-btn"
                  onClick={() => setPage(id)}
                  onDoubleClick={() => setRenaming(id)}
                  data-tip={id === rootId ? "Page d'accueil · double-clic pour renommer" : 'Double-clic pour renommer'}
                >
                  {id === rootId ? <Home size={13} aria-hidden="true" /> : <FileText size={13} aria-hidden="true" />}
                  <span>{page.name}</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
      {pages.includes(current) && (
        <div className="pm-popover-anchor">
          <button
            type="button"
            className="pm-page-more"
            aria-label={`Options de la page ${nodes[current]?.name ?? ''}`}
            data-tip="Options de la page"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <MoreHorizontal size={15} />
          </button>
          {menu && <PageMenu id={current} onRename={() => setRenaming(current)} onClose={() => setMenu(false)} />}
        </div>
      )}
      <button type="button" className="pm-page-add" onClick={() => addPage()} aria-label="Ajouter une page" data-tip="Ajouter une page">
        <Plus size={14} /> <span className="pm-hide-sm">Page</span>
      </button>
      <div className="pm-popover-anchor">
        <button
          type="button"
          className="pm-page-add"
          aria-label="Ajouter une page toute faite"
          data-tip="Gabarits : tableau de bord, paramètres, connexion, liste et détail"
          aria-expanded={templates}
          onClick={() => setTemplates(!templates)}
        >
          <LayoutTemplate size={14} /> <span className="pm-hide-sm">Gabarit</span>
        </button>
        {templates && <TemplateMenu onClose={() => setTemplates(false)} />}
      </div>
    </div>
  )
}

/** Les gabarits de pages : un clic ajoute la ou les pages, avec leurs variables. */
function TemplateMenu({ onClose }: { onClose: () => void }) {
  const addPageTemplate = useEditor((s) => s.addPageTemplate)
  return (
    <Popover onClose={onClose}>
      <p className="pm-popover-title">Ajouter une page toute faite</p>
      {PAGE_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          className="pm-popover-item pm-template-item"
          onClick={() => {
            addPageTemplate(t.id)
            onClose()
          }}
        >
          <strong>{t.name}</strong>
          <span>{t.description}</span>
        </button>
      ))}
    </Popover>
  )
}

function PageMenu({ id, onRename, onClose }: { id: string; onRename: () => void; onClose: () => void }) {
  const pages = useEditor((s) => s.project.pages)
  const rootId = useEditor((s) => s.project.rootId)
  const name = useEditor((s) => s.project.nodes[id]?.name)
  const { duplicatePage, removePage, setHomePage, movePage } = useEditor.getState()
  const i = pages.indexOf(id)
  const run = (fn: () => void) => () => {
    fn()
    onClose()
  }
  return (
    <Popover onClose={onClose}>
      <p className="pm-popover-title">{name}</p>
      <button type="button" className="pm-popover-item" onClick={run(onRename)}>
        <Pencil size={14} /> Renommer
      </button>
      <button type="button" className="pm-popover-item" onClick={run(() => duplicatePage(id))}>
        <Copy size={14} /> Dupliquer
      </button>
      {id !== rootId && (
        <button type="button" className="pm-popover-item" onClick={run(() => setHomePage(id))}>
          <Home size={14} /> Définir comme page d'accueil
        </button>
      )}
      <button type="button" className="pm-popover-item" disabled={i <= 0} onClick={run(() => movePage(id, -1))}>
        <ArrowLeft size={14} /> Déplacer à gauche
      </button>
      <button type="button" className="pm-popover-item" disabled={i >= pages.length - 1} onClick={run(() => movePage(id, 1))}>
        <ArrowRight size={14} /> Déplacer à droite
      </button>
      <button
        type="button"
        className="pm-popover-item is-danger"
        disabled={pages.length < 2}
        onClick={run(() => {
          if (confirm(`Supprimer la page « ${name} » et tout son contenu ?`)) removePage(id)
        })}
      >
        <Trash2 size={14} /> Supprimer la page
      </button>
    </Popover>
  )
}
