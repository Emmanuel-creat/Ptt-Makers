import { useEffect, useState } from 'react'

/** Largeur en dessous de laquelle l'éditeur passe en disposition mobile (un écran à la fois). */
export const MOBILE_QUERY = '(max-width: 820px)'

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}
