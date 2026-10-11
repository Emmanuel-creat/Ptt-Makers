import { parseProject } from '../model/templates'
import type { Project } from '../model/types'

/** Préfixe de l'adresse d'un projet partagé : …/#projet=… */
export const SHARE_PREFIX = '#projet='

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Response(bytes as BodyInit).body!.pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

const toBase64Url = (bytes: Uint8Array) => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text: string) => {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Compresse le projet pour le mettre dans une adresse (rien n'est envoyé sur un serveur). */
export async function encodeProject(project: Project): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(project))
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))
}

export async function decodeProject(data: string): Promise<Project | null> {
  try {
    const json = await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw'))
    return parseProject(JSON.parse(new TextDecoder().decode(json)))
  } catch {
    return null
  }
}

export async function shareUrl(project: Project, base = location.href): Promise<string> {
  return base.replace(/#.*$/, '') + SHARE_PREFIX + (await encodeProject(project))
}

/** Lit un projet partagé dans l'adresse de la page, puis retire celui-ci de l'adresse. */
export async function readSharedProject(): Promise<Project | null | undefined> {
  if (!location.hash.startsWith(SHARE_PREFIX)) return undefined
  const project = await decodeProject(location.hash.slice(SHARE_PREFIX.length))
  history.replaceState(null, '', location.pathname + location.search)
  return project
}
