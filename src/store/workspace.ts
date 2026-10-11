import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'system' | 'light' | 'dark'
export type Device = 'mobile' | 'tablet' | 'desktop'
export type DockPosition = 'right' | 'bottom'
export type LeftTab = 'bricks' | 'layers' | 'variables'
export type DockTab = 'preview' | 'code'
export type CodeTab = 'html' | 'css' | 'js'

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
  device: Device
  beginner: boolean
  onboardingDone: boolean
  leftTab: LeftTab
  dockTab: DockTab
  codeTab: CodeTab
  dialog: null | 'templates' | 'shortcuts' | 'export'
  set: (patch: Partial<Omit<WorkspaceState, 'set' | 'resetLayout'>>) => void
  resetLayout: () => void
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...DEFAULT_LAYOUT,
      theme: 'system',
      device: 'desktop',
      beginner: true,
      onboardingDone: false,
      leftTab: 'bricks',
      dockTab: 'preview',
      codeTab: 'html',
      dialog: null,
      set: (patch) => set(patch),
      resetLayout: () => set(DEFAULT_LAYOUT),
    }),
    {
      name: 'ptt-makers:espace',
      partialize: ({ dialog: _dialog, set: _set, resetLayout: _reset, ...rest }) => rest,
    },
  ),
)
