// Serveur relais de l'assistant IA de Ptt-Makers (Cloudflare Worker).
// Il garde la clé API côté serveur : les élèves d'une classe ou les membres d'un club
// utilisent l'assistant sans avoir chacun leur propre clé.
//
// Variables à régler dans Cloudflare :
//   ANTHROPIC_API_KEY  (secret)  la clé de l'API Anthropic
//   ORIGINES_AUTORISEES          adresses qui ont le droit d'utiliser le relais, séparées par des virgules
//                                (ex. https://emmanuel-creat.github.io)

const API = 'https://api.anthropic.com'
const MODELE = 'claude-opus-5-5'
const MAX_TOKENS = 64000
// Seuls les en-têtes utiles sont transmis à l'API ; la clé vient toujours du serveur.
const ENTETES_TRANSMIS = ['content-type', 'anthropic-version', 'anthropic-beta', 'accept']

function cors(origine) {
  return {
    'access-control-allow-origin': origine,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': '*',
    'access-control-max-age': '86400',
    vary: 'origin',
  }
}

export default {
  async fetch(requete, env) {
    const origine = requete.headers.get('origin') ?? ''
    const autorisees = (env.ORIGINES_AUTORISEES ?? '').split(',').map((o) => o.trim()).filter(Boolean)
    if (!autorisees.includes(origine)) return new Response('Origine non autorisée', { status: 403 })
    if (requete.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origine) })

    const url = new URL(requete.url)
    if (requete.method !== 'POST' || url.pathname !== '/v1/messages') {
      return new Response('Seul POST /v1/messages est relayé', { status: 404, headers: cors(origine) })
    }

    // Le relais impose le modèle et une taille de réponse maximale.
    let corps
    try {
      corps = await requete.json()
    } catch {
      return new Response('Corps JSON invalide', { status: 400, headers: cors(origine) })
    }
    corps.model = MODELE
    corps.max_tokens = Math.min(Number(corps.max_tokens) || MAX_TOKENS, MAX_TOKENS)

    const entetes = new Headers({ 'x-api-key': env.ANTHROPIC_API_KEY })
    for (const nom of ENTETES_TRANSMIS) {
      const valeur = requete.headers.get(nom)
      if (valeur) entetes.set(nom, valeur)
    }

    const reponse = await fetch(`${API}/v1/messages${url.search}`, { method: 'POST', headers: entetes, body: JSON.stringify(corps) })
    // La réponse (y compris en flux) est renvoyée telle quelle, avec les en-têtes CORS.
    const sortie = new Headers(reponse.headers)
    for (const [nom, valeur] of Object.entries(cors(origine))) sortie.set(nom, valeur)
    return new Response(reponse.body, { status: reponse.status, headers: sortie })
  },
}
