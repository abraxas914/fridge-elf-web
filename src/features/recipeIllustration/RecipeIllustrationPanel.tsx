import { useEffect, useMemo, useState } from 'react'
import type { RecipeIllustrationPort } from '../../app/ports'
import { RECIPE_ILLUSTRATION_STYLES } from './styles'
import type {
  RecipeIllustrationJob,
  RecipeIllustrationJobPage,
  RecipeIllustrationRecipe,
  RecipeIllustrationStyleId,
} from './types'
import './RecipeIllustrationPanel.css'

interface RecipeIllustrationPanelProps {
  recipe: RecipeIllustrationRecipe
  managed: boolean
  illustration: RecipeIllustrationPort
  pollIntervalMs?: number
}

export function RecipeIllustrationPanel({
  recipe,
  managed,
  illustration,
  pollIntervalMs = 750,
}: RecipeIllustrationPanelProps) {
  const [styleId, setStyleId] =
    useState<RecipeIllustrationStyleId>('xiaohei')
  const [job, setJob] = useState<RecipeIllustrationJob | null>(null)
  const [resultPages, setResultPages] = useState<
    RecipeIllustrationJobPage[]
  >([])
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!job || !['queued', 'running'].includes(job.status)) return
    let active = true
    const timer = window.setTimeout(() => {
      void illustration
        .getJob(job.id)
        .then((next) => {
          if (active) {
            setJob(next)
            setResultPages((current) =>
              mergeResultPages(current, next.pages),
            )
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setError(
              cause instanceof Error
                ? cause.message
                : '暂时无法读取生成进度。',
            )
          }
        })
    }, pollIntervalMs)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [illustration, job, pollIntervalMs])

  const selectedStyle = useMemo(
    () =>
      RECIPE_ILLUSTRATION_STYLES.find(
        (style) => style.id === styleId,
      ) ?? RECIPE_ILLUSTRATION_STYLES[0],
    [styleId],
  )

  const start = async (pageIndexes?: number[]) => {
    setStarting(true)
    setError('')
    if (!pageIndexes) setResultPages([])
    try {
      const next = await illustration.start({
        contractVersion: 1,
        recipe,
        styleId,
        ...(pageIndexes ? { pageIndexes } : {}),
      })
      setJob(next)
      setResultPages((current) =>
        mergeResultPages(
          pageIndexes ? current : [],
          next.pages,
        ),
      )
      if (next.status === 'failed') {
        setError(next.error?.message || '图片生成失败，请重新尝试。')
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '图片生成失败，请重新尝试。',
      )
    } finally {
      setStarting(false)
    }
  }

  const running = job?.status === 'queued' || job?.status === 'running'

  return (
    <section
      aria-label="食谱插画"
      className="recipe-illustration-panel"
    >
      <div className="recipe-illustration-heading">
        <span>{managed ? 'MANAGED IMAGE2' : '4 STYLES'}</span>
        <b>生成食谱插画</b>
      </div>
      <fieldset
        className="recipe-style-grid"
        disabled={starting || running}
      >
        <legend>选择插画风格</legend>
        {RECIPE_ILLUSTRATION_STYLES.map((style) => (
          <label
            className={
              style.id === styleId ? 'recipe-style selected' : 'recipe-style'
            }
            key={style.id}
          >
            <input
              checked={style.id === styleId}
              name="recipe-illustration-style"
              type="radio"
              value={style.id}
              onChange={() => setStyleId(style.id)}
            />
            <span>{style.label}</span>
          </label>
        ))}
      </fieldset>

      {!job || job.status === 'failed' ? (
        <button
          className="recipe-illustration-primary"
          disabled={starting}
          type="button"
          onClick={() => void start()}
        >
          {starting
            ? '正在提交…'
            : job?.status === 'failed'
              ? '重新生成食谱插画'
              : '生成食谱插画'}
        </button>
      ) : null}

      {running ? (
        <div
          aria-live="polite"
          className="recipe-illustration-progress"
          role="status"
        >
          正在生成第 {Math.min(job.completedPages + 1, job.totalPages)}/
          {job.totalPages} 页
        </div>
      ) : null}

      {error ? (
        <div className="recipe-illustration-error" role="alert">
          {error}
        </div>
      ) : null}

      {resultPages.length ? (
        <div className="recipe-illustration-results">
          {resultPages.map((page) => (
            <figure key={page.index}>
              <img
                src={page.imageUrl}
                alt={`${recipe.title} · ${selectedStyle.label} · 第${page.index}页`}
              />
              <figcaption>
                <span>第 {page.index} 页</span>
                <a href={page.imageUrl} download={`${recipe.id}-${page.index}.png`}>
                  保存图片
                </a>
                <button
                  type="button"
                  onClick={() => void start([page.index])}
                >
                  重新生成第{page.index}页
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function mergeResultPages(
  current: RecipeIllustrationJobPage[],
  incoming: RecipeIllustrationJobPage[],
): RecipeIllustrationJobPage[] {
  const byIndex = new Map(
    current.map((page) => [page.index, page]),
  )
  incoming.forEach((page) => byIndex.set(page.index, page))
  return [...byIndex.values()].sort((a, b) => a.index - b.index)
}
