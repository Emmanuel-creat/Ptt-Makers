import { type Expr, evalExpr, exprText, parseExpr, readRecordField, type EvalEnv } from './expressions'
import type { CollectionField, Variable, VariableKind, VariableValue } from './types'

export const VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Noms réservés aux répétitions : {{element}} est l'élément de la liste, {{position}} son numéro. */
export const RESERVED_NAMES = new Set(['element', 'position', 'etat', 'afficher'])

/** Ce que voit une copie dans une répétition. */
export interface RepeatScope {
  element: unknown
  position: number
  /** Champs de la collection parcourue (pour les champs calculés). */
  fields?: CollectionField[]
}

export type TemplatePart = { kind: 'text'; value: string } | { kind: 'var'; name: string } | { kind: 'expr'; src: string; expr: Expr }

const NAME_PATH = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*$/

/**
 * Découpe « Bonjour {{prenom}} ! » en morceaux de texte et de variables.
 * Un nom peut avoir un champ : {{element.nom}} (dans une répétition).
 * Entre accolades, on peut aussi écrire une formule : {{prix * quantite}}, {{somme(produits.prix)}}.
 */
export function parseTemplate(text: string): TemplatePart[] {
  const parts: TemplatePart[] = []
  const re = /\{\{\s*([^{}]+?)\s*\}\}/g
  let last = 0
  let m: RegExpExecArray | null
  const pushText = (value: string) => {
    const prev = parts[parts.length - 1]
    if (prev?.kind === 'text') prev.value += value
    else parts.push({ kind: 'text', value })
  }
  while ((m = re.exec(text))) {
    if (m.index > last) pushText(text.slice(last, m.index))
    const inner = m[1]
    if (NAME_PATH.test(inner)) parts.push({ kind: 'var', name: inner })
    else {
      const expr = parseExpr(inner)
      if (expr) parts.push({ kind: 'expr', src: inner, expr })
      else pushText(m[0])
    }
    last = m.index + m[0].length
  }
  if (last < text.length) pushText(text.slice(last))
  return parts
}

/** Ce que voit une formule dans l'éditeur : les valeurs de départ des variables, et l'élément d'une répétition. */
export function exprEnv(variables: Variable[], scope?: RepeatScope): EvalEnv {
  const listOf = (path: string[]): unknown[] | undefined => {
    const v = variables.find((x) => x.name === path[0])
    if (!v || !Array.isArray(v.initial)) return undefined
    const items = v.initial as unknown[]
    if (path.length === 1) return items
    if (path.length !== 2) return undefined
    return items.map((r) => readRecordField(r, path[1], v.fields))
  }
  return {
    value: (path) => {
      if (scope && path[0] === 'position' && path.length === 1) return scope.position
      if (scope && path[0] === 'element') {
        if (path.length === 1) return scope.element ?? ''
        let cur: unknown = scope.element
        path.slice(1).forEach((key, i) => {
          cur = i === 0 ? readRecordField(cur, key, scope.fields) : cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[key] : undefined
        })
        return cur ?? ''
      }
      const v = variables.find((x) => x.name === path[0])
      return v && path.length === 1 ? v.initial : undefined
    },
    values: listOf,
  }
}

/** Résultat d'une formule avec les valeurs de départ ; null si elle utilise un nom inconnu. */
export function evaluateTemplateExpr(expr: Expr, variables: Variable[], scope?: RepeatScope): string | null {
  try {
    return exprText(evalExpr(expr, exprEnv(variables, scope)))
  } catch {
    return null
  }
}

export function hasVariables(text: string, variables: Variable[]): boolean {
  return parseTemplate(text).some((p) => (p.kind === 'var' && variables.some((v) => v.name === p.name)) || p.kind === 'expr')
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
    name
      .split('.')
      .slice(1)
      .forEach((key, i) => {
        cur = i === 0 ? readRecordField(cur, key, scope.fields) : cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[key] : undefined
      })
    if (typeof cur === 'number' && scope.fields?.some((f) => f.type === 'formula' && name === `element.${f.name}`)) return exprText(cur)
    if (cur == null) return name === 'element' ? '' : null
    return typeof cur === 'object' ? JSON.stringify(cur) : String(cur)
  }
  const v = variables.find((x) => x.name === name)
  return v ? displayValue(v.initial) : null
}

export function interpolate(text: string, variables: Variable[], scope?: RepeatScope): string {
  return parseTemplate(text)
    .map((p) =>
      p.kind === 'text'
        ? p.value
        : p.kind === 'expr'
          ? (evaluateTemplateExpr(p.expr, variables, scope) ?? `{{${p.src}}}`)
          : (resolveToken(p.name, variables, scope) ?? `{{${p.name}}}`),
    )
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
