/**
 * Petites formules écrites entre accolades : {{prix * quantite}}, {{somme(produits.prix)}},
 * {{prenom & " " & nom}}, {{arrondi(total / 3, 2)}}.
 *
 * Une formule est d'abord découpée en arbre (parseExpr). L'éditeur la calcule directement (evalExpr)
 * et le code généré la traduit en JavaScript lisible (compileExpr) : les deux suivent les mêmes règles.
 */

export type BinOp = '+' | '-' | '*' | '/' | '%' | '&'

export type Expr =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'ref'; path: string[] }
  | { k: 'neg'; a: Expr }
  | { k: 'bin'; op: BinOp; a: Expr; b: Expr }
  | { k: 'call'; fn: FnName; args: Expr[] }

/** Fonctions sur une liste ou une collection : {{somme(produits.prix)}}. */
export const AGGREGATES = ['somme', 'moyenne', 'nombre', 'min', 'max'] as const
export type Aggregate = (typeof AGGREGATES)[number]
export const FUNCTIONS = [...AGGREGATES, 'arrondi'] as const
export type FnName = (typeof FUNCTIONS)[number]

export const FUNCTION_HELP: Record<FnName, string> = {
  somme: 'somme(produits.prix) : le total d’un champ',
  moyenne: 'moyenne(notes) : la moyenne',
  nombre: 'nombre(produits) : le nombre d’éléments',
  min: 'min(produits.prix) : la plus petite valeur',
  max: 'max(produits.prix) : la plus grande valeur',
  arrondi: 'arrondi(total, 2) : arrondi à 2 décimales',
}

type Tok = { t: 'num'; v: number } | { t: 'str'; v: string } | { t: 'id'; v: string } | { t: 'op'; v: string }

function tokenize(src: string): Tok[] | null {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const m = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(src.slice(i))!
      out.push({ t: 'num', v: Number(m[0]) })
      i += m[0].length
      continue
    }
    if (c === '"' || c === "'" || c === '«') {
      const end = c === '«' ? '»' : c
      const close = src.indexOf(end, i + 1)
      if (close < 0) return null
      const raw = src.slice(i + 1, close)
      out.push({ t: 'str', v: c === '«' ? raw.trim() : raw })
      i = close + 1
      continue
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*/.exec(src.slice(i))
    if (id) {
      out.push({ t: 'id', v: id[0] })
      i += id[0].length
      continue
    }
    if ('+-*/%&(),;'.includes(c)) {
      out.push({ t: 'op', v: c === ';' ? ',' : c })
      i++
      continue
    }
    return null
  }
  return out
}

/** Découpe une formule ; null si elle n'est pas valide. */
export function parseExpr(src: string): Expr | null {
  const toks = tokenize(src)
  if (!toks?.length) return null
  let pos = 0
  const peek = () => toks[pos]
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v
  const fail = (): never => {
    throw new Error('formule')
  }

  const primary = (): Expr => {
    const t = toks[pos++]
    if (!t) return fail()
    if (t.t === 'num') return { k: 'num', v: t.v }
    if (t.t === 'str') return { k: 'str', v: t.v }
    if (t.t === 'op' && t.v === '(') {
      const e = concat()
      if (!isOp(')')) fail()
      pos++
      return e
    }
    if (t.t === 'id') {
      if (isOp('(')) {
        if (!(FUNCTIONS as readonly string[]).includes(t.v)) fail()
        pos++
        const args: Expr[] = []
        if (!isOp(')')) {
          args.push(concat())
          while (isOp(',')) {
            pos++
            args.push(concat())
          }
        }
        if (!isOp(')')) fail()
        pos++
        const fn = t.v as FnName
        if (fn === 'arrondi' ? args.length < 1 || args.length > 2 : args.length !== 1 || args[0].k !== 'ref') fail()
        return { k: 'call', fn, args }
      }
      return { k: 'ref', path: t.v.split('.') }
    }
    return fail()
  }
  const unary = (): Expr => {
    if (isOp('-')) {
      pos++
      return { k: 'neg', a: unary() }
    }
    if (isOp('+')) pos++
    return primary()
  }
  const chain = (next: () => Expr, ops: string[]) => (): Expr => {
    let a = next()
    while (peek()?.t === 'op' && ops.includes(String(peek()!.v))) {
      const op = toks[pos++].v as BinOp
      a = { k: 'bin', op, a, b: next() }
    }
    return a
  }
  const mul = chain(unary, ['*', '/', '%'])
  const add = chain(mul, ['+', '-'])
  const concat = chain(add, ['&'])

  try {
    const e = concat()
    return pos === toks.length ? e : null
  } catch {
    return null
  }
}

/** Les noms (variables, champs) utilisés par une formule. */
export function exprRefs(e: Expr, out: string[][] = []): string[][] {
  if (e.k === 'ref') out.push(e.path)
  else if (e.k === 'neg') exprRefs(e.a, out)
  else if (e.k === 'bin') {
    exprRefs(e.a, out)
    exprRefs(e.b, out)
  } else if (e.k === 'call') e.args.forEach((a) => exprRefs(a, out))
  return out
}

/* --------------------------------- Calcul --------------------------------- */

export interface EvalEnv {
  /** Valeur d'un nom (variable, élément d'une répétition, champ d'une fiche) ; undefined s'il est inconnu. */
  value(path: string[]): unknown
  /** Valeurs d'une liste pour somme, moyenne… : produits.prix → les prix ; undefined si ce n'est pas une liste. */
  values(path: string[]): unknown[] | undefined
}

export const toNumber = (x: unknown): number => {
  if (typeof x === 'number') return x
  if (typeof x === 'boolean') return x ? 1 : 0
  if (Array.isArray(x)) return x.length
  const n = Number(String(x ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function aggregate(fn: Aggregate, values: unknown[]): number {
  if (fn === 'nombre') return values.length
  const nums = values.map(toNumber)
  if (!nums.length) return 0
  if (fn === 'somme') return nums.reduce((a, b) => a + b, 0)
  if (fn === 'moyenne') return nums.reduce((a, b) => a + b, 0) / nums.length
  return fn === 'min' ? Math.min(...nums) : Math.max(...nums)
}

export const roundTo = (x: number, digits: number) => {
  const f = 10 ** Math.max(0, Math.min(10, Math.trunc(digits)))
  return Math.round(x * f) / f
}

export class UnknownName extends Error {}

/** Calcule une formule ; lève UnknownName si un nom est inconnu. */
export function evalExpr(e: Expr, env: EvalEnv): number | string {
  switch (e.k) {
    case 'num':
    case 'str':
      return e.v
    case 'ref': {
      const v = env.value(e.path)
      if (v === undefined) throw new UnknownName(e.path.join('.'))
      return Array.isArray(v) ? v.length : typeof v === 'number' || typeof v === 'string' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : String(v ?? '')
    }
    case 'neg':
      return -toNumber(evalExpr(e.a, env))
    case 'bin': {
      const a = evalExpr(e.a, env)
      const b = evalExpr(e.b, env)
      if (e.op === '&') return exprText(a) + exprText(b)
      const x = toNumber(a)
      const y = toNumber(b)
      return e.op === '+' ? x + y : e.op === '-' ? x - y : e.op === '*' ? x * y : e.op === '/' ? x / y : x % y
    }
    case 'call': {
      if (e.fn === 'arrondi') return roundTo(toNumber(evalExpr(e.args[0], env)), e.args[1] ? toNumber(evalExpr(e.args[1], env)) : 0)
      const path = (e.args[0] as Extract<Expr, { k: 'ref' }>).path
      const values = env.values(path)
      if (!values) throw new UnknownName(path.join('.'))
      return aggregate(e.fn, values)
    }
  }
}

/** Résultat affiché : nombre à la française (deux décimales au plus), rien pour une division par zéro. */
export function exprText(v: number | string): string {
  if (typeof v === 'string') return v
  if (!Number.isFinite(v)) return ''
  const rounded = Math.round(v * 100) / 100
  return String(rounded).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/* ---------------------------- Champs calculés ----------------------------- */

/** Ce qu'il faut savoir d'un champ de collection (évite d'importer tout le modèle). */
export interface FieldInfo {
  name: string
  type: string
  formula?: string
}

const formulaCache = new Map<string, Expr | null>()
/** La formule d'un champ calculé, découpée une seule fois. */
export function fieldFormula(f: FieldInfo | undefined): Expr | null {
  if (!f || f.type !== 'formula') return null
  const src = f.formula ?? ''
  if (!formulaCache.has(src)) formulaCache.set(src, parseExpr(src))
  return formulaCache.get(src)!
}

/** Valeur d'un champ d'une fiche ; un champ calculé applique sa formule aux autres champs. */
export function readRecordField(record: unknown, name: string, fields: FieldInfo[] | undefined, depth = 0): unknown {
  const r = record && typeof record === 'object' ? (record as Record<string, unknown>) : {}
  const f = fields?.find((x) => x.name === name)
  const formula = fieldFormula(f)
  if (!f || f.type !== 'formula') return r[name]
  if (!formula || depth > 8) return ''
  try {
    return evalExpr(formula, {
      value: (path) => (path.length === 1 && (fields!.some((x) => x.name === path[0]) || path[0] in r) ? readRecordField(r, path[0], fields, depth + 1) : undefined),
      values: () => undefined,
    })
  } catch {
    return ''
  }
}

/** Le JavaScript qui lit un champ d'une fiche (« x.prix », ou la formule d'un champ calculé). */
export function compileRecordField(obj: string, name: string, fields: FieldInfo[] | undefined, depth = 0): string {
  const f = fields?.find((x) => x.name === name)
  const formula = fieldFormula(f)
  const access = /^\d/.test(name) ? `${obj}?.[${name}]` : `${obj}.${name}`
  if (!f || f.type !== 'formula') return access
  if (!formula || depth > 8) return '""'
  const compiled = compileExpr(formula, {
    ref: (path) => (path.length === 1 && fields!.some((x) => x.name === path[0]) ? compileRecordField(obj, path[0], fields, depth + 1) : null),
    list: () => null,
    isNumber: (path) => fields!.find((x) => x.name === path[0])?.type === 'number',
  })
  return compiled == null ? '""' : `(${compiled})`
}

/** Un champ calculé donne-t-il un nombre (pour la mise en forme) ? */
export const formulaIsNumber = (f: FieldInfo) => {
  const e = fieldFormula(f)
  return !!e && isArith(e)
}

/* ------------------------------ Traduction JS ----------------------------- */

export interface CompileEnv {
  /** Code JavaScript qui lit un nom (ex. « etat.prix », « element.prix ») ; null s'il est inconnu. */
  ref(path: string[]): string | null
  /** Pour somme(produits.prix) : la liste (« etat.produits ») et la lecture d'un élément x (« x.prix »). */
  list(path: string[]): { list: string; read: (x: string) => string } | null
  /** Le nom désigne-t-il sûrement un nombre (pas besoin de Number(…)) ? */
  isNumber?(path: string[]): boolean
}

const isArith = (e: Expr) => e.k === 'num' || e.k === 'neg' || (e.k === 'bin' && e.op !== '&') || e.k === 'call'

/** Traduit une formule en JavaScript ; null si un nom est inconnu. */
export function compileExpr(e: Expr, env: CompileEnv): string | null {
  const PREC: Record<BinOp, number> = { '&': 0, '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 }
  /** Opérande d'un calcul : entre parenthèses seulement si l'ordre des opérations l'exige. */
  const num = (x: Expr, parent?: BinOp, right = false): string | null => {
    const c = compileExpr(x, env)
    if (c == null) return null
    if (x.k === 'bin' && parent) {
      const needs = PREC[x.op] < PREC[parent] || (right && PREC[x.op] === PREC[parent] && ['-', '/', '%'].includes(parent))
      return needs ? `(${c})` : c
    }
    if (isArith(x) || (x.k === 'ref' && env.isNumber?.(x.path))) return c
    return `Number(${c})`
  }
  switch (e.k) {
    case 'num':
      return String(e.v)
    case 'str':
      return JSON.stringify(e.v)
    case 'ref':
      return env.ref(e.path)
    case 'neg': {
      const a = num(e.a)
      return a == null ? null : e.a.k === 'bin' || a.startsWith('-') ? `-(${a})` : `-${a}`
    }
    case 'bin': {
      if (e.op === '&') {
        const a = compileExpr(e.a, env)
        const b = compileExpr(e.b, env)
        return a == null || b == null ? null : `enTexte(${a}) + enTexte(${b})`
      }
      const a = num(e.a, e.op)
      const b = num(e.b, e.op, true)
      return a == null || b == null ? null : `${a} ${e.op} ${b}`
    }
    case 'call': {
      if (e.fn === 'arrondi') {
        const a = compileExpr(e.args[0], env)
        const d = e.args[1] ? compileExpr(e.args[1], env) : '0'
        return a == null || d == null ? null : `arrondir(${a}, ${d})`
      }
      const path = (e.args[0] as Extract<Expr, { k: 'ref' }>).path
      const l = env.list(path)
      if (!l) return null
      return e.fn === 'nombre' ? `${l.list}.length` : `calculer(${JSON.stringify(e.fn)}, ${l.list}.map((x) => ${l.read('x')}))`
    }
  }
}

/** Les fonctions utilitaires dont le code généré a besoin pour ses formules. */
export function exprHelpers(js: string): string[] {
  const out: string[] = []
  if (/\benTexte\(/.test(js)) {
    out.push(
      '// Un nombre s’affiche à la française (1 250,5) ; une division par zéro n’affiche rien',
      'function enTexte(valeur) {',
      '  if (typeof valeur !== "number") return String(valeur ?? "");',
      '  if (!Number.isFinite(valeur)) return "";',
      '  return String(Math.round(valeur * 100) / 100).replace(".", ",").replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ");',
      '}',
    )
  }
  if (/\bcalculer\(/.test(js)) {
    out.push(
      '',
      '// somme, moyenne, min et max d’une liste de valeurs',
      'function calculer(operation, valeurs) {',
      '  const nombres = valeurs.map((v) => Number(v) || 0);',
      '  if (!nombres.length) return 0;',
      '  if (operation === "somme") return nombres.reduce((a, b) => a + b, 0);',
      '  if (operation === "moyenne") return nombres.reduce((a, b) => a + b, 0) / nombres.length;',
      '  return operation === "min" ? Math.min(...nombres) : Math.max(...nombres);',
      '}',
    )
  }
  if (/\barrondir\(/.test(js)) {
    out.push('', '// arrondi(valeur, 2) : deux chiffres après la virgule', 'function arrondir(valeur, chiffres) {', '  const facteur = 10 ** chiffres;', '  return Math.round(Number(valeur) * facteur) / facteur;', '}')
  }
  return out[0] === '' ? out.slice(1) : out
}
