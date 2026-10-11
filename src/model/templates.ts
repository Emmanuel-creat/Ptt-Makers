import { BRICKS } from './bricks'
import { BUSINESS_TEMPLATES } from './businessTemplates'
import { buildApp, buildProject, type Spec, type Template } from './appBuilder'
import { scaffoldCollection } from './scaffold'
import type { Action, BrickStyle, Project, PropValue, Variable } from './types'

export { ROOT_ID, buildApp, buildProject, TEMPLATE_FAMILIES } from './appBuilder'
export type { PageSpec, Spec, Template, TemplateFamily } from './appBuilder'

const H = (text: string, level: '1' | '2' | '3', style?: BrickStyle): Spec => ({
  type: 'heading',
  props: { text, level },
  style,
})
const P = (text: string, style?: BrickStyle): Spec => ({ type: 'text', props: { text }, style })

const ADD_TASK: Action[] = [
  {
    type: 'if',
    variable: 'nouvelle',
    op: 'notEmpty',
    value: '',
    then: [
      { type: 'listAdd', variable: 'taches', value: '{{nouvelle}}' },
      { type: 'set', variable: 'nouvelle', value: '' },
    ],
    else: [{ type: 'alert', message: 'Écris d’abord une tâche.' }],
  },
]

export const TEMPLATES: Template[] = [
  {
    id: 'vierge',
    family: 'depart',
    name: 'Page vierge',
    description: 'Une page blanche pour partir de zéro.',
    accent: '#94a3b8',
    create: () => buildProject('Nouveau projet', {}, []),
  },
  {
    id: 'accueil',
    family: 'sites',
    name: "Page d'accueil",
    description: 'Présente une idée avec un grand titre, des boutons et trois atouts.',
    accent: '#6c5ce7',
    create: () =>
      buildProject('Page d’accueil', { title: 'Mon super projet', style: { padding: 0, gap: 0, background: '#ffffff', color: '#1b1d29' } }, [
        {
          type: 'section',
          name: 'Bandeau',
          style: { padding: 56, gap: 18, align: 'center', textAlign: 'center', background: '#f3f1ff', borderRadius: 0 },
          children: [
            { type: 'badge', props: { text: 'Nouveau' }, style: { margin: 0 } },
            H('Donne vie à tes idées', '1', { maxWidth: '720px' }),
            P('Une phrase courte qui explique ce que ton projet apporte et pourquoi il est utile.', {
              maxWidth: '560px',
              color: '#4b5068',
              fontSize: 18,
            }),
            {
              type: 'row',
              name: 'Boutons',
              style: { justify: 'center', gap: 12 },
              children: [
                { type: 'button', props: { text: 'Découvrir', variant: 'primary' }, onClick: [{ type: 'scrollTo', target: '@atouts' }] },
                {
                  type: 'button',
                  props: { text: 'Nous contacter', variant: 'secondary' },
                  onClick: [{ type: 'alert', message: 'Merci ! On te répond très vite.' }],
                },
              ],
            },
          ],
        },
        {
          type: 'section',
          ref: 'atouts',
          name: 'Atouts',
          style: { padding: 48, gap: 24 },
          children: [
            H('Pourquoi choisir ce projet ?', '2', { textAlign: 'center' }),
            {
              type: 'grid',
              props: { columns: 3 },
              children: [
                ['eclair', 'Rapide', 'Tout se met en place en quelques minutes.'],
                ['palette', 'Personnalisable', 'Couleurs, textes et mise en page à ton image.'],
                ['poignee', 'Accessible', 'Pensé pour être simple à utiliser par tout le monde.'],
              ].map(
                ([icon, t, d]): Spec => ({
                  type: 'card',
                  children: [
                    { type: 'icon', props: { symbol: icon, label: '' }, style: { fontSize: 30, color: '#5b4ff5' } },
                    H(t, '3'),
                    P(d, { color: '#5b6075' }),
                  ],
                }),
              ),
            },
          ],
        },
        {
          type: 'section',
          name: 'Pied de page',
          style: { padding: 24, background: '#1b1d29', color: '#c7cad8', align: 'center', borderRadius: 0 },
          children: [P('© 2026 · Fait avec Ptt-Makers', { fontSize: 14 })],
        },
      ]),
  },
  {
    id: 'compteur',
    family: 'depart',
    name: 'Compteur',
    description: 'Découvre les variables : des boutons qui changent un nombre.',
    accent: '#10b981',
    create: () =>
      buildProject(
        'Compteur',
        { style: { padding: 32, align: 'center', justify: 'center', background: '#f5f6fa', color: '#1b1d29' } },
        [
          {
            type: 'card',
            name: 'Carte compteur',
            style: { padding: 32, gap: 16, align: 'center', width: '100%', maxWidth: '420px', shadow: 'md' },
            children: [
              { type: 'badge', props: { text: 'Exemple de variable' } },
              H('Mon compteur', '2'),
              {
                type: 'heading',
                name: 'Valeur',
                props: { text: '{{compteur}}', level: '1' },
                style: { fontSize: 64, color: '#6c5ce7' },
              },
              {
                type: 'row',
                style: { justify: 'center', gap: 10 },
                children: [
                  { type: 'button', props: { text: '− 1', variant: 'secondary' }, onClick: [{ type: 'add', variable: 'compteur', amount: -1 }] },
                  { type: 'button', props: { text: 'Remettre à 0', variant: 'ghost' }, onClick: [{ type: 'set', variable: 'compteur', value: '0' }] },
                  { type: 'button', props: { text: '+ 1', variant: 'primary' }, onClick: [{ type: 'add', variable: 'compteur', amount: 1 }] },
                ],
              },
              P('Clique sur les boutons dans l’aperçu, puis regarde l’onglet JS du code.', {
                fontSize: 14,
                color: '#6b7083',
                textAlign: 'center',
              }),
            ],
          },
        ],
        [{ name: 'compteur', kind: 'number', initial: 0 }],
      ),
  },
  {
    id: 'contact',
    family: 'sites',
    name: 'Formulaire de contact',
    description: 'Des champs reliés à des variables et un message de confirmation.',
    accent: '#0ea5e9',
    create: () =>
      buildProject(
        'Formulaire de contact',
        { style: { padding: 32, align: 'center', background: '#eef6fb', color: '#1b1d29' } },
        [
          {
            type: 'card',
            ref: 'formulaire',
            name: 'Formulaire',
            style: { padding: 28, gap: 14, width: '100%', maxWidth: '480px', shadow: 'md' },
            children: [
              H('Contacte-nous', '2'),
              P('Bonjour {{nom}} ! Laisse-nous un message, on te répond vite.', { color: '#4b5068' }),
              { type: 'input', props: { label: 'Ton prénom', placeholder: 'Ex. Camille', inputType: 'text', bind: 'nom', required: true } },
              { type: 'input', props: { label: 'Ton e-mail', placeholder: 'camille@exemple.fr', inputType: 'email', bind: 'email', required: true } },
              {
                type: 'textarea',
                props: { label: 'Ton message', placeholder: 'Écris ici…', bind: 'message', required: true, minLength: 10, errorText: 'Ton message doit faire au moins 10 caractères.' },
              },
              { type: 'checkbox', props: { label: 'Je veux recevoir la lettre d’information', bind: 'abonne' } },
              {
                type: 'button',
                props: { text: 'Envoyer', variant: 'primary' },
                style: { width: '100%' },
                onClick: [
                  { type: 'validate', target: '@formulaire' },
                  { type: 'set', variable: 'envoye', value: 'true' },
                ],
              },
              {
                type: 'card',
                name: 'Confirmation',
                showIf: 'envoye',
                style: { direction: 'row', align: 'center', gap: 10, padding: 14, background: '#ecfdf5', borderColor: '#a7f3d0', shadow: 'none', color: '#065f46' },
                children: [
                  { type: 'icon', props: { symbol: 'valide', label: '' }, style: { fontSize: 22 } },
                  P('Merci {{nom}}, ton message a bien été envoyé !'),
                ],
              },
            ],
          },
        ],
        [
          { name: 'nom', kind: 'text', initial: '' },
          { name: 'email', kind: 'text', initial: '' },
          { name: 'message', kind: 'text', initial: '' },
          { name: 'abonne', kind: 'boolean', initial: false },
          { name: 'envoye', kind: 'boolean', initial: false },
        ],
      ),
  },
  {
    id: 'profil',
    family: 'sites',
    name: 'Carte de profil',
    description: 'Une carte de présentation avec un bouton « Suivre ».',
    accent: '#f59e0b',
    create: () =>
      buildProject(
        'Carte de profil',
        { style: { padding: 32, align: 'center', justify: 'center', background: '#fff7ed', color: '#1b1d29' } },
        [
          {
            type: 'card',
            name: 'Profil',
            style: { padding: 0, gap: 0, width: '100%', maxWidth: '360px', shadow: 'lg', borderWidth: 0 },
            children: [
              { type: 'image', props: { src: '', alt: 'Photo de couverture' }, style: { height: '140px', borderRadius: 14 } },
              {
                type: 'stack',
                style: { padding: 24, gap: 10 },
                children: [
                  H('Alex Martin', '2'),
                  { type: 'badge', props: { text: 'Créateur·rice d’applis' }, style: { background: '#ffedd5', color: '#9a3412' } },
                  P('J’imagine des outils simples pour rendre le numérique plus agréable.', { color: '#4b5068' }),
                  { type: 'text', name: 'Abonnés', props: { text: '{{abonnes}} abonnés' }, style: { fontWeight: '600' } },
                  {
                    type: 'row',
                    style: { gap: 10 },
                    children: [
                      {
                        type: 'button',
                        props: { text: 'Suivre', variant: 'primary' },
                        onClick: [{ type: 'add', variable: 'abonnes', amount: 1 }],
                      },
                      { type: 'link', props: { text: 'Voir le portfolio', href: 'https://example.com', newTab: true } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        [{ name: 'abonnes', kind: 'number', initial: 128 }],
      ),
  },
  {
    id: 'taches',
    family: 'applications',
    name: 'Liste de tâches',
    description: 'Une vraie petite appli : ajouter, cocher et retirer des tâches avec une liste.',
    accent: '#8b5cf6',
    create: () =>
      buildProject(
        'Liste de tâches',
        { style: { padding: 32, align: 'center', background: '#f5f3ff', color: '#1b1d29' } },
        [
          {
            type: 'card',
            name: 'Appli tâches',
            style: { padding: 28, gap: 16, width: '100%', maxWidth: '520px', shadow: 'md' },
            children: [
              H('Mes tâches', '2'),
              P('{{taches}} tâche(s) à faire', { color: '#6b7083', fontSize: 14 }),
              {
                type: 'row',
                name: 'Ajout',
                style: { gap: 8, align: 'end', wrap: false },
                children: [
                  {
                    type: 'input',
                    props: { label: 'Nouvelle tâche', placeholder: 'Ex. Réviser les maths', inputType: 'text', bind: 'nouvelle', eventKey: 'Enter' },
                    style: { width: '100%' },
                    // La touche Entrée ajoute la tâche, comme le bouton.
                    on: { onKey: ADD_TASK },
                  },
                  { type: 'button', props: { text: 'Ajouter', variant: 'primary' }, onClick: ADD_TASK },
                ],
              },
              {
                type: 'repeat',
                name: 'Tâches',
                props: { source: 'taches', columns: 1, empty: 'Bravo, plus rien à faire !' },
                style: { gap: 8 },
                children: [
                  {
                    type: 'row',
                    name: 'Ligne de tâche',
                    style: { gap: 10, justify: 'space-between', padding: 10, background: '#f8f7ff', borderRadius: 10, wrap: false },
                    children: [
                      { type: 'text', name: 'Texte de la tâche', props: { text: '{{position}}. {{element}}' } },
                      {
                        type: 'button',
                        props: { text: 'Fait', variant: 'secondary' },
                        onClick: [{ type: 'listRemove', variable: 'taches', which: 'current' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'button',
                props: { text: 'Tout effacer', variant: 'ghost' },
                onClick: [{ type: 'listClear', variable: 'taches' }],
              },
            ],
          },
        ],
        [
          { name: 'taches', kind: 'list', initial: ['Découvrir Ptt-Makers', 'Créer ma première appli'] },
          { name: 'nouvelle', kind: 'text', initial: '' },
        ],
      ),
  },
  {
    id: 'annuaire',
    family: 'applications',
    name: 'Annuaire (API)',
    description: 'Charge des données depuis Internet et les affiche en cartes.',
    accent: '#0d9488',
    create: () =>
      buildProject(
        'Annuaire',
        {
          style: { padding: 32, gap: 20, background: '#f0fdfa', color: '#1b1d29' },
          onLoad: [{ type: 'fetch', url: 'https://jsonplaceholder.typicode.com/users', variable: 'personnes', path: '' }],
        },
        [
          H('Annuaire', '1'),
          P('Ces fiches viennent d’une API : elles sont chargées quand la page s’ouvre. {{personnes}} personnes trouvées.', { color: '#4b5068' }),
          {
            type: 'repeat',
            name: 'Fiches',
            props: { source: 'personnes', columns: 3, empty: 'Chargement…' },
            style: { gap: 16 },
            children: [
              {
                type: 'card',
                name: 'Fiche',
                style: { gap: 6 },
                children: [
                  H('{{element.name}}', '3'),
                  ...(
                    [
                      ['email', 'E-mail', '{{element.email}}'],
                      ['ville', 'Ville', '{{element.address.city}}'],
                    ] as const
                  ).map(
                    ([icon, label, text]): Spec => ({
                      type: 'row',
                      name: label,
                      style: { gap: 6, align: 'center', color: '#4b5068' },
                      children: [
                        { type: 'icon', props: { symbol: icon, label }, style: { fontSize: 16 } },
                        P(text, { fontSize: 14 }),
                      ],
                    }),
                  ),
                  { type: 'button', props: { text: 'Saluer', variant: 'secondary' }, onClick: [{ type: 'alert', message: 'Bonjour {{element.name}} !' }] },
                ],
              },
            ],
          },
        ],
        [{ name: 'personnes', kind: 'list', initial: [] }],
      ),
  },
  {
    id: 'site',
    family: 'sites',
    name: 'Site de plusieurs pages',
    description: 'Accueil, À propos et Contact, avec un menu pour passer d’une page à l’autre.',
    accent: '#e11d48',
    create: () => {
      const menu = (): Spec => ({
        type: 'row',
        name: 'Menu',
        style: { gap: 16, padding: 16, background: '#1b1d29', justify: 'center' },
        children: [
          { type: 'link', props: { text: 'Accueil', page: '@accueil', href: '', newTab: false }, style: { color: '#ffffff' } },
          { type: 'link', props: { text: 'À propos', page: '@apropos', href: '', newTab: false }, style: { color: '#ffffff' } },
          { type: 'link', props: { text: 'Contact', page: '@contact', href: '', newTab: false }, style: { color: '#ffffff' } },
        ],
      })
      const pageStyle: BrickStyle = { padding: 0, gap: 0, background: '#ffffff', color: '#1b1d29' }
      const body = (children: Spec[]): Spec => ({ type: 'section', style: { padding: 40, gap: 16, borderRadius: 0 }, children })
      return buildApp('Mon site', [
        {
          ref: 'accueil',
          name: 'Accueil',
          title: 'Mon site',
          style: pageStyle,
          children: [
            menu(),
            body([
              H('Bienvenue sur mon site', '1'),
              P('Chaque page est un onglet au-dessus de la zone de création. Le menu passe de l’une à l’autre.'),
              { type: 'button', props: { text: 'Me contacter', variant: 'primary' }, onClick: [{ type: 'navigate', page: '@contact' }] },
            ]),
          ],
        },
        {
          ref: 'apropos',
          name: 'À propos',
          style: pageStyle,
          children: [menu(), body([H('À propos', '1'), P('Raconte ici ton histoire, ton projet ou ton équipe.')])],
        },
        {
          ref: 'contact',
          name: 'Contact',
          style: pageStyle,
          children: [
            menu(),
            body([
              H('Contact', '1'),
              { type: 'input', props: { label: 'Ton e-mail', placeholder: 'toi@exemple.fr', inputType: 'email', bind: 'email' } },
              { type: 'button', props: { text: 'Envoyer', variant: 'primary' }, onClick: [{ type: 'alert', message: 'Merci, on t’écrit à {{email}} !' }] },
            ]),
          ],
        },
      ], [{ name: 'email', kind: 'text', initial: '' }])
    },
  },
  {
    id: 'tableau-bord',
    family: 'pilotage',
    name: 'Tableau de bord',
    description: 'Chiffres clés, graphiques, objectifs et dernières commandes : un vrai écran de pilotage.',
    accent: '#0ea5e9',
    create: () => ({
      ...buildProject('Tableau de bord', { style: { padding: 28, gap: 20 } }, [
        {
          type: 'row',
          name: 'En-tête',
          style: { justify: 'space-between' },
          children: [H('Tableau de bord', '1', { fontSize: 30 }), { type: 'badge', props: { text: 'Octobre 2026' } }],
        },
        {
          type: 'grid',
          name: 'Chiffres clés',
          props: { columns: 4 },
          children: [
            { type: 'stat', props: { label: 'Chiffre d’affaires', value: '48 250 €', delta: '+12,4 %', symbol: 'paiement' } },
            { type: 'stat', props: { label: 'Commandes', value: '1 284', delta: '+6,1 %', symbol: 'panier' } },
            { type: 'stat', props: { label: 'Nouveaux clients', value: '312', delta: '+18 %', symbol: 'groupe' } },
            { type: 'stat', props: { label: 'Panier moyen', value: '37,60 €', delta: '-2,3 %', symbol: 'cadeau' } },
          ],
        },
        {
          type: 'grid',
          name: 'Graphiques',
          props: { columns: 2 },
          children: [
            {
              type: 'stack',
              name: 'Ventes de la semaine',
              children: [
                H('Ventes de la semaine', '3'),
                { type: 'chart', props: { kind: 'barres', data: 'Lun : 5 200\nMar : 6 800\nMer : 6 100\nJeu : 8 400\nVen : 9 300\nSam : 7 900\nDim : 4 500', unit: '€', showValues: false } },
              ],
            },
            {
              type: 'stack',
              name: 'Ventes par canal',
              children: [
                H('Ventes par canal', '3'),
                { type: 'chart', props: { kind: 'anneau', data: 'Site web : 52\nMagasins : 31\nPlaces de marché : 17', unit: '%', showValues: true } },
              ],
            },
          ],
        },
        {
          type: 'card',
          name: 'Objectifs',
          children: [
            H('Objectifs du trimestre', '3'),
            { type: 'progress', props: { label: 'Chiffre d’affaires', value: '72' } },
            { type: 'progress', props: { label: 'Satisfaction client', value: '88' } },
          ],
        },
        H('Dernières commandes', '3'),
        {
          type: 'table',
          props: {
            columns: 'N° ; Client ; Montant ; Statut',
            rows: '1042 ; Camille Martin ; 128,00 € ; Livrée\n1043 ; Yanis Benali ; 54,90 € ; En préparation\n1044 ; Léa Dubois ; 249,00 € ; Expédiée\n1045 ; Hugo Petit ; 19,90 € ; Annulée\n1046 ; Inès Moreau ; 87,50 € ; Livrée',
            striped: true,
            sortable: true,
          },
        },
      ]),
      theme: { style: 'pro-sobre' },
    }),
  },
  {
    id: 'projet',
    family: 'pilotage',
    name: 'Gestion de projet',
    description: 'Un kanban à faire glisser, le calendrier du mois et une barre d’avancement reliée à un bouton.',
    accent: '#f59e0b',
    create: () => ({
      ...buildProject(
        'Gestion de projet',
        { style: { padding: 28, gap: 18 } },
        [
          H('Refonte du site', '1', { fontSize: 30 }),
          P('Glisse les cartes d’une colonne à l’autre dans l’aperçu, ou clique leur flèche.'),
          {
            type: 'row',
            name: 'Avancement',
            children: [
              { type: 'progress', props: { label: 'Avancement du projet', value: '{{avancement}}' }, style: { width: '60%' } },
              {
                type: 'button',
                props: { text: '+10 %', variant: 'secondary' },
                onClick: [
                  {
                    type: 'if',
                    variable: 'avancement',
                    op: 'lt',
                    value: '100',
                    then: [{ type: 'add', variable: 'avancement', amount: 10 }],
                    else: [{ type: 'alert', message: 'Le projet est terminé !' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'kanban',
            props: {
              columns:
                'À faire : Écrire les textes ; Choisir les photos ; Préparer la mise en ligne\nEn cours : Maquette de l’accueil ; Logo\nÀ valider : Charte graphique\nTerminé : Réunion de lancement ; Cahier des charges',
            },
          },
          H('Planning', '2'),
          {
            type: 'calendar',
            props: { month: '2026-10', events: '5 : Atelier contenu\n9 : Revue maquette\n14 : Point d’équipe\n21 : Test utilisateurs\n28 : Mise en ligne' },
          },
        ],
        [{ name: 'avancement', kind: 'number', initial: 40 }],
      ),
      theme: { style: 'pastel' },
    }),
  },
  {
    id: 'messagerie',
    family: 'applications',
    name: 'Messagerie mobile',
    description: 'Une application mobile de trois écrans : discussion, contacts et profil, avec la barre d’onglets en bas.',
    accent: '#8b5cf6',
    create: () => {
      const tabbar: Spec = { type: 'tabbar', props: { icons: 'message\ngroupe\npersonne' } }
      const pageStyle: BrickStyle = { padding: 16, gap: 14 }
      return {
        ...buildApp('Messagerie', [
          {
            name: 'Discussions',
            title: 'Messagerie',
            style: pageStyle,
            children: [
              H('Alex Martin', '2'),
              { type: 'badge', props: { text: 'En ligne' } },
              {
                type: 'chat',
                props: {
                  messages:
                    'Alex : Salut ! Tu es dispo pour la démo de demain ?\nMoi : Oui, 10 h ça te va ?\nAlex : Parfait. J’apporte les maquettes.\nMoi : Super, à demain !',
                  me: 'Moi',
                  composer: true,
                  placeholder: 'Écris un message…',
                },
              },
              tabbar,
            ],
          },
          {
            name: 'Contacts',
            style: pageStyle,
            children: [
              H('Contacts', '2'),
              {
                type: 'table',
                props: { columns: 'Nom ; Statut', rows: 'Alex Martin ; En ligne\nSam Diallo ; Absent\nNora Lefèvre ; En ligne\nTom Garnier ; Hors ligne', striped: false, sortable: true },
              },
              tabbar,
            ],
          },
          {
            name: 'Profil',
            style: pageStyle,
            children: [
              H('Mon profil', '2'),
              {
                type: 'grid',
                props: { columns: 2 },
                children: [
                  { type: 'stat', props: { label: 'Messages envoyés', value: '1 248', delta: '+32 cette semaine', symbol: 'message' } },
                  { type: 'stat', props: { label: 'Contacts', value: '86', delta: '+4', symbol: 'groupe' } },
                ],
              },
              { type: 'progress', props: { label: 'Profil complété', value: '80' } },
              tabbar,
            ],
          },
        ]),
        theme: { style: 'neo-sombre' },
      }
    },
  },
  {
    id: 'stock',
    family: 'gestion',
    name: 'Gestion de stock',
    description: 'Une vraie petite base de données : un formulaire ajoute des produits, le tableau se met à jour et tout reste enregistré dans le navigateur.',
    accent: '#0f9c74',
    create: () => {
      const produits: Variable = {
        name: 'produits',
        kind: 'collection',
        persist: true,
        fields: [
          { name: 'nom', label: 'Produit', type: 'text' },
          { name: 'categorie', label: 'Catégorie', type: 'text' },
          { name: 'quantite', label: 'Quantité', type: 'number' },
          { name: 'prix', label: 'Prix (€)', type: 'number' },
          { name: 'arrivage', label: 'Arrivage', type: 'date' },
          { name: 'valeur', label: 'Valeur (€)', type: 'formula', formula: 'quantite * prix' },
        ],
        initial: [
          { nom: 'Café en grains 1 kg', categorie: 'Épicerie', quantite: 24, prix: 18.9, arrivage: '2026-10-02' },
          { nom: 'Thé vert bio', categorie: 'Épicerie', quantite: 40, prix: 6.5, arrivage: '2026-09-28' },
          { nom: 'Tasse en grès', categorie: 'Vaisselle', quantite: 12, prix: 14, arrivage: '2026-10-06' },
          { nom: 'Moulin manuel', categorie: 'Accessoires', quantite: 5, prix: 39, arrivage: '2026-10-09' },
        ],
      }
      const base = buildApp(
        'Gestion de stock',
        [
          {
            name: 'Stock',
            title: 'Gestion de stock',
            style: { padding: 28, gap: 18, maxWidth: '980px' },
            children: [
              H('Gestion de stock', '1'),
              P('Ajoute un produit avec le formulaire : il apparaît dans le tableau et reste enregistré, même après un rechargement.'),
              {
                type: 'grid',
                props: { columns: 2 },
                children: [
                  { type: 'stat', props: { label: 'Produits suivis', value: '{{produits}}', delta: 'mis à jour en direct', symbol: 'panier' } },
                  { type: 'stat', props: { label: 'Valeur du stock', value: '{{somme(produits.valeur)}} €', delta: '{{somme(produits.quantite)}} articles', symbol: 'paiement' } },
                ],
              },
            ],
          },
        ],
        [produits],
      )
      const made = scaffoldCollection(base, 'produits', base.rootId)
      return { ...base, variables: made ? [...base.variables, ...made.variables] : base.variables, nodes: made?.nodes ?? base.nodes, theme: { style: 'pro-sobre' } }
    },
  },
  {
    id: 'membres',
    family: 'applications',
    name: 'Espace membres',
    description: 'Créer un compte, se connecter et ouvrir une page réservée aux membres, qui reste ouverte au retour.',
    accent: '#4f46e5',
    create: () => {
      const login = { variable: 'membre', page: '@connexion' }
      const project = buildApp(
        'Espace membres',
        [
          {
            ref: 'accueil',
            name: 'Accueil',
            style: { padding: 32, gap: 16, maxWidth: '720px' },
            children: [
              H('Le club des curieux', '1'),
              P('Des ateliers chaque semaine, des ressources à télécharger et une communauté. Connecte-toi pour ouvrir ton espace.'),
              { type: 'button', props: { text: 'Mon espace', variant: 'primary' }, onClick: [{ type: 'navigate', page: '@espace' }] },
            ],
          },
          {
            ref: 'connexion',
            name: 'Connexion',
            style: { padding: 32, gap: 16, maxWidth: '480px' },
            children: [
              H('Connexion', '1'),
              {
                type: 'card',
                ref: 'formulaire',
                children: [
                  { type: 'input', props: { label: 'E-mail', placeholder: 'toi@exemple.fr', inputType: 'email', bind: 'email', required: true } },
                  { type: 'input', props: { label: 'Mot de passe', placeholder: '6 caractères au moins', inputType: 'password', bind: 'mot_de_passe', required: true, minLength: 6 } },
                  {
                    type: 'row',
                    style: { gap: 10 },
                    children: [
                      {
                        type: 'button',
                        props: { text: 'Se connecter', variant: 'primary' },
                        onClick: [
                          { type: 'validate', target: '@formulaire' },
                          { type: 'login', variable: 'membre', email: '{{email}}', password: '{{mot_de_passe}}' },
                          { type: 'set', variable: 'mot_de_passe', value: '' },
                          { type: 'navigate', page: '@espace' },
                        ],
                      },
                      {
                        type: 'button',
                        props: { text: 'Créer un compte', variant: 'secondary' },
                        onClick: [
                          { type: 'validate', target: '@formulaire' },
                          { type: 'signup', variable: 'membre', email: '{{email}}', password: '{{mot_de_passe}}' },
                          { type: 'set', variable: 'mot_de_passe', value: '' },
                          { type: 'navigate', page: '@espace' },
                        ],
                      },
                    ],
                  },
                ],
              },
              P('Ton compte est gardé dans ce navigateur, avec ton mot de passe chiffré.', { color: '#6b7280', fontSize: 13 }),
            ],
          },
          {
            ref: 'espace',
            name: 'Mon espace',
            login,
            style: { padding: 32, gap: 16, maxWidth: '720px' },
            children: [
              H('Bonjour {{membre}}', '1'),
              P('Bienvenue dans ton espace. Cette page n’est visible qu’une fois connecté.'),
              {
                type: 'grid',
                props: { columns: 2 },
                children: [
                  { type: 'stat', props: { label: 'Ateliers suivis', value: '3', delta: 'ce mois-ci', symbol: 'trophee' } },
                  { type: 'stat', props: { label: 'Prochain atelier', value: 'Jeudi', delta: 'Poterie, 18 h', symbol: 'calendrier' } },
                ],
              },
              {
                type: 'button',
                props: { text: 'Se déconnecter', variant: 'secondary' },
                onClick: [
                  { type: 'logout', variable: 'membre' },
                  { type: 'navigate', page: '@accueil' },
                ],
              },
            ],
          },
        ],
        [
          { name: 'membre', kind: 'text', initial: '', persist: true },
          { name: 'email', kind: 'text', initial: '' },
          { name: 'mot_de_passe', kind: 'text', initial: '' },
        ],
      )
      return { ...project, theme: { style: 'neo-clair' } }
    },
  },
  {
    id: 'back-office',
    family: 'pilotage',
    name: 'Back-office',
    description: 'Un vrai logiciel de gestion : barre latérale, en-têtes, tableau de bord en zones, fiches clients modifiables dans le tableau, formulaire vérifié.',
    accent: '#0f766e',
    create: () => {
      const clients: Variable = {
        name: 'clients',
        kind: 'collection',
        persist: true,
        fields: [
          { name: 'nom', label: 'Client', type: 'text' },
          { name: 'email', label: 'E-mail', type: 'text' },
          { name: 'rendez_vous', label: 'Rendez-vous', type: 'date' },
          { name: 'montant', label: 'Montant (€)', type: 'number' },
        ],
        initial: [
          { nom: 'Boulangerie Martin', email: 'contact@boulangerie-martin.fr', rendez_vous: '2026-10-14', montant: 1250 },
          { nom: 'Garage du Centre', email: 'accueil@garageducentre.fr', rendez_vous: '2026-10-20', montant: 3400 },
          { nom: 'Studio Lumière', email: 'bonjour@studiolumiere.fr', rendez_vous: '2026-11-03', montant: 860 },
        ],
      }
      const shell = (title: string, subtitle: string, actions: Spec[], content: Spec[]): Spec => ({
        type: 'appshell',
        props: { brand: 'Atelier Gestion', sidebarWidth: 220 },
        children: [
          { type: 'appheader', props: { title, subtitle }, style: { gap: 10, padding: 20 }, children: actions },
          { type: 'section', name: 'Contenu', style: { gap: 20, padding: 24 }, children: content },
        ],
      })
      const field = (label: string, bind: string, inputType: string, extra: Record<string, PropValue> = {}): Spec => ({
        type: 'input',
        props: { label, bind, inputType, required: true, ...extra },
      })
      return {
        ...buildApp(
          'Back-office',
          [
            {
              name: 'Tableau de bord',
              style: { padding: 0 },
              children: [
                shell('Tableau de bord', 'Les chiffres du mois, en direct', [{ type: 'button', props: { text: 'Nouveau client', variant: 'primary' }, onClick: [{ type: 'navigate', page: '@clients' }] }], [
                  {
                    type: 'grid',
                    name: 'Zones du tableau de bord',
                    props: { template: '1fr 1fr 1fr', areas: 'clients montant prochain\ngraphique graphique prochain' },
                    style: { gap: 16 },
                    children: [
                      { type: 'stat', props: { label: 'Clients', value: '{{clients}}', delta: 'dans la base', symbol: 'groupe' }, style: { area: 'clients' } },
                      { type: 'stat', props: { label: 'Montant total', value: '{{somme(clients.montant)}} €', delta: '+8 % ce mois', symbol: 'paiement' }, style: { area: 'montant' } },
                      {
                        type: 'card',
                        name: 'Prochains rendez-vous',
                        style: { area: 'prochain', padding: 18, gap: 10 },
                        children: [
                          H('Prochains rendez-vous', '3'),
                          { type: 'repeat', props: { source: 'clients', sortField: 'rendez_vous', sortDir: 'asc' }, style: { gap: 6 }, children: [P('{{element.nom}} : {{element.rendez_vous}}', { fontSize: 14 })] },
                        ],
                      },
                      { type: 'chart', props: { kind: 'barres', title: 'Chiffre d’affaires', data: 'Juil. : 8200\nAoût : 6400\nSept. : 9100\nOct. : 11800' }, style: { area: 'graphique' } },
                    ],
                  },
                ]),
              ],
            },
            {
              ref: 'clients',
              name: 'Clients',
              style: { padding: 0 },
              children: [
                shell('Clients', 'Clique une case du tableau pour la modifier', [], [
                  {
                    type: 'grid',
                    props: { template: 'minmax(260px, 1fr) 2fr' },
                    style: { gap: 20, align: 'start' },
                    children: [
                      {
                        type: 'form',
                        name: 'Nouveau client',
                        props: { submitText: 'Ajouter le client', successText: '{{nom}} est ajouté.', resetAfter: true },
                        style: { gap: 12, padding: 20 },
                        on: { onSubmit: [{ type: 'addRecord', variable: 'clients', values: { nom: '{{nom}}', email: '{{email}}', rendez_vous: '{{rendez_vous}}', montant: '{{montant}}' } }] },
                        children: [
                          H('Nouveau client', '3'),
                          field('Nom du client', 'nom', 'text'),
                          field('E-mail', 'email', 'email'),
                          field('Rendez-vous', 'rendez_vous', 'date', { min: '2026-01-01' }),
                          field('Montant (€)', 'montant', 'number', { min: '0' }),
                        ],
                      },
                      { type: 'table', props: { source: 'clients', editable: true, selectable: true, sortable: true, resizable: true, striped: true } },
                    ],
                  },
                ]),
              ],
            },
          ],
          [
            clients,
            { name: 'nom', kind: 'text', initial: '' },
            { name: 'email', kind: 'text', initial: '' },
            { name: 'rendez_vous', kind: 'text', initial: '' },
            { name: 'montant', kind: 'number', initial: 0 },
          ],
        ),
        theme: { style: 'pro-sobre' },
      }
    },
  },
  ...BUSINESS_TEMPLATES,
]

export const createDefaultProject = () => TEMPLATES[1].create()

/** Vérifie grossièrement qu'un objet importé est bien un projet Ptt-Makers. */
export function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const p = value as Project
  if (p.version !== 1 || typeof p.rootId !== 'string' || !p.nodes || !p.nodes[p.rootId] || !Array.isArray(p.variables)) return false
  if (p.pages !== undefined && !Array.isArray(p.pages)) return false
  return Object.values(p.nodes).every(
    (n) => n && typeof n.id === 'string' && n.type in BRICKS && Array.isArray(n.children) && Array.isArray(n.onClick) && typeof n.props === 'object',
  )
}

/** Valide un projet importé et le met à niveau (les projets d'avant les pages multiples n'ont pas de liste « pages »). */
export function parseProject(value: unknown): Project | null {
  if (!isProject(value)) return null
  const p = value
  const pages = (p.pages ?? []).filter((id, i, all) => p.nodes[id]?.type === 'page' && !p.nodes[id].parent && all.indexOf(id) === i)
  if (!pages.includes(p.rootId)) pages.unshift(p.rootId)
  return { ...p, pages }
}
