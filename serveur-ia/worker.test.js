// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from './worker.js'

const env = { ANTHROPIC_API_KEY: 'sk-ant-serveur', ORIGINES_AUTORISEES: 'https://emmanuel-creat.github.io' }
const post = (body, origin = 'https://emmanuel-creat.github.io', path = '/v1/messages?beta=true') =>
  new Request(`https://relais.exemple${path}`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', 'x-api-key': 'relais', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  })

afterEach(() => vi.unstubAllGlobals())

describe('serveur relais', () => {
  it('ajoute la vraie clé, impose le modèle et renvoie la réponse avec CORS', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await worker.fetch(post({ model: 'autre', max_tokens: 999999, messages: [] }), env)
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://emmanuel-creat.github.io')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages?beta=true')
    expect(init.headers.get('x-api-key')).toBe('sk-ant-serveur')
    expect(init.headers.get('anthropic-version')).toBe('2023-06-01')
    expect(JSON.parse(init.body)).toMatchObject({ model: 'claude-opus-5-5', max_tokens: 64000 })
  })

  it('refuse les autres origines et les autres adresses', async () => {
    vi.stubGlobal('fetch', vi.fn())
    expect((await worker.fetch(post({}, 'https://pirate.exemple'), env)).status).toBe(403)
    expect((await worker.fetch(post({}, undefined, '/v1/models'), env)).status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })
})
