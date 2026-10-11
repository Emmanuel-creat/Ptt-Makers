import { BookOpen, FilePlus2, FileText, FolderOpen, History, LayoutTemplate, Newspaper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TEMPLATES } from '../model/templates'
import { useEditor } from '../store/editor'
import { listProjects } from '../store/library'
import { useWorkspace } from '../store/workspace'
import { Logo } from './TopBar'

const REPO = 'https://github.com/Emmanuel-creat/Ptt-Makers/blob/main'

/** Illustration de l'écran d'accueil : des briques empilées sur une grille, dessinées en SVG. */
function SplashScene() {
  const brick = (x: number, y: number, color: string, key: string) => (
    <g key={key} transform={`translate(${x} ${y})`}>
      <path d="M0 14 L28 0 L56 14 L28 28 Z" fill={color} />
      <path d="M0 14 L28 28 L28 52 L0 38 Z" fill={color} opacity="0.72" />
      <path d="M56 14 L28 28 L28 52 L56 38 Z" fill={color} opacity="0.5" />
      <ellipse cx="28" cy="12" rx="7" ry="3.5" fill="#fff" opacity="0.35" />
    </g>
  )
  const lines = []
  for (let i = -6; i <= 6; i++) {
    lines.push(<line key={`a${i}`} x1={280 + i * 56} y1="236" x2={280 + i * 18} y2="150" />)
  }
  for (let j = 0; j < 5; j++) {
    const y = 150 + j * j * 5 + j * 6
    lines.push(<line key={`b${j}`} x1="-20" y1={y} x2="580" y2={y} />)
  }
  return (
    <svg className="pm-splash-scene" viewBox="0 0 560 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="rgba(255,255,255,0.08)" strokeWidth="1">{lines}</g>
      {brick(330, 118, '#4772b3', 'b1')}
      {brick(386, 118, '#5fd39a', 'b2')}
      {brick(358, 94, '#9d8cff', 'b3')}
      {brick(414, 94, '#58b8ef', 'b4')}
      {brick(386, 70, '#ffa033', 'b5')}
      {brick(442, 132, '#f2b84b', 'b6')}
    </svg>
  )
}

/** Écran d'accueil : nouveau projet depuis un modèle, projets récents, aide. */
export function Splash() {
  const ws = useWorkspace()
  const { createProject, openProject, notify, saveNow } = useEditor.getState()
  const [recent] = useState(() => {
    saveNow()
    return listProjects().slice(0, 6)
  })
  const close = () => ws.set({ splashOpen: false })
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && ws.set({ splashOpen: false })
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [ws])
  const fromTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)
    if (!t) return
    createProject(t.create())
    notify(`Nouveau projet « ${t.name} » créé`)
    close()
  }

  return (
    <div className="pm-splash-back" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="pm-splash" role="dialog" aria-modal="true" aria-label="Écran d'accueil">
        <div className="pm-splash-art">
          <SplashScene />
          <div className="pm-splash-brand">
            <Logo size={34} />
            Ptt-Makers
          </div>
          <span className="pm-splash-version">{__APP_VERSION__}</span>
          <span className="pm-splash-credit">Construis des logiciels avec des briques</span>
        </div>
        <div className="pm-splash-cols">
          <div className="pm-splash-list">
            <h3>Nouveau projet</h3>
            {TEMPLATES.slice(0, 6).map((t) => (
              <button key={t.id} type="button" className="pm-splash-item" onClick={() => fromTemplate(t.id)}>
                <FilePlus2 size={14} />
                <span>{t.name}</span>
              </button>
            ))}
            <button type="button" className="pm-splash-item" onClick={() => ws.set({ splashOpen: false, dialog: 'templates' })}>
              <LayoutTemplate size={14} />
              <span>Tous les modèles…</span>
            </button>
          </div>
          <div className="pm-splash-list">
            <h3>Projets récents</h3>
            {recent.length === 0 && <p className="pm-splash-empty">Aucun projet enregistré pour l'instant.</p>}
            {recent.map((p) => (
              <button
                key={p.id}
                type="button"
                className="pm-splash-item"
                onClick={() => {
                  openProject(p.id)
                  close()
                }}
              >
                <FileText size={14} />
                <span>{p.name || 'Sans nom'}</span>
              </button>
            ))}
            <button type="button" className="pm-splash-item" onClick={() => ws.set({ splashOpen: false, dialog: 'projects' })}>
              <FolderOpen size={14} />
              <span>Mes projets…</span>
            </button>
          </div>
        </div>
        <div className="pm-splash-foot">
          <div className="pm-splash-list">
            <button type="button" className="pm-splash-item" onClick={close}>
              <History size={14} />
              <span>Reprendre le projet en cours</span>
            </button>
            <label className="pm-splash-item">
              <input type="checkbox" checked={ws.showSplash} onChange={(e) => ws.set({ showSplash: e.target.checked })} />
              <span>Afficher au démarrage</span>
            </label>
          </div>
          <div className="pm-splash-list">
            <a className="pm-splash-item" href={`${REPO}/CHANGELOG.md`} target="_blank" rel="noopener noreferrer">
              <Newspaper size={14} />
              <span>Nouveautés</span>
            </a>
            <a className="pm-splash-item" href={`${REPO}/docs/GUIDE.md`} target="_blank" rel="noopener noreferrer">
              <BookOpen size={14} />
              <span>Guide d'utilisation</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
