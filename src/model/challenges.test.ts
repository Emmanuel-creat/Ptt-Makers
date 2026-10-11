import { describe, expect, it } from 'vitest'
import { CHALLENGES, challengeProgress } from './challenges'
import { TEMPLATES } from './templates'

const challenge = (id: string) => CHALLENGES.find((c) => c.id === id)!
const template = (id: string) => TEMPLATES.find((t) => t.id === id)!.create()

describe('défis guidés', () => {
  it('une page vierge ne valide aucune étape', () => {
    for (const c of CHALLENGES) expect(challengeProgress(c, template('vierge')).some(Boolean), c.id).toBe(false)
  })

  it('le modèle Compteur réussit le défi « Un bouton qui compte »', () => {
    expect(challengeProgress(challenge('compteur'), template('compteur'))).toEqual([true, true, true])
  })

  it('le modèle Liste de tâches réussit le défi de la liste', () => {
    expect(challengeProgress(challenge('courses'), template('taches'))).toEqual([true, true, true, true])
  })

  it('« Bonjour, prénom ! » demande que le texte affiche la variable du champ', () => {
    const p = template('contact')
    const [champ, relie, bonjour] = challengeProgress(challenge('bonjour'), p)
    expect([champ, relie, bonjour]).toEqual([true, true, true])
  })
})
