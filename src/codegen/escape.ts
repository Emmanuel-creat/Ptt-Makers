export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Échappe un morceau de texte pour l'insérer dans un gabarit JavaScript `…`. */
export function escapeTemplate(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

/** Liens : seuls http(s), mailto, tel et les ancres internes sont acceptés. */
export function safeHref(url: string): string {
  const t = String(url ?? '').trim()
  if (!t) return '#'
  if (/^(https?:|mailto:|tel:)/i.test(t) || t.startsWith('#')) return t
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(t)) return `https://${t}`
  return '#'
}

export function safeImageSrc(url: string): string | null {
  const t = String(url ?? '').trim()
  if (/^https?:\/\//i.test(t) || /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(t)) return t
  return null
}
