# Serveur relais de l'assistant IA

L'assistant IA de Ptt-Makers (version Pro) peut fonctionner de deux façons :

1. **Clé personnelle** : chacun colle sa clé API Anthropic dans les réglages de l'assistant. Elle reste dans son navigateur. Rien à installer.
2. **Serveur relais** (ce dossier) : la clé est rangée sur un petit serveur gratuit Cloudflare. Les utilisateurs n'ont qu'à coller l'adresse du relais. Pratique pour une classe ou un club.

## Mise en place (une fois)

1. Crée un compte gratuit sur [Cloudflare](https://dash.cloudflare.com/sign-up) et une clé API sur [console.anthropic.com](https://console.anthropic.com/settings/keys).
2. Dans ce dossier :

   ```bash
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY   # colle ta clé quand elle est demandée
   npx wrangler deploy
   ```

3. Wrangler affiche l'adresse du relais, par exemple `https://ptt-makers-ia.mon-compte.workers.dev`.
4. Dans Ptt-Makers : **Assistant IA** > **Réglages** > « adresse de ton serveur relais », puis **Enregistrer**.

## Sécurité

- Seules les adresses listées dans `ORIGINES_AUTORISEES` (fichier `wrangler.toml`) peuvent utiliser le relais. Ajoute la tienne si tu héberges Ptt-Makers ailleurs.
- Le relais n'accepte que `POST /v1/messages`, impose le modèle `claude-opus-5-5` et limite la taille des réponses.
- La clé n'est jamais envoyée au navigateur. Tout le monde peut cependant utiliser le relais depuis une origine autorisée : surveille ta consommation dans la console Anthropic et fixe-y une limite de dépense.
