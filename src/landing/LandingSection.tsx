import type { ReactNode } from 'react'
import { useLandingReveal } from './useLandingReveal'

export function LandingSection({
  id,
  className = '',
  labelledBy,
  children,
  snap = false,
}: {
  id?: string
  className?: string
  labelledBy: string
  children: ReactNode
  snap?: boolean
}) {
  const { revealRef, isVisible } = useLandingReveal<HTMLElement>()

  return (
    <section
      ref={revealRef}
      id={id}
      className={`landing-reveal ${className}`.trim()}
      aria-labelledby={labelledBy}
      data-visible={isVisible}
      data-snap={snap || undefined}
    >
      {children}
    </section>
  )
}
