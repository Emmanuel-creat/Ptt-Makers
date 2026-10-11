import { useLayoutEffect, useState, type RefObject } from 'react'

/*
 * Liste fenêtrée : avec des centaines de lignes de même hauteur, seules celles
 * à l'écran (et une marge autour) sont dans la page. Des espaces vides en haut
 * et en bas gardent la bonne hauteur de défilement.
 */

/** En dessous de ce nombre de lignes, tout est affiché : rien à gagner. */
export const WINDOW_FROM = 300
/** Pour le code, on garde tout plus longtemps : la recherche du navigateur (Ctrl + F) trouve tout. */
export const CODE_WINDOW_FROM = 1500

export interface RowWindow {
  start: number
  end: number
  /** Hauteur des lignes non affichées avant et après la fenêtre. */
  before: number
  after: number
}

export function useRowWindow(ref: RefObject<HTMLElement | null>, count: number, rowHeight: number, overscan = 30, from = WINDOW_FROM): RowWindow {
  const enabled = count > from
  const [view, setView] = useState({ top: 0, height: 900 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const update = () => setView((v) => (v.top === el.scrollTop && v.height === el.clientHeight ? v : { top: el.scrollTop, height: el.clientHeight || v.height }))
    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [ref, enabled])

  if (!enabled || rowHeight <= 0) return { start: 0, end: count, before: 0, after: 0 }
  const start = Math.max(0, Math.floor(view.top / rowHeight) - overscan)
  const end = Math.min(count, Math.ceil((view.top + view.height) / rowHeight) + overscan)
  return { start, end, before: start * rowHeight, after: Math.max(0, count - end) * rowHeight }
}
