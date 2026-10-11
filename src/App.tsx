import { PanelBottomClose, PanelRightClose, SlidersHorizontal } from 'lucide-react'
import { ToolsPanel } from './components/ToolsPanel'
import { Canvas } from './components/Canvas'
import { Dialogs } from './components/Dialogs'
import { Dock } from './components/Dock'
import { Inspector } from './components/Inspector'
import { Onboarding } from './components/Onboarding'
import { Splitter } from './components/Splitter'
import { Toast } from './components/Toast'
import { PanelToggle, TopBar } from './components/TopBar'
import { IconButton } from './components/ui'
import { useShortcuts, useTheme } from './hooks/useShortcuts'
import { MobileLayout } from './components/MobileLayout'
import { useIsMobile } from './hooks/useIsMobile'
import { DEFAULT_LAYOUT, useWorkspace } from './store/workspace'

export default function App() {
  useTheme()
  useShortcuts()
  const ws = useWorkspace()
  const mobile = useIsMobile()
  if (mobile) {
    return (
      <div className="pm-app is-mobile">
        <TopBar compact />
        <MobileLayout />
        <Dialogs />
        <Toast />
      </div>
    )
  }
  const dockRight = ws.dockPosition === 'right'

  const dock = (
    <section className={`pm-panel pm-dock is-${ws.dockPosition}`} data-tour="dock" style={dockRight ? { width: ws.dockSize } : { height: ws.dockSize }}>
      <Dock />
      <IconButton
        className="pm-dock-close"
        label="Replier l'aperçu et le code"
        tipSide="left"
        onClick={() => ws.set({ dockCollapsed: true })}
      >
        {dockRight ? <PanelRightClose size={16} /> : <PanelBottomClose size={16} />}
      </IconButton>
    </section>
  )
  const dockSplitter = (
    <Splitter
      axis={dockRight ? 'x' : 'y'}
      invert
      value={ws.dockSize}
      min={dockRight ? 300 : 160}
      max={dockRight ? 960 : 720}
      onChange={(dockSize) => ws.set({ dockSize })}
      onReset={() => ws.set({ dockSize: dockRight ? 440 : 320 })}
      label="Redimensionner l'aperçu"
    />
  )

  return (
    <div className="pm-app">
      <TopBar />
      <div className="pm-main">
        {ws.leftCollapsed ? (
          <PanelToggle side="left" />
        ) : (
          <>
            <aside className="pm-panel pm-left" style={{ width: ws.leftWidth }} data-tour="bricks" aria-label="Outils">
              <ToolsPanel onCollapse={() => ws.set({ leftCollapsed: true })} />
            </aside>
            <Splitter
              axis="x"
              value={ws.leftWidth}
              min={220}
              max={460}
              onChange={(leftWidth) => ws.set({ leftWidth })}
              onReset={() => ws.set({ leftWidth: DEFAULT_LAYOUT.leftWidth })}
              label="Redimensionner le panneau des briques"
            />
          </>
        )}

        <div className="pm-center">
          <div className="pm-center-row">
            <div className="pm-canvas-area" data-tour="canvas" aria-label="Zone de création">
              <Canvas />
            </div>
            {dockRight && (ws.dockCollapsed ? <PanelToggle side="dock" /> : <>{dockSplitter}{dock}</>)}
          </div>
          {!dockRight && (ws.dockCollapsed ? <PanelToggle side="dock" /> : <>{dockSplitter}{dock}</>)}
        </div>

        {ws.rightCollapsed ? (
          <PanelToggle side="right" />
        ) : (
          <>
            <Splitter
              axis="x"
              invert
              value={ws.rightWidth}
              min={260}
              max={480}
              onChange={(rightWidth) => ws.set({ rightWidth })}
              onReset={() => ws.set({ rightWidth: DEFAULT_LAYOUT.rightWidth })}
              label="Redimensionner le panneau des propriétés"
            />
            <aside className="pm-panel pm-right" style={{ width: ws.rightWidth }} data-tour="inspector" aria-label="Propriétés">
              <div className="pm-panel-head">
                <h2 className="pm-panel-title">
                  <SlidersHorizontal size={15} /> Propriétés
                </h2>
                <IconButton label="Replier le panneau" tipSide="left" onClick={() => ws.set({ rightCollapsed: true })}>
                  <PanelRightClose size={16} />
                </IconButton>
              </div>
              <div className="pm-panel-body">
                <Inspector />
              </div>
            </aside>
          </>
        )}
      </div>

      <datalist id="pm-length-suggestions">
        {['auto', '100%', '50%', '320px', '480px', '720px', '960px'].map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <Dialogs />
      <Onboarding />
      <Toast />
    </div>
  )
}
