import {
  CircleAlert,
  CircleCheck,
  TriangleAlert,
  MonitorDown,
  BookOpen,
  Clipboard,
  ClipboardPaste,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  GraduationCap,
  Heading,
  Image,
  Keyboard,
  LayoutTemplate,
  Monitor,
  MousePointer2,
  MousePointerClick,
  Newspaper,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Pilcrow,
  Palette,
  Sparkles,
  FileText,
  LayoutPanelLeft,
  Type,
  Zap,
  Plus,
  Redo2,
  RotateCcw,
  Smartphone,
  Square,
  SquareStack,
  Star,
  Tablet,
  TextCursorInput,
  Trash2,
  Trophy,
  Undo2,
  type LucideIcon,
  History,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PAGE_TEMPLATES } from '../model/pageTemplates'
import { BRICKS } from '../model/bricks'
import type { BrickType } from '../model/types'
import { useEditor } from '../store/editor'
import { WORKSPACES, useWorkspace, type Device } from '../store/workspace'
import { useProblems } from './ProblemsPanel'
import { IconButton, MOD } from './ui'

const REPO = 'https://github.com/Emmanuel-creat/Ptt-Makers/blob/main'
/** Le paquet de la version pour ordinateur (Windows, macOS, Linux), mis à jour à chaque publication. */
const LOCAL_PACKAGE = 'https://emmanuel-creat.github.io/Ptt-Makers/Ptt-Makers-local.zip'

/** Briques proposées dans le menu Ajouter et dans la barre d'outils. */
const QUICK: { type: BrickType; icon: LucideIcon }[] = [
  { type: 'section', icon: SquareStack },
  { type: 'card', icon: Square },
  { type: 'heading', icon: Heading },
  { type: 'text', icon: Pilcrow },
  { type: 'button', icon: MousePointerClick },
  { type: 'input', icon: TextCursorInput },
  { type: 'image', icon: Image },
  { type: 'icon', icon: Star },
]

type Item = { label: string; icon?: ReactNode; kbd?: string; disabled?: boolean; run: () => void } | 'sep'

function useMenus() {
  const ws = useWorkspace()
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const selected = useEditor((s) => (s.selectedId ? s.project.nodes[s.selectedId] : null))
  const ed = useEditor.getState()
  const sel = selected?.parent ? selected : null
  const device = (d: Device, label: string, icon: ReactNode): Item => ({
    label: `${ws.device === d ? '· ' : ''}${label}`,
    icon,
    run: () => ws.set({ device: d, styleScope: d === 'desktop' ? 'all' : ws.styleScope }),
  })
  const menus: { id: string; label: string; items: Item[] }[] = [
    {
      id: 'fichier',
      label: 'Fichier',
      items: [
        { label: 'Nouveau projet depuis un modèle…', icon: <FilePlus2 size={14} />, run: () => ws.set({ dialog: 'templates' }) },
        { label: 'Mes projets…', icon: <FolderOpen size={14} />, run: () => ws.set({ dialog: 'projects' }) },
        { label: 'Versions…', icon: <History size={14} />, run: () => ws.set({ dialog: 'versions' }) },
        { label: "Écran d'accueil", icon: <LayoutTemplate size={14} />, run: () => ws.set({ splashOpen: true }) },
        'sep',
        { label: 'Exporter…', icon: <Download size={14} />, run: () => ws.set({ dialog: 'export' }) },
        // La version installée s'ouvre depuis un fichier : inutile de la proposer à nouveau.
        ...(location.protocol === 'file:'
          ? []
          : [{ label: 'Installer sur mon ordinateur', icon: <MonitorDown size={14} />, run: () => window.open(LOCAL_PACKAGE, '_blank', 'noopener') }]),
      ],
    },
    {
      id: 'edition',
      label: 'Édition',
      items: [
        { label: 'Annuler', icon: <Undo2 size={14} />, kbd: `${MOD}+Z`, disabled: !canUndo, run: ed.undo },
        { label: 'Rétablir', icon: <Redo2 size={14} />, kbd: `${MOD}+Maj+Z`, disabled: !canRedo, run: ed.redo },
        'sep',
        { label: 'Dupliquer', icon: <Copy size={14} />, kbd: `${MOD}+D`, disabled: !sel, run: () => sel && ed.duplicate(sel.id) },
        { label: 'Copier', icon: <Clipboard size={14} />, kbd: `${MOD}+C`, disabled: !sel, run: () => sel && ed.copy(sel.id) },
        { label: 'Coller', icon: <ClipboardPaste size={14} />, kbd: `${MOD}+V`, run: ed.paste },
        { label: 'Supprimer', icon: <Trash2 size={14} />, kbd: 'Suppr', disabled: !sel, run: () => sel && ed.remove(sel.id) },
      ],
    },
    {
      id: 'ajouter',
      label: 'Ajouter',
      items: [
        ...QUICK.map(({ type, icon: Icon }): Item => ({ label: BRICKS[type].label, icon: <Icon size={14} />, run: () => ed.addBrickNearSelection(type) })),
        'sep',
        { label: 'Page', icon: <Plus size={14} />, run: () => ed.addPage() },
        ...PAGE_TEMPLATES.map((t): Item => ({ label: `Page : ${t.name}`, icon: <LayoutTemplate size={14} />, run: () => ed.addPageTemplate(t.id) })),
      ],
    },
    {
      id: 'affichage',
      label: 'Affichage',
      items: [
        device('mobile', 'Mobile', <Smartphone size={14} />),
        device('tablet', 'Tablette', <Tablet size={14} />),
        device('desktop', 'Ordinateur', <Monitor size={14} />),
        'sep',
        { label: ws.leftCollapsed ? 'Afficher les briques' : 'Masquer les briques', icon: <PanelLeft size={14} />, run: () => ws.set({ leftCollapsed: !ws.leftCollapsed }) },
        { label: ws.rightCollapsed ? 'Afficher les propriétés' : 'Masquer les propriétés', icon: <PanelRight size={14} />, run: () => ws.set({ rightCollapsed: !ws.rightCollapsed }) },
        { label: ws.dockCollapsed ? "Afficher l'aperçu et le code" : "Masquer l'aperçu et le code", icon: <PanelBottom size={14} />, run: () => ws.set({ dockCollapsed: !ws.dockCollapsed }) },
        { label: 'Disposition par défaut', icon: <RotateCcw size={14} />, run: ws.resetLayout },
        'sep',
        { label: ws.beginner ? 'Désactiver le mode débutant' : 'Activer le mode débutant', icon: <GraduationCap size={14} />, run: () => ws.set({ beginner: !ws.beginner }) },
        { label: 'Interface classique (claire)', icon: <MousePointer2 size={14} />, run: () => ws.set({ ui: 'classique' }) },
      ],
    },
    {
      id: 'aide',
      label: 'Aide',
      items: [
        { label: "Guide d'utilisation", icon: <BookOpen size={14} />, run: () => window.open(`${REPO}/docs/GUIDE.md`, '_blank', 'noopener') },
        { label: 'Raccourcis clavier', icon: <Keyboard size={14} />, kbd: '?', run: () => ws.set({ dialog: 'shortcuts' }) },
        { label: 'Défis guidés', icon: <Trophy size={14} />, run: () => ws.set({ dialog: 'challenges' }) },
        { label: 'Nouveautés', icon: <Newspaper size={14} />, run: () => window.open(`${REPO}/CHANGELOG.md`, '_blank', 'noopener') },
        { label: 'Revoir la visite guidée', icon: <GraduationCap size={14} />, run: () => ws.set({ onboardingDone: false }) },
      ],
    },
  ]
  return menus
}

/** Menus déroulants du haut (Fichier, Édition, Ajouter, Affichage, Aide). */
export function MenuBar() {
  const menus = useMenus()
  const [open, setOpen] = useState<string | null>(null)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null)
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  return (
    <nav className="pm-menubar" ref={ref} aria-label="Menus">
      {menus.map((m) => (
        <div key={m.id} className="pm-popover-anchor">
          <button
            type="button"
            className="pm-menu-btn"
            aria-haspopup="menu"
            aria-expanded={open === m.id}
            onClick={() => setOpen(open === m.id ? null : m.id)}
            onMouseEnter={() => open && setOpen(m.id)}
          >
            {m.label}
          </button>
          {open === m.id && (
            <div className="pm-menu" role="menu" aria-label={m.label}>
              {m.items.map((it, i) =>
                it === 'sep' ? (
                  <div key={i} className="pm-menu-sep" role="separator" />
                ) : (
                  <button
                    key={i}
                    type="button"
                    role="menuitem"
                    className="pm-menu-item"
                    disabled={it.disabled}
                    onClick={() => {
                      setOpen(null)
                      it.run()
                    }}
                  >
                    {it.icon}
                    <span>{it.label}</span>
                    {it.kbd && <kbd>{it.kbd}</kbd>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

/** Onglets des espaces de travail : chacun range les panneaux pour une tâche. */
export function WorkspaceTabs() {
  const ws = useWorkspace()
  return (
    <div className="pm-workspaces" role="tablist" aria-label="Espaces de travail">
      {WORKSPACES.map((w) => (
        <button
          key={w.id}
          type="button"
          role="tab"
          aria-label={`Espace ${w.label}`}
          aria-selected={ws.workspaceTab === w.id}
          className="pm-workspace-tab"
          onClick={() => ws.set({ workspaceTab: w.id, ...w.layout })}
        >
          {w.label}
        </button>
      ))}
    </div>
  )
}

/** Barre d'outils verticale à gauche de la vue : ajoute une brique près de la sélection. */
export function ToolStrip() {
  const { addBrickNearSelection, select } = useEditor.getState()
  return (
    <div className="pm-toolstrip" role="toolbar" aria-label="Outils rapides" aria-orientation="vertical">
      <IconButton label="Sélectionner la page" tipSide="right" active onClick={() => select(useEditor.getState().currentPage)}>
        <MousePointer2 size={17} />
      </IconButton>
      <div className="pm-toolstrip-sep" />
      {QUICK.map(({ type, icon: Icon }) => (
        <IconButton key={type} label={`Ajouter : ${BRICKS[type].label}`} tipSide="right" onClick={() => addBrickNearSelection(type)}>
          <Icon size={17} />
        </IconButton>
      ))}
    </div>
  )
}

/** Barre d'état : aide sur les gestes et taille du projet. */
export function StatusBar() {
  const nodes = useEditor((s) => s.project.nodes)
  const pages = useEditor((s) => s.project.pages.length)
  const variables = useEditor((s) => s.project.variables.length)
  const bricks = Object.values(nodes).filter((n) => n.parent).length
  const problems = useProblems()
  const errors = problems.filter((p) => p.level === 'erreur').length
  const setWorkspace = useWorkspace((s) => s.set)
  return (
    <footer className="pm-statusbar">
      <span>
        <kbd>Clic</kbd> Sélectionner
      </span>
      <span>
        <kbd>Glisser</kbd> Déplacer
      </span>
      <span>
        <kbd>Double-clic</kbd> Modifier le texte
      </span>
      <span>
        <kbd>Suppr</kbd> Supprimer
      </span>
      <button
        type="button"
        className={`pm-statusbar-problems ${errors ? 'is-error' : problems.length ? 'is-warning' : 'is-ok'}`}
        onClick={() => setWorkspace({ dockTab: 'problems', dockCollapsed: false })}
      >
        {errors ? <CircleAlert size={13} /> : problems.length ? <TriangleAlert size={13} /> : <CircleCheck size={13} />}
        {errors ? `${errors} ${errors > 1 ? 'erreurs' : 'erreur'}` : problems.length ? `${problems.length} ${problems.length > 1 ? 'conseils' : 'conseil'}` : 'Aucun problème'}
      </button>
      <span className="pm-statusbar-right">
        {bricks} briques · {pages} {pages > 1 ? 'pages' : 'page'} · {variables} variables · {__APP_VERSION__}
      </span>
    </footer>
  )
}

/** Onglets à icônes du panneau Propriétés : chacun mène à sa section et l'ouvre. */
const PROP_TABS: { section: string; label: string; icon: LucideIcon; page?: boolean }[] = [
  { section: 'Contenu', label: 'Contenu', icon: FileText },
  { section: 'Mise en page', label: 'Mise en page', icon: LayoutPanelLeft },
  { section: 'Apparence', label: 'Apparence', icon: Palette },
  { section: 'Texte', label: 'Texte', icon: Type },
  { section: 'Interactions', label: 'Interactions', icon: Zap },
  { section: 'Style du projet', label: 'Style du projet', icon: Sparkles, page: true },
]

export function PropsTabs({ body }: { body: React.RefObject<HTMLDivElement | null> }) {
  const [current, setCurrent] = useState<string | null>(null)
  const go = (section: string, page?: boolean) => {
    setCurrent(section)
    const find = () => body.current?.querySelector<HTMLElement>(`[data-section="${section}"]`)
    const reveal = () => {
      const el = find()
      if (!el) return
      if (!el.classList.contains('is-open')) el.querySelector<HTMLButtonElement>('.pm-section-head')?.click()
      el.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
    if (!find() && page) {
      const ed = useEditor.getState()
      ed.select(ed.currentPage)
      requestAnimationFrame(() => requestAnimationFrame(reveal))
    } else reveal()
  }
  return (
    <nav className="pm-props-tabs" aria-label="Sections des propriétés">
      {PROP_TABS.map(({ section, label, icon: Icon, page }) => (
        <button
          key={section}
          type="button"
          className="pm-props-tab"
          aria-label={`Aller à la section ${label}`}
          aria-current={current === section}
          data-tip={label}
          data-tip-side="right"
          onClick={() => go(section, page)}
        >
          <Icon size={15} />
        </button>
      ))}
    </nav>
  )
}
