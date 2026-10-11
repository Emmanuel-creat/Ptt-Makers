import { Copy, FileCode, FileJson, Files, FolderOpen, Plus, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { bundle, generate } from '../codegen/generate'
import { TEMPLATES, parseProject } from '../model/templates'
import { useEditor } from '../store/editor'
import { listProjects } from '../store/library'
import { useWorkspace } from '../store/workspace'
import { downloadFile, slugify } from '../utils/download'
import { Kbd, MOD } from './ui'

export function Dialogs() {
  const dialog = useWorkspace((s) => s.dialog)
  const close = () => useWorkspace.getState().set({ dialog: null })
  if (dialog === 'templates') return <TemplatesDialog onClose={close} />
  if (dialog === 'shortcuts') return <ShortcutsDialog onClose={close} />
  if (dialog === 'export') return <ExportDialog onClose={close} />
  if (dialog === 'projects') return <ProjectsDialog onClose={close} />
  return null
}

function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button, [href], input')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        // Garde le focus à l'intérieur de la fenêtre.
        const items = [...ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea')].filter((el) => !el.hasAttribute('disabled'))
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [onClose])
  return (
    <div className="pm-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`pm-modal ${wide ? 'is-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="pm-modal-title" ref={ref}>
        <header className="pm-modal-head">
          <div>
            <h2 id="pm-modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="pm-icon-btn" aria-label="Fermer" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="pm-modal-body">{children}</div>
      </div>
    </div>
  )
}

function TemplatesDialog({ onClose }: { onClose: () => void }) {
  const { createProject, notify } = useEditor.getState()
  return (
    <Modal title="Choisir un modèle" subtitle="Le modèle s'ouvre dans un nouveau projet. Ton projet actuel reste dans « Mes projets »." onClose={onClose} wide>
      <div className="pm-templates">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="pm-template"
            style={{ '--accent': t.accent } as React.CSSProperties}
            onClick={() => {
              createProject(t.create())
              notify(`Nouveau projet « ${t.name} » créé`)
              onClose()
            }}
          >
            <TemplateThumb id={t.id} />
            <span className="pm-template-name">{t.name}</span>
            <span className="pm-template-desc">{t.description}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

/** Vignette abstraite de chaque modèle. */
function TemplateThumb({ id }: { id: string }) {
  return (
    <span className={`pm-thumb pm-thumb-${id}`} aria-hidden="true">
      <span className="a" />
      <span className="b" />
      <span className="c" />
      <span className="d" />
    </span>
  )
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const project = useEditor((s) => s.project)
  const { createProject, notify } = useEditor.getState()
  const fileRef = useRef<HTMLInputElement>(null)
  const base = slugify(project.name)

  const exportHtml = () => {
    downloadFile(`${base}.html`, bundle(generate(project)), 'text/html')
    notify('Page HTML téléchargée')
  }
  const exportFiles = () => {
    const code = generate(project)
    downloadFile('index.html', code.html, 'text/html')
    downloadFile('style.css', code.css, 'text/css')
    downloadFile('script.js', code.js, 'text/javascript')
    notify('Fichiers index.html, style.css et script.js téléchargés')
  }
  const exportJson = () => {
    downloadFile(`${base}.ptt.json`, JSON.stringify(project, null, 2), 'application/json')
    notify('Projet enregistré')
  }
  const importJson = async (file: File) => {
    try {
      const data = parseProject(JSON.parse(await file.text()))
      if (!data) throw new Error('format')
      createProject(data)
      notify(`Projet « ${data.name} » importé dans Mes projets`)
      onClose()
    } catch {
      notify("Ce fichier n'est pas un projet Ptt-Makers valide")
    }
  }

  return (
    <Modal title="Exporter et partager" subtitle="Le code généré est du HTML, CSS et JavaScript standard : il fonctionne partout." onClose={onClose}>
      <div className="pm-export-list">
        <button type="button" className="pm-export" onClick={exportHtml}>
          <FileCode size={22} />
          <span>
            <strong>Page HTML autonome</strong>
            <small>Un seul fichier, prêt à ouvrir ou à mettre en ligne.</small>
          </span>
        </button>
        <button type="button" className="pm-export" onClick={exportFiles}>
          <Files size={22} />
          <span>
            <strong>Fichiers séparés</strong>
            <small>index.html, style.css et script.js, pour continuer dans un éditeur de code.</small>
          </span>
        </button>
        <button type="button" className="pm-export" onClick={exportJson}>
          <FileJson size={22} />
          <span>
            <strong>Projet Ptt-Makers (.json)</strong>
            <small>Pour sauvegarder ton projet et le rouvrir plus tard ou ailleurs.</small>
          </span>
        </button>
        <button type="button" className="pm-export" onClick={() => fileRef.current?.click()}>
          <Upload size={22} />
          <span>
            <strong>Importer un projet</strong>
            <small>Ouvre un fichier .json exporté depuis Ptt-Makers.</small>
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importJson(f)
            e.target.value = ''
          }}
        />
      </div>
    </Modal>
  )
}

const SHORTCUTS: [string[], string][] = [
  [[MOD, 'Z'], 'Annuler'],
  [[MOD, 'Maj', 'Z'], 'Rétablir'],
  [['Suppr'], 'Supprimer la brique sélectionnée'],
  [[MOD, 'D'], 'Dupliquer'],
  [[MOD, 'C'], 'Copier'],
  [[MOD, 'V'], 'Coller dans la sélection'],
  [['Alt', '↑'], 'Monter la brique'],
  [['Alt', '↓'], 'Descendre la brique'],
  [['Échap'], 'Sélectionner le parent'],
  [['Entrée'], 'Modifier le texte de la brique'],
  [['?'], 'Afficher cette aide'],
]

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const set = useWorkspace((s) => s.set)
  return (
    <Modal title="Raccourcis et aide" onClose={onClose}>
      <table className="pm-shortcuts">
        <tbody>
          {SHORTCUTS.map(([keys, label]) => (
            <tr key={label}>
              <td>
                {keys.map((k, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </td>
              <td>{label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pm-modal-foot">
        <button
          type="button"
          className="pm-btn pm-btn-secondary"
          onClick={() => {
            set({ dialog: null, onboardingDone: false })
          }}
        >
          Revoir la visite guidée
        </button>
      </div>
    </Modal>
  )
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

/** « Mes projets » : tous les projets enregistrés dans ce navigateur. */
function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const projectId = useEditor((s) => s.projectId)
  const { openProject, duplicateProject, deleteProject, saveNow } = useEditor.getState()
  const [, refresh] = useState(0)
  // La liste est lue dans le stockage du navigateur : on enregistre d'abord le projet ouvert.
  useState(() => saveNow())
  const projects = listProjects()
  const update = () => refresh((n) => n + 1)

  return (
    <Modal title="Mes projets" subtitle="Tes projets sont enregistrés dans ce navigateur. Exporte-les en .json pour les garder ailleurs." onClose={onClose} wide>
      <div className="pm-projects-actions">
        <button type="button" className="pm-btn pm-btn-primary" onClick={() => useWorkspace.getState().set({ dialog: 'templates' })}>
          <Plus size={16} /> Nouveau projet
        </button>
      </div>
      <ul className="pm-projects">
        {projects.map((p) => {
          const current = p.id === projectId
          return (
            <li key={p.id} className={`pm-project ${current ? 'is-current' : ''}`}>
              <button
                type="button"
                className="pm-project-open"
                onClick={() => {
                  openProject(p.id)
                  onClose()
                }}
              >
                <FolderOpen size={18} aria-hidden="true" />
                <span className="pm-project-name">{p.name || 'Sans nom'}</span>
                <span className="pm-project-meta">
                  {current ? 'Ouvert · ' : ''}
                  {p.pages} page{p.pages > 1 ? 's' : ''} · modifié le {dateFormat.format(p.updatedAt)}
                </span>
              </button>
              <button
                type="button"
                className="pm-icon-btn"
                aria-label={`Dupliquer ${p.name}`}
                data-tip="Dupliquer"
                onClick={() => {
                  duplicateProject(p.id)
                  update()
                }}
              >
                <Copy size={16} />
              </button>
              <button
                type="button"
                className="pm-icon-btn is-danger"
                aria-label={`Supprimer ${p.name}`}
                data-tip="Supprimer"
                onClick={() => {
                  if (!confirm(`Supprimer définitivement « ${p.name} » ?`)) return
                  deleteProject(p.id)
                  update()
                }}
              >
                <Trash2 size={16} />
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
