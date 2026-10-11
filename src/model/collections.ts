import type { CollectionField, DataRecord, FieldType, Variable, VariableValue } from './types'
import { toVariableName } from './variables'

/**
 * Collections : une petite base de données intégrée au projet.
 * Une collection est une variable dont chaque élément est une fiche (un objet) avec des champs typés.
 */

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Texte',
  number: 'Nombre',
  date: 'Date',
  boolean: 'Oui / non',
  image: 'Image (adresse)',
  link: 'Lien',
}

export const isCollection = (v: Variable | undefined): v is Variable & { kind: 'collection' } => v?.kind === 'collection'

/** Les variables qui contiennent plusieurs éléments (listes de textes et collections). */
export const isListLike = (v: Variable | undefined): boolean => v?.kind === 'list' || v?.kind === 'collection'

export const DEFAULT_FIELDS: CollectionField[] = [{ name: 'nom', label: 'Nom', type: 'text' }]

/** Champs d'une collection (jamais vide). */
export function fieldsOf(v: Variable): CollectionField[] {
  return v.fields?.length ? v.fields : DEFAULT_FIELDS
}

/** Fiches d'une collection (les éléments qui ne sont pas des objets sont ignorés). */
export function recordsOf(v: Variable): DataRecord[] {
  return Array.isArray(v.initial) ? (v.initial as unknown[]).filter(isRecord) : []
}

export function isRecord(x: unknown): x is DataRecord {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/** Valeur vide d'un champ selon son type. */
export function emptyValue(type: FieldType): string | number | boolean {
  return type === 'number' ? 0 : type === 'boolean' ? false : ''
}

export function emptyRecord(fields: CollectionField[]): DataRecord {
  return Object.fromEntries(fields.map((f) => [f.name, emptyValue(f.type)]))
}

/** Convertit une saisie dans le type du champ. */
export function coerceField(raw: unknown, type: FieldType): string | number | boolean {
  if (type === 'number') {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
    const n = Number(String(raw ?? '').replace(/[\s  ]/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  if (type === 'boolean') {
    if (typeof raw === 'boolean') return raw
    return ['oui', 'vrai', 'true', '1', 'x'].includes(String(raw ?? '').trim().toLowerCase())
  }
  return raw == null ? '' : String(raw)
}

/** 1250.5 → « 1 250,5 » (deux décimales au plus). Même règle que le script généré. */
export function formatNumberFr(n: number): string {
  const rounded = Math.round(n * 100) / 100
  return String(rounded).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Valeur affichée dans un tableau : nombre à la française, date jj/mm/aaaa, Oui ou Non. */
export function formatField(value: unknown, type: FieldType): string {
  if (value == null || value === '') return ''
  if (type === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? formatNumberFr(n) : String(value)
  }
  if (type === 'boolean') return value === true || value === 'true' ? 'Oui' : 'Non'
  if (type === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value)
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** Nom technique d'un champ à partir de son libellé (« Prix TTC » → « prix_ttc »), unique dans la collection. */
export function fieldName(label: string, taken: string[]): string {
  const base = toVariableName(label).toLowerCase() || 'champ'
  let name = base
  for (let i = 2; taken.includes(name); i++) name = `${base}_${i}`
  return name
}

/** Ajoute un champ (et sa valeur vide dans chaque fiche). */
export function addField(v: Variable, label: string, type: FieldType): Pick<Variable, 'fields' | 'initial'> {
  const fields = fieldsOf(v)
  const field = { name: fieldName(label, fields.map((f) => f.name)), label: label.trim() || 'Champ', type }
  return { fields: [...fields, field], initial: recordsOf(v).map((r) => ({ ...r, [field.name]: emptyValue(type) })) }
}

/** Change un champ ; les fiches suivent (nouveau nom, valeurs converties dans le nouveau type). */
export function updateField(v: Variable, name: string, patch: Partial<Pick<CollectionField, 'label' | 'type'>>): Pick<Variable, 'fields' | 'initial'> {
  const fields = fieldsOf(v)
  const old = fields.find((f) => f.name === name)
  if (!old) return { fields, initial: recordsOf(v) }
  // Le nom technique ne change pas : les {{element.nom}} déjà écrits restent valables.
  const next: CollectionField = {
    name: old.name,
    label: patch.label ?? old.label,
    type: patch.type ?? old.type,
  }
  return {
    fields: fields.map((f) => (f.name === name ? next : f)),
    initial: recordsOf(v).map((r) => {
      const { [name]: value, ...rest } = r
      const kept = patch.type && patch.type !== old.type ? coerceField(value, next.type) : (value ?? emptyValue(next.type))
      // On garde l'ordre des champs dans la fiche.
      return Object.fromEntries(fields.map((f) => (f.name === name ? [next.name, kept] : [f.name, rest[f.name]])))
    }),
  }
}

export function removeField(v: Variable, name: string): Pick<Variable, 'fields' | 'initial'> {
  return {
    fields: fieldsOf(v).filter((f) => f.name !== name),
    initial: recordsOf(v).map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== name))),
  }
}

/** Champs devinés à partir de fiches (données importées ou chargées depuis une API). */
export function inferFields(records: DataRecord[]): CollectionField[] {
  const names: string[] = []
  for (const r of records.slice(0, 50)) for (const k of Object.keys(r)) if (!names.includes(k)) names.push(k)
  return names.map((name) => {
    const values = records.map((r) => r[name]).filter((x) => x !== '' && x != null)
    let type: FieldType = 'text'
    if (values.length && values.every((x) => typeof x === 'number')) type = 'number'
    else if (values.length && values.every((x) => typeof x === 'boolean')) type = 'boolean'
    else if (values.length && values.every((x) => /^\d{4}-\d{2}-\d{2}/.test(String(x)))) type = 'date'
    else if (values.length && values.every((x) => /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(String(x)))) type = 'image'
    else if (values.length && values.every((x) => /^https?:\/\//i.test(String(x)))) type = 'link'
    return { name, label: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '), type }
  })
}

/** Valeur de départ d'une collection à partir d'une autre valeur (changement de type). */
export function toRecords(value: VariableValue, fields: CollectionField[]): DataRecord[] {
  if (!Array.isArray(value)) return []
  const first = fields[0]?.name ?? 'nom'
  return (value as unknown[]).map((x) => (isRecord(x) ? x : { ...emptyRecord(fields), [first]: String(x) }))
}

/** Lit un fichier CSV (séparé par « ; », « , » ou une tabulation, guillemets acceptés). La première ligne donne les titres. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
  const count = (c: string) => firstLine.split(c).length - 1
  const sep = [';', '\t', ','].reduce((best, c) => (count(c) > count(best) ? c : best), ';')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === sep) {
      row.push(cell.trim())
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

/** Champs et fiches tirés d'un CSV : les types sont devinés (nombres à la française, dates jj/mm/aaaa, oui/non). */
export function importCsv(text: string): Pick<Variable, 'fields' | 'initial'> | null {
  const [head, ...body] = parseCsv(text)
  if (!head?.length || !body.length) return null
  const names: string[] = []
  const labels = head.map((h, i) => h || `Colonne ${i + 1}`)
  for (const l of labels) names.push(fieldName(l, names))
  const column = (i: number) => body.map((r) => r[i] ?? '').filter(Boolean)
  const fields: CollectionField[] = labels.map((label, i) => {
    const values = column(i)
    let type: FieldType = 'text'
    if (values.length && values.every((x) => /^-?[\d\s  ]+([.,]\d+)?$/.test(x))) type = 'number'
    else if (values.length && values.every((x) => /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/.test(x))) type = 'date'
    else if (values.length && values.every((x) => /^(oui|non|vrai|faux|true|false)$/i.test(x))) type = 'boolean'
    else if (values.length && values.every((x) => /^https?:\/\//i.test(x))) type = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(values[0]) ? 'image' : 'link'
    return { name: names[i], label, type }
  })
  const toValue = (raw: string, f: CollectionField) => {
    if (f.type === 'date') {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw)
      return m ? `${m[3]}-${m[2]}-${m[1]}` : raw
    }
    return raw === '' ? emptyValue(f.type) : coerceField(raw, f.type)
  }
  return { fields, initial: body.map((r) => Object.fromEntries(fields.map((f, i) => [f.name, toValue(r[i] ?? '', f)]))) }
}
