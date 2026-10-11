import { Braces, Plus, X } from 'lucide-react'
import { useContext, useEffect, useRef, useState } from 'react'
import type { VariableKind } from '../model/types'
import { displayValue } from '../model/variables'
import { useEditor } from '../store/editor'
import { ScopeTokens } from './scope'
import { NewVariableForm } from './VariablesPanel'


export const SWATCHES = ['#ffffff', '#f5f6fa', '#1b1d29', '#6c5ce7', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f3f1ff']

/** Champ texte qui accepte les variables {{nom}} avec un menu d'insertion. */
export function TextInput({
  id,
  value,
  onChange,
  multiline,
  dynamic,
  placeholder,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  dynamic?: boolean
  placeholder?: string
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const [menu, setMenu] = useState(false)
  const variables = useEditor((s) => s.project.variables)
  const scope = useContext(ScopeTokens)

  const insert = (name: string) => {
    const el = ref.current
    const token = `{{${name}}}`
    if (!el) return onChange(value + token)
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    onChange(value.slice(0, start) + token + value.slice(end))
    setMenu(false)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const props = {
    id,
    ref,
    className: 'pm-input',
    value,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  }

  return (
    <div className={`pm-text-input ${dynamic ? 'is-dynamic' : ''}`}>
      {multiline ? <textarea rows={3} {...props} /> : <input type="text" {...props} />}
      {dynamic && (
        <button
          type="button"
          className="pm-insert-var"
          aria-label="Insérer une variable"
          data-tip="Insérer une variable"
          data-tip-side="left"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <Braces size={13} />
        </button>
      )}
      {menu && (
        <Popover onClose={() => setMenu(false)}>
          <p className="pm-popover-title">Insérer une variable</p>
          {scope.map((t) => (
            <button key={t.token} type="button" className="pm-popover-item is-scope" onClick={() => insert(t.token)}>
              <code>{`{{${t.token}}}`}</code>
              <span className="pm-muted">{t.hint}</span>
            </button>
          ))}
          {variables.map((v) => (
            <button key={v.name} type="button" className="pm-popover-item" onClick={() => insert(v.name)}>
              <code>{`{{${v.name}}}`}</code>
              <span className="pm-muted">
                {v.kind === 'collection'
                  ? `collection de ${displayValue(v.initial)} fiche(s)`
                  : v.kind === 'list'
                    ? `liste de ${displayValue(v.initial)} élément(s)`
                    : String(v.initial) || '(vide)'}
              </span>
            </button>
          ))}
          {!variables.length && <p className="pm-row-help">Crée d'abord une variable :</p>}
          <NewVariableForm compact onCreated={insert} />
        </Popover>
      )}
    </div>
  )
}

export function Popover({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  return (
    <div className="pm-popover" ref={ref} role="dialog">
      {children}
    </div>
  )
}

/** Nombre avec unité ; vide = valeur par défaut. */
export function NumberInput({
  id,
  value,
  onChange,
  unit = 'px',
  min = 0,
  max = 400,
  step = 1,
  placeholder = 'auto',
}: {
  id?: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  unit?: string
  min?: number
  max?: number
  step?: number
  placeholder?: string
}) {
  return (
    <div className="pm-number">
      <input
        id={id}
        className="pm-input"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => {
          if (e.target.value === '') return onChange(undefined)
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)))
        }}
      />
      {unit && <span className="pm-number-unit">{unit}</span>}
    </div>
  )
}

export function ColorInput({ id, value, onChange }: { id?: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  const [open, setOpen] = useState(false)
  const hex = value && /^#[0-9a-f]{6}$/i.test(value) ? value : value && /^#[0-9a-f]{3}$/i.test(value) ? expand(value) : '#ffffff'
  return (
    <div className="pm-color">
      <button
        type="button"
        className={`pm-color-swatch ${value ? '' : 'is-empty'}`}
        style={{ background: value || undefined }}
        aria-label="Choisir une couleur"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      />
      <input
        id={id}
        className="pm-input pm-mono"
        placeholder="aucune"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value.trim() || undefined)}
        spellCheck={false}
      />
      {value && (
        <button type="button" className="pm-icon-btn pm-icon-btn-sm" aria-label="Retirer la couleur" data-tip="Retirer" onClick={() => onChange(undefined)}>
          <X size={13} />
        </button>
      )}
      {open && (
        <Popover onClose={() => setOpen(false)}>
          <div className="pm-swatches">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                className={`pm-swatch ${value?.toLowerCase() === c ? 'is-active' : ''}`}
                style={{ background: c }}
                aria-label={c}
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                }}
              />
            ))}
          </div>
          <label className="pm-color-custom">
            <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} />
            <span>
              <Plus size={13} /> Couleur personnalisée
            </span>
          </label>
        </Popover>
      )}
    </div>
  )
}

const expand = (h: string) => '#' + h.slice(1).split('').map((c) => c + c).join('')

export function SelectInput({
  id,
  value,
  options,
  onChange,
  placeholder,
}: {
  id?: string
  value: string | undefined
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <select id={id} className="pm-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Choix d'une variable, avec création rapide. */
export function VariableSelect({
  id,
  value,
  onChange,
  kinds,
  placeholder = 'Aucune',
}: {
  id?: string
  value: string | undefined
  onChange: (v: string) => void
  kinds?: VariableKind[]
  placeholder?: string
}) {
  const variables = useEditor((s) => s.project.variables)
  const [creating, setCreating] = useState(false)
  const list = kinds ? variables.filter((v) => kinds.includes(v.kind)) : variables
  return (
    <div className="pm-var-select">
      <div className="pm-var-select-row">
        <SelectInput
          id={id}
          value={value}
          placeholder={placeholder}
          options={list.map((v) => ({ value: v.name, label: v.name }))}
          onChange={onChange}
        />
        <button
          type="button"
          className="pm-icon-btn pm-icon-btn-sm"
          aria-label="Nouvelle variable"
          data-tip="Nouvelle variable"
          data-tip-side="left"
          onClick={() => setCreating(!creating)}
        >
          <Plus size={14} />
        </button>
      </div>
      {value && !variables.some((v) => v.name === value) && <p className="pm-field-error">La variable « {value} » n'existe plus.</p>}
      {creating && (
        <NewVariableForm
          compact
          defaultKind={kinds?.[0]}
          onCreated={(name) => {
            onChange(name)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}
