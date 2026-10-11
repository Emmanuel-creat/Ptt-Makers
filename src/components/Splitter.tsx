import { useRef } from 'react'

/**
 * Poignée de redimensionnement entre deux zones.
 * À la souris : glisser. Au clavier : flèches (Maj pour aller plus vite). Double-clic : taille par défaut.
 */
export function Splitter({
  axis,
  value,
  min,
  max,
  onChange,
  invert = false,
  onReset,
  label,
}: {
  /** « x » : poignée verticale qui règle une largeur ; « y » : poignée horizontale qui règle une hauteur. */
  axis: 'x' | 'y'
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  /** Vrai quand le panneau réglé est après la poignée (à droite / en bas). */
  invert?: boolean
  onReset?: () => void
  label: string
}) {
  const start = useRef<{ pos: number; value: number } | null>(null)
  const clamp = (v: number) => Math.round(Math.max(min, Math.min(max, v)))

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    start.current = { pos: axis === 'x' ? e.clientX : e.clientY, value }
    document.body.classList.add(axis === 'x' ? 'is-resizing-x' : 'is-resizing-y')
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return
    const delta = (axis === 'x' ? e.clientX : e.clientY) - start.current.pos
    onChange(clamp(start.current.value + (invert ? -delta : delta)))
  }
  const onPointerUp = () => {
    start.current = null
    document.body.classList.remove('is-resizing-x', 'is-resizing-y')
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 12
    const grow = axis === 'x' ? (invert ? 'ArrowLeft' : 'ArrowRight') : invert ? 'ArrowUp' : 'ArrowDown'
    const shrink = axis === 'x' ? (invert ? 'ArrowRight' : 'ArrowLeft') : invert ? 'ArrowDown' : 'ArrowUp'
    if (e.key === grow) onChange(clamp(value + step))
    else if (e.key === shrink) onChange(clamp(value - step))
    else if (e.key === 'Home') onChange(min)
    else if (e.key === 'End') onChange(max)
    else return
    e.preventDefault()
  }

  return (
    <div
      className={`pm-splitter pm-splitter-${axis}`}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onDoubleClick={onReset}
    />
  )
}
