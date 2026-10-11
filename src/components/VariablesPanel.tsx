import { Braces, ChevronRight, FileUp, LayoutTemplate, Lightbulb, Plus, Trash2 } from 'lucide-react'
import { countActions, forEachAction, forEachNodeAction } from '../model/actions'
import { FunctionActionsEditor } from './ActionsEditor'
import { useRef, useState } from 'react'
import { DEFAULT_FIELDS, FIELD_TYPE_LABEL, addField, emptyRecord, fieldsOf, formatField, importCsv, recordsOf, removeField, toRecords, updateField } from '../model/collections'
import { countVariableUses } from '../model/refactor'
import { parseExpr, readRecordField } from '../model/expressions'
import { shownField } from '../codegen/proBricks'
import type { AppFunction, CollectionField, DataRecord, FieldType, Variable, VariableKind } from '../model/types'
import { RESERVED_NAMES, VAR_NAME_RE, coerce, convertValue, defaultValue, toVariableName, valueToText } from '../model/variables'
import { useEditor } from '../store/editor'
import { useWorkspace } from '../store/workspace'

const NO_FUNCTIONS: AppFunction[] = []

export const KIND_LABEL: Record<VariableKind, string> = {
  text: 'Texte',
  number: 'Nombre',
  boolean: 'Vrai / faux',
  list: 'Liste',
  collection: 'Collection',
}

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
      <FunctionsSection />
    </div>
  )
}

/** Fonctions réutilisables : une suite d'actions nommée, lancée de partout avec « Lancer une fonction ». */
function FunctionsSection() {
  const functions = useEditor((s) => s.project.functions ?? NO_FUNCTIONS)
  const addFunction = useEditor((s) => s.addFunction)
  const [name, setName] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const clean = toVariableName(name)
  const exists = functions.some((f) => f.name === clean)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (clean && addFunction(clean)) {
      setOpen(clean)
      setName('')
    }
  }
  return (
    <section className="pm-functions" aria-label="Fonctions réutilisables">
      <h3 className="pm-functions-title">
        <Braces size={14} aria-hidden="true" /> Fonctions réutilisables
      </h3>
      <p className="pm-row-help">Une suite d’actions à écrire une fois, puis à lancer depuis n’importe quel bouton avec « Lancer une fonction ».</p>
      <form className="pm-var-new-row" onSubmit={submit}>
        <input className="pm-input" placeholder="Nom (ex. reinitialiser)" aria-label="Nom de la nouvelle fonction" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="pm-btn pm-btn-primary pm-btn-icon" disabled={!clean || exists} aria-label="Créer la fonction">
          <Plus size={16} />
        </button>
      </form>
      {name && exists && <p className="pm-field-error">Ce nom existe déjà</p>}
      <ul className="pm-var-list">
        {functions.map((f) => (
          <FunctionItem key={f.name} fn={f} open={open === f.name} onToggle={() => setOpen(open === f.name ? null : f.name)} />
        ))}
      </ul>
    </section>
  )
}

function FunctionItem({ fn, open, onToggle }: { fn: AppFunction; open: boolean; onToggle: () => void }) {
  const { renameFunction, removeFunction, notify } = useEditor.getState()
  const [draft, setDraft] = useState(fn.name)
  const calls = useEditor((s) => {
    let n = 0
    for (const node of Object.values(s.project.nodes)) forEachNodeAction(node, (a) => a.type === 'call' && a.name === fn.name && n++)
    for (const f of s.project.functions ?? []) forEachAction(f.actions, (a) => a.type === 'call' && a.name === fn.name && n++)
    return n
  })
  const rename = () => {
    const clean = toVariableName(draft)
    if (clean === fn.name) return setDraft(fn.name)
    if (!clean || !renameFunction(fn.name, clean)) {
      notify('Ce nom est déjà pris ou invalide')
      setDraft(fn.name)
    }
  }
  return (
    <li className="pm-var-item pm-function-item">
      <div className="pm-function-head">
        <button type="button" className="pm-function-toggle" aria-expanded={open} onClick={onToggle}>
          <ChevronRight size={14} aria-hidden="true" className={open ? 'is-open' : ''} />
          <code>{fn.name}()</code>
          <span className="pm-muted">
            {countActions(fn.actions)} action(s), {calls} appel(s)
          </span>
        </button>
        <button type="button" className="pm-icon-btn" aria-label={`Supprimer la fonction ${fn.name}`} onClick={() => removeFunction(fn.name)}>
          <Trash2 size={14} />
        </button>
      </div>
      {open && (
        <div className="pm-function-body">
          <input
            className="pm-input"
            aria-label="Nom de la fonction"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={rename}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          />
          <FunctionActionsEditor name={fn.name} />
        </div>
      )}
    </li>
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
    addVariable(kind === 'collection' ? { name: clean, kind, fields: DEFAULT_FIELDS, initial: [] } : { name: clean, kind, initial: defaultValue(kind) })
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
  const functions = useEditor((s) => s.project.functions)
  const uses = countVariableUses(nodes, v.name, functions)

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
            if (kind === 'collection') {
              const fields = v.fields?.length ? v.fields : DEFAULT_FIELDS
              updateVariable(v.name, { kind, fields, initial: toRecords(v.initial, fields) })
            } else updateVariable(v.name, { kind, initial: convertValue(v.initial, kind) })
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
        ) : v.kind === 'collection' ? null : v.kind === 'list' ? (
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
      {v.kind === 'collection' && <CollectionEditor variable={v} />}
      <label className="pm-var-persist">
        <input type="checkbox" checked={!!v.persist} onChange={(e) => updateVariable(v.name, { persist: e.target.checked || undefined })} />
        <span>Garder dans le navigateur (reste après un rechargement)</span>
      </label>
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

/** Champs et fiches de départ d'une collection, comme une petite base de données. */
function CollectionEditor({ variable: v }: { variable: Variable }) {
  const updateVariable = useEditor((s) => s.updateVariable)
  const scaffold = useEditor((s) => s.scaffoldCollection)
  const notify = useEditor((s) => s.notify)
  const fileRef = useRef<HTMLInputElement>(null)
  const fields = fieldsOf(v)
  const records = recordsOf(v)
  const update = (patch: Partial<Variable>) => updateVariable(v.name, patch)
  const setRecord = (i: number, record: DataRecord) => update({ initial: records.map((r, j) => (j === i ? record : r)) })

  return (
    <div className="pm-coll">
      <p className="pm-coll-title">Champs</p>
      <ul className="pm-coll-fields">
        {fields.map((f) => (
          <FieldRow
            key={f.name}
            field={f}
            canRemove={fields.length > 1}
            onChange={(patch) => update(updateField(v, f.name, patch))}
            onRemove={() => update(removeField(v, f.name))}
          />
        ))}
      </ul>
      <NewFieldForm onAdd={(label, type) => update(addField(v, label, type))} />

      <p className="pm-coll-title">
        Fiches de départ <span className="pm-muted">({records.length})</span>
      </p>
      {records.length > 0 && (
        <div className="pm-coll-grid-wrap">
          <table className="pm-coll-grid">
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f.name} scope="col">
                    {f.label}
                  </th>
                ))}
                <th scope="col">
                  <span className="pm-sr-only">Supprimer</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  {fields.map((f) => (
                    <td key={f.name}>
                      <RecordInput
                        field={f}
                        value={f.type === 'formula' ? formatField(readRecordField(r, f.name, fields), shownField(f).type) : r[f.name]}
                        position={i + 1} onChange={(value) => setRecord(i, { ...r, [f.name]: value })} />
                    </td>
                  ))}
                  <td>
                    <button
                      type="button"
                      className="pm-icon-btn pm-icon-btn-sm"
                      aria-label={`Supprimer la fiche ${i + 1}`}
                      onClick={() => update({ initial: records.filter((_, j) => j !== i) })}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pm-coll-actions">
        <button type="button" className="pm-btn pm-btn-dashed pm-btn-sm" onClick={() => update({ initial: [...records, emptyRecord(fields)] })}>
          <Plus size={13} /> Ajouter une fiche
        </button>
        <button type="button" className="pm-btn pm-btn-sm" onClick={() => fileRef.current?.click()}>
          <FileUp size={13} /> Importer un CSV
        </button>
        <button type="button" className="pm-btn pm-btn-sm" onClick={() => scaffold(v.name)}>
          <LayoutTemplate size={13} /> Créer un formulaire et un tableau
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          hidden
          aria-label={`Fichier CSV à importer dans ${v.name}`}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            const imported = importCsv(await file.text())
            if (!imported) return notify('Ce fichier ne contient pas de données lisibles')
            if (records.length && !confirm(`Remplacer les ${records.length} fiche(s) de « ${v.name} » par celles du fichier ?`)) return
            update(imported)
            notify(`${(imported.initial as unknown[]).length} fiche(s) importée(s) dans « ${v.name} »`)
          }}
        />
      </div>
    </div>
  )
}

function FieldRow({
  field: f,
  canRemove,
  onChange,
  onRemove,
}: {
  field: CollectionField
  canRemove: boolean
  onChange: (patch: Partial<Pick<CollectionField, 'label' | 'type' | 'formula'>>) => void
  onRemove: () => void
}) {
  const [label, setLabel] = useState(f.label)
  const [formula, setFormula] = useState(f.formula ?? '')
  const formulaError = f.type === 'formula' && formula.trim() !== '' && !parseExpr(formula)
  return (
    <li className="pm-coll-field">
      <input
        className="pm-input"
        aria-label={`Nom affiché du champ ${f.name}`}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => (label.trim() ? label !== f.label && onChange({ label: label.trim() }) : setLabel(f.label))}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <select className="pm-input" aria-label={`Type du champ ${f.label}`} value={f.type} onChange={(e) => onChange({ type: e.target.value as FieldType })}>
        {Object.entries(FIELD_TYPE_LABEL).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <code className="pm-coll-token" title="À écrire dans une répétition">{`element.${f.name}`}</code>
      <button
        type="button"
        className="pm-icon-btn pm-icon-btn-sm"
        aria-label={`Supprimer le champ ${f.label}`}
        disabled={!canRemove}
        onClick={() => {
          if (confirm(`Supprimer le champ « ${f.label} » et ses valeurs ?`)) onRemove()
        }}
      >
        <Trash2 size={13} />
      </button>
      {f.type === 'formula' && (
        <div className="pm-coll-formula">
          <input
            className={`pm-input ${formulaError ? 'is-invalid' : ''}`}
            aria-label={`Formule du champ ${f.label}`}
            placeholder="ex. prix * quantite"
            value={formula}
            onChange={(e) => {
              setFormula(e.target.value)
              if (!e.target.value.trim() || parseExpr(e.target.value)) onChange({ formula: e.target.value })
            }}
          />
          {formulaError && <p className="pm-field-error">Formule incomplète</p>}
        </div>
      )}
    </li>
  )
}

function NewFieldForm({ onAdd }: { onAdd: (label: string, type: FieldType) => void }) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<FieldType>('text')
  return (
    <form
      className="pm-coll-new"
      onSubmit={(e) => {
        e.preventDefault()
        if (!label.trim()) return
        onAdd(label, type)
        setLabel('')
      }}
    >
      <input className="pm-input" placeholder="Nouveau champ (ex. Prix)" aria-label="Nom du nouveau champ" value={label} onChange={(e) => setLabel(e.target.value)} />
      <select className="pm-input" aria-label="Type du nouveau champ" value={type} onChange={(e) => setType(e.target.value as FieldType)}>
        {Object.entries(FIELD_TYPE_LABEL).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <button type="submit" className="pm-btn pm-btn-primary pm-btn-icon" disabled={!label.trim()} aria-label="Ajouter le champ">
        <Plus size={16} />
      </button>
    </form>
  )
}

function RecordInput({
  field: f,
  value,
  position,
  onChange,
}: {
  field: CollectionField
  value: unknown
  position: number
  onChange: (v: string | number | boolean) => void
}) {
  const label = `${f.label} de la fiche ${position}`
  if (f.type === 'formula') return <output className="pm-coll-computed" aria-label={label}>{String(value ?? '')}</output>
  if (f.type === 'boolean') return <input type="checkbox" aria-label={label} checked={value === true} onChange={(e) => onChange(e.target.checked)} />
  if (f.type === 'number')
    return (
      <input
        className="pm-input"
        type="number"
        aria-label={label}
        value={typeof value === 'number' ? value : Number(value) || 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    )
  return (
    <input
      className="pm-input"
      type={f.type === 'date' ? 'date' : 'text'}
      aria-label={label}
      placeholder={f.type === 'image' || f.type === 'link' ? 'https://…' : ''}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
