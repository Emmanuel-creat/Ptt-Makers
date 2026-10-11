import { afterEach, describe, expect, it } from 'vitest'
import { buildApp, TEMPLATES } from '../model/templates'
import type { Project } from '../model/types'
import { generate } from './generate'

/** Charge le code généré dans le DOM de test et exécute son script, comme le ferait un navigateur. */
function run(source: string | Project) {
  const code = generate(typeof source === 'string' ? TEMPLATES.find((t) => t.id === source)!.create() : source)
  const body = code.html.slice(code.html.indexOf('<body>') + 6, code.html.indexOf('<script'))
  document.body.innerHTML = body
  // Les écouteurs posés sur window par le script sont retirés après chaque test.
  const add = window.addEventListener
  window.addEventListener = ((type: string, fn: EventListener) => {
    listeners.push([type, fn])
    add.call(window, type, fn)
  }) as typeof window.addEventListener
  try {
    new Function(code.js)()
  } finally {
    window.addEventListener = add
  }
  return (id: string) => document.getElementById(id)!
}

const listeners: [string, EventListener][] = []

afterEach(() => {
  for (const [type, fn] of listeners.splice(0)) window.removeEventListener(type, fn)
  document.body.innerHTML = ''
})

describe('le code exporté fonctionne sans Ptt-Makers', () => {
  it('compteur', () => {
    const $ = run('compteur')
    $('bouton-3').click()
    $('bouton-3').click()
    $('bouton-1').click()
    expect($('titre-2').textContent).toBe('1')
    $('bouton-2').click()
    expect($('titre-2').textContent).toBe('0')
  })

  it('formulaire de contact', () => {
    const $ = run('contact')
    const prenom = $('champ-1-champ') as HTMLInputElement
    prenom.value = 'Lina'
    prenom.dispatchEvent(new Event('input'))
    expect($('texte-1').textContent).toBe('Bonjour Lina ! Laisse-nous un message, on te répond vite.')
    expect($('carte-2').hidden).toBe(true)
    // Le formulaire est vérifié avant l'envoi : l'e-mail et le message manquent.
    $('bouton-1').click()
    expect($('carte-2').hidden).toBe(true)
    expect(document.activeElement).toBe($('champ-2-champ'))
    const email = $('champ-2-champ') as HTMLInputElement
    email.value = 'lina@exemple.fr'
    email.dispatchEvent(new Event('input'))
    const message = $('zone-1-champ') as HTMLTextAreaElement
    message.value = 'Bonjour, une question sur vos horaires.'
    message.dispatchEvent(new Event('input'))
    $('bouton-1').click()
    expect($('carte-2').hidden).toBe(false)
    expect($('texte-2').textContent).toContain('Merci Lina')
  })

  it('carte de profil', () => {
    const $ = run('profil')
    $('bouton-1').click()
    expect($('texte-2').textContent).toBe('129 abonnés')
  })
})

describe('listes, conditions, pages et API', () => {
  it('liste de tâches : ajouter, retirer, vider', () => {
    const $ = run('taches')
    const items = () => [...document.querySelectorAll('#repetition-1 .repeat-item')].map((el) => el.textContent?.replace(/\s+/g, ' ').trim())
    expect(items()).toEqual(['1. Découvrir Ptt-Makers Fait', '2. Créer ma première appli Fait'])
    expect($('texte-1').textContent).toBe('2 tâche(s) à faire')

    // Condition : rien n'est ajouté si le champ est vide.
    const alerts: string[] = []
    window.alert = (m: string) => alerts.push(m)
    $('bouton-1').click()
    expect(alerts).toEqual(['Écris d’abord une tâche.'])

    const champ = $('champ-1-champ') as HTMLInputElement
    champ.value = 'Lire un livre'
    champ.dispatchEvent(new Event('input'))
    $('bouton-1').click()
    expect(items()).toHaveLength(3)
    expect(champ.value).toBe('')

    // « Fait » retire la tâche de sa propre copie.
    ;(document.querySelectorAll('#repetition-1 .bouton-2')[0] as HTMLElement).click()
    expect(items()[0]).toContain('1. Créer ma première appli')
    expect($('texte-1').textContent).toBe('2 tâche(s) à faire')

    $('bouton-3').click()
    expect(items()).toHaveLength(0)
    expect($('repetition-1').textContent).toContain('Bravo, plus rien à faire')
  })

  it('annuaire : charge les données d’une API au chargement', async () => {
    const users = [
      { name: 'Léa', email: 'lea@ex.fr', address: { city: 'Lyon' } },
      { name: 'Sam', email: 'sam@ex.fr', address: { city: 'Nantes' } },
    ]
    const calls: string[] = []
    globalThis.fetch = ((url: string) => {
      calls.push(url)
      return Promise.resolve({ json: () => Promise.resolve(users) })
    }) as unknown as typeof fetch
    const $ = run('annuaire')
    expect($('repetition-1').textContent).toContain('Chargement…')
    await new Promise((r) => setTimeout(r, 0))
    expect(calls).toEqual(['https://jsonplaceholder.typicode.com/users'])
    const cards = document.querySelectorAll('#repetition-1 .carte-1')
    expect(cards).toHaveLength(2)
    expect(cards[1].textContent).toContain('Sam')
    expect(cards[1].textContent).toContain('Nantes')
    expect($('texte-1').textContent).toContain('2 personnes trouvées')
  })

  it('site de plusieurs pages : navigation par le menu et les boutons', async () => {
    window.scrollTo = () => {}
    const $ = run('site')
    const visible = () => [...document.querySelectorAll('main.page')].filter((m) => !(m as HTMLElement).hidden).map((m) => m.id)
    expect(visible()).toEqual(['page'])
    $('bouton-1').click()
    await new Promise((r) => setTimeout(r, 0))
    expect(visible()).toEqual(['page-2'])
    expect(location.hash).toBe('#page-2')
    location.hash = 'page-1'
    await new Promise((r) => setTimeout(r, 0))
    expect(visible()).toEqual(['page-1'])
    location.hash = ''
    await new Promise((r) => setTimeout(r, 0))
    expect(visible()).toEqual(['page'])
  })
})

describe('briques avancées', () => {
  it('onglets, fenêtre et menu des pages', async () => {
    const $ = run(
      buildApp('X', [
        {
          name: 'Accueil',
          children: [
            { type: 'navbar', props: { brand: 'Moi' } },
            {
              type: 'tabs',
              children: [
                { type: 'stack', name: 'Infos', children: [] },
                { type: 'stack', name: 'Prix', children: [] },
              ],
            },
            { type: 'modal', ref: 'fen', children: [{ type: 'text', props: { text: 'Coucou' } }] },
            { type: 'button', props: { text: 'Ouvrir' }, onClick: [{ type: 'show', target: '@fen' }] },
          ],
        },
        { name: 'Contact', children: [] },
      ]),
    )
    // Onglets : un clic sur « Prix » affiche le second panneau.
    const titres = [...document.querySelectorAll<HTMLButtonElement>('.tabs-bar > button')]
    expect($('colonne-2').hidden).toBe(true)
    titres[1].click()
    expect($('colonne-1').hidden).toBe(true)
    expect($('colonne-2').hidden).toBe(false)
    expect(titres[1].getAttribute('aria-selected')).toBe('true')

    // Fenêtre : le bouton l'ouvre, la croix la referme.
    expect($('fenetre-1').hidden).toBe(true)
    $('bouton-1').click()
    expect($('fenetre-1').hidden).toBe(false)
    document.querySelector<HTMLButtonElement>('#fenetre-1 .modal-close')!.click()
    expect($('fenetre-1').hidden).toBe(true)

    // Menu : le lien de la page affichée est mis en avant.
    window.scrollTo = () => {}
    document.querySelector<HTMLAnchorElement>('.navbar a[href="#page-1"]')!.click()
    await new Promise((r) => setTimeout(r, 0))
    expect($('page-1').hidden).toBe(false)
    expect(document.querySelector('.navbar a[href="#page-1"]')!.classList.contains('is-active')).toBe(true)
    expect(document.querySelector('.navbar a[href="#page"]')!.classList.contains('is-active')).toBe(false)
  })
})

describe('collections dans le code exporté', () => {
  it('gestion de stock : le formulaire ajoute une fiche, le tableau suit, la suppression aussi', () => {
    localStorage.clear()
    const project = TEMPLATES.find((t) => t.id === 'stock')!.create()
    const $ = run(project)
    const table = document.querySelector('.table')!
    const rows = () => [...table.querySelectorAll('tbody tr')]
    expect(rows()).toHaveLength(4)
    expect(rows()[0].textContent).toContain('18,9')
    expect(rows()[0].textContent).toContain('02/10/2026')

    const field = (label: string) => [...document.querySelectorAll('label')].find((l) => l.textContent?.includes(label))!.querySelector('input')!
    const type = (label: string, value: string) => {
      const input = field(label)
      input.value = value
      input.dispatchEvent(new Event('input'))
    }
    type('Produit', 'Sirop d’érable')
    type('Catégorie', 'Épicerie')
    type('Quantité', '8')
    type('Prix', '12.5')
    type('Arrivage', '2026-10-11')
    const add = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Ajouter')!
    add.click()
    expect(rows()).toHaveLength(5)
    expect(rows()[4].textContent).toContain('Sirop d’érable')
    expect(rows()[4].textContent).toContain('12,5')
    expect(rows()[4].textContent).toContain('11/10/2026')
    // Les champs sont vidés pour la fiche suivante.
    expect(field('Produit').value).toBe('')
    // Le chiffre clé compte les fiches, l'autre additionne un champ calculé (quantité × prix).
    expect(document.querySelector('.stat-value')!.textContent).toBe('5')
    expect(document.querySelectorAll('.stat-value')[1].textContent).toBe('1 176,6 €')
    expect(rows()[4].textContent).toContain('100')

    // Les données sont gardées dans le navigateur.
    const saved = JSON.parse(localStorage.getItem('ptt-makers:gestion_de_stock')!)
    expect(saved.produits).toHaveLength(5)

    ;(rows()[0].querySelector('.table-delete') as HTMLButtonElement).click()
    expect(rows()).toHaveLength(4)
    expect(rows()[0].textContent).toContain('Thé vert bio')
    expect($('tableau-1').querySelector('.table-empty')!.hasAttribute('hidden')).toBe(true)
  })

  it('les données gardées reviennent au rechargement', () => {
    localStorage.setItem('ptt-makers:gestion_de_stock', JSON.stringify({ produits: [{ nom: 'Seul produit', quantite: 1, prix: 2 }] }))
    run(TEMPLATES.find((t) => t.id === 'stock')!.create())
    expect(document.querySelectorAll('.table tbody tr')).toHaveLength(1)
    expect(document.querySelector('.stat-value')!.textContent).toBe('1')
    localStorage.clear()
  })

  it('une collection vide affiche le message du tableau', () => {
    const project = buildApp(
      'Vide',
      [{ name: 'Accueil', children: [{ type: 'table', props: { source: 'clients', empty: 'Pas encore de client.' } }] }],
      [{ name: 'clients', kind: 'collection', fields: [{ name: 'nom', label: 'Nom', type: 'text' }], initial: [] }],
    )
    run(project)
    const empty = document.querySelector('.table-empty') as HTMLElement
    expect(empty.hidden).toBe(false)
    expect(empty.textContent).toBe('Pas encore de client.')
  })

  it('la recherche du tableau ne garde que les fiches qui contiennent le mot', () => {
    localStorage.clear()
    run(TEMPLATES.find((t) => t.id === 'stock')!.create())
    const rows = () => [...document.querySelectorAll('.table tbody tr')]
    const search = [...document.querySelectorAll('label')].find((l) => l.textContent?.includes('Rechercher'))!.querySelector('input')!
    search.value = 'epicerie'
    search.dispatchEvent(new Event('input'))
    expect(rows()).toHaveLength(2)
    // Une valeur calculée se cherche aussi : 12 × 14 = 168.
    search.value = '168'
    search.dispatchEvent(new Event('input'))
    expect(rows()).toHaveLength(1)
    expect(rows()[0].textContent).toContain('Tasse en grès')
    search.value = ''
    search.dispatchEvent(new Event('input'))
    expect(rows()).toHaveLength(4)
    localStorage.clear()
  })

  it('filtre relié à une variable, tri décroissant et suppression dans une vue', () => {
    const project = buildApp(
      'Vue',
      [
        {
          name: 'Accueil',
          children: [
            { type: 'input', props: { label: 'Catégorie', bind: 'choix' } },
            {
              type: 'table',
              props: { source: 'livres', filterField: 'genre', filterOp: 'eq', filterValue: '{{choix}}', sortField: 'pages', sortDir: 'desc' },
            },
            {
              type: 'repeat',
              props: { source: 'livres', filterField: 'pages', filterOp: 'gt', filterValue: '200', sortField: 'titre' },
              children: [
                { type: 'text', props: { text: '{{element.titre}}' } },
                { type: 'button', props: { text: 'Retirer' }, onClick: [{ type: 'listRemove', variable: 'livres', which: 'current' }] },
              ],
            },
          ],
        },
      ],
      [
        { name: 'choix', kind: 'text', initial: '' },
        {
          name: 'livres',
          kind: 'collection',
          fields: [
            { name: 'titre', label: 'Titre', type: 'text' },
            { name: 'genre', label: 'Genre', type: 'text' },
            { name: 'pages', label: 'Pages', type: 'number' },
          ],
          initial: [
            { titre: 'Dune', genre: 'Science-fiction', pages: 600 },
            { titre: 'Le Petit Prince', genre: 'Conte', pages: 96 },
            { titre: 'Fondation', genre: 'Science-fiction', pages: 250 },
            { titre: 'Bel-Ami', genre: 'Roman', pages: 410 },
          ],
        },
      ],
    )
    run(project)
    const rows = () => [...document.querySelectorAll('.table tbody tr')].map((r) => (r as HTMLTableRowElement).cells[0].textContent)
    // Filtre vide : tout est affiché, du plus long au plus court.
    expect(rows()).toEqual(['Dune', 'Bel-Ami', 'Fondation', 'Le Petit Prince'])
    const input = document.querySelector('input')!
    input.value = 'science-FICTION'
    input.dispatchEvent(new Event('input'))
    expect(rows()).toEqual(['Dune', 'Fondation'])

    // La répétition garde les livres de plus de 200 pages, par ordre alphabétique.
    const titles = () => [...document.querySelectorAll('.repeat > :not(template) p')].map((p) => p.textContent)
    expect(titles()).toEqual(['Bel-Ami', 'Dune', 'Fondation'])
    // Retirer « Dune » (2e de la vue, 1er de la liste) enlève bien Dune.
    ;([...document.querySelectorAll('.repeat > :not(template) button')][1] as HTMLButtonElement).click()
    expect(titles()).toEqual(['Bel-Ami', 'Fondation'])
    expect(rows()).toEqual(['Fondation'])
  })
})

describe('logique : validation, pages avec une valeur, actions qui attendent', () => {
  it('le formulaire n’est pas envoyé tant qu’un champ ne respecte pas sa règle', () => {
    const project = buildApp(
      'Inscription',
      [
        {
          name: 'Accueil',
          children: [
            {
              type: 'card',
              ref: 'formulaire',
              children: [
                { type: 'input', props: { label: 'Prénom', bind: 'prenom', required: true, minLength: 2 } },
                { type: 'input', props: { label: 'E-mail', bind: 'email', inputType: 'email' } },
                { type: 'input', props: { label: 'Âge', bind: 'age', inputType: 'number', min: '12', max: '120', errorText: 'Entre 12 et 120 ans.' } },
                { type: 'checkbox', props: { label: 'J’accepte', bind: 'accord', required: true } },
                {
                  type: 'button',
                  props: { text: 'Envoyer' },
                  onClick: [{ type: 'validate', target: '@formulaire' }, { type: 'add', variable: 'envois', amount: 1 }],
                },
              ],
            },
            { type: 'text', props: { text: '{{envois}} envoi' } },
          ],
        },
      ],
      [
        { name: 'prenom', kind: 'text', initial: '' },
        { name: 'email', kind: 'text', initial: '' },
        { name: 'age', kind: 'number', initial: 30 },
        { name: 'accord', kind: 'boolean', initial: false },
        { name: 'envois', kind: 'number', initial: 0 },
      ],
    )
    run(project)
    const inputs = [...document.querySelectorAll('input')]
    const type = (i: number, value: string) => {
      inputs[i].value = value
      inputs[i].dispatchEvent(new Event('input'))
    }
    const send = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Envoyer')!
    const errors = () => [...document.querySelectorAll('.field-error')].map((e) => ((e as HTMLElement).hidden ? '' : e.textContent))
    const sent = () => document.querySelector('.page > p')!.textContent

    expect(inputs[0].hasAttribute('required')).toBe(true)
    expect(inputs[0].getAttribute('aria-describedby')).toMatch(/-erreur$/)
    send.click()
    expect(sent()).toBe('0 envoi')
    expect(errors()).toEqual(['Ce champ est obligatoire.', '', '', 'Coche cette case pour continuer.'])
    expect(document.activeElement).toBe(inputs[0])

    type(0, 'A')
    expect(errors()[0]).toBe('Écris au moins 2 caractères.')
    type(0, 'Ana')
    type(1, 'ana@')
    type(2, '9')
    inputs[3].checked = true
    inputs[3].dispatchEvent(new Event('change'))
    send.click()
    expect(sent()).toBe('0 envoi')
    expect(errors()).toEqual(['', 'Cette adresse e-mail n’est pas valide.', 'Entre 12 et 120 ans.', ''])

    type(1, 'ana@exemple.fr')
    type(2, '15')
    send.click()
    expect(errors()).toEqual(['', '', '', ''])
    expect(sent()).toBe('1 envoi')
  })

  it('une page reçoit la valeur envoyée par le bouton d’une copie', async () => {
    window.scrollTo = () => {}
    const project = buildApp(
      'Catalogue',
      [
        {
          name: 'Liste',
          children: [
            {
              type: 'repeat',
              props: { source: 'fruits' },
              children: [{ type: 'button', props: { text: '{{element}}' }, onClick: [{ type: 'navigate', page: '@fiche', value: '{{element}}' }] }],
            },
          ],
        },
        { ref: 'fiche', name: 'Fiche', paramVar: 'choisi', children: [{ type: 'heading', props: { text: 'Fiche : {{choisi}}', level: '1' } }] },
      ],
      [
        { name: 'fruits', kind: 'list', initial: ['Pomme', 'Café / thé'] },
        { name: 'choisi', kind: 'text', initial: '' },
      ],
    )
    run(project)
    const buttons = [...document.querySelectorAll('.repeat button')] as HTMLButtonElement[]
    buttons[1].click()
    await new Promise((r) => setTimeout(r, 0))
    expect(location.hash).toBe('#page-1/Caf%C3%A9%20%2F%20th%C3%A9')
    expect(document.getElementById('page-1')!.hidden).toBe(false)
    expect(document.querySelector('#page-1 h1')!.textContent).toBe('Fiche : Café / thé')
    location.hash = ''
    await new Promise((r) => setTimeout(r, 0))
  })

  it('attendre puis charger : chaque action attend la précédente', async () => {
    let resolveFetch: (v: unknown) => void = () => {}
    globalThis.fetch = (() => new Promise((r) => (resolveFetch = r))) as unknown as typeof fetch
    const project = buildApp(
      'Chaine',
      [
        {
          name: 'Accueil',
          children: [
            {
              type: 'button',
              props: { text: 'Lancer' },
              onClick: [
                { type: 'set', variable: 'etape', value: 'attente' },
                { type: 'wait', ms: 20 },
                { type: 'set', variable: 'etape', value: 'chargement' },
                { type: 'fetch', url: 'https://api.exemple.fr/total', variable: 'total', path: 'valeur' },
                { type: 'set', variable: 'etape', value: 'fini' },
              ],
            },
            { type: 'text', props: { text: '{{etape}} {{total}}' } },
          ],
        },
      ],
      [
        { name: 'etape', kind: 'text', initial: 'prêt' },
        { name: 'total', kind: 'number', initial: 0 },
      ],
    )
    run(project)
    const shown = () => document.querySelector('.page > p')!.textContent
    ;(document.querySelector('button') as HTMLButtonElement).click()
    // La page montre l'étape en cours avant la pause.
    expect(shown()).toBe('attente 0')
    await new Promise((r) => setTimeout(r, 40))
    expect(shown()).toBe('chargement 0')
    resolveFetch({ json: () => Promise.resolve({ valeur: 42 }) })
    await new Promise((r) => setTimeout(r, 0))
    expect(shown()).toBe('fini 42')
  })
})
