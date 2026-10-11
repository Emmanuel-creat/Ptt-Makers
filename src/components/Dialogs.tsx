import { Atom, Check, Copy, FileCode, FileJson, Files, FolderOpen, History, Link2, Plus, RotateCcw, Search, Smartphone, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toReact, toVue } from '../codegen/frameworks'
import { AssistantDialog } from './Assistant'
import { bundle, generate } from '../codegen/generate'
import { CHALLENGES } from '../model/challenges'
import { TEMPLATES, TEMPLATE_FAMILIES, buildProject, parseProject, type TemplateFamily } from '../model/templates'
import { useEditor } from '../store/editor'
import { listProjects } from '../store/library'
import { listVersions, removeVersion, saveVersion } from '../store/versions'
import { useWorkspace } from '../store/workspace'
import { downloadBytes, downloadFile, slugify, svgToPng } from '../utils/download'
import { zip } from '../utils/zip'
import { appIconSvg, pwaFiles } from '../codegen/pwa'
import { shareUrl } from '../utils/share'
import { Kbd, MOD } from './ui'

export function Dialogs() {
  const dialog = useWorkspace((s) => s.dialog)
  const close = () => useWorkspace.getState().set({ dialog: null })
  if (dialog === 'templates') return <TemplatesDialog onClose={close} />
  if (dialog === 'shortcuts') return <ShortcutsDialog onClose={close} />
  if (dialog === 'export') return <ExportDialog onClose={close} />
  if (dialog === 'projects') return <ProjectsDialog onClose={close} />
  if (dialog === 'challenges') return <ChallengesDialog onClose={close} />
  if (dialog === 'assistant') return <AssistantDialog onClose={close} />
  if (dialog === 'versions') return <VersionsDialog onClose={close} />
  return null
}

export function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
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

/** Pour chercher sans tenir compte des accents ni des majuscules. */
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function TemplatesDialog({ onClose }: { onClose: () => void }) {
  const { createProject, notify } = useEditor.getState()
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState<TemplateFamily | 'toutes'>('toutes')
  const words = fold(query).split(/\s+/).filter(Boolean)
  const shown = TEMPLATES.filter(
    (t) => (family === 'toutes' || t.family === family) && words.every((w) => fold(`${t.name} ${t.description}`).includes(w)),
  )
  const groups = TEMPLATE_FAMILIES.map((f) => ({ ...f, list: shown.filter((t) => t.family === f.id) })).filter((g) => g.list.length)

  return (
    <Modal title="Galerie de modèles" subtitle={`${TEMPLATES.length} modèles. Le modèle s'ouvre dans un nouveau projet ; ton projet actuel reste dans « Mes projets ».`} onClose={onClose} wide>
      <div className="pm-gallery-bar">
        <label className="pm-gallery-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" className="pm-input" aria-label="Chercher un modèle" placeholder="Chercher : facture, réservation, équipe…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="pm-gallery-families" role="radiogroup" aria-label="Familles de modèles">
          {[{ id: 'toutes' as const, label: 'Toutes' }, ...TEMPLATE_FAMILIES].map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={family === f.id} className={`pm-chip-btn ${family === f.id ? 'is-on' : ''}`} onClick={() => setFamily(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {groups.length === 0 && <p className="pm-muted pm-gallery-empty">Aucun modèle ne correspond à « {query} ».</p>}
      {groups.map((g) => (
        <section key={g.id} className="pm-gallery-group" aria-label={g.label}>
          <h3 className="pm-gallery-title">
            {g.label} <span className="pm-muted">{g.list.length}</span>
          </h3>
          <div className="pm-templates">
            {g.list.map((t) => (
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
                <TemplateThumb id={t.id} family={t.family} />
                <span className="pm-template-name">{t.name}</span>
                <span className="pm-template-desc">{t.description}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </Modal>
  )
}

/** Vignette abstraite de chaque modèle. */
function TemplateThumb({ id, family }: { id: string; family: TemplateFamily }) {
  return (
    <span className={`pm-thumb pm-thumb-${id} pm-thumb-fam-${family}`} aria-hidden="true">
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
  const exportPwa = async () => {
    const svg = appIconSvg(project)
    const [p192, p512] = await Promise.all([svgToPng(svg, 192), svgToPng(svg, 512)])
    downloadBytes(`${base}-application.zip`, zip(pwaFiles(project, { 192: p192 ?? undefined, 512: p512 ?? undefined })), 'application/zip')
    notify('Application installable téléchargée : lis LISEZ-MOI.txt pour l’installer')
  }
  const exportReact = () => {
    const { jsx, css } = toReact(project)
    downloadFile('App.jsx', jsx, 'text/javascript')
    downloadFile('App.css', css, 'text/css')
    notify('Fichiers App.jsx et App.css téléchargés')
  }
  const exportVue = () => {
    downloadFile('App.vue', toVue(project), 'text/plain')
    notify('Fichier App.vue téléchargé')
  }
  const copyLink = async () => {
    try {
      const url = await shareUrl(project)
      await navigator.clipboard.writeText(url)
      notify('Lien copié : la personne qui l’ouvre reçoit une copie de ton projet')
    } catch {
      notify('Impossible de copier le lien dans ce navigateur')
    }
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
        <button type="button" className="pm-export" onClick={exportPwa}>
          <Smartphone size={22} />
          <span>
            <strong>Application installable (PWA)</strong>
            <small>Un .zip qui s’installe sur téléphone et ordinateur, marche sans internet, et se prépare pour Android et iOS.</small>
          </span>
        </button>
        <button type="button" className="pm-export" onClick={copyLink}>
          <Link2 size={22} />
          <span>
            <strong>Copier un lien de partage</strong>
            <small>Le projet entier tient dans le lien : rien n'est envoyé sur un serveur.</small>
          </span>
        </button>
        <button type="button" className="pm-export" onClick={exportReact}>
          <Atom size={22} />
          <span>
            <strong>Composant React</strong>
            <small>App.jsx et App.css, à mettre dans un projet Vite + React.</small>
          </span>
        </button>
        <button type="button" className="pm-export" onClick={exportVue}>
          <FileCode size={22} />
          <span>
            <strong>Composant Vue</strong>
            <small>App.vue, à mettre dans un projet Vite + Vue.</small>
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
  [['Maj', 'Clic'], 'Ajouter une brique à la sélection'],
  [[MOD, 'G'], 'Grouper les briques sélectionnées'],
  [[MOD, 'Maj', 'G'], 'Dégrouper'],
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
const defaultVersionName = () => `Version du ${dateFormat.format(Date.now())}`

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

function VersionsDialog({ onClose }: { onClose: () => void }) {
  const projectId = useEditor((s) => s.projectId)
  const projectName = useEditor((s) => s.project.name)
  const { loadProject, notify } = useEditor.getState()
  const [name, setName] = useState('')
  const [, refresh] = useState(0)
  const versions = listVersions(projectId)
  const update = () => refresh((n) => n + 1)

  const save = () => {
    const label = name.trim() || defaultVersionName()
    if (!saveVersion(projectId, label, useEditor.getState().project)) return notify('Le navigateur n’a plus de place : supprime d’anciennes versions')
    setName('')
    notify(`Version « ${label} » enregistrée`)
    update()
  }

  return (
    <Modal title="Versions" subtitle={`Des photos de « ${projectName} » que tu peux retrouver plus tard, dans ce navigateur.`} onClose={onClose} wide>
      <form
        className="pm-versions-new"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <input className="pm-input" aria-label="Nom de la version" placeholder="Nom de la version (ex. : avant la refonte)" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="pm-btn pm-btn-primary">
          <History size={16} /> Enregistrer cette version
        </button>
      </form>
      {versions.length === 0 ? (
        <p className="pm-muted pm-versions-empty">Aucune version pour l’instant. Enregistre-en une avant un gros changement.</p>
      ) : (
        <ul className="pm-projects">
          {versions.map((v) => (
            <li key={v.id} className="pm-project">
              <div className="pm-project-open is-static">
                <History size={18} aria-hidden="true" />
                <span className="pm-project-name">{v.name}</span>
                <span className="pm-project-meta">
                  {v.auto ? 'Automatique · ' : ''}
                  {v.project.pages.length} page{v.project.pages.length > 1 ? 's' : ''} · le {dateFormat.format(v.at)}
                </span>
              </div>
              <button
                type="button"
                className="pm-btn pm-btn-secondary"
                onClick={() => {
                  // On garde l'état actuel : revenir en arrière ne fait rien perdre.
                  saveVersion(projectId, `Avant de revenir à « ${v.name} »`, useEditor.getState().project, true)
                  loadProject(structuredClone(v.project))
                  notify(`Retour à « ${v.name} » (Ctrl+Z pour annuler)`)
                  onClose()
                }}
              >
                <RotateCcw size={15} /> Revenir à cette version
              </button>
              <button
                type="button"
                className="pm-icon-btn is-danger"
                aria-label={`Supprimer la version ${v.name}`}
                data-tip="Supprimer"
                onClick={() => {
                  if (!confirm(`Supprimer la version « ${v.name} » ?`)) return
                  removeVersion(projectId, v.id)
                  update()
                }}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

const LEVELS = ['', 'Facile', 'Moyen', 'Avancé']

function ChallengesDialog({ onClose }: { onClose: () => void }) {
  const done = useWorkspace((s) => s.challengesDone)
  const start = (id: string) => {
    const c = CHALLENGES.find((x) => x.id === id)!
    const { createProject } = useEditor.getState()
    createProject(buildProject(`Défi : ${c.name}`, {}, []))
    useWorkspace.getState().set({ challenge: { id, projectId: useEditor.getState().projectId }, dialog: null })
  }
  return (
    <Modal
      title="Défis guidés"
      subtitle="Chaque défi s’ouvre dans un nouveau projet. Les étapes se cochent toutes seules quand tu les réussis."
      onClose={onClose}
      wide
    >
      <ul className="pm-challenges">
        {CHALLENGES.map((c) => (
          <li key={c.id} className={`pm-challenge-card ${done.includes(c.id) ? 'is-done' : ''}`}>
            <div>
              <span className={`pm-level is-${c.level}`}>{LEVELS[c.level]}</span>
              {done.includes(c.id) && (
                <span className="pm-level is-ok">
                  <Check size={12} /> Réussi
                </span>
              )}
            </div>
            <strong>{c.name}</strong>
            <p>{c.goal}</p>
            <small>{c.steps.length} étapes</small>
            <button type="button" className="pm-btn pm-btn-secondary" onClick={() => start(c.id)}>
              {done.includes(c.id) ? 'Recommencer' : 'Commencer'}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
