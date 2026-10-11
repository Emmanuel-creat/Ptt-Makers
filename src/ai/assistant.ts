import type Anthropic from '@anthropic-ai/sdk'
import { STYLE_PRESETS } from '../model/styles'
import type { Project } from '../model/types'
import { brickCatalog, PROJECT_SCHEMA, projectToAi, type AiProject } from './format'

/**
 * Assistant IA de la version Pro.
 * Deux façons de se connecter :
 * - une clé personnelle Anthropic, gardée dans ce navigateur et envoyée directement à l'API ;
 * - un serveur relais (voir serveur-ia/), qui garde la clé de son côté.
 */

export const MODEL = 'claude-opus-5-5'

export interface AiSettings {
  /** Clé personnelle (sk-ant-…), gardée seulement dans ce navigateur. */
  apiKey: string
  /** Adresse d'un serveur relais ; s'il est rempli, la clé n'est pas utilisée. */
  proxyUrl: string
}

const SETTINGS_KEY = 'ptt-makers:ia'

export function readSettings(): AiSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<AiSettings>
    return { apiKey: raw.apiKey ?? '', proxyUrl: raw.proxyUrl ?? '' }
  } catch {
    return { apiKey: '', proxyUrl: '' }
  }
}

export function writeSettings(s: AiSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* stockage bloqué */
  }
}

export const isConfigured = (s: AiSettings) => !!(s.proxyUrl.trim() || s.apiKey.trim())

async function client(s: AiSettings): Promise<Anthropic> {
  // Le SDK n'est chargé qu'à la première utilisation de l'assistant.
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const proxy = s.proxyUrl.trim().replace(/\/+$/, '')
  return new Anthropic({
    // Avec un relais, c'est lui qui ajoute la vraie clé.
    apiKey: proxy ? 'relais' : s.apiKey.trim(),
    baseURL: proxy || undefined,
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  })
}

/** Message d'erreur compréhensible pour l'utilisateur. */
export async function describeError(error: unknown): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  if (error instanceof Anthropic.AuthenticationError) return 'La clé est refusée : vérifie-la dans les réglages de l’assistant.'
  if (error instanceof Anthropic.PermissionDeniedError) return 'Cette clé n’a pas accès à ce modèle.'
  if (error instanceof Anthropic.RateLimitError) return 'Trop de demandes en peu de temps : réessaie dans un instant.'
  if (error instanceof Anthropic.BadRequestError) return `Demande refusée par l’API : ${error.message}`
  if (error instanceof Anthropic.APIConnectionError) return 'Impossible de joindre l’API (connexion ou adresse du relais).'
  if (error instanceof Anthropic.APIError) return `Erreur de l’API (${error.status ?? '?'}) : ${error.message}`
  return error instanceof Error ? error.message : String(error)
}

const STYLE_LIST = STYLE_PRESETS.map((s) => `"${s.id}" (${s.name})`).join(', ')

const FORMAT_RULES = `Tu construis des applications pour Ptt-Makers, un atelier visuel en français. Tu réponds avec un projet au format JSON demandé.

Règles du format :
- pages : la première est la page d'accueil. "ref" est un identifiant court et unique (ex. "accueil", "contact").
- bricks : liste à plat. "parent" vaut la ref d'une page ou d'une brique conteneur. L'ordre de la liste est l'ordre d'affichage.
- props et style sont des listes clé / valeur (valeurs en texte). Styles : direction (row|column), gap, padding, margin, borderRadius, borderWidth, fontSize, opacity (nombres en px, opacity de 0 à 1), align et justify (start|center|end|stretch|between), wrap (true|false), width, maxWidth, height (ex. "100%", "480px"), background, color, borderColor (couleurs #rrggbb), shadow (none|sm|md|lg), fontWeight (400 à 800), textAlign (left|center|right).
- Variables : noms simples sans accents (ex. "score", "taches"). Type list : valeurs de départ une par ligne. Type collection (une base de données de fiches) : valeur de départ en JSON, {"champs": [{"name": "nom", "label": "Nom", "type": "text"}, {"name": "prix", "label": "Prix", "type": "number"}], "fiches": [{"nom": "Café", "prix": 2.5}], "garder": true} ; types de champ : text, number, date (aaaa-mm-jj), boolean, image, link ; "garder" garde les données dans le navigateur. Une brique table avec la propriété source = nom de la collection l'affiche et se met à jour toute seule (rowDelete = true ajoute un bouton Supprimer par ligne).
- Un texte affiche une variable avec {{nom}}. Dans une répétition (repeat), {{element}}, {{element.champ}} et {{position}} désignent l'élément copié.
- Champs (input, textarea, select, checkbox) : la propriété "bind" relie le champ à une variable.
- Actions (onClick des briques, onLoad des pages) : remplis seulement les champs utiles à leur type, laisse les autres vides ("" ou 0, listes vides).
  set (variable, value), add (variable, amount), toggleVar (variable), show/hide/toggle/scrollTo (target = ref d'une brique), alert (message), openUrl (url), navigate (page = ref d'une page), listAdd (variable, value), listRemove (variable, which = current|first|last ; current = l'élément de la copie cliquée), listClear (variable), addRecord (variable = une collection, value = les valeurs de la nouvelle fiche en JSON, ex. {"nom": "{{nom_saisi}}", "prix": "{{prix_saisi}}"}), fetch (url d'une API JSON en https, variable, path facultatif vers les données), if (variable, op = true|false|eq|neq|gt|lt|empty|notEmpty, value, then, else).
- Disposition des pages : "pile" (les briques s'empilent, par défaut) ou "grille" (placement libre : 12 colonnes et des rangées de 40 px). Sur une page en grille, donne à chaque brique posée directement sur la page sa case "place" (col de 1 à 12, row à partir de 1, w en colonnes, h en rangées), sans chevauchement. Partout ailleurs, place vaut 0 partout.
- Onglets (tabs) et accordéon (accordion) : chaque enfant est une colonne (stack) ; son "name" devient le titre de l'onglet ou de la question.
- Fenêtre (modal) : cachée au départ ; un bouton l'ouvre avec l'action show. Barre de menu (navbar) : affiche toute seule un lien par page.
- Lien vers une page : brique link avec la propriété page = ref de la page.
- Style du projet (theme.style) : choisis le style qui convient le mieux parmi ${STYLE_LIST}. Quand un style est choisi, ne donne pas de couleur de fond, de texte, de bordure ni d'ombre aux briques : elles suivent le style. Laisse primary vide sauf si l'utilisateur demande une couleur précise.
- Écris tous les textes visibles en français, avec du vrai contenu (pas de « Lorem ipsum »). Pas de tiret cadratin, et aucun emoji dans les textes : pour illustrer, ajoute une brique icon (propriété symbol = nom d'une icône de la liste).
- "summary" : deux ou trois phrases simples qui expliquent ce que tu as construit.

Briques disponibles :
${brickCatalog()}`

async function requestProject(s: AiSettings, content: string, onProgress?: (chars: number) => void): Promise<AiProject> {
  const api = await client(s)
  const stream = api.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: { type: 'json_schema', schema: PROJECT_SCHEMA } },
    system: FORMAT_RULES,
    messages: [{ role: 'user', content }],
  })
  let chars = 0
  stream.on('text', (delta) => {
    chars += delta.length
    onProgress?.(chars)
  })
  const message = await stream.finalMessage()
  if (message.stop_reason === 'refusal') throw new Error('L’IA a refusé cette demande. Essaie de la reformuler.')
  if (message.stop_reason === 'max_tokens') throw new Error('Le projet demandé est trop grand pour une seule réponse. Découpe ta demande.')
  const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  try {
    return JSON.parse(text) as AiProject
  } catch {
    throw new Error('La réponse de l’IA est incomplète. Réessaie.')
  }
}

/** Crée une application complète à partir d'une description. */
export function generateProject(s: AiSettings, description: string, onProgress?: (chars: number) => void) {
  return requestProject(s, `Crée cette application :\n\n${description}`, onProgress)
}

/** Modifie le projet ouvert selon une consigne ; renvoie le projet complet mis à jour. */
export function modifyProject(s: AiSettings, project: Project, instruction: string, onProgress?: (chars: number) => void) {
  const current = JSON.stringify(projectToAi(project))
  return requestProject(
    s,
    `Voici le projet actuel :\n${current}\n\nModifie-le selon cette consigne, en gardant tout le reste tel quel (mêmes refs, mêmes textes) et renvoie le projet complet :\n\n${instruction}`,
    onProgress,
  )
}

/** Répond à une question sur le projet ou sur son code, en flux (le texte arrive au fur et à mesure). */
export async function explain(s: AiSettings, question: string, code: string, onText: (text: string) => void): Promise<string> {
  const api = await client(s)
  const stream = api.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system:
      'Tu es le professeur de Ptt-Makers, un atelier où l’on construit des applications avec des briques et où le code HTML, CSS et JavaScript s’écrit tout seul. Tu expliques en français, simplement, à quelqu’un qui débute. Réponses courtes, avec de petits extraits de code quand c’est utile. Si on te demande de corriger, dis précisément quoi changer dans Ptt-Makers (quelle brique, quel réglage). Pas de tiret cadratin ni d’emoji.',
    messages: [{ role: 'user', content: `Code actuel du projet :\n\n${code}\n\nQuestion : ${question}` }],
  })
  let all = ''
  stream.on('text', (delta) => {
    all += delta
    onText(all)
  })
  const message = await stream.finalMessage()
  if (message.stop_reason === 'refusal') throw new Error('L’IA a refusé de répondre à cette question.')
  return all
}
