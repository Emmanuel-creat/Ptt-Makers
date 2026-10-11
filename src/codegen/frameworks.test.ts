import * as React from 'react'
import { act, createElement, type ComponentType } from 'react'
import * as JsxRuntime from 'react/jsx-runtime'
import { createRoot } from 'react-dom/client'
import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'
import * as Vue from 'vue'
import { parse } from 'vue/compiler-sfc'
import { TEMPLATES } from '../model/templates'
import { htmlToJsx, toReact, toVue, viteReactFiles } from './frameworks'

const project = (id: string) => TEMPLATES.find((t) => t.id === id)!.create()

/** Compile le JSX exporté avec TypeScript et renvoie le composant. */
function loadReact(jsx: string): ComponentType {
  const out = ts.transpileModule(jsx, {
    fileName: 'App.jsx',
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  expect(out.diagnostics ?? []).toEqual([])
  const mod: { exports: { default?: ComponentType } } = { exports: {} }
  const req = (name: string) => (name === 'react' ? React : name === 'react/jsx-runtime' ? JsxRuntime : {})
  new Function('require', 'module', 'exports', out.outputText)(req, mod, mod.exports)
  return mod.exports.default!
}

let cleanup: (() => void) | null = null
afterEach(() => {
  cleanup?.()
  cleanup = null
  document.body.innerHTML = ''
})

async function mountReact(id: string) {
  const App = loadReact(toReact(project(id)).jsx)
  const el = document.createElement('div')
  document.body.append(el)
  const root = createRoot(el)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  await act(async () => root.render(createElement(App)))
  cleanup = () => act(() => root.unmount())
  return (sel: string) => document.querySelector<HTMLElement>(sel)!
}

async function mountVue(id: string) {
  const { descriptor } = parse(toVue(project(id)))
  expect(descriptor.template?.content).toBeTruthy()
  // Le script « setup » exporté, exécuté avec le vrai onMounted de Vue.
  const body = descriptor.scriptSetup!.content.replace("import { onMounted } from 'vue'", '')
  const el = document.createElement('div')
  document.body.append(el)
  const app = Vue.createApp({ template: descriptor.template!.content, setup: () => new Function('onMounted', body)(Vue.onMounted) })
  app.mount(el)
  await Vue.nextTick()
  cleanup = () => app.unmount()
  return (sel: string) => document.querySelector<HTMLElement>(sel)!
}

describe('export React et Vue', () => {
  it('convertit le HTML en JSX', () => {
    expect(htmlToJsx('<!-- Carte -->\n<div class="card" hidden><label for="a">x {y}</label><input type="text" value="b"></div>')).toBe(
      '{/* Carte */}\n<div className="card" hidden><label htmlFor="a">x {\'{\'}y{\'}\'}</label><input type="text" defaultValue="b" /></div>',
    )
    expect(htmlToJsx('<textarea id="t">Salut &amp; bye</textarea>')).toBe('<textarea id="t" defaultValue="Salut &amp; bye" />')
  })

  it.each(TEMPLATES.map((t) => t.id))('le modèle %s donne du JSX valide', (id) => {
    loadReact(toReact(project(id)).jsx)
  })

  it('React : les icônes dessinées gardent leurs attributs SVG', async () => {
    expect(htmlToJsx('<svg stroke-width="2" aria-hidden="true"><path d="M1 1"/></svg>')).toBe('<svg strokeWidth="2" aria-hidden="true"><path d="M1 1" /></svg>')
    await mountReact('accueil')
    const svg = document.querySelector('#icone-1 svg')!
    expect(svg.getAttribute('stroke-width')).toBe('2')
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('React : le compteur fonctionne', async () => {
    const $ = await mountReact('compteur')
    await act(async () => {
      $('#bouton-3').click()
      $('#bouton-3').click()
    })
    expect($('#titre-2').textContent).toBe('2')
  })

  it('React : la liste de tâches ajoute et retire', async () => {
    const $ = await mountReact('taches')
    expect(document.querySelectorAll('#repetition-1 .repeat-item')).toHaveLength(2)
    const champ = $('#champ-1-champ') as HTMLInputElement
    champ.value = 'Lire'
    champ.dispatchEvent(new Event('input', { bubbles: true }))
    $('#bouton-1').click()
    expect(document.querySelectorAll('#repetition-1 .repeat-item')).toHaveLength(3)
    document.querySelector<HTMLElement>('#repetition-1 .bouton-2')!.click()
    expect($('#texte-1').textContent).toBe('2 tâche(s) à faire')
  })

  it('Vue : le compteur et la liste de tâches fonctionnent', async () => {
    let $ = await mountVue('compteur')
    $('#bouton-3').click()
    expect($('#titre-2').textContent).toBe('1')
    cleanup?.()
    document.body.innerHTML = ''

    $ = await mountVue('taches')
    expect([...document.querySelectorAll('#repetition-1 .texte-2')].map((e) => e.textContent)).toEqual([
      '1. Découvrir Ptt-Makers',
      '2. Créer ma première appli',
    ])
    $('#bouton-3').click()
    expect(document.querySelectorAll('#repetition-1 .repeat-item')).toHaveLength(0)
  })

  it('Vue : le fichier contient le gabarit, le script et le style', () => {
    const sfc = toVue(project('contact'))
    expect(sfc).toMatch(/^<script setup>/)
    expect(sfc).toContain('<main v-pre id="page" class="page">')
    expect(sfc).toContain('onMounted(() => {')
    expect(sfc).toContain('<style>')
  })
})

describe('partage par lien', () => {
  it('le projet tient dans le lien et revient à l’identique', async () => {
    const { encodeProject, decodeProject, shareUrl } = await import('../utils/share')
    const p = project('site')
    const data = await encodeProject(p)
    expect(data).toMatch(/^[\w-]+$/)
    expect(data.length).toBeLessThan(JSON.stringify(p).length)
    expect(await decodeProject(data)).toEqual(p)
    expect(await decodeProject('pas-un-projet')).toBeNull()
    expect(await shareUrl(p, 'https://exemple.fr/app/#ancien')).toBe(`https://exemple.fr/app/#projet=${data}`)
  })
})

describe('projet Vite + React', () => {
  it('contient tout ce qu’il faut pour lancer npm run dev, avec le numéro de version', () => {
    const p = { ...project('vierge'), name: 'Ma Boutique', appVersion: '2.3.1' }
    const files = viteReactFiles(p)
    const paths = files.map((f) => f.path)
    expect(paths).toEqual(
      expect.arrayContaining(['ma-boutique/package.json', 'ma-boutique/index.html', 'ma-boutique/vite.config.js', 'ma-boutique/src/main.jsx', 'ma-boutique/src/App.jsx', 'ma-boutique/src/App.css']),
    )
    const pkg = JSON.parse(files.find((f) => f.path.endsWith('package.json'))!.data as string)
    expect(pkg.version).toBe('2.3.1')
    expect(pkg.scripts.dev).toBe('vite')
    expect(files.find((f) => f.path.endsWith('index.html'))!.data).toContain('<title>Ma Boutique</title>')
    expect(files.find((f) => f.path.endsWith('App.jsx'))!.data).toBe(toReact(p).jsx)
  })

  it('prend 1.0.0 quand le projet n’a pas encore de numéro', () => {
    const files = viteReactFiles({ ...project('vierge'), appVersion: undefined })
    expect(JSON.parse(files.find((f) => f.path.endsWith('package.json'))!.data as string).version).toBe('1.0.0')
  })
})
