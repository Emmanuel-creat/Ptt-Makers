import { describe, expect, it } from 'vitest'
import { TEMPLATES, buildApp, buildProject, parseProject } from '../model/templates'
import { bundle, generate } from './generate'
import { highlightLines } from './highlight'
import { sanitizeColor, sanitizeLength } from './style'

describe('génération de code', () => {
  it('produit une page HTML complète et lisible', () => {
    const p = buildProject('Démo', { title: 'Ma page' }, [{ type: 'heading', props: { text: 'Salut', level: '1' } }])
    const { html } = generate(p)
    expect(html).toContain('<title>Ma page</title>')
    expect(html).toContain('<main id="page" class="page">')
    expect(html).toContain('<h1 id="titre-1">Salut</h1>')
  })

  it('échappe les textes saisis par l’utilisateur', () => {
    const p = buildProject('X', {}, [{ type: 'text', props: { text: '<img src=x onerror=alert(1)>' } }])
    const { html } = generate(p)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<img src=x')
  })

  it('neutralise les liens dangereux', () => {
    const p = buildProject('X', {}, [{ type: 'link', props: { text: 'a', href: 'javascript:alert(1)' } }])
    expect(generate(p).html).toContain('href="#"')
  })

  it('refuse les valeurs CSS qui pourraient injecter du code', () => {
    expect(sanitizeLength('100px; } body { display:none')).toBeNull()
    expect(sanitizeLength('120')).toBe('120px')
    expect(sanitizeLength('50%')).toBe('50%')
    expect(sanitizeColor('red;}')).toBeNull()
    expect(sanitizeColor('#6c5ce7')).toBe('#6c5ce7')
  })

  it('génère le JavaScript du compteur', () => {
    const p = TEMPLATES.find((t) => t.id === 'compteur')!.create()
    const { js, html } = generate(p)
    expect(js).toContain('compteur: 0,')
    expect(js).toContain('etat.compteur = etat.compteur + 1;')
    expect(js).toContain('etat.compteur = etat.compteur - 1;')
    expect(js).toContain('document.getElementById("titre-2").textContent = `${etat.compteur}`;')
    expect(html).toContain('>0</h1>')
  })

  it('relie les champs et gère l’affichage conditionnel', () => {
    const p = TEMPLATES.find((t) => t.id === 'contact')!.create()
    const { js, html } = generate(p)
    expect(js).toContain('etat.nom = evenement.target.value;')
    expect(js).toContain('etat.abonne = evenement.target.checked;')
    expect(js).toMatch(/\.hidden = !etat\.envoye;/)
    expect(html).toMatch(/<div id="carte-2" class="card" hidden>/)
  })

  it('ne casse pas un gabarit JavaScript avec des caractères spéciaux', () => {
    const p = buildProject(
      'X',
      {},
      [{ type: 'text', props: { text: 'Prix: `${1}` \\ {{n}} </script>' } }],
      [{ name: 'n', kind: 'number', initial: 1 }],
    )
    const code = generate(p)
    expect(code.js).toContain('`Prix: \\`\\${1}\\` \\\\ ${etat.n} </script>`')
    const page = bundle(code)
    // Le script intégré ne doit pas pouvoir être refermé par le texte.
    expect(page.match(/<\/script>/g)!.length).toBe(1)
    // Le JavaScript généré reste valide.
    expect(() => new Function(code.js.replace('afficher();\n', '').replace(/document\.getElementById[^\n]*\n/g, ''))).not.toThrow()
  })

  it('indique les lignes de chaque brique', () => {
    const p = TEMPLATES.find((t) => t.id === 'compteur')!.create()
    const code = generate(p)
    const lines = code.html.split('\n')
    const [start, end] = code.map['bouton-3'].html!
    expect(lines.slice(start - 1, end).join('\n')).toContain('id="bouton-3"')
    const [cs] = code.map['carte-1'].css!
    expect(code.css.split('\n')[cs]).toBe('#carte-1 {')
    const [js] = code.map['bouton-3'].js!
    expect(code.js.split('\n')[js]).toContain('getElementById("bouton-3")')
  })

  it('tous les modèles produisent du JavaScript valide', () => {
    for (const t of TEMPLATES) {
      const { js } = generate(t.create())
      expect(() => new Function(js), t.name).not.toThrow()
    }
  })
})

describe('coloration syntaxique', () => {
  it('garde le même nombre de lignes et échappe le HTML', () => {
    const src = '<p class="a">x</p>\n<!-- c -->\n'
    const lines = highlightLines(src, 'html')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('<span class="tok-tag">&lt;p</span>')
  })
})

describe('pages, listes, conditions et API', () => {
  it('écrit une condition si / sinon lisible', () => {
    const p = buildProject(
      'X',
      {},
      [
        {
          type: 'button',
          onClick: [
            {
              type: 'if',
              variable: 'score',
              op: 'gt',
              value: '10',
              then: [{ type: 'alert', message: 'Gagné' }],
              else: [{ type: 'add', variable: 'score', amount: 1 }],
            },
          ],
        },
      ],
      [{ name: 'score', kind: 'number', initial: 0 }],
    )
    const { js } = generate(p)
    expect(js).toContain('  if (etat.score > 10) {\n    alert(`Gagné`);\n  } else {\n    etat.score = etat.score + 1;\n  }\n  afficher();')
    expect(() => new Function(js)).not.toThrow()
  })

  it('une répétition devient un modèle <template> et ses briques des classes', () => {
    const p = TEMPLATES.find((t) => t.id === 'taches')!.create()
    const { html, css, js } = generate(p)
    expect(html).toMatch(/<div id="repetition-1" class="repeat">\n\s+<template>\n\s+<div class="repeat-item">/)
    expect(html).toContain('<p class="texte-2">{{position}}. {{element}}</p>')
    expect(css).toContain('.ligne-2 {')
    expect(js).toContain('rendreListe("repetition-1", etat.taches, (copie, element, position) => {')
    expect(js).toContain('copie.querySelector(".texte-2").textContent = `${position}. ${element}`;')
    expect(js).toContain('etat.taches.splice(position - 1, 1);')
    expect(js).toContain('taches: ["Découvrir Ptt-Makers", "Créer ma première appli"],')
  })

  it('ignore proprement les adresses d’API non sûres', () => {
    const p = buildProject('X', { onLoad: [{ type: 'fetch', url: 'javascript:alert(1)', variable: 'v', path: '' }] }, [], [
      { name: 'v', kind: 'list', initial: [] },
    ])
    const { js } = generate(p)
    expect(js).toContain('// Action ignorée : l’adresse doit commencer par https://')
    expect(js).not.toContain('fetch(')
  })

  it('plusieurs pages : une seule page visible et un aperçu qui démarre où on veut', () => {
    const p = TEMPLATES.find((t) => t.id === 'site')!.create()
    const code = generate(p)
    expect(p.pages).toEqual(['page', 'page-1', 'page-2'])
    expect(code.html).toContain('<main id="page" class="page">')
    expect(code.html).toContain('<main id="page-1" class="page" hidden>')
    expect(code.html).toContain('<a id="lien-2" href="#page-1">À propos</a>')
    expect(code.js).toContain('const PAGES = ["page", "page-1", "page-2"];')
    expect(code.js).toContain('allerA("page-2");')
    expect(bundle(code, { startPage: 'page-2' })).toContain('const PAGE_DEPART = "page-2";')
  })

  it('le code intégré garde les « $ » des textes', () => {
    const p = buildProject('X', {}, [{ type: 'text', props: { text: "Prix : 5 $& 6 $' {{n}}" } }], [{ name: 'n', kind: 'number', initial: 1 }])
    expect(bundle(generate(p))).toContain("`Prix : 5 $& 6 $' ${etat.n}`")
  })

  it('met à niveau un ancien projet sans liste de pages', () => {
    const old = buildApp('Ancien', [{ name: 'Page', children: [] }]) as Partial<ReturnType<typeof buildApp>>
    delete old.pages
    const p = parseProject(old)!
    expect(p.pages).toEqual(['page'])
    expect(parseProject({ version: 2 })).toBeNull()
  })
})
