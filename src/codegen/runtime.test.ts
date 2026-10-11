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
