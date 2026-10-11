import { describe, expect, it } from 'vitest'
import { compileExpr, evalExpr, exprText, parseExpr, readRecordField } from './expressions'
import { exprEnv, interpolate } from './variables'
import type { Variable } from './types'

const vars: Variable[] = [
  { name: 'prix', kind: 'number', initial: 12.5 },
  { name: 'quantite', kind: 'number', initial: 3 },
  { name: 'prenom', kind: 'text', initial: 'Lina' },
  {
    name: 'produits',
    kind: 'collection',
    fields: [
      { name: 'nom', label: 'Nom', type: 'text' },
      { name: 'prix', label: 'Prix', type: 'number' },
      { name: 'quantite', label: 'Quantité', type: 'number' },
      { name: 'total', label: 'Total', type: 'formula', formula: 'prix * quantite' },
    ],
    initial: [
      { nom: 'Café', prix: 2.5, quantite: 4 },
      { nom: 'Thé', prix: 3, quantite: 2 },
    ],
  },
]

const calc = (src: string) => exprText(evalExpr(parseExpr(src)!, exprEnv(vars)))

describe('formules', () => {
  it('respecte les priorités et les parenthèses', () => {
    expect(calc('1 + 2 * 3')).toBe('7')
    expect(calc('(1 + 2) * 3')).toBe('9')
    expect(calc('-prix + 1')).toBe('-11,5')
    expect(calc('10 / 4')).toBe('2,5')
    expect(calc('10 / 0')).toBe('')
  })

  it('utilise les variables, les textes et les fonctions', () => {
    expect(calc('prix * quantite')).toBe('37,5')
    expect(calc('"Bonjour " & prenom')).toBe('Bonjour Lina')
    expect(calc('somme(produits.prix)')).toBe('5,5')
    expect(calc('moyenne(produits.quantite)')).toBe('3')
    expect(calc('nombre(produits)')).toBe('2')
    expect(calc('somme(produits.total)')).toBe('16')
    expect(calc('arrondi(10 / 3, 2)')).toBe('3,33')
    expect(calc('max(produits.prix) * 1000')).toBe('3 000')
  })

  it('refuse une formule mal écrite', () => {
    for (const bad of ['1 +', 'prix *', 'somme(1)', 'inconnue(2)', '(1', '"texte']) expect(parseExpr(bad)).toBeNull()
  })

  it('s’affiche dans un texte, et reste visible si un nom est inconnu', () => {
    expect(interpolate('Total : {{prix * quantite}} €', vars)).toBe('Total : 37,5 €')
    expect(interpolate('{{inconnu * 2}}', vars)).toBe('{{inconnu * 2}}')
    expect(interpolate('{{ pas une formule ! }}', vars)).toBe('{{ pas une formule ! }}')
  })

  it('calcule un champ d’une fiche', () => {
    const fields = (vars[3].fields ?? []).map((f) => ({ ...f }))
    expect(readRecordField({ prix: 2, quantite: 5 }, 'total', fields)).toBe(10)
  })

  it('se traduit en JavaScript lisible', () => {
    const js = compileExpr(parseExpr('prix * quantite + 1')!, {
      ref: (p) => `etat.${p.join('.')}`,
      list: () => null,
      isNumber: () => true,
    })
    expect(js).toBe('etat.prix * etat.quantite + 1')
  })
})

describe('formules traduites', () => {
  const env = { ref: (p: string[]) => p.join('_'), list: () => null, isNumber: () => true }
  const js = (src: string) => compileExpr(parseExpr(src)!, env)
  it('garde seulement les parenthèses utiles', () => {
    expect(js('a - (b - c)')).toBe('a - (b - c)')
    expect(js('(a + b) * c')).toBe('(a + b) * c')
    expect(js('a + b * c')).toBe('a + b * c')
    expect(js('-(a + b)')).toBe('-(a + b)')
    // Le JavaScript produit donne le même résultat que l'éditeur.
    for (const src of ['10 - (4 - 1)', '(2 + 3) * 4', '7 % 3 + 1', '100 / (5 * 2)', '-(2 + 3) * 2']) {
      const code = compileExpr(parseExpr(src)!, { ref: () => null, list: () => null })!
      expect(new Function(`return ${code}`)()).toBe(evalExpr(parseExpr(src)!, { value: () => undefined, values: () => undefined }))
    }
  })
})

describe('renommer une variable', () => {
  it('suit la variable dans les formules, sans toucher aux champs ni aux autres noms', async () => {
    const { renameInTemplates } = await import('./refactor')
    expect(renameInTemplates('{{prix}} et {{prix * quantite}} et {{somme(prix.x)}} et {{element.prix}} et {{prixHT}}', 'prix', 'tarif')).toBe(
      '{{tarif}} et {{tarif * quantite}} et {{somme(tarif.x)}} et {{element.prix}} et {{prixHT}}',
    )
  })
})
