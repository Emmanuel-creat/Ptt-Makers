import { Lightbulb, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { countVariableUses } from '../model/refactor'
import type { Variable, VariableKind } from '../model/types'
import { RESERVED_NAMES, VAR_NAME_RE, coerce, convertValue, defaultValue, toVariableName, valueToText } from '../model/variables'
import { useEditor } from '../store/editor'
import { useWorkspace } from '../store/workspace'

export const KIND_LABEL: Record<VariableKind, string> = { text: 'Texte', number: 'Nombre', boolean: 'Vrai / faux', list: 'Liste' }

/** Gestion des variables : l'« état » de l'application. */
export function VariablesPanel() {
  const variables = useEditor((s) => s.project.variables)
  const beginner = useWorkspace((s) => s.beginner)
  return (
    <div className="pm-variables">
      {beginner && (
        <p className="pm-hint">
          <Lightbulb size={15} aria-hidden="true" />
          <span>
            Une <strong>variable</strong> garde une information (un nombre, un texte…) que ton application peut afficher et modifier.
            Écris <code>{'{{nom}}'}</code> dans un texte pour l'afficher.
          </span>
        </p>
      )}
      <NewVariableForm />
      <ul className="pm-var-list">
        {variables.map((v) => (
          <VariableItem key={v.name} variable={v} />
        ))}
      </ul>
      {!variables.length && <p className="pm-empty-small">Aucune variable pour l'instant.</p>}
    </div>
  )
}

export function NewVariableForm({
  onCreated,
  compact,
  defaultKind = 'text',
}: {
  onCreated?: (name: string) => void
  compact?: boolean
  defaultKind?: VariableKind
}) {
  const variables = useEditor((s) => s.project.variables)
  const addVariable = useEditor((s) => s.addVariable)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<VariableKind>(defaultKind)
  const clean = toVariableName(name)
  const exists = variables.some((v) => v.name === clean)
  const reserved = RESERVED_NAMES.has(clean)
  const error = name && !clean ? 'Nom invalide' : exists ? 'Ce nom existe déjà' : reserved ? 'Ce nom est réservé' : ''

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clean || exists || reserved) return
    addVariable({ name: clean, kind, initial: defaultValue(kind) })
    onCreated?.(clean)
    setName('')
  }

  return (
    <form className={`pm-var-new ${compact ? 'is-compact' : ''}`} onSubmit={submit}>
      <div className="pm-var-new-row">
        <input
          className="pm-input"
          placeholder="Nom (ex. score)"
          aria-label="Nom de la nouvelle variable"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select className="pm-input" aria-label="Type de la variable" value={kind} onChange={(e) => setKind(e.target.value as VariableKind)}>
          {Object.entries(KIND_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <button type="submit" className="pm-btn pm-btn-primary pm-btn-icon" disabled={!clean || exists || reserved} aria-label="Créer la variable">
          <Plus size={16} />
        </button>
      </div>
      {error ? (
        <p className="pm-field-error">{error}</p>
      ) : (
        name &&
        clean !== name && (
          <p className="pm-row-help">
            Sera nommée <code>{clean}</code>
          </p>
        )
      )}
    </form>
  )
}

function VariableItem({ variable: v }: { variable: Variable }) {
  const nodes = useEditor((s) => s.project.nodes)
  const variables = useEditor((s) => s.project.variables)
  const { updateVariable, removeVariable, notify } = useEditor.getState()
  const [draft, setDraft] = useState(v.name)
  const uses = countVariableUses(nodes, v.name)

  const commitName = () => {
    const clean = toVariableName(draft)
    if (!clean || !VAR_NAME_RE.test(clean) || RESERVED_NAMES.has(clean) || (clean !== v.name && variables.some((x) => x.name === clean))) {
      setDraft(v.name)
      if (clean !== v.name) notify('Nom de variable invalide ou déjà utilisé')
      return
    }
    setDraft(clean)
    if (clean !== v.name) updateVariable(v.name, { name: clean })
  }

  return (
    <li className="pm-var-item">
      <div className="pm-var-head">
        <span className="pm-var-sigil" aria-hidden="true">
          {'{ }'}
        </span>
        <input
          className="pm-var-name"
          aria-label={`Nom de la variable ${v.name}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <button
          type="button"
          className="pm-icon-btn pm-icon-btn-sm"
          aria-label={`Supprimer la variable ${v.name}`}
          data-tip="Supprimer"
          onClick={() => {
            if (uses && !confirm(`La variable « ${v.name} » est utilisée ${uses} fois. La supprimer quand même ?`)) return
            removeVariable(v.name)
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="pm-var-body">
        <select
          className="pm-input"
          aria-label="Type"
          value={v.kind}
          onChange={(e) => {
            const kind = e.target.value as VariableKind
            updateVariable(v.name, { kind, initial: convertValue(v.initial, kind) })
          }}
        >
          {Object.entries(KIND_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        {v.kind === 'boolean' ? (
          <select
            className="pm-input"
            aria-label="Valeur de départ"
            value={String(v.initial)}
            onChange={(e) => updateVariable(v.name, { initial: e.target.value === 'true' })}
          >
            <option value="false">Faux</option>
            <option value="true">Vrai</option>
          </select>
        ) : v.kind === 'list' ? (
          <ListValue key={v.name} value={v.initial as string[]} onChange={(initial) => updateVariable(v.name, { initial })} />
        ) : (
          <input
            className="pm-input"
            aria-label="Valeur de départ"
            placeholder="Valeur de départ"
            type={v.kind === 'number' ? 'number' : 'text'}
            value={String(v.initial)}
            onChange={(e) => updateVariable(v.name, { initial: coerce(e.target.value, v.kind) })}
          />
        )}
      </div>
      <p className="pm-var-uses">{uses ? `Utilisée ${uses} fois` : 'Pas encore utilisée'}</p>
    </li>
  )
}

/** Valeurs de départ d'une liste : un élément par ligne. */
function ListValue({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState(valueToText(value))
  return (
    <textarea
      className="pm-input pm-var-list-value"
      aria-label="Éléments de départ (un par ligne)"
      placeholder="Un élément par ligne"
      rows={3}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        onChange(coerce(e.target.value, 'list') as string[])
      }}
    />
  )
}
