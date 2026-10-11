import { describe, expect, it } from 'vitest'
import { findProblems } from './problems'
import { buildApp, TEMPLATES } from './templates'

describe('panneau Problèmes', () => {
  it.each(TEMPLATES.map((t) => t.id))('le modèle %s n’a aucune erreur', (id) => {
    const errors = findProblems(TEMPLATES.find((t) => t.id === id)!.create()).filter((p) => p.level === 'erreur')
    expect(errors.map((p) => p.message)).toEqual([])
  })

  it('trouve les variables, champs, pages et briques qui n’existent pas', () => {
    const project = buildApp(
      'Test',
      [
        {
          name: 'Accueil',
          children: [
            { type: 'text', props: { text: 'Bonjour {{prenom}}, total {{somme(produits.prixx)}} et {{prix *}}' } },
            { type: 'input', props: { label: 'Nom', bind: 'nom' } },
            {
              type: 'button',
              props: { text: '' },
              onClick: [
                { type: 'add', variable: 'score', amount: 1 },
                { type: 'show', target: 'disparue' },
                { type: 'listAdd', variable: 'produits', value: 'x' },
              ],
            },
            { type: 'image', props: { src: '', alt: '' } },
          ],
        },
      ],
      [
        {
          name: 'produits',
          kind: 'collection',
          fields: [
            { name: 'prix', label: 'Prix', type: 'number' },
            { name: 'total', label: 'Total', type: 'formula', formula: 'prix * quantite' },
          ],
          initial: [],
        },
        { name: 'oubliee', kind: 'text', initial: '' },
      ],
    )
    const problems = findProblems(project)
    const messages = problems.map((p) => `${p.level} ${p.message}`)
    expect(messages).toEqual(
      expect.arrayContaining([
        'erreur La variable « prenom » n’existe pas.',
        'erreur La collection « produits » n’a pas de champ « prixx ».',
        'erreur La formule « prix * » est mal écrite.',
        'erreur « Enregistrer dans la variable » : la variable « nom » n’existe pas.',
        'erreur Une action utilise la variable « score », qui n’existe pas.',
        'erreur Une action vise une brique qui n’existe plus.',
        'erreur « produits » n’est pas une liste : l’action « Ajouter un élément » ne fera rien.',
        'erreur La formule de « Total » utilise « quantite », qui n’est pas un champ de « produits ».',
        'attention Un bouton n’a pas de texte.',
        'attention L’image n’a pas de description : les lecteurs d’écran ne pourront pas la lire.',
        'attention La variable « oubliee » n’est utilisée nulle part.',
      ]),
    )
    // Les erreurs passent avant les conseils, et chaque problème montre sa brique.
    expect(problems[0].level).toBe('erreur')
    expect(problems.find((p) => p.message.includes('prenom'))!.nodeId).toBe('texte-1')
  })

  it('signale une fonction inconnue, une fonction qui tourne sans fin et vérifie les actions des fonctions', () => {
    const project = buildApp(
      'Fonctions',
      [{ name: 'Accueil', children: [{ type: 'button', props: { text: 'Go' }, onClick: [{ type: 'call', name: 'absente' }, { type: 'call', name: 'a' }] }] }],
      [],
      [
        { name: 'a', actions: [{ type: 'call', name: 'b' }] },
        { name: 'b', actions: [{ type: 'call', name: 'a' }, { type: 'add', variable: 'inconnue', amount: 1 }] },
      ],
    )
    const messages = findProblems(project).map((p) => p.message)
    expect(messages).toContain('Une action lance la fonction « absente », qui n’existe pas.')
    expect(messages).toContain('La fonction « a » finit par se lancer elle-même : elle tournerait sans fin.')
    expect(messages).toContain('La fonction « b » finit par se lancer elle-même : elle tournerait sans fin.')
    expect(messages).toContain('Une action utilise la variable « inconnue », qui n’existe pas.')
  })
})
