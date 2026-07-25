import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { getRecipeShowcaseIndex } from './recipeShowcaseMotion'
import { recipeShowcase } from './recipeShowcase'
import './RecipeShowcase.css'

const getRetinaSource = (source: string) =>
  source.replace(/\.webp$/, '@2x.webp')

const prefersStaticShowcase = () => {
  if (typeof window.matchMedia !== 'function') return false
  return (
    window.matchMedia('(max-width: 800px)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function RecipeShowcase({
  onOpenDemo,
}: {
  onOpenDemo?: () => void
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const [activeIndex, setActiveIndex] = useState(1)

  useEffect(() => {
    const section = sectionRef.current
    if (!section || prefersStaticShowcase()) return

    const scrollRoot = section.closest<HTMLElement>('.landing-page')
    const scrollTarget: HTMLElement | Window = scrollRoot ?? window
    let animationFrame = 0

    const updateActiveImage = () => {
      animationFrame = 0
      const rectangle = section.getBoundingClientRect()
      const scrollRange = Math.max(1, rectangle.height - window.innerHeight)
      const progress = Math.min(1, Math.max(0, -rectangle.top / scrollRange))
      setActiveIndex(getRecipeShowcaseIndex(progress))
    }

    const scheduleUpdate = () => {
      if (animationFrame) return
      animationFrame = window.requestAnimationFrame(updateActiveImage)
    }

    scheduleUpdate()
    scrollTarget.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      scrollTarget.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  const openDemo = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpenDemo) return
    event.preventDefault()
    onOpenDemo()
  }

  const visualOrder = [
    activeIndex,
    ...recipeShowcase.images.map((_, index) => index).filter(
      (index) => index !== activeIndex,
    ),
  ]

  return (
    <section
      ref={sectionRef}
      className="recipe-showcase"
      aria-labelledby="recipe-showcase-title"
      data-active-index={activeIndex + 1}
    >
      <div className="recipe-showcase-stage">
        <div className="recipe-showcase-copy">
          <h2 id="recipe-showcase-title">把做饭这件事，画得更简单。</h2>
          <p>从食材到上桌，一眼看懂。</p>
          <a
            className="landing-button landing-button-primary"
            href="/demo"
            aria-label="开始制作"
            onClick={openDemo}
          >
            开始制作
            <span aria-hidden="true">→</span>
          </a>
          <div
            className="recipe-showcase-controls"
            role="group"
            aria-label="选择食谱插画示例"
          >
            {recipeShowcase.images.map((_, index) => (
              <button
                type="button"
                key={index}
                aria-label={`查看番茄炒蛋食谱插画示例 ${index + 1}`}
                aria-pressed={activeIndex === index}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>

        <div className="recipe-showcase-gallery">
          {recipeShowcase.images.map((source, index) => (
            <figure
              className="recipe-showcase-frame"
              data-active={activeIndex === index ? 'true' : 'false'}
              data-position={visualOrder.indexOf(index)}
              data-testid={`recipe-showcase-image-${index + 1}`}
              key={source}
            >
              <img
                src={source}
                srcSet={`${source} 600w, ${getRetinaSource(source)} 1200w`}
                sizes="(max-width: 800px) 78vw, 31vw"
                width="1200"
                height="1440"
                loading="lazy"
                decoding="async"
                alt={`番茄炒蛋食谱插画示例 ${index + 1}`}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
