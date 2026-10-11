import { scaffoldCollection } from './scaffold'
import { buildApp, type Spec, type Template } from './appBuilder'
import type { CollectionField, Project, Variable } from './types'

/*
 * Modèles de gestion : chacun est une petite base de données (une collection),
 * des chiffres clés calculés par des formules, et le formulaire et le tableau
 * de « Créer un formulaire et un tableau ». Tout reste enregistré dans le navigateur.
 */

interface Stat {
  label: string
  value: string
  delta?: string
  symbol: string
}

interface GestionSpec {
  id: string
  name: string
  description: string
  accent: string
  /** Nom de la collection (sans accent ni espace). */
  collection: string
  fields: CollectionField[]
  rows: Record<string, string | number | boolean>[]
  intro: string
  stats: Stat[]
  /** Briques posées entre les chiffres clés et le formulaire (graphique, kanban, calendrier…). */
  extra?: Spec[]
  style: string
}

function gestion(spec: GestionSpec): Template {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    accent: spec.accent,
    family: 'gestion',
    create: (): Project => {
      const collection: Variable = { name: spec.collection, kind: 'collection', persist: true, fields: spec.fields, initial: spec.rows }
      const base = buildApp(
        spec.name,
        [
          {
            name: spec.name,
            title: spec.name,
            style: { padding: 28, gap: 18, maxWidth: '1040px' },
            children: [
              { type: 'heading', props: { text: spec.name, level: '1' } },
              { type: 'text', props: { text: spec.intro } },
              {
                type: 'grid',
                props: { columns: Math.min(spec.stats.length, 4) },
                children: spec.stats.map((s) => ({ type: 'stat', props: { label: s.label, value: s.value, delta: s.delta ?? '', symbol: s.symbol } })),
              },
              ...(spec.extra ?? []),
            ],
          },
        ],
        [collection],
      )
      const made = scaffoldCollection(base, spec.collection, base.rootId)
      return {
        ...base,
        variables: made ? [...base.variables, ...made.variables] : base.variables,
        nodes: made?.nodes ?? base.nodes,
        theme: { style: spec.style },
      }
    },
  }
}

const text = (name: string, label: string): CollectionField => ({ name, label, type: 'text' })
const num = (name: string, label: string): CollectionField => ({ name, label, type: 'number' })
const date = (name: string, label: string): CollectionField => ({ name, label, type: 'date' })
const yes = (name: string, label: string): CollectionField => ({ name, label, type: 'boolean' })
const calc = (name: string, label: string, formula: string): CollectionField => ({ name, label, type: 'formula', formula })

export const BUSINESS_TEMPLATES: Template[] = [
  gestion({
    id: 'crm',
    name: 'CRM clients',
    description: 'Tes contacts et tes affaires en cours : étape de vente, montant espéré, pipeline en kanban et chiffres clés.',
    accent: '#2563eb',
    collection: 'contacts',
    fields: [text('nom', 'Nom'), text('entreprise', 'Entreprise'), text('email', 'E-mail'), text('etape', 'Étape'), num('montant', 'Montant (€)'), date('relance', 'Prochaine relance')],
    rows: [
      { nom: 'Camille Martin', entreprise: 'Atelier Lumen', email: 'camille@lumen.fr', etape: 'Proposition', montant: 4800, relance: '2026-10-14' },
      { nom: 'Yanis Benali', entreprise: 'Boulangerie du Port', email: 'yanis@duport.fr', etape: 'Premier contact', montant: 1200, relance: '2026-10-16' },
      { nom: 'Léa Dubois', entreprise: 'Studio Nord', email: 'lea@studionord.fr', etape: 'Négociation', montant: 9500, relance: '2026-10-13' },
      { nom: 'Hugo Petit', entreprise: 'Vélos Petit', email: 'hugo@velos-petit.fr', etape: 'Gagné', montant: 3100, relance: '2026-11-02' },
    ],
    intro: 'Ajoute un contact, suis son étape de vente et sa prochaine relance. Le pipeline montre où en est chaque affaire.',
    stats: [
      { label: 'Contacts', value: '{{nombre(contacts)}}', symbol: 'groupe' },
      { label: 'Pipeline', value: '{{somme(contacts.montant)}} €', delta: 'montant espéré', symbol: 'paiement' },
      { label: 'Affaire moyenne', value: '{{arrondi(moyenne(contacts.montant), 0)}} €', symbol: 'poignee' },
    ],
    extra: [
      { type: 'heading', props: { text: 'Pipeline', level: '2' } },
      { type: 'kanban', props: { columns: 'Premier contact : Boulangerie du Port\nProposition : Atelier Lumen\nNégociation : Studio Nord\nGagné : Vélos Petit' } },
    ],
    style: 'pro-sobre',
  }),
  gestion({
    id: 'facturation',
    name: 'Facturation',
    description: 'Les lignes d’une facture avec la TVA : les totaux hors taxes, la TVA et le TTC se calculent tout seuls.',
    accent: '#0f766e',
    collection: 'lignes',
    fields: [
      text('designation', 'Désignation'),
      num('quantite', 'Quantité'),
      num('prix', 'Prix unitaire HT (€)'),
      num('tva', 'TVA (%)'),
      calc('total_ht', 'Total HT (€)', 'arrondi(quantite * prix, 2)'),
      calc('montant_tva', 'TVA (€)', 'arrondi(quantite * prix * tva / 100, 2)'),
      calc('total_ttc', 'Total TTC (€)', 'arrondi(quantite * prix * (1 + tva / 100), 2)'),
    ],
    rows: [
      { designation: 'Création du logo', quantite: 1, prix: 450, tva: 20 },
      { designation: 'Maquette du site (jour)', quantite: 3, prix: 380, tva: 20 },
      { designation: 'Impression de flyers (lot de 500)', quantite: 2, prix: 65, tva: 20 },
      { designation: 'Formation (heure)', quantite: 4, prix: 55, tva: 0 },
    ],
    intro: 'Facture n° 2026-042 pour l’Atelier Lumen. Ajoute une ligne : les totaux se mettent à jour.',
    stats: [
      { label: 'Total HT', value: '{{arrondi(somme(lignes.total_ht), 2)}} €', symbol: 'paiement' },
      { label: 'TVA', value: '{{arrondi(somme(lignes.montant_tva), 2)}} €', symbol: 'info' },
      { label: 'Total TTC', value: '{{arrondi(somme(lignes.total_ttc), 2)}} €', delta: 'à payer sous 30 jours', symbol: 'valide' },
    ],
    style: 'editorial',
  }),
  gestion({
    id: 'reservation',
    name: 'Réservations',
    description: 'Les réservations d’un restaurant ou d’un salon : date, heure, nombre de personnes, calendrier du mois.',
    accent: '#c2410c',
    collection: 'reservations',
    fields: [text('client', 'Client'), date('jour', 'Date'), text('heure', 'Heure'), num('personnes', 'Personnes'), text('telephone', 'Téléphone'), yes('confirmee', 'Confirmée')],
    rows: [
      { client: 'Famille Roux', jour: '2026-10-12', heure: '12:30', personnes: 4, telephone: '06 12 34 56 78', confirmee: true },
      { client: 'Nadia K.', jour: '2026-10-12', heure: '20:00', personnes: 2, telephone: '06 98 76 54 32', confirmee: true },
      { client: 'Club de lecture', jour: '2026-10-15', heure: '19:30', personnes: 8, telephone: '07 11 22 33 44', confirmee: false },
    ],
    intro: 'Note chaque réservation et coche-la quand elle est confirmée. Le calendrier montre les temps forts du mois.',
    stats: [
      { label: 'Réservations', value: '{{nombre(reservations)}}', symbol: 'calendrier' },
      { label: 'Couverts', value: '{{somme(reservations.personnes)}}', symbol: 'repas' },
      { label: 'Table moyenne', value: '{{arrondi(moyenne(reservations.personnes), 1)}} pers.', symbol: 'groupe' },
    ],
    extra: [{ type: 'calendar', props: { month: '2026-10', events: '12 : Famille Roux, Nadia K.\n15 : Club de lecture\n31 : Soirée d’Halloween' } }],
    style: 'nature',
  }),
  gestion({
    id: 'rh',
    name: 'Ressources humaines',
    description: 'Le registre du personnel : poste, service, date d’entrée, salaire et jours de congés restants.',
    accent: '#7c3aed',
    collection: 'employes',
    fields: [text('nom', 'Nom'), text('poste', 'Poste'), text('service', 'Service'), date('entree', 'Date d’entrée'), num('salaire', 'Salaire brut (€)'), num('conges', 'Congés restants (jours)')],
    rows: [
      { nom: 'Camille Martin', poste: 'Designer', service: 'Produit', entree: '2023-03-01', salaire: 3200, conges: 12 },
      { nom: 'Yanis Benali', poste: 'Développeur', service: 'Produit', entree: '2022-09-15', salaire: 3600, conges: 8 },
      { nom: 'Léa Dubois', poste: 'Chargée de marketing', service: 'Marketing', entree: '2024-01-08', salaire: 2900, conges: 19 },
      { nom: 'Hugo Petit', poste: 'Commercial', service: 'Ventes', entree: '2021-06-21', salaire: 3100, conges: 5 },
    ],
    intro: 'Ajoute une personne à l’équipe. Les chiffres clés suivent l’effectif, la masse salariale et les congés.',
    stats: [
      { label: 'Effectif', value: '{{nombre(employes)}}', symbol: 'groupe' },
      { label: 'Masse salariale', value: '{{somme(employes.salaire)}} €', delta: 'par mois, brut', symbol: 'paiement' },
      { label: 'Congés restants', value: '{{arrondi(moyenne(employes.conges), 1)}} j', delta: 'en moyenne', symbol: 'soleil' },
    ],
    extra: [{ type: 'chart', props: { kind: 'anneau', data: 'Produit : 2\nMarketing : 1\nVentes : 1', unit: '', showValues: true } }],
    style: 'pastel',
  }),
  gestion({
    id: 'depenses',
    name: 'Suivi des dépenses',
    description: 'Un budget personnel ou d’association : chaque dépense avec sa catégorie, le total et la plus grosse.',
    accent: '#dc2626',
    collection: 'depenses',
    fields: [text('libelle', 'Libellé'), text('categorie', 'Catégorie'), num('montant', 'Montant (€)'), date('jour', 'Date')],
    rows: [
      { libelle: 'Courses de la semaine', categorie: 'Alimentation', montant: 86.4, jour: '2026-10-04' },
      { libelle: 'Abonnement de transport', categorie: 'Transport', montant: 75, jour: '2026-10-01' },
      { libelle: 'Place de cinéma', categorie: 'Loisirs', montant: 11.5, jour: '2026-10-08' },
    ],
    intro: 'Note chaque dépense : le total du mois et la plus grosse dépense se calculent tout seuls.',
    stats: [
      { label: 'Total', value: '{{arrondi(somme(depenses.montant), 2)}} €', symbol: 'paiement' },
      { label: 'Plus grosse dépense', value: '{{max(depenses.montant)}} €', symbol: 'attention' },
      { label: 'Dépenses', value: '{{nombre(depenses)}}', symbol: 'panier' },
    ],
    style: 'neo-clair',
  }),
  gestion({
    id: 'bibliotheque',
    name: 'Bibliothèque',
    description: 'Le catalogue d’une bibliothèque de quartier ou de classe : titre, auteur, genre, disponible ou prêté.',
    accent: '#92400e',
    collection: 'livres',
    fields: [text('titre', 'Titre'), text('auteur', 'Auteur'), text('genre', 'Genre'), num('annee', 'Année'), yes('disponible', 'Disponible')],
    rows: [
      { titre: 'Le Petit Prince', auteur: 'Antoine de Saint-Exupéry', genre: 'Conte', annee: 1943, disponible: true },
      { titre: 'Vingt mille lieues sous les mers', auteur: 'Jules Verne', genre: 'Aventure', annee: 1870, disponible: false },
      { titre: 'L’Étranger', auteur: 'Albert Camus', genre: 'Roman', annee: 1942, disponible: true },
    ],
    intro: 'Ajoute un livre au catalogue, et décoche « Disponible » quand il est prêté.',
    stats: [
      { label: 'Livres', value: '{{nombre(livres)}}', symbol: 'livre' },
      { label: 'Le plus ancien', value: '{{min(livres.annee)}}', symbol: 'horloge' },
    ],
    style: 'carnet',
  }),
  gestion({
    id: 'notes',
    name: 'Notes des élèves',
    description: 'Le carnet de notes d’une classe : une note par matière et la moyenne de chaque élève, calculée.',
    accent: '#0891b2',
    collection: 'eleves',
    fields: [
      text('nom', 'Élève'),
      num('maths', 'Maths'),
      num('francais', 'Français'),
      num('histoire', 'Histoire'),
      calc('moyenne', 'Moyenne', 'arrondi((maths + francais + histoire) / 3, 1)'),
    ],
    rows: [
      { nom: 'Inès', maths: 15, francais: 13, histoire: 16 },
      { nom: 'Tom', maths: 11, francais: 14, histoire: 12 },
      { nom: 'Sacha', maths: 17, francais: 12, histoire: 14 },
    ],
    intro: 'Saisis les notes sur 20 : la moyenne de l’élève et celle de la classe se calculent toutes seules.',
    stats: [
      { label: 'Élèves', value: '{{nombre(eleves)}}', symbol: 'groupe' },
      { label: 'Moyenne de la classe', value: '{{arrondi(moyenne(eleves.moyenne), 1)}} / 20', symbol: 'trophee' },
      { label: 'Meilleure moyenne', value: '{{max(eleves.moyenne)}} / 20', symbol: 'etoile' },
    ],
    style: 'pastel',
  }),
  gestion({
    id: 'tickets',
    name: 'Support client',
    description: 'Les demandes des clients : sujet, priorité, statut et date d’ouverture, comme dans un outil d’assistance.',
    accent: '#ea580c',
    collection: 'tickets',
    fields: [text('sujet', 'Sujet'), text('client', 'Client'), text('priorite', 'Priorité'), text('statut', 'Statut'), date('ouvert', 'Ouvert le')],
    rows: [
      { sujet: 'Impossible de me connecter', client: 'Nadia K.', priorite: 'Haute', statut: 'En cours', ouvert: '2026-10-09' },
      { sujet: 'Facture en double', client: 'Studio Nord', priorite: 'Moyenne', statut: 'Nouveau', ouvert: '2026-10-10' },
      { sujet: 'Changer mon adresse', client: 'Hugo Petit', priorite: 'Basse', statut: 'Résolu', ouvert: '2026-10-02' },
    ],
    intro: 'Enregistre chaque demande, et cherche-la par client ou par statut dans le tableau.',
    stats: [
      { label: 'Demandes', value: '{{nombre(tickets)}}', symbol: 'message' },
      { label: 'Délai de réponse', value: '4 h', delta: 'objectif : 8 h', symbol: 'horloge' },
    ],
    extra: [{ type: 'kanban', props: { columns: 'Nouveau : Facture en double\nEn cours : Impossible de me connecter\nRésolu : Changer mon adresse' } }],
    style: 'utilitaire',
  }),
  gestion({
    id: 'recrutement',
    name: 'Recrutement',
    description: 'Les candidatures à un poste : étape de l’entretien, note sur 5 et date du prochain rendez-vous.',
    accent: '#4f46e5',
    collection: 'candidats',
    fields: [text('nom', 'Candidat'), text('poste', 'Poste'), text('etape', 'Étape'), num('note', 'Note (sur 5)'), date('rendezvous', 'Prochain rendez-vous')],
    rows: [
      { nom: 'Alice Moreau', poste: 'Développeuse', etape: 'Entretien technique', note: 4, rendezvous: '2026-10-15' },
      { nom: 'Karim Haddad', poste: 'Développeur', etape: 'Premier appel', note: 3, rendezvous: '2026-10-13' },
      { nom: 'Julie Faure', poste: 'Designer', etape: 'Offre envoyée', note: 5, rendezvous: '2026-10-20' },
    ],
    intro: 'Suis chaque candidature, de l’appel à l’offre.',
    stats: [
      { label: 'Candidatures', value: '{{nombre(candidats)}}', symbol: 'personne' },
      { label: 'Note moyenne', value: '{{arrondi(moyenne(candidats.note), 1)}} / 5', symbol: 'etoile' },
    ],
    extra: [{ type: 'kanban', props: { columns: 'Premier appel : Karim Haddad\nEntretien technique : Alice Moreau\nOffre envoyée : Julie Faure' } }],
    style: 'pro-sobre',
  }),
  gestion({
    id: 'flotte',
    name: 'Flotte de véhicules',
    description: 'Les véhicules d’une entreprise : kilométrage, prochain entretien et coût, pour ne rien oublier.',
    accent: '#475569',
    collection: 'vehicules',
    fields: [text('immatriculation', 'Immatriculation'), text('modele', 'Modèle'), num('kilometres', 'Kilomètres'), date('entretien', 'Prochain entretien'), num('cout', 'Coût annuel (€)')],
    rows: [
      { immatriculation: 'GH-482-KT', modele: 'Utilitaire électrique', kilometres: 38200, entretien: '2026-11-04', cout: 1450 },
      { immatriculation: 'FB-117-QA', modele: 'Citadine', kilometres: 61500, entretien: '2026-10-22', cout: 980 },
    ],
    intro: 'Ajoute un véhicule et la date de son prochain entretien.',
    stats: [
      { label: 'Véhicules', value: '{{nombre(vehicules)}}', symbol: 'velo' },
      { label: 'Kilomètres', value: '{{somme(vehicules.kilometres)}} km', symbol: 'lieu' },
      { label: 'Coût annuel', value: '{{somme(vehicules.cout)}} €', symbol: 'paiement' },
    ],
    style: 'chrome',
  }),
  gestion({
    id: 'salle-sport',
    name: 'Salle de sport',
    description: 'Les membres d’une salle de sport ou d’un club : formule, date d’inscription et revenu mensuel.',
    accent: '#16a34a',
    collection: 'membres',
    fields: [text('nom', 'Membre'), text('formule', 'Formule'), date('debut', 'Inscrit le'), num('mensualite', 'Mensualité (€)'), yes('actif', 'Actif')],
    rows: [
      { nom: 'Sofia L.', formule: 'Illimitée', debut: '2026-01-10', mensualite: 39, actif: true },
      { nom: 'Marc D.', formule: 'Matin', debut: '2025-09-02', mensualite: 25, actif: true },
      { nom: 'Emma T.', formule: 'Étudiante', debut: '2026-09-15', mensualite: 19, actif: false },
    ],
    intro: 'Inscris un membre et sa formule : le revenu du mois suit.',
    stats: [
      { label: 'Membres', value: '{{nombre(membres)}}', symbol: 'groupe' },
      { label: 'Revenu mensuel', value: '{{somme(membres.mensualite)}} €', symbol: 'paiement' },
    ],
    style: 'nuit-jaune',
  }),
  gestion({
    id: 'recettes',
    name: 'Carnet de recettes',
    description: 'Tes recettes de cuisine : catégorie, temps de préparation et nombre de parts.',
    accent: '#d97706',
    collection: 'recettes',
    fields: [text('titre', 'Recette'), text('categorie', 'Catégorie'), num('minutes', 'Préparation (min)'), num('parts', 'Parts'), { name: 'photo', label: 'Photo', type: 'image' }],
    rows: [
      { titre: 'Tarte aux pommes', categorie: 'Dessert', minutes: 45, parts: 8, photo: '' },
      { titre: 'Soupe de potiron', categorie: 'Entrée', minutes: 30, parts: 4, photo: '' },
      { titre: 'Risotto aux champignons', categorie: 'Plat', minutes: 40, parts: 4, photo: '' },
    ],
    intro: 'Ajoute une recette, puis cherche par catégorie dans le tableau.',
    stats: [
      { label: 'Recettes', value: '{{nombre(recettes)}}', symbol: 'repas' },
      { label: 'La plus rapide', value: '{{min(recettes.minutes)}} min', symbol: 'horloge' },
    ],
    style: 'pate-a-modeler',
  }),
  gestion({
    id: 'inventaire',
    name: 'Inventaire du matériel',
    description: 'Le matériel d’une école, d’un club ou d’un bureau : où il est, dans quel état, et ce qu’il vaut.',
    accent: '#0d9488',
    collection: 'materiel',
    fields: [text('objet', 'Objet'), text('salle', 'Salle'), text('etat', 'État'), num('valeur', 'Valeur (€)')],
    rows: [
      { objet: 'Vidéoprojecteur', salle: 'Salle 12', etat: 'Bon', valeur: 420 },
      { objet: 'Ordinateur portable', salle: 'Bureau', etat: 'À réparer', valeur: 850 },
      { objet: 'Imprimante 3D', salle: 'Atelier', etat: 'Neuf', valeur: 690 },
    ],
    intro: 'Note chaque objet et son état ; la valeur totale du parc se calcule toute seule.',
    stats: [
      { label: 'Objets', value: '{{nombre(materiel)}}', symbol: 'reglages' },
      { label: 'Valeur du parc', value: '{{somme(materiel.valeur)}} €', symbol: 'paiement' },
    ],
    style: 'bento',
  }),
  gestion({
    id: 'heures',
    name: 'Suivi des heures',
    description: 'Le temps passé sur chaque projet et le montant à facturer, pour un indépendant ou une petite équipe.',
    accent: '#2563eb',
    collection: 'heures',
    fields: [text('projet', 'Projet'), date('jour', 'Date'), num('duree', 'Heures'), num('taux', 'Taux horaire (€)'), calc('montant', 'Montant (€)', 'duree * taux')],
    rows: [
      { projet: 'Site de la boulangerie', jour: '2026-10-06', duree: 3.5, taux: 45 },
      { projet: 'Logo Studio Nord', jour: '2026-10-07', duree: 2, taux: 50 },
      { projet: 'Site de la boulangerie', jour: '2026-10-09', duree: 4, taux: 45 },
    ],
    intro: 'Note tes heures : le montant de chaque ligne et le total à facturer se calculent tout seuls.',
    stats: [
      { label: 'Heures', value: '{{somme(heures.duree)}} h', symbol: 'horloge' },
      { label: 'À facturer', value: '{{somme(heures.montant)}} €', symbol: 'paiement' },
    ],
    style: 'terminal',
  }),
  gestion({
    id: 'inscriptions',
    name: 'Inscriptions à un événement',
    description: 'Les inscrits à un atelier ou une fête : atelier choisi, nombre de places et paiement reçu.',
    accent: '#db2777',
    collection: 'inscrits',
    fields: [text('nom', 'Nom'), text('email', 'E-mail'), text('atelier', 'Atelier'), num('places', 'Places'), yes('paye', 'Payé')],
    rows: [
      { nom: 'Lina B.', email: 'lina@exemple.fr', atelier: 'Poterie', places: 2, paye: true },
      { nom: 'Paul M.', email: 'paul@exemple.fr', atelier: 'Cuisine', places: 1, paye: false },
    ],
    intro: 'Chaque inscription réserve des places : le total est suivi en direct.',
    stats: [
      { label: 'Inscriptions', value: '{{nombre(inscrits)}}', symbol: 'email' },
      { label: 'Places réservées', value: '{{somme(inscrits.places)}} / 40', symbol: 'fete' },
    ],
    style: 'degrade-vif',
  }),
  gestion({
    id: 'dons',
    name: 'Dons d’une association',
    description: 'Les dons reçus par une association : donateur, montant, date et moyen de paiement.',
    accent: '#059669',
    collection: 'dons',
    fields: [text('donateur', 'Donateur'), num('montant', 'Montant (€)'), date('jour', 'Date'), text('moyen', 'Moyen de paiement')],
    rows: [
      { donateur: 'Marie R.', montant: 50, jour: '2026-10-03', moyen: 'Virement' },
      { donateur: 'Entreprise Lumen', montant: 500, jour: '2026-10-05', moyen: 'Chèque' },
      { donateur: 'Anonyme', montant: 20, jour: '2026-10-08', moyen: 'Espèces' },
    ],
    intro: 'Enregistre chaque don : le total collecté et le don moyen se calculent tout seuls.',
    stats: [
      { label: 'Collecté', value: '{{somme(dons.montant)}} €', delta: 'objectif : 2 000 €', symbol: 'coeur' },
      { label: 'Don moyen', value: '{{arrondi(moyenne(dons.montant), 0)}} €', symbol: 'cadeau' },
      { label: 'Donateurs', value: '{{nombre(dons)}}', symbol: 'groupe' },
    ],
    style: 'nature',
  }),
]
