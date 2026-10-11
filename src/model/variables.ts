import type { Variable, VariableKind } from './types'

export const VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

export type TemplatePart = { kind: 'text'; value: string } | { kind: 'var'; name: string }

/** Découpe « Bonjour {{prenom}} ! » en morceaux de texte et de variables. */
export function parseTemplate(text: string): TemplatePart[] {
  const parts: TemplatePart[] = []
  const re = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g
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

export function interpolate(text: string, variables: Variable[]): string {
  return parseTemplate(text)
    .map((p) => {
      if (p.kind === 'text') return p.value
      const v = variables.find((x) => x.name === p.name)
      return v ? String(v.initial) : `{{${p.name}}}`
    })
    .join('')
}

/** Convertit une saisie texte dans le type de la variable. */
export function coerce(value: string, kind: VariableKind): string | number | boolean {
  if (kind === 'number') {
    const n = Number(value.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  if (kind === 'boolean') return value === 'true' || value === 'vrai' || value === '1'
  return value
}

export function defaultValue(kind: VariableKind): string | number | boolean {
  return kind === 'number' ? 0 : kind === 'boolean' ? false : ''
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
