import {
  CircleHelp,
  Download,
  FolderOpen,
  GraduationCap,
  LayoutTemplate,
  Monitor,
  Moon,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Redo2,
  RotateCcw,
  Settings2,
  Smartphone,
  Sparkles,
  Sun,
  SunMoon,
  Tablet,
  Trophy,
  Undo2,
} from 'lucide-react'
import { useState } from 'react'
import { useEditor } from '../store/editor'
import { useWorkspace, type Theme } from '../store/workspace'
import { Popover } from './fields'
import { IconButton, MOD, Segmented, Switch } from './ui'

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="pm-logo">
      <rect x="3" y="17" width="12" height="12" rx="3.5" fill="var(--cat-texte)" />
      <rect x="17" y="17" width="12" height="12" rx="3.5" fill="var(--cat-interaction)" />
      <rect x="10" y="3" width="12" height="12" rx="3.5" fill="var(--pm-brand)" />
      <circle cx="16" cy="9" r="2.2" fill="#fff" opacity="0.9" />
    </svg>
  )
}

const THEME_NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_LABEL: Record<Theme, string> = { system: 'Thème : système', light: 'Thème : clair', dark: 'Thème : sombre' }

export function TopBar({ compact = false }: { compact?: boolean }) {
  const name = useEditor((s) => s.project.name)
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const { undo, redo, renameProject } = useEditor.getState()
  const ws = useWorkspace()
  const [layoutOpen, setLayoutOpen] = useState(false)

  return (
    <header className={`pm-topbar ${compact ? 'is-compact' : ''}`}>
      <div className="pm-brand">
        <Logo />
        <span className="pm-brand-name">
          Ptt<span>-Makers</span>
        </span>
      </div>
      <div className="pm-topbar-sep" />
      <input
        className="pm-project-name"
        aria-label="Nom du projet"
        value={name}
        onChange={(e) => renameProject(e.target.value)}
        spellCheck={false}
      />
      <div className="pm-topbar-group">
        <IconButton label="Annuler" shortcut={`${MOD}+Z`} disabled={!canUndo} onClick={undo}>
          <Undo2 size={17} />
        </IconButton>
        <IconButton label="Rétablir" shortcut={`${MOD}+Maj+Z`} disabled={!canRedo} onClick={redo}>
          <Redo2 size={17} />
        </IconButton>
      </div>

      <div className="pm-topbar-center">
        <Segmented
          label="Format d'affichage"
          value={ws.device}
          onChange={(device) => ws.set({ device, styleScope: device === 'desktop' ? 'all' : ws.styleScope === 'all' ? 'all' : device })}
          options={[
            { value: 'mobile', label: 'Mobile', icon: <Smartphone size={16} /> },
            { value: 'tablet', label: 'Tablette', icon: <Tablet size={16} /> },
            { value: 'desktop', label: 'Ordinateur', icon: <Monitor size={16} /> },
          ]}
        />
      </div>

      <div className="pm-topbar-group">
        <IconButton label="Mode débutant (aides et explications)" active={ws.beginner} onClick={() => ws.set({ beginner: !ws.beginner })}>
          <GraduationCap size={18} />
        </IconButton>
        <IconButton label={THEME_LABEL[ws.theme]} onClick={() => ws.set({ theme: THEME_NEXT[ws.theme] })}>
          {ws.theme === 'light' ? <Sun size={17} /> : ws.theme === 'dark' ? <Moon size={17} /> : <SunMoon size={17} />}
        </IconButton>
        <div className="pm-popover-anchor pm-layout-anchor">
          <IconButton label="Disposition de l'espace de travail" active={layoutOpen} onClick={() => setLayoutOpen(!layoutOpen)}>
            <Settings2 size={17} />
          </IconButton>
          {layoutOpen && (
            <Popover onClose={() => setLayoutOpen(false)}>
              <p className="pm-popover-title">Espace de travail</p>
              <div className="pm-layout-options">
                <Switch checked={!ws.leftCollapsed} onChange={(v) => ws.set({ leftCollapsed: !v })} label="Briques et calques" />
                <Switch checked={!ws.rightCollapsed} onChange={(v) => ws.set({ rightCollapsed: !v })} label="Propriétés" />
                <Switch checked={!ws.dockCollapsed} onChange={(v) => ws.set({ dockCollapsed: !v })} label="Aperçu et code" />
                <div className="pm-layout-dock">
                  <span>Position de l'aperçu</span>
                  <Segmented
                    label="Position de l'aperçu"
                    size="sm"
                    value={ws.dockPosition}
                    onChange={(dockPosition) => ws.set({ dockPosition, dockSize: dockPosition === 'right' ? 440 : 320 })}
                    options={[
                      { value: 'right', label: 'À droite', icon: <PanelRight size={15} /> },
                      { value: 'bottom', label: 'En bas', icon: <PanelBottom size={15} /> },
                    ]}
                  />
                </div>
                <button
                  type="button"
                  className="pm-btn pm-btn-secondary pm-btn-sm"
                  onClick={() => {
                    ws.resetLayout()
                    setLayoutOpen(false)
                  }}
                >
                  <RotateCcw size={14} /> Disposition par défaut
                </button>
              </div>
            </Popover>
          )}
        </div>
        <IconButton label="Raccourcis clavier et aide" shortcut="?" onClick={() => ws.set({ dialog: 'shortcuts' })}>
          <CircleHelp size={17} />
        </IconButton>
        <div className="pm-topbar-sep" />
        <button type="button" className="pm-btn pm-btn-ai" onClick={() => ws.set({ dialog: 'assistant' })}>
          <Sparkles size={16} /> <span className="pm-hide-sm">Assistant IA</span> <span className="pm-pro">Pro</span>
        </button>
        <button type="button" className="pm-btn pm-btn-secondary" onClick={() => ws.set({ dialog: 'challenges' })}>
          <Trophy size={16} /> <span className="pm-hide-sm">Défis</span>
        </button>
        <button type="button" className="pm-btn pm-btn-secondary" onClick={() => ws.set({ dialog: 'projects' })}>
          <FolderOpen size={16} /> <span className="pm-hide-sm">Mes projets</span>
        </button>
        <button type="button" className="pm-btn pm-btn-secondary" onClick={() => ws.set({ dialog: 'templates' })}>
          <LayoutTemplate size={16} /> <span className="pm-hide-sm">Modèles</span>
        </button>
        <button type="button" className="pm-btn pm-btn-primary" onClick={() => ws.set({ dialog: 'export' })}>
          <Download size={16} /> <span className="pm-hide-sm">Exporter</span>
        </button>
      </div>
    </header>
  )
}

/** Boutons pour replier / déplier les panneaux, affichés au bord de l'écran. */
export function PanelToggle({ side }: { side: 'left' | 'right' | 'dock' }) {
  const ws = useWorkspace()
  const map = {
    left: { label: 'Afficher les briques', icon: <PanelLeft size={16} />, on: () => ws.set({ leftCollapsed: false }) },
    right: { label: 'Afficher les propriétés', icon: <PanelRight size={16} />, on: () => ws.set({ rightCollapsed: false }) },
    dock: {
      label: "Afficher l'aperçu et le code",
      icon: ws.dockPosition === 'right' ? <PanelRight size={16} /> : <PanelBottom size={16} />,
      on: () => ws.set({ dockCollapsed: false }),
    },
  }[side]
  return (
    <button type="button" className={`pm-panel-reopen is-${side}`} onClick={map.on} aria-label={map.label} data-tip={map.label}>
      {map.icon}
    </button>
  )
}
