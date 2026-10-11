import type { Variable, VariableKind, VariableValue } from './types'

export const VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Noms réservés aux répétitions : {{element}} est l'élément de la liste, {{position}} son numéro. */
export const RESERVED_NAMES = new Set(['element', 'position', 'etat', 'afficher'])

/** Ce que voit une copie dans une répétition. */
export interface RepeatScope {
  element: unknown
  position: number
}

export type TemplatePart = { kind: 'text'; value: string } | { kind: 'var'; name: string }

/**
 * Découpe « Bonjour {{prenom}} ! » en morceaux de texte et de variables.
 * Un nom peut avoir un champ : {{element.nom}} (dans une répétition).
 */
export function parseTemplate(text: string): TemplatePart[] {
  const parts: TemplatePart[] = []
  const re = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*)\s*\}\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ kind: 'text', value: text.slice(last, m.index) })
    parts.push({ kind: 'var', name: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) })
  return parts
}

export function hasVariables(text: string, variables: Variable[]): boolean {
  return parseTemplate(text).some((p) => p.kind === 'var' && variables.some((v) => v.name === p.name))
}

/** Texte affiché pour une valeur : une liste affiche son nombre d'éléments. */
export function displayValue(value: VariableValue): string {
  return Array.isArray(value) ? String(value.length) : String(value)
}

/** Valeur de {{nom}} avec les valeurs de départ (et l'élément courant dans une répétition). */
export function resolveToken(name: string, variables: Variable[], scope?: RepeatScope): string | null {
  if (scope && (name === 'position' || name === 'element' || name.startsWith('element.'))) {
    if (name === 'position') return String(scope.position)
    let cur: unknown = scope.element
    for (const key of name.split('.').slice(1)) cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[key] : undefined
    if (cur == null) return name === 'element' ? '' : null
    return typeof cur === 'object' ? JSON.stringify(cur) : String(cur)
  }
  const v = variables.find((x) => x.name === name)
  return v ? displayValue(v.initial) : null
}

export function interpolate(text: string, variables: Variable[], scope?: RepeatScope): string {
  return parseTemplate(text)
    .map((p) => (p.kind === 'text' ? p.value : (resolveToken(p.name, variables, scope) ?? `{{${p.name}}}`)))
    .join('')
}

/** Convertit une saisie texte dans le type de la variable (une ligne par élément pour une liste). */
export function coerce(value: string, kind: VariableKind): VariableValue {
  if (kind === 'collection') return []
  if (kind === 'list') return value.split('\n').map((s) => s.trim()).filter(Boolean)
  if (kind === 'number') {
    const n = Number(value.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  if (kind === 'boolean') return value === 'true' || value === 'vrai' || value === '1'
  return value
}

export function defaultValue(kind: VariableKind): VariableValue {
  return kind === 'number' ? 0 : kind === 'boolean' ? false : kind === 'list' || kind === 'collection' ? [] : ''
}

/** Valeur sous forme de texte modifiable (une ligne par élément pour une liste). */
export function valueToText(value: VariableValue): string {
  if (!Array.isArray(value)) return String(value)
  // Une fiche de collection devient le texte de son premier champ.
  return (value as unknown[]).map((x) => (x && typeof x === 'object' ? String(Object.values(x)[0] ?? '') : String(x))).join('\n')
}

/** Change le type d'une variable en gardant au mieux sa valeur. */
export function convertValue(value: VariableValue, kind: VariableKind): VariableValue {
  return coerce(valueToText(value), kind)
}

/** Transforme un libellé libre en nom de variable valide (« Mon prénom » → « mon_prenom »). */
export function toVariableName(raw: string): string {
  const base = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!base) return ''
  return /^[0-9]/.test(base) ? `_${base}` : base
}
