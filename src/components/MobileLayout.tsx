import { Blocks, Eye, MousePointerClick, SlidersHorizontal } from 'lucide-react'
import { useWorkspace, type MobileView } from '../store/workspace'
import { Canvas } from './Canvas'
import { Dock } from './Dock'
import { Inspector } from './Inspector'
import { ToolsPanel } from './ToolsPanel'

const VIEWS: { id: MobileView; label: string; icon: React.ReactNode }[] = [
  { id: 'tools', label: 'Outils', icon: <Blocks size={20} /> },
  { id: 'create', label: 'Création', icon: <MousePointerClick size={20} /> },
  { id: 'props', label: 'Propriétés', icon: <SlidersHorizontal size={20} /> },
  { id: 'preview', label: 'Aperçu', icon: <Eye size={20} /> },
]

/** Sur petit écran : une zone à la fois, et une barre d'onglets en bas pour passer de l'une à l'autre. */
export function MobileLayout() {
  const view = useWorkspace((s) => s.mobileView)
  const set = useWorkspace((s) => s.set)
  return (
    <>
      <main className="pm-mobile-main">
        {view === 'tools' && (
          <section className="pm-panel pm-mobile-screen" aria-label="Outils">
            <ToolsPanel />
          </section>
        )}
        {view === 'create' && (
          <section className="pm-mobile-screen" aria-label="Zone de création">
            <Canvas />
          </section>
        )}
        {view === 'props' && (
          <section className="pm-panel pm-mobile-screen" aria-label="Propriétés">
            <Inspector />
          </section>
        )}
        {view === 'preview' && (
          <section className="pm-panel pm-mobile-screen pm-dock" aria-label="Aperçu et code">
            <Dock />
          </section>
        )}
      </main>
      <nav className="pm-mobile-nav" aria-label="Zones de l'éditeur">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" aria-current={view === v.id ? 'page' : undefined} onClick={() => set({ mobileView: v.id })}>
            {v.icon}
            <span>{v.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
