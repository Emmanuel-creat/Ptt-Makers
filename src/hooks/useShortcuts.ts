import { useEffect } from 'react'
import { INLINE_EDITABLE } from '../components/CanvasNode'
import { useEditor } from '../store/editor'
import { useWorkspace } from '../store/workspace'

const isTyping = (el: Element | null) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable)

/** Raccourcis clavier globaux de l'éditeur. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useWorkspace.getState().dialog) return
      const ed = useEditor.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (mod && key === 's') {
        e.preventDefault()
        ed.saveNow()
        ed.notify('Projet enregistré (la sauvegarde est aussi automatique)')
        return
      }
      if (isTyping(document.activeElement)) return

      const sel = ed.selectedId ? ed.project.nodes[ed.selectedId] : null
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) ed.redo()
        else ed.undo()
      } else if (mod && key === 'y') {
        e.preventDefault()
        ed.redo()
      } else if (mod && key === 'd' && sel) {
        e.preventDefault()
        ed.duplicate(sel.id)
      } else if (mod && key === 'c' && sel && !window.getSelection()?.toString()) {
        ed.copy(sel.id)
      } else if (mod && key === 'v' && ed.clipboard) {
        e.preventDefault()
        ed.paste()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && sel?.parent) {
        e.preventDefault()
        ed.remove(sel.id)
      } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && sel) {
        e.preventDefault()
        ed.moveBy(sel.id, e.key === 'ArrowUp' ? -1 : 1)
      } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && sel?.place) {
        // Page en grille : décaler la brique d'une colonne.
        e.preventDefault()
        ed.setPlace(sel.id, { col: sel.place.col + (e.key === 'ArrowLeft' ? -1 : 1) })
      } else if (e.key === 'Escape' && sel) {
        ed.select(sel.parent)
      } else if (e.key === 'Enter' && sel && INLINE_EDITABLE.has(sel.type) && !(document.activeElement instanceof HTMLButtonElement)) {
        e.preventDefault()
        ed.setEditing(sel.id)
      } else if (e.key === '?') {
        useWorkspace.getState().set({ dialog: 'shortcuts' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** Applique le thème (clair / sombre / système) à la page. */
export function useTheme() {
  const theme = useWorkspace((s) => s.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
