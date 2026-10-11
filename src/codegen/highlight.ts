import { escapeHtml } from './escape'

export type Lang = 'html' | 'css' | 'js'
type Token = { cls: string | null; text: string }

function byRegex(src: string, re: RegExp, classify: (m: RegExpExecArray) => string | null): Token[] {
  const tokens: Token[] = []
  let last = 0
  let m: RegExpExecArray | null
  re.lastIndex = 0
  while ((m = re.exec(src))) {
    if (m[0] === '') {
      re.lastIndex++
      continue
    }
    if (m.index > last) tokens.push({ cls: null, text: src.slice(last, m.index) })
    tokens.push({ cls: classify(m), text: m[0] })
    last = m.index + m[0].length
  }
  if (last < src.length) tokens.push({ cls: null, text: src.slice(last) })
  return tokens
}

const JS_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'new', 'true', 'false', 'null', 'undefined', 'for', 'of',
])

function tokenizeJs(src: string): Token[] {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g
  return byRegex(src, re, (m) => {
    if (m[1]) return 'tok-comment'
    if (m[2]) return 'tok-string'
    if (m[3]) return 'tok-number'
    if (m[4]) return JS_KEYWORDS.has(m[4]) ? 'tok-keyword' : 'tok-fn'
    if (m[5]) return JS_KEYWORDS.has(m[5]) ? 'tok-keyword' : m[5] === 'etat' || m[5] === 'document' ? 'tok-var' : null
    return null
  })
}

function tokenizeCss(src: string): Token[] {
  const tokens: Token[] = []
  // Découpe grossière : commentaires, blocs { … }, et le reste (sélecteurs / règles @).
  const re = /(\/\*[\s\S]*?\*\/)|(\{)|(\})|([^{}/]+|\/)/g
  let depth = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (m[1]) tokens.push({ cls: 'tok-comment', text: m[1] })
    else if (m[2]) {
      depth++
      tokens.push({ cls: 'tok-punct', text: '{' })
    } else if (m[3]) {
      depth = Math.max(0, depth - 1)
      tokens.push({ cls: 'tok-punct', text: '}' })
    } else {
      const chunk = m[4]
      if (depth > 0 && /[:;]/.test(chunk)) {
        tokens.push(
          ...byRegex(chunk, /([\w-]+)(?=\s*:)|(#[0-9a-fA-F]{3,8}\b)|(-?\d+(?:\.\d+)?(?:px|%|rem|em|vh|vw|s|deg)?)|(!important)/g, (mm) =>
            mm[1] ? 'tok-prop' : mm[2] ? 'tok-number' : mm[3] ? 'tok-number' : 'tok-keyword',
          ),
        )
      } else {
        tokens.push(...byRegex(chunk, /(@[\w-]+)|([^\s,][^,\n]*)/g, (mm) => (mm[1] ? 'tok-keyword' : 'tok-selector')))
      }
    }
  }
  return tokens
}

function tokenizeHtml(src: string): Token[] {
  const tokens: Token[] = []
  const re = /(<!--[\s\S]*?-->)|(<!DOCTYPE[^>]*>)|(<\/?[\w-]+)([^>]*?)(\/?>)/gi
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (m.index > last) tokens.push({ cls: null, text: src.slice(last, m.index) })
    if (m[1]) tokens.push({ cls: 'tok-comment', text: m[1] })
    else if (m[2]) tokens.push({ cls: 'tok-keyword', text: m[2] })
    else {
      tokens.push({ cls: 'tok-tag', text: m[3] })
      tokens.push(...byRegex(m[4], /([\w-]+)(?==)|("[^"]*")|([\w-]+)/g, (mm) => (mm[2] ? 'tok-string' : 'tok-attr')))
      tokens.push({ cls: 'tok-tag', text: m[5] })
    }
    last = m.index + m[0].length
  }
  if (last < src.length) tokens.push({ cls: null, text: src.slice(last) })
  return tokens
}

/** Renvoie une ligne HTML colorée par ligne de code. */
export function highlightLines(src: string, lang: Lang): string[] {
  const tokens = lang === 'html' ? tokenizeHtml(src) : lang === 'css' ? tokenizeCss(src) : tokenizeJs(src)
  const lines: string[] = ['']
  for (const t of tokens) {
    const parts = t.text.split('\n')
    parts.forEach((part, i) => {
      if (i > 0) lines.push('')
      if (!part) return
      const html = escapeHtml(part)
      lines[lines.length - 1] += t.cls ? `<span class="${t.cls}">${html}</span>` : html
    })
  }
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  return lines
}
