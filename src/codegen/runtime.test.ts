import { afterEach, describe, expect, it } from 'vitest'
import { TEMPLATES } from '../model/templates'
import { generate } from './generate'

/** Charge le code généré dans le DOM de test et exécute son script, comme le ferait un navigateur. */
function run(templateId: string) {
  const code = generate(TEMPLATES.find((t) => t.id === templateId)!.create())
  const body = code.html.slice(code.html.indexOf('<body>') + 6, code.html.indexOf('<script'))
  document.body.innerHTML = body
  new Function(code.js)()
  return (id: string) => document.getElementById(id)!
}

afterEach(() => {
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
    expect(items()).toEqual(['1. Découvrir Ptt-Makers Fait ✓', '2. Créer ma première appli Fait ✓'])
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
    expect(cards[1].textContent).toContain('🏙️ Nantes')
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
