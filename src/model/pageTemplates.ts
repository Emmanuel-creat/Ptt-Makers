import { mapNodeActions } from './actions'
import { buildApp, type PageSpec, type Spec } from './appBuilder'
import { renameVariableInNodes } from './refactor'
import { cloneSubtree, collectSubtree, type Nodes } from './tree'
import type { Action, Project, Variable } from './types'

/**
 * Gabarits de pages : des pages toutes faites (tableau de bord, paramètres, connexion, liste et détail)
 * ajoutées au projet ouvert, avec les variables dont elles ont besoin.
 */
export interface PageTemplate {
  id: string
  name: string
  description: string
  /** Une ou plusieurs pages ; « @accueil » désigne la page d'accueil du projet. */
  pages: () => PageSpec[]
  variables: () => Variable[]
}

const H = (text: string, level: '1' | '2' | '3'): Spec => ({ type: 'heading', props: { text, level } })
const P = (text: string): Spec => ({ type: 'text', props: { text } })

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'tableau-de-bord',
    name: 'Tableau de bord',
    description: 'Trois chiffres clés, un graphique et un tableau triable, rangés dans une grille à zones.',
    variables: () => [],
    pages: (): PageSpec[] => [
      {
        name: 'Tableau de bord',
        style: { gap: 20, padding: 32 },
        children: [
          H('Tableau de bord', '1'),
          {
            type: 'grid',
            name: 'Zones du tableau de bord',
            props: { template: '1fr 1fr 1fr', areas: 'ventes clients panier\ngraphique graphique tableau' },
            style: { gap: 16 },
            children: [
              { type: 'stat', props: { label: 'Ventes du mois', value: '12 480 €', delta: '+12 %', symbol: 'paiement' }, style: { area: 'ventes' } },
              { type: 'stat', props: { label: 'Nouveaux clients', value: '86', delta: '+5 %', symbol: 'groupe' }, style: { area: 'clients' } },
              { type: 'stat', props: { label: 'Panier moyen', value: '42 €', delta: '-2 %', symbol: 'panier' }, style: { area: 'panier' } },
              { type: 'chart', props: { kind: 'courbe', title: 'Ventes par semaine', data: 'S1 : 2400\nS2 : 3100\nS3 : 2800\nS4 : 4180' }, style: { area: 'graphique' } },
              {
                type: 'table',
                props: { columns: 'Produit ; Ventes', rows: 'Café en grains ; 182\nThé vert ; 96\nChocolat chaud ; 74', sortable: true, striped: true },
                style: { area: 'tableau' },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'parametres',
    name: 'Paramètres',
    description: 'Un profil et des préférences dans un formulaire vérifié, gardés dans le navigateur.',
    variables: () => [
      { name: 'profil_nom', kind: 'text', initial: '', persist: true },
      { name: 'profil_email', kind: 'text', initial: '', persist: true },
      { name: 'notifications', kind: 'boolean', initial: true, persist: true },
      { name: 'langue', kind: 'text', initial: 'Français', persist: true },
    ],
    pages: (): PageSpec[] => [
      {
        name: 'Paramètres',
        style: { gap: 20, padding: 32, maxWidth: '720px' },
        children: [
          H('Paramètres', '1'),
          P('Ces réglages restent dans ce navigateur, même après un rechargement.'),
          {
            type: 'form',
            name: 'Formulaire des paramètres',
            props: { submitText: 'Enregistrer', successText: 'Paramètres enregistrés.', resetAfter: false },
            style: { gap: 16, padding: 24 },
            children: [
              H('Profil', '3'),
              { type: 'input', props: { label: 'Nom', bind: 'profil_nom', required: true, placeholder: 'Ex. Camille Martin' } },
              { type: 'input', props: { label: 'E-mail', bind: 'profil_email', inputType: 'email', required: true, placeholder: 'camille@exemple.fr' } },
              H('Préférences', '3'),
              { type: 'checkbox', props: { label: 'Recevoir les notifications', bind: 'notifications' } },
              { type: 'select', props: { label: 'Langue', options: 'Français\nEnglish\nEspañol', bind: 'langue' } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'connexion',
    name: 'Connexion',
    description: 'Se connecter ou créer un compte, puis aller sur la page d’accueil du projet.',
    variables: () => [
      { name: 'connexion_email', kind: 'text', initial: '' },
      { name: 'connexion_mot_de_passe', kind: 'text', initial: '' },
      { name: 'utilisateur', kind: 'text', initial: '' },
    ],
    pages: (): PageSpec[] => [
      {
        name: 'Connexion',
        style: { padding: 32, align: 'center', justify: 'center' },
        children: [
          {
            type: 'card',
            ref: 'carte',
            name: 'Carte de connexion',
            style: { gap: 14, padding: 28, width: '100%', maxWidth: '400px' },
            children: [
              H('Connexion', '1'),
              P('Heureux de te revoir !'),
              { type: 'input', props: { label: 'E-mail', bind: 'connexion_email', inputType: 'email', required: true } },
              { type: 'input', props: { label: 'Mot de passe', bind: 'connexion_mot_de_passe', inputType: 'password', required: true, minLength: 6 } },
              {
                type: 'button',
                props: { text: 'Se connecter', variant: 'primary' },
                states: { hover: { scale: 102 }, active: { scale: 97 } },
                onClick: [
                  { type: 'validate', target: '@carte' },
                  { type: 'login', variable: 'utilisateur', email: '{{connexion_email}}', password: '{{connexion_mot_de_passe}}' },
                  { type: 'set', variable: 'connexion_mot_de_passe', value: '' },
                  { type: 'navigate', page: '@accueil' },
                ],
              },
              {
                type: 'button',
                props: { text: 'Créer un compte', variant: 'ghost' },
                onClick: [
                  { type: 'validate', target: '@carte' },
                  { type: 'signup', variable: 'utilisateur', email: '{{connexion_email}}', password: '{{connexion_mot_de_passe}}' },
                  { type: 'set', variable: 'connexion_mot_de_passe', value: '' },
                  { type: 'navigate', page: '@accueil' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'liste-detail',
    name: 'Liste et détail',
    description: 'Deux pages : une liste de fiches avec recherche, et la fiche choisie en détail.',
    variables: () => [
      {
        name: 'fiches',
        kind: 'collection',
        fields: [
          { name: 'nom', label: 'Nom', type: 'text' },
          { name: 'categorie', label: 'Catégorie', type: 'text' },
          { name: 'description', label: 'Description', type: 'text' },
        ],
        initial: [
          { nom: 'Atelier poterie', categorie: 'Loisirs', description: 'Deux heures pour façonner un bol, cuisson comprise.' },
          { nom: 'Cours de guitare', categorie: 'Musique', description: 'Les premiers accords en petit groupe, guitare prêtée.' },
          { nom: 'Randonnée du Vercors', categorie: 'Nature', description: 'Une boucle de 12 km avec un guide, pique-nique tiré du sac.' },
        ],
      },
      { name: 'recherche_fiche', kind: 'text', initial: '' },
      { name: 'fiche_choisie', kind: 'text', initial: '' },
    ],
    pages: (): PageSpec[] => [
      {
        name: 'Liste',
        style: { gap: 16, padding: 32 },
        children: [
          H('Toutes les fiches', '1'),
          { type: 'input', props: { label: 'Rechercher', bind: 'recherche_fiche', placeholder: 'Un nom, une catégorie…' } },
          {
            type: 'repeat',
            props: { source: 'fiches', search: 'recherche_fiche', columns: 3 },
            style: { gap: 16 },
            children: [
              {
                type: 'card',
                style: { gap: 8, padding: 18 },
                states: { hover: { shadow: 'lg', scale: 102 } },
                children: [
                  { type: 'badge', props: { text: '{{element.categorie}}' } },
                  H('{{element.nom}}', '3'),
                  { type: 'button', props: { text: 'Voir la fiche', variant: 'secondary' }, onClick: [{ type: 'navigate', page: '@detail', value: '{{element.nom}}' }] },
                ],
              },
            ],
          },
        ],
      },
      {
        ref: 'detail',
        name: 'Détail',
        paramVar: 'fiche_choisie',
        style: { gap: 16, padding: 32, maxWidth: '760px' },
        children: [
          { type: 'button', props: { text: 'Retour à la liste', variant: 'ghost' }, onClick: [{ type: 'navigate', page: '@liste' }] },
          {
            type: 'repeat',
            props: { source: 'fiches', filterField: 'nom', filterOp: 'eq', filterValue: '{{fiche_choisie}}' },
            children: [
              {
                type: 'card',
                style: { gap: 10, padding: 24 },
                children: [{ type: 'badge', props: { text: '{{element.categorie}}' } }, H('{{element.nom}}', '1'), P('{{element.description}}')],
              },
            ],
          },
        ],
      },
    ],
  },
]

/** Le gabarit « Liste et détail » renvoie à sa première page avec « @liste ». */
const FIRST_PAGE_REF = 'liste'

/**
 * Ajoute les pages d'un gabarit au projet : nouveaux identifiants, liens et actions « Aller sur une page »
 * reliés aux nouvelles pages (« @accueil » : la page d'accueil du projet). Une variable déjà présente
 * avec le même nom et le même type est réutilisée ; sinon la variable du gabarit est renommée.
 */
export function addPageTemplate(project: Project, template: PageTemplate): { project: Project; firstPage: string } {
  const specs = template.pages()
  if (!specs[0].ref) specs[0] = { ...specs[0], ref: FIRST_PAGE_REF }
  const temp = buildApp(template.name, specs, template.variables())
  let source: Nodes = temp.nodes
  const variables = [...project.variables]
  for (const v of temp.variables) {
    const same = variables.find((x) => x.name === v.name)
    if (same && same.kind === v.kind) continue
    let name = v.name
    for (let i = 2; variables.some((x) => x.name === name); i++) name = `${v.name}_${i}`
    if (name !== v.name) source = renameVariableInNodes(source, v.name, name)
    variables.push({ ...v, name })
  }
  let nodes: Nodes = { ...project.nodes }
  const pageMap = new Map<string, string>()
  for (const pageId of temp.pages) {
    const clone = cloneSubtree(source, pageId, nodes)
    clone.nodes[clone.rootId] = { ...clone.nodes[clone.rootId], name: source[pageId].name }
    nodes = { ...nodes, ...clone.nodes }
    pageMap.set(pageId, clone.rootId)
  }
  const pageOf = (ref: string) => pageMap.get(ref) ?? (ref === '@accueil' ? project.rootId : ref)
  const relink = (a: Action): Action => (a.type === 'navigate' ? { ...a, page: pageOf(a.page) } : a)
  for (const newPage of pageMap.values()) {
    for (const id of collectSubtree(nodes, newPage)) {
      const n = mapNodeActions(nodes[id], relink)
      if (n.type === 'link' && typeof n.props.page === 'string') n.props = { ...n.props, page: pageOf(n.props.page) }
      nodes[id] = n
    }
  }
  const pages = [...project.pages, ...pageMap.values()]
  return { project: { ...project, nodes, pages, variables }, firstPage: pageMap.get(temp.pages[0])! }
}
