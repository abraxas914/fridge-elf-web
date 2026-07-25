import { useEffect, useRef, useState } from 'react'
import {
  compileRecipePlan,
  createRecipeIllustrationRequestV1,
  ILLUSTRATION_STYLES,
  type IllustrationStyleId,
} from '../../illustration/recipePlan'
import './IllustrationModal.css'

interface IllustrationResult {
  page: number
  totalPages: number
  title: string
  url: string
}

interface IllustrationModalProps {
  defaultRecipeText: string
  demoToken: string
  fetcher?: typeof fetch
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string }
    }
    return payload.error?.message ?? '图片生成失败'
  } catch {
    return '图片生成失败'
  }
}

export function IllustrationModal({
  defaultRecipeText,
  demoToken,
  fetcher = fetch,
}: IllustrationModalProps) {
  const [recipeText, setRecipeText] = useState(defaultRecipeText)
  const [style, setStyle] = useState<IllustrationStyleId>('xiaohei')
  const [results, setResults] = useState<IllustrationResult[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const objectUrls = useRef<string[]>([])

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const generate = async () => {
    setError('')
    let plan
    try {
      plan = compileRecipePlan(recipeText)
    } catch (parseError) {
      setError(
        parseError instanceof Error ? parseError.message : '无法解析食谱',
      )
      return
    }

    results.forEach((result) => URL.revokeObjectURL(result.url))
    objectUrls.current = []
    setResults([])
    setGenerating(true)
    try {
      for (let page = 1; page <= plan.pages.length; page += 1) {
        setStatus(`正在生成第 ${page}/${plan.pages.length} 页…`)
        const response = await fetcher('/api/illustrate', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-demo-token': demoToken,
          },
          body: JSON.stringify(
            createRecipeIllustrationRequestV1(
              plan,
              style,
              [page],
              'web-preview-recipe',
            ),
          ),
        })
        if (!response.ok) throw new Error(await readError(response))
        if (response.headers.get('content-type') !== 'image/png') {
          throw new Error('图片服务返回了未知格式')
        }
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        objectUrls.current.push(url)
        const result = {
          page,
          totalPages: plan.pages.length,
          title: plan.title,
          url,
        }
        setResults((current) => [...current, result])
      }
      setStatus(`已生成 ${plan.pages.length} 页 · 1200×1440`)
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : '图片生成失败',
      )
      setStatus('')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="illustration-flow">
      <div className="preview-strip">LIVE IMAGE2 · SERVER-SIDE KEY</div>
      <p className="illustration-intro">
        粘贴含「菜名 / 食材 / 编号步骤」的中文食谱。超过 6 步会自动逐页生成。
      </p>

      {!demoToken && (
        <div className="illustration-alert" role="alert">
          演示链接无效或已过期，请重新扫码进入。
        </div>
      )}

      <div className="illustration-label">选择插画风格</div>
      <div className="illustration-styles">
        {ILLUSTRATION_STYLES.map((item) => (
          <button
            className={`illustration-style${style === item.id ? ' selected' : ''}`}
            type="button"
            aria-pressed={style === item.id}
            key={item.id}
            onClick={() => setStyle(item.id)}
          >
            <span className="illustration-style-name">{item.name}</span>
            <span className="illustration-style-en">{item.englishName}</span>
            <span className="illustration-style-desc">{item.description}</span>
          </button>
        ))}
      </div>

      <label className="illustration-label" htmlFor="illustration-recipe">
        中文食谱
      </label>
      <textarea
        id="illustration-recipe"
        className="illustration-textarea"
        value={recipeText}
        maxLength={4_000}
        onChange={(event) => setRecipeText(event.target.value)}
      />
      <div className="illustration-count">{recipeText.length} / 4000</div>

      <button
        className="illustration-generate"
        type="button"
        disabled={!demoToken || generating}
        onClick={() => void generate()}
      >
        {generating ? '正在生成…' : '生成插画'}
      </button>
      {status && (
        <div className="illustration-status" role="status">
          {status}
        </div>
      )}
      {error && (
        <div className="illustration-alert" role="alert">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="illustration-results" aria-live="polite">
          {results.map((result) => (
            <figure className="illustration-result" key={result.page}>
              <img
                src={result.url}
                alt={`${result.title} · 第 ${result.page} 页`}
              />
              <figcaption>
                <span>
                  PAGE {result.page}/{result.totalPages}
                </span>
                <a
                  href={result.url}
                  download={`recipe-${style}-${String(result.page).padStart(2, '0')}.png`}
                >
                  下载 PNG
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
