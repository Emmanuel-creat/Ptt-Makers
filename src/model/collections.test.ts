import { describe, expect, it } from 'vitest'
import { addField, applyView, coerceField, formatField, importCsv, inferFields, parseCsv, removeField, toRecords, updateField } from './collections'
import type { Variable } from './types'

const produits = (): Variable => ({
  name: 'produits',
  kind: 'collection',
  fields: [
    { name: 'nom', label: 'Nom', type: 'text' },
    { name: 'prix', label: 'Prix', type: 'number' },
  ],
  initial: [
    { nom: 'Café', prix: 2.5 },
    { nom: 'Thé', prix: 3 },
  ],
})

describe('collections', () => {
  it('met en forme les valeurs à la française', () => {
    expect(formatField(1250.5, 'number')).toBe('1 250,5')
    expect(formatField('2026-10-11', 'date')).toBe('11/10/2026')
    expect(formatField(true, 'boolean')).toBe('Oui')
    expect(formatField(false, 'boolean')).toBe('Non')
    expect(formatField('', 'number')).toBe('')
  })

  it('convertit une saisie dans le type du champ', () => {
    expect(coerceField('12,5', 'number')).toBe(12.5)
    expect(coerceField('abc', 'number')).toBe(0)
    expect(coerceField('Oui', 'boolean')).toBe(true)
    expect(coerceField(4, 'text')).toBe('4')
  })

  it('ajoute un champ avec un nom technique unique et une valeur vide dans chaque fiche', () => {
    const next = addField(produits(), 'Prix', 'number')
    expect(next.fields!.map((f) => f.name)).toEqual(['nom', 'prix', 'prix_2'])
    expect(next.initial).toEqual([
      { nom: 'Café', prix: 2.5, prix_2: 0 },
      { nom: 'Thé', prix: 3, prix_2: 0 },
    ])
  })

  it('renomme un champ sans changer son nom technique et convertit les valeurs quand le type change', () => {
    const renamed = updateField(produits(), 'prix', { label: 'Prix TTC' })
    expect(renamed.fields![1]).toEqual({ name: 'prix', label: 'Prix TTC', type: 'number' })
    const asText = updateField(produits(), 'prix', { type: 'text' })
    expect(asText.initial).toEqual([
      { nom: 'Café', prix: '2.5' },
      { nom: 'Thé', prix: '3' },
    ])
  })

  it('retire un champ et ses valeurs', () => {
    expect(removeField(produits(), 'prix').initial).toEqual([{ nom: 'Café' }, { nom: 'Thé' }])
  })

  it('devine les champs de données importées', () => {
    const fields = inferFields([{ titre: 'A', note: 4, lu: true, date: '2026-01-02', site: 'https://exemple.fr' }])
    expect(fields.map((f) => f.type)).toEqual(['text', 'number', 'boolean', 'date', 'link'])
  })

  it('transforme une liste de textes en fiches', () => {
    expect(toRecords(['Lina', 'Sam'], produits().fields!)).toEqual([
      { nom: 'Lina', prix: 0 },
      { nom: 'Sam', prix: 0 },
    ])
  })
})

describe('import CSV', () => {
  it('lit un CSV avec point-virgule, guillemets et types devinés', () => {
    const csv = '﻿Nom;Prix;Date;Actif\n"Café ""bio""";2,50;11/10/2026;oui\nThé;3;01/02/2026;non\n'
    expect(parseCsv(csv)).toEqual([
      ['Nom', 'Prix', 'Date', 'Actif'],
      ['Café "bio"', '2,50', '11/10/2026', 'oui'],
      ['Thé', '3', '01/02/2026', 'non'],
    ])
    const imported = importCsv(csv)!
    expect(imported.fields!.map((f) => `${f.name}:${f.type}`)).toEqual(['nom:text', 'prix:number', 'date:date', 'actif:boolean'])
    expect(imported.initial).toEqual([
      { nom: 'Café "bio"', prix: 2.5, date: '2026-10-11', actif: true },
      { nom: 'Thé', prix: 3, date: '2026-02-01', actif: false },
    ])
  })

  it('accepte la virgule comme séparateur et refuse un fichier sans données', () => {
    expect(importCsv('ville,habitants\nLyon,522000')!.initial).toEqual([{ ville: 'Lyon', habitants: 522000 }])
    expect(importCsv('juste,un,titre')).toBeNull()
  })
})

describe('vue d’une collection : recherche, filtre et tri', () => {
  const fields = [
    { name: 'nom', label: 'Nom', type: 'text' as const },
    { name: 'rayon', label: 'Rayon', type: 'text' as const },
    { name: 'prix', label: 'Prix', type: 'number' as const },
    { name: 'bio', label: 'Bio', type: 'boolean' as const },
    { name: 'double', label: 'Double', type: 'formula' as const, formula: 'prix * 2' },
  ]
  const items = [
    { nom: 'Café', rayon: 'Épicerie', prix: 18, bio: true },
    { nom: 'Tasse', rayon: 'Vaisselle', prix: 14, bio: false },
    { nom: 'Thé', rayon: 'Épicerie', prix: 6.5, bio: true },
  ]
  const names = (v: Parameters<typeof applyView>[2]) => applyView(items, fields, v).map((x) => (x as { nom: string }).nom)

  it('cherche sans tenir compte des accents ni des majuscules, valeurs calculées comprises', () => {
    expect(names({ search: 'EPICERIE', filter: null, sort: null })).toEqual(['Café', 'Thé'])
    expect(names({ search: '28', filter: null, sort: null })).toEqual(['Tasse'])
  })

  it('filtre selon la condition, une valeur vide montre tout', () => {
    expect(names({ search: '', filter: { field: 'prix', op: 'gt', value: '10' }, sort: null })).toEqual(['Café', 'Tasse'])
    expect(names({ search: '', filter: { field: 'bio', op: 'unchecked', value: '' }, sort: null })).toEqual(['Tasse'])
    expect(names({ search: '', filter: { field: 'rayon', op: 'neq', value: 'epicerie' }, sort: null })).toEqual(['Tasse'])
    expect(names({ search: '', filter: { field: 'rayon', op: 'eq', value: '' }, sort: null })).toHaveLength(3)
  })

  it('trie sans modifier la collection', () => {
    expect(names({ search: '', filter: null, sort: { field: 'double', desc: false } })).toEqual(['Thé', 'Tasse', 'Café'])
    expect(names({ search: '', filter: null, sort: { field: 'nom', desc: true } })).toEqual(['Thé', 'Tasse', 'Café'])
    expect(items[0].nom).toBe('Café')
  })
})

