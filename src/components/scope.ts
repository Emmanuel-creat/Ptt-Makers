import { createContext } from 'react'

/** Mots en plus proposés par « Insérer une variable » (dans une répétition : {{element}}, {{position}}). */
export const ScopeTokens = createContext<{ token: string; hint: string }[]>([])

export const REPEAT_TOKENS = [
  { token: 'element', hint: "l'élément de la liste" },
  { token: 'position', hint: 'son numéro (1, 2, 3…)' },
  { token: 'element.nom', hint: 'un champ de l’élément (données d’API)' },
]
