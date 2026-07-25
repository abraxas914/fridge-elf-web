import { useEffect, useRef, useState, type RefObject } from 'react'

export function useLandingReveal<T extends HTMLElement>(): {
  revealRef: RefObject<T | null>
  isVisible: boolean
} {
  const revealRef = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const element = revealRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsVisible(true)
        observer.disconnect()
      },
      { threshold: 0.18 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { revealRef, isVisible }
}
