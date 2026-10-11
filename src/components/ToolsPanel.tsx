import { Blocks, Braces, Layers as LayersIcon, PanelLeftClose } from 'lucide-react'
import { useEditor } from '../store/editor'
import { useWorkspace, type LeftTab } from '../store/workspace'
import { Layers } from './Layers'
import { Palette } from './Palette'
import { IconButton } from './ui'
import { VariablesPanel } from './VariablesPanel'

const LEFT_TABS: { id: LeftTab; label: string; icon: React.ReactNode }[] = [
  { id: 'bricks', label: 'Briques', icon: <Blocks size={15} /> },
  { id: 'layers', label: 'Calques', icon: <LayersIcon size={15} /> },
  { id: 'variables', label: 'Variables', icon: <Braces size={15} /> },
]

/** Onglets Briques / Calques / Variables (panneau de gauche, ou écran « Outils » sur mobile). */
export function ToolsPanel({ onCollapse }: { onCollapse?: () => void }) {
  const ws = useWorkspace()
  const varCount = useEditor((s) => s.project.variables.length)
  return (
    <>
      <div className="pm-panel-head">
        <div className="pm-tabs" role="tablist" aria-label="Outils">
          {LEFT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={ws.leftTab === t.id}
              className="pm-tab"
              onClick={() => ws.set({ leftTab: t.id })}
            >
              {t.icon}
              {t.label}
              {t.id === 'variables' && varCount > 0 && <span className="pm-count">{varCount}</span>}
            </button>
          ))}
        </div>
        {onCollapse && (
          <IconButton label="Replier le panneau" tipSide="right" onClick={onCollapse}>
            <PanelLeftClose size={16} />
          </IconButton>
        )}
      </div>
      <div className="pm-panel-body">
        {ws.leftTab === 'bricks' && <Palette />}
        {ws.leftTab === 'layers' && <Layers />}
        {ws.leftTab === 'variables' && <VariablesPanel />}
      </div>
    </>
  )
}

