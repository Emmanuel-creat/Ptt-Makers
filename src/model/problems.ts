import { forEachAction } from './actions'
import { BRICKS } from './bricks'
import { fieldsOf, isCollection, isListLike } from './collections'
import { exprRefs, parseExpr } from './expressions'
import { countVariableUses } from './refactor'
import { repeatOf, walk } from './tree'
import type { Action, BrickNode, Project, Variable } from './types'
import { parseTemplate } from './variables'

export type ProblemLevel = 'erreur' | 'attention'

/** Un problème du projet : une erreur empêche une partie de l'application de marcher, une attention est un conseil. */
export interface Problem {
  /** Identifiant stable (pour les listes React). */
  key: string
  level: ProblemLevel
  message: string
  /** La brique concernée (un clic la sélectionne). */
  nodeId?: string
  /** La variable concernée. */
  variable?: string
}

/** Ce qu'un texte avec des {{…}} a le droit d'utiliser à cet endroit. */
interface Scope {
  variables: Variable[]
  /** La collection ou la liste parcourue, quand le texte est dans une répétition. */
  repeat: Variable | null | undefined
}

/** Vérifie qu'un script est bien écrit, sans le lancer. */
function scriptError(js: string): string | null {
  if (!js.trim()) return null
  try {
    new Function('bloc', 'etat', js)
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

const short = (s: string) => (s.length > 40 ? `${s.slice(0, 39)}…` : s)

/** Les noms inconnus d'un texte : variables qui n'existent pas, formules mal écrites. */
function templateIssues(text: string, scope: Scope): { level: ProblemLevel; message: string }[] {
  if (!text.includes('{{')) return []
  const out: { level: ProblemLevel; message: string }[] = []
  const known = (path: string[]): { level: ProblemLevel; message: string } | null => {
    const [first, field] = path
    if (first === 'element' || first === 'position') {
      if (scope.repeat === undefined) return { level: 'erreur', message: `{{${path.join('.')}}} ne marche que dans une répétition.` }
      if (first === 'element' && field && isCollection(scope.repeat ?? undefined)) {
        if (!fieldsOf(scope.repeat!).some((f) => f.name === field)) {
          return { level: 'erreur', message: `La collection « ${scope.repeat!.name} » n’a pas de champ « ${field} ».` }
        }
      }
      return null
    }
    const v = scope.variables.find((x) => x.name === first)
    if (!v) return { level: 'erreur', message: `La variable « ${first} » n’existe pas.` }
    if (field && isCollection(v) && !fieldsOf(v).some((f) => f.name === field)) {
      return { level: 'erreur', message: `La collection « ${v.name} » n’a pas de champ « ${field} ».` }
    }
    return null
  }
  for (const part of parseTemplate(text)) {
    if (part.kind === 'var') {
      const issue = known(part.name.split('.'))
      if (issue) out.push(issue)
    } else if (part.kind === 'expr') {
      for (const path of exprRefs(part.expr)) {
        const issue = known(path)
        if (issue) out.push(issue)
      }
    } else {
      for (const m of part.value.matchAll(/\{\{([^{}]*)\}\}/g)) {
        out.push({ level: 'erreur', message: `La formule « ${short(m[1].trim())} » est mal écrite.` })
      }
    }
  }
  return out
}

/** Les textes d'une action qui peuvent contenir des {{…}}. */
function actionTexts(a: Action): string[] {
  switch (a.type) {
    case 'set':
    case 'listAdd':
      return [a.value]
    case 'alert':
      return [a.message]
    case 'fetch':
      return [a.url]
    case 'navigate':
      return a.value ? [a.value] : []
    case 'addRecord':
      return Object.values(a.values ?? {})
    case 'signup':
    case 'login':
      return [a.email, a.password]
    default:
      return []
  }
}

/** Passe tout le projet en revue : briques, actions et variables. */
export function findProblems(project: Project): Problem[] {
  const { nodes, variables } = project
  const problems: Problem[] = []
  const seen = new Set<string>()
  const add = (p: Omit<Problem, 'key'>) => {
    const key = `${p.nodeId ?? p.variable ?? ''}:${p.message}`
    if (seen.has(key)) return
    seen.add(key)
    problems.push({ key, ...p })
  }
  const variable = (name: string) => variables.find((v) => v.name === name)

  const checkActions = (actions: Action[], node: BrickNode, scope: Scope) => {
    forEachAction(actions, (a) => {
      if ('variable' in a) {
        const v = variable(a.variable)
        if (!a.variable) add({ level: 'erreur', message: 'Une action n’a pas de variable choisie.', nodeId: node.id })
        else if (!v) add({ level: 'erreur', message: `Une action utilise la variable « ${a.variable} », qui n’existe pas.`, nodeId: node.id })
        else if (a.type === 'listAdd' && v.kind !== 'list') add({ level: 'erreur', message: `« ${v.name} » n’est pas une liste : l’action « Ajouter un élément » ne fera rien.`, nodeId: node.id })
        else if (a.type === 'addRecord' && !isCollection(v)) add({ level: 'erreur', message: `« ${v.name} » n’est pas une collection : l’action « Ajouter une fiche » ne fera rien.`, nodeId: node.id })
        else if ((a.type === 'listRemove' || a.type === 'listClear') && !isListLike(v)) add({ level: 'erreur', message: `« ${v.name} » n’est pas une liste.`, nodeId: node.id })
        else if ((a.type === 'signup' || a.type === 'login' || a.type === 'logout') && v.kind !== 'text') {
          add({ level: 'erreur', message: `La personne connectée se range dans une variable texte, pas dans « ${v.name} ».`, nodeId: node.id })
        }
      }
      if ('target' in a && !nodes[a.target]) add({ level: 'erreur', message: 'Une action vise une brique qui n’existe plus.', nodeId: node.id })
      if (a.type === 'navigate') {
        if (!project.pages.includes(a.page)) add({ level: 'erreur', message: 'Une action « Aller sur une page » vise une page qui n’existe plus.', nodeId: node.id })
        else if (a.value?.trim() && !variable(String(nodes[a.page]?.props.paramVar ?? ''))) {
          add({ level: 'attention', message: `La page « ${nodes[a.page].name} » reçoit une valeur mais ne la range dans aucune variable (réglages de la page).`, nodeId: a.page })
        }
      }
      if (a.type === 'fetch' && !/^https?:\/\//i.test(a.url.trim())) add({ level: 'erreur', message: 'L’adresse à charger doit commencer par https://', nodeId: node.id })
      if (a.type === 'listRemove' && a.which === 'current' && scope.repeat === undefined) {
        add({ level: 'erreur', message: '« Retirer l’élément de cette copie » ne marche que dans une répétition.', nodeId: node.id })
      }
      if ((a.type === 'signup' || a.type === 'login') && (!a.email.trim() || !a.password.trim())) {
        add({ level: 'erreur', message: `L’action « ${a.type === 'signup' ? 'Créer un compte' : 'Se connecter'} » n’a pas d’e-mail ou de mot de passe.`, nodeId: node.id })
      }
      for (const text of actionTexts(a)) for (const issue of templateIssues(text, scope)) add({ ...issue, nodeId: node.id })
    })
  }

  for (const pageId of project.pages) {
    const page = nodes[pageId]
    if (!page) continue
    if (!page.children.length) add({ level: 'attention', message: `La page « ${page.name} » est vide.`, nodeId: pageId })
    if (String(page.props.loginVar ?? '') && !project.pages.includes(String(page.props.loginPage ?? ''))) {
      add({ level: 'erreur', message: `La page « ${page.name} » est réservée aux personnes connectées : choisis la page de connexion.`, nodeId: pageId })
    }
    walk(nodes, pageId, (node) => {
      const r = repeatOf(nodes, node.id)
      const scope: Scope = { variables, repeat: r ? (variable(String(nodes[r].props.source ?? '')) ?? null) : undefined }
      const def = BRICKS[node.type]
      const source = variable(String(node.props.source ?? ''))

      for (const field of def?.fields ?? []) {
        const value = node.props[field.key]
        if (typeof value !== 'string' || !value) continue
        if (field.kind === 'variable' && !variable(value)) {
          add({ level: 'erreur', message: `« ${field.label} » : la variable « ${value} » n’existe pas.`, nodeId: node.id })
        } else if (field.kind === 'page' && !project.pages.includes(value)) {
          add({ level: 'erreur', message: 'Le lien mène à une page qui n’existe plus.', nodeId: node.id })
        } else if (field.kind === 'field' && isCollection(source) && !fieldsOf(source).some((f) => f.name === value)) {
          add({ level: 'erreur', message: `« ${field.label} » : la collection « ${source.name} » n’a pas de champ « ${value} ».`, nodeId: node.id })
        }
      }
      for (const value of Object.values(node.props)) {
        if (typeof value === 'string') for (const issue of templateIssues(value, scope)) add({ ...issue, nodeId: node.id })
      }
      if (node.showIf && !variable(node.showIf)) add({ level: 'erreur', message: `« Afficher seulement si » utilise la variable « ${node.showIf} », qui n’existe pas.`, nodeId: node.id })

      if (node.type === 'repeat' && !String(node.props.source ?? '')) add({ level: 'attention', message: 'La répétition ne parcourt aucune liste.', nodeId: node.id })
      if (node.type === 'image' && !String(node.props.alt ?? '').trim()) add({ level: 'attention', message: 'L’image n’a pas de description : les lecteurs d’écran ne pourront pas la lire.', nodeId: node.id })
      if (node.type === 'button' && !String(node.props.text ?? '').trim()) add({ level: 'attention', message: 'Un bouton n’a pas de texte.', nodeId: node.id })
      if (node.type === 'link' && !String(node.props.page ?? '') && !/^(https?:|mailto:)/i.test(String(node.props.href ?? '').trim())) {
        add({ level: 'attention', message: 'Le lien ne mène nulle part : choisis une page ou une adresse.', nodeId: node.id })
      }

      if (node.type === 'code') {
        if (scope.repeat !== undefined) add({ level: 'erreur', message: 'Le code personnalisé ne marche pas dans une répétition.', nodeId: node.id })
        const error = scriptError(String(node.props.js ?? ''))
        if (error) add({ level: 'erreur', message: `Le JavaScript du code personnalisé a une erreur : ${error}`, nodeId: node.id })
      }

      checkActions(node.onClick, node, scope)
      if (node.onLoad) checkActions(node.onLoad, node, scope)
    })
  }

  for (const v of variables) {
    if (isCollection(v)) {
      for (const f of fieldsOf(v)) {
        if (f.type !== 'formula') continue
        const expr = parseExpr(f.formula ?? '')
        if (!expr) add({ level: 'erreur', message: `Le champ calculé « ${f.label} » a une formule mal écrite.`, variable: v.name })
        else {
          for (const [name] of exprRefs(expr)) {
            if (!fieldsOf(v).some((x) => x.name === name)) add({ level: 'erreur', message: `La formule de « ${f.label} » utilise « ${name} », qui n’est pas un champ de « ${v.name} ».`, variable: v.name })
          }
        }
      }
    }
    if (countVariableUses(nodes, v.name) === 0) add({ level: 'attention', message: `La variable « ${v.name} » n’est utilisée nulle part.`, variable: v.name })
  }

  return problems.sort((a, b) => (a.level === b.level ? 0 : a.level === 'erreur' ? -1 : 1))
}
