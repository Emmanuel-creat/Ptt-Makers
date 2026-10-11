import { describe, expect, it } from 'vitest'
import { TEMPLATES, buildApp, buildProject, parseProject } from '../model/templates'
import { bundle, generate } from './generate'
import { highlightLines } from './highlight'
import { areaNames, gridAreas, gridTemplate, sanitizeColor, sanitizeLength } from './style'
import { videoSource } from './escape'

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

describe('briques avancées, thème et réglages par écran', () => {
  const app = () =>
    buildApp('X', [
      {
        name: 'Accueil',
        children: [
          { type: 'navbar', props: { brand: 'Moi' } },
          {
            type: 'tabs',
            children: [
              { type: 'stack', name: 'Infos', children: [{ type: 'text', props: { text: 'A' } }] },
              { type: 'stack', name: 'Prix', children: [{ type: 'text', props: { text: 'B' } }] },
            ],
          },
          { type: 'accordion', props: { firstOpen: true }, children: [{ type: 'stack', name: 'Question', children: [] }] },
          { type: 'modal', ref: 'fen', props: { label: 'Bravo' }, style: { padding: 20 }, children: [{ type: 'text', props: { text: 'Coucou' } }] },
          { type: 'button', props: { text: 'Ouvrir' }, onClick: [{ type: 'show', target: '@fen' }] },
          { type: 'video', props: { src: 'https://youtu.be/dQw4w9WgXcQ', title: 'Clip' } },
          { type: 'icon', props: { symbol: 'fusee', label: 'Fusée' } },
          // Projet ancien : l'emoji fusée devient l'icône dessinée équivalente.
          { type: 'icon', props: { symbol: '\u{1f680}', label: '' } },
        ],
      },
      { name: 'Contact', children: [] },
    ])

  it('écrit des onglets, un accordéon, une fenêtre, un menu, une vidéo et une icône', () => {
    const { html, css, js } = generate(app())
    expect(html).toContain('<button type="button" role="tab" aria-selected="true">Infos</button>')
    expect(html).toMatch(/<div id="colonne-2" class="stack" hidden>/)
    expect(html).toContain('<details class="accordion-item" open>')
    expect(html).toContain('<summary>Question</summary>')
    expect(html).toContain('<div id="fenetre-1" class="modal" hidden>')
    expect(html).toContain('<button type="button" class="modal-close" aria-label="Fermer">×</button>')
    expect(css).toContain('#fenetre-1 > .modal-box {')
    expect(html).toContain('<a href="#page" class="is-active">Accueil</a>')
    expect(html).toContain('<a href="#page-1">Contact</a>')
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"')
    expect(html).toContain('<span id="icone-1" class="icon" role="img" aria-label="Fusée"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"')
    const rocket = /<span id="icone-1"[^>]*>(<svg[\s\S]*?<\/svg>)<\/span>/.exec(html)![1]
    expect(html).toContain(`<span id="icone-2" class="icon" aria-hidden="true">${rocket}</span>`)
    // Aucun emoji dans le code généré.
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(js).toContain('Onglets : un clic sur un titre affiche son panneau')
    expect(js).toContain('Fenêtres : la croix ou un clic à côté les referme')
    expect(js).toContain('lien.classList.toggle("is-active"')
    expect(() => new Function(js)).not.toThrow()
  })

  it('applique le thème et les réglages propres à la tablette et au mobile', () => {
    const p = buildProject('X', {}, [{ type: 'text', props: { text: 'a' }, style: { fontSize: 20 } }])
    p.theme = { primary: '#e11d48', radius: 4, font: 'serif' }
    p.nodes['texte-1'].responsive = { tablet: { fontSize: 18 }, mobile: { fontSize: 14, hide: true } }
    const { css } = generate(p)
    expect(css).toContain(':root {\n  --couleur: #e11d48;\n  --arrondi: 4px;\n  --police: Georgia')
    expect(css).toContain('@media (max-width: 900px) {\n  /* Paragraphe 1 */\n  #texte-1 {\n    font-size: 18px;\n  }\n}')
    expect(css).toContain('@media (max-width: 600px) {\n  /* Paragraphe 1 */\n  #texte-1 {\n    font-size: 14px;\n    display: none !important;\n  }\n}')
    p.theme = { primary: 'red;} body{display:none' }
    expect(generate(p).css).not.toContain(':root {')
  })

  it('reconnaît les adresses de vidéo', () => {
    expect(videoSource('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3')).toMatchObject({ kind: 'youtube', id: 'dQw4w9WgXcQ' })
    expect(videoSource('https://youtube.com/shorts/dQw4w9WgXcQ')).toMatchObject({ kind: 'youtube' })
    expect(videoSource('https://exemple.fr/film.mp4')).toEqual({ kind: 'file', src: 'https://exemple.fr/film.mp4' })
    expect(videoSource('javascript:alert(1)')).toBeNull()
  })
})

describe('code personnalisé', () => {
  const project = () =>
    buildProject('Code', {}, [
      { type: 'code', props: { html: '<p class="hello">Salut</p>', css: '.hello { color: red; }', js: 'bloc.dataset.pret = "oui";\n// </script> ne casse rien' } },
    ])

  it('pose le HTML, ajoute le CSS et lance le script avec « bloc »', () => {
    const code = generate(project())
    expect(code.html).toContain('<div id="code-1" class="code-perso"></div>')
    expect(code.css).toContain('.hello { color: red; }')
    expect(code.js).toContain('bloc.innerHTML = "<p class=\\"hello\\">Salut</p>";')
    expect(code.js).toContain('})(document.getElementById("code-1"));')
    expect(code.js).not.toMatch(/<\/script/i)
  })

  it('fonctionne dans la page exportée', () => {
    document.body.innerHTML = bundle(generate(project()))
      .replace(/^[\s\S]*<body>/, '')
      .replace(/<script>[\s\S]*<\/script>[\s\S]*$/, '')
    new Function(generate(project()).js)()
    const bloc = document.getElementById('code-1')!
    expect(bloc.querySelector('.hello')?.textContent).toBe('Salut')
    expect(bloc.dataset.pret).toBe('oui')
  })
})

describe('formulaires, cadre d’application et grilles avancées', () => {
  it('grille : colonnes sur mesure et zones nommées, vérifiées contre l’injection de CSS', () => {
    expect(gridTemplate('240px 1fr minmax(120px, 2fr)')).toBe('240px 1fr minmax(120px, 2fr)')
    expect(gridTemplate('1fr; } body {')).toBeNull()
    expect(gridAreas('entete entete\nmenu contenu')).toBe('"entete entete" "menu contenu"')
    expect(gridAreas('a b\nc')).toBeNull()
    expect(gridAreas('a "b')).toBeNull()
    expect(areaNames('entete entete\nmenu .')).toEqual(['entete', 'menu'])
    const project = buildApp('Grille', [
      {
        name: 'Accueil',
        children: [
          {
            type: 'grid',
            props: { areas: 'entete entete\nmenu contenu' },
            children: [
              { type: 'text', props: { text: 'Haut' }, style: { area: 'entete' } },
              { type: 'text', props: { text: 'Menu' }, style: { area: 'menu', alignSelf: 'center' } },
              { type: 'row', style: { grow: true, order: 2 } },
            ],
          },
        ],
      },
    ])
    const css = generate(project).css
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));')
    expect(css).toContain('grid-template-areas: "entete entete" "menu contenu";')
    expect(css).toContain('grid-area: entete;')
    expect(css).toContain('align-self: center;')
    expect(css).toContain('flex: 1 1 0;')
    expect(css).toContain('order: 2;')
  })

  it('cadre d’application : un lien par page dans la barre latérale, et la zone principale', () => {
    const project = buildApp('Appli', [
      { name: 'Tableau de bord', children: [{ type: 'appshell', props: { brand: 'Gestion' }, children: [{ type: 'appheader', props: { title: 'Accueil', subtitle: '' } }] }] },
      { name: 'Clients', children: [] },
    ])
    const { html, js } = generate(project)
    expect(html).toContain('<nav class="app-sidebar" aria-label="Navigation de l’application">')
    expect(html).toContain('<a href="#page-1">Clients</a>')
    expect(html).toContain('<h1 class="appheader-title">Accueil</h1>')
    expect(js).toContain('.app-sidebar a')
  })
})
