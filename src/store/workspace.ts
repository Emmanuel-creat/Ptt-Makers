import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StateScope } from '../model/types'

export type Theme = 'system' | 'light' | 'dark'
/** Interface de l'éditeur : « pro » (sombre et compacte, façon logiciel de 3D) ou « classique ». */
export type UiStyle = 'pro' | 'classique'
/** Espaces de travail : chacun range les panneaux pour une tâche. */
export type WorkspaceTab = 'construction' | 'style' | 'logique' | 'code' | 'apercu'
export type Device = 'mobile' | 'tablet' | 'desktop'
export type DockPosition = 'right' | 'bottom'
export type LeftTab = 'bricks' | 'layers' | 'variables'
export type DockTab = 'preview' | 'code' | 'problems'
export type CodeTab = 'html' | 'css' | 'js'
export type MobileView = 'tools' | 'create' | 'props' | 'preview'
/** Format dont on modifie le style dans les propriétés. */
export type StyleScope = 'all' | 'tablet' | 'mobile'
/** État dont on règle le style : normal, ou survol, focus, appui, désactivé. */
export type StyleState = 'normal' | StateScope

export const DEVICE_WIDTH: Record<Device, number | null> = { mobile: 390, tablet: 820, desktop: null }

interface Layout {
  leftWidth: number
  rightWidth: number
  dockSize: number
  dockPosition: DockPosition
  leftCollapsed: boolean
  rightCollapsed: boolean
  dockCollapsed: boolean
}

export const DEFAULT_LAYOUT: Layout = {
  leftWidth: 272,
  rightWidth: 312,
  dockSize: 320,
  dockPosition: 'bottom',
  leftCollapsed: false,
  rightCollapsed: false,
  dockCollapsed: false,
}

interface WorkspaceState extends Layout {
  theme: Theme
  ui: UiStyle
  workspaceTab: WorkspaceTab
  /** Écran d'accueil (nouveau projet, projets récents) à l'ouverture. */
  showSplash: boolean
  splashOpen: boolean
  device: Device
  beginner: boolean
  onboardingDone: boolean
  leftTab: LeftTab
  dockTab: DockTab
  codeTab: CodeTab
  mobileView: MobileView
  styleScope: StyleScope
  styleState: StyleState
  /** Zone de création : montrer l'autre ambiance (sombre ou claire) du style. */
  showAlternate: boolean
  /** Défi guidé en cours, lié au projet créé pour lui. */
  challenge: { id: string; projectId: string } | null
  challengesDone: string[]
  dialog: null | 'templates' | 'shortcuts' | 'export' | 'projects' | 'challenges' | 'assistant' | 'versions'
  set: (patch: Partial<Omit<WorkspaceState, 'set' | 'resetLayout'>>) => void
  resetLayout: () => void
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...DEFAULT_LAYOUT,
      theme: 'system',
      ui: 'pro',
      workspaceTab: 'construction',
      showSplash: true,
      splashOpen: false,
      device: 'desktop',
      beginner: true,
      onboardingDone: false,
      leftTab: 'bricks',
      dockTab: 'preview',
      codeTab: 'html',
      mobileView: 'create',
      styleScope: 'all',
      styleState: 'normal',
      showAlternate: false,
      challenge: null,
      challengesDone: [],
      dialog: null,
      set: (patch) => set(patch),
      resetLayout: () => set({ ...DEFAULT_LAYOUT, workspaceTab: 'construction' }),
    }),
    {
      name: 'ptt-makers:espace',
      partialize: ({ dialog: _dialog, splashOpen: _splash, styleState: _state, set: _set, resetLayout: _reset, ...rest }) => rest,
    },
  ),
)

/** Disposition de chaque espace de travail (les panneaux restent redimensionnables). */
export const WORKSPACES: { id: WorkspaceTab; label: string; layout: Partial<Layout> & { leftTab?: LeftTab; dockTab?: DockTab } }[] = [
  { id: 'construction', label: 'Construction', layout: { ...DEFAULT_LAYOUT, leftTab: 'bricks', dockTab: 'preview' } },
  { id: 'style', label: 'Style', layout: { leftCollapsed: false, rightCollapsed: false, dockCollapsed: false, dockPosition: 'right', dockSize: 440, rightWidth: 360, leftTab: 'layers', dockTab: 'preview' } },
  { id: 'logique', label: 'Logique', layout: { leftCollapsed: false, rightCollapsed: false, dockCollapsed: false, dockPosition: 'bottom', dockSize: 320, leftTab: 'variables', dockTab: 'preview' } },
  { id: 'code', label: 'Code', layout: { leftCollapsed: false, rightCollapsed: true, dockCollapsed: false, dockPosition: 'right', dockSize: 720, leftTab: 'layers', dockTab: 'code' } },
  { id: 'apercu', label: 'Aperçu', layout: { leftCollapsed: true, rightCollapsed: true, dockCollapsed: false, dockPosition: 'right', dockSize: 960, dockTab: 'preview' } },
]
