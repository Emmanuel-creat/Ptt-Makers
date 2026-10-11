import { useEffect, useState } from 'react'
import { useEditor } from '../store/editor'

/** Petit message temporaire en bas de l'écran. */
export function Toast() {
  const toast = useEditor((s) => s.toast)
  const [hiddenId, setHiddenId] = useState<number | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setHiddenId(toast.id), 2600)
    return () => clearTimeout(t)
  }, [toast])
  const visible = toast && toast.id !== hiddenId
  return (
    <div className="pm-toast-zone" role="status" aria-live="polite">
      {visible && (
        <div className="pm-toast" key={toast.id}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
