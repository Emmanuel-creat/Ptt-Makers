import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  /** Raccourci affiché dans l'infobulle. */
  shortcut?: string
  active?: boolean
  tipSide?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactNode
}

/** Bouton icône avec infobulle et libellé accessible. */
export function IconButton({ label, shortcut, active, tipSide = 'bottom', className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-tip={shortcut ? `${label} · ${shortcut}` : label}
      data-tip-side={tipSide}
      className={`pm-icon-btn ${active ? 'is-active' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
}: {
  value: T | undefined
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className={`pm-segmented pm-segmented-${size}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.icon ? o.label : undefined}
          data-tip={o.icon ? o.label : undefined}
          className={value === o.value ? 'is-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.icon ?? o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="pm-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="pm-switch-track" aria-hidden="true">
        <span className="pm-switch-thumb" />
      </span>
      <span className="pm-switch-label">{label}</span>
    </label>
  )
}

/** Ligne de formulaire du panneau Propriétés : libellé + contrôle (+ aide). */
export function Row({ label, help, children, stacked }: { label: string; help?: string; children: (id: string) => ReactNode; stacked?: boolean }) {
  const id = useId()
  return (
    <div className={`pm-row ${stacked ? 'is-stacked' : ''}`}>
      <label htmlFor={id} className="pm-row-label">
        {label}
      </label>
      <div className="pm-row-control">{children(id)}</div>
      {help && <p className="pm-row-help">{help}</p>}
    </div>
  )
}

/** Section repliable du panneau Propriétés. */
export function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  badge?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className={`pm-section ${open ? 'is-open' : ''}`} data-section={title}>
      <button type="button" className="pm-section-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {icon}
        <span>{title}</span>
        {badge}
        <ChevronDown size={15} className="pm-section-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="pm-section-body" id={id}>
          {children}
        </div>
      )}
    </section>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="pm-kbd">{children}</kbd>
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const MOD = isMac ? '⌘' : 'Ctrl'
