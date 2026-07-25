import { useRef, useState } from 'react'
import type { AudioCue, SpeechSession } from '../../app/ports'
import type { SavedRecipe } from '../../app/recipes'
import type { AppTab } from '../../app/types'
import { FOOD_SVGS } from '../../catalog/foodCatalog'
import { PixelIcon, svgDataUrl } from '../../catalog/pixelIcons'
import './RecipeScene.css'

export type Recipe = SavedRecipe

export function RecipeMini({
  recipe,
  label,
  onOpen,
}: {
  recipe: Recipe
  label?: string
  onOpen: (recipe: Recipe) => void
}) {
  return (
    <button className="recipe-mini" type="button" onClick={() => onOpen(recipe)}>
      <span className="recipe-mini-icon">
        {recipe.key === 'unknown' ? '🍽' : (
          <img src={svgDataUrl(FOOD_SVGS[recipe.key])} alt="" aria-hidden="true" />
        )}
      </span>
      <span className="recipe-mini-main">
        <span className="recipe-mini-cn">{recipe.cn}</span>
        <span className="recipe-mini-en">
          {recipe.name} · {label ?? (recipe.match ? 'FRIDGE MATCH' : 'NEED SHOP')}
        </span>
      </span>
      <span className="recipe-mini-meta">{recipe.time}M</span>
    </button>
  )
}

interface RecipeSceneProps {
  active?: boolean
  onOpenRecipe?: (recipe: Recipe) => void
  onOpenPlanner: () => void
  onOpenFavorites?: () => void
  onOpenAi?: () => void
  onOpenAgent: (text: string) => Promise<void>
  onSpeechStart?: () => SpeechSession<string>
  onSpeech?: () => Promise<string>
  onSelectTab?: (tab: AppTab) => void
  onToast: (message: string) => void
  onCue?: (cue: AudioCue) => void
}

export function RecipeScene(props: RecipeSceneProps) {
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [listening, setListening] = useState(false)
  const speechSession = useRef<SpeechSession<string> | null>(null)
  const tools = [
    { cls: 'a', icon: 'heart' as const, title: '个人收藏食谱', sub: 'FAVORITES', action: props.onOpenFavorites ?? (() => props.onToast('个人收藏食谱暂不可用')) },
    { cls: 'b', icon: 'bot' as const, title: '今日推荐', sub: 'AI PICKS', action: props.onOpenAi },
    { cls: 'c', icon: 'calendar' as const, title: '周规划', sub: 'MEAL PLAN', action: props.onOpenPlanner },
  ].filter(
    (tool): tool is typeof tool & { action: () => void } =>
      typeof tool.action === 'function',
  )

  return (
    <section className="tab active" data-tab="recipe" data-testid="recipe-scene">
      <div className="section-title"><span className="en">CHAT BOT</span><span className="cn">问冰箱 Agent</span></div>
      <div className="recipe-bot entry-composer">
        <div className="recipe-bot-head entry-composer-head">
          <div className="recipe-bot-avatar entry-composer-icon"><PixelIcon name="bot" className="pxi" /></div>
          <div><div className="recipe-bot-title entry-composer-title">问冰箱 Agent</div><div className="recipe-bot-sub entry-composer-subtitle">MANUAL + VOICE</div></div>
        </div>
        <textarea
          aria-label="向冰箱提问"
          className="recipe-bot-input"
          rows={3}
          value={question}
          placeholder="例如：今晚用番茄和鸡蛋能做什么？"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <div className="recipe-bot-actions entry-actions">
          <button
            className="recipe-ask-btn entry-action"
            type="button"
            disabled={asking}
            onClick={async () => {
              setAsking(true)
              try {
                if (!question.trim()) {
                  props.onToast('先输入想问的问题')
                  return
                }
                await props.onOpenAgent(question.trim())
              } finally {
                setAsking(false)
              }
            }}
          >
            <PixelIcon name="plus" className="pxi" />
            {asking ? '思考中' : '询问'}
          </button>
          <button
            className="recipe-voice-btn entry-action voice"
            type="button"
            disabled={listening || asking}
            aria-label="语音输入"
            onPointerDown={(event) => {
              if (listening || asking) return
              event.currentTarget.setPointerCapture(event.pointerId)
              setListening(true)
              const session = props.onSpeechStart?.()
              if (!session) {
                setListening(false)
                props.onToast('请在手机 App 中使用语音输入')
                return
              }
              speechSession.current = session
              void session.result.then(async (text) => {
                setQuestion(text)
                setAsking(true)
                await props.onOpenAgent(text)
              }).catch((error) => {
                props.onToast(error instanceof Error ? error.message : '语音识别失败')
              }).finally(() => {
                setListening(false)
                setAsking(false)
                speechSession.current = null
              })
            }}
            onPointerUp={() => speechSession.current?.stop()}
            onPointerCancel={() => speechSession.current?.stop()}
            onContextMenu={(event) => event.preventDefault()}
            onClick={async (event) => {
              event.preventDefault()
              if (!props.onSpeech || props.onSpeechStart) return
              setListening(true)
              try {
                const text = await props.onSpeech()
                setQuestion(text)
                await props.onOpenAgent(text)
              } finally {
                setListening(false)
              }
            }}
          >
            <PixelIcon name="mic" className="pxi" />{listening ? '松开发送' : '按住说话'}
          </button>
        </div>
      </div>
      <div className="section-title"><span className="en">RECIPE LAB</span><span className="cn">食谱工坊</span></div>
      <div className="recipe-tool-grid">
        {tools.map((tool) => (
          <button className={`action-btn recipe-tool ${tool.cls}`} type="button" key={tool.title} onClick={tool.action}>
            <PixelIcon name={tool.icon} className="pxi" />
            <span className="atitle">{tool.title}</span>
            <span className="asub">{tool.sub}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
