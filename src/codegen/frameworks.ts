import type { Project } from '../model/types'
import { escapeTemplate } from './escape'
import { generate, type GeneratedCode } from './generate'

/**
 * Export vers React et Vue.
 * La structure de la page devient du JSX (ou un gabarit Vue) et le script généré
 * est lancé une fois, quand le composant est affiché : il agit sur la page par les
 * mêmes identifiants que dans la version HTML.
 */

/** Contenu de <body> sans la balise <script>, décalé à gauche. */
function bodyOf(code: GeneratedCode): string {
  const html = code.html
  const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('  <script src="script.js">'))
  return body
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => l.replace(/^ {2}/, ''))
    .join('\n')
}

const indentBy = (text: string, pad: string) =>
  text
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n')

const VOID = new Set(['input', 'img', 'br', 'hr', 'source'])
const JSX_NAMES: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  allowfullscreen: 'allowFullScreen',
  autoplay: 'autoPlay',
}

function jsxAttrs(tag: string, raw: string): string {
  const out: string[] = []
  for (const m of raw.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) {
    let [, name] = m
    const value = m[2]
    // Les valeurs de départ des champs : React les veut en « default ».
    if (tag === 'input' && name === 'value') name = 'defaultValue'
    else if (tag === 'input' && name === 'checked') name = 'defaultChecked'
    else if (tag === 'option' && name === 'selected') continue
    else name = JSX_NAMES[name] ?? name
    // Attributs SVG des icônes : « stroke-width » devient « strokeWidth ».
    if (name.includes('-') && !/^(data|aria)-/.test(name)) name = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    out.push(value === undefined ? name : `${name}="${value}"`)
  }
  return out.length ? ' ' + out.join(' ') : ''
}

/** Convertit le HTML généré par Ptt-Makers (bien formé, attributs échappés) en JSX. */
export function htmlToJsx(html: string): string {
  const token =
    /<!--([\s\S]*?)-->|<template>([\s\S]*?)<\/template>|<textarea([^>]*)>([\s\S]*?)<\/textarea>|<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g
  let out = ''
  for (const m of html.matchAll(token)) {
    const [, comment, template, taAttrs, taValue, closing, tag, attrs, text] = m
    if (comment !== undefined) out += `{/*${comment.replace(/\*\//g, '* /')}*/}`
    else if (template !== undefined) {
      // Le modèle d'une répétition reste du HTML : le script le recopie pour chaque élément.
      const inner = template.replace(/^\n/, '').replace(/\n\s*$/, '')
      out += `<template dangerouslySetInnerHTML={{ __html: \`\n${escapeTemplate(inner)}\n\` }} />`
    } else if (taAttrs !== undefined) out += `<textarea${jsxAttrs('textarea', taAttrs)} defaultValue="${taValue}" />`
    else if (tag !== undefined) {
      const name = tag.toLowerCase()
      const selfClosing = /\/\s*$/.test(attrs)
      if (closing) out += `</${name}>`
      else out += `<${name}${jsxAttrs(name, attrs.replace(/\/\s*$/, '').trim())}${VOID.has(name) || selfClosing ? ' />' : '>'}`
    } else if (text !== undefined) out += text.replace(/[{}]/g, (c) => `{'${c}'}`)
  }
  return out
}

const header = (project: Project, kind: string, usage: string) =>
  [`// ${kind} généré par Ptt-Makers à partir du projet « ${project.name.replace(/\n/g, ' ')} ».`, `// ${usage}`].join('\n')

export interface ReactExport {
  jsx: string
  css: string
}

export function toReact(project: Project, code: GeneratedCode = generate(project)): ReactExport {
  const jsx = [
    header(project, 'Composant React', 'Dans un projet Vite + React, remplace src/App.jsx et src/App.css par ces deux fichiers.'),
    "import { useEffect, useRef } from 'react'",
    "import './App.css'",
    '',
    'export default function App() {',
    '  const demarre = useRef(false)',
    '',
    '  useEffect(() => {',
    '    // Le comportement de la page est lancé une seule fois (même en mode strict).',
    '    if (demarre.current) return',
    '    demarre.current = true',
    '',
    indentBy(code.js.trimEnd(), '    '),
    '  }, [])',
    '',
    '  return (',
    '    <>',
    indentBy(htmlToJsx(bodyOf(code)), '      '),
    '    </>',
    '  )',
    '}',
    '',
  ].join('\n')
  return { jsx, css: code.css }
}

export function toVue(project: Project, code: GeneratedCode = generate(project)): string {
  // v-pre : Vue affiche ce HTML tel quel (les {{…}} des répétitions sont remplis par le script).
  const template = bodyOf(code).replace(/^<(main|section|div|nav)\b/gm, '<$1 v-pre')
  return [
    '<script setup>',
    header(project, 'Composant Vue', 'Dans un projet Vite + Vue, remplace src/App.vue par ce fichier.'),
    "import { onMounted } from 'vue'",
    '',
    '// Le comportement de la page est lancé quand le composant est affiché.',
    'onMounted(() => {',
    indentBy(code.js.trimEnd().replace(/<\/(script)/gi, '<\\/$1'), '  '),
    '})',
    '</script>',
    '',
    '<template>',
    indentBy(template, '  '),
    '</template>',
    '',
    '<style>',
    code.css.trimEnd().replace(/<\/(style)/gi, '<\\/$1'),
    '</style>',
    '',
  ].join('\n')
}
