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
