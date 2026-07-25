import { useState } from 'react'
import type { AudioCue } from '../../app/ports'
import type { AppTab } from '../../app/types'
import { FOOD_SVGS } from '../../catalog/foodCatalog'
import { PixelIcon, svgDataUrl } from '../../catalog/pixelIcons'
import { RECIPES } from '../../fixtures/goldenFixture'
import './RecipeScene.css'

export type Recipe = (typeof RECIPES)[number]

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
        <img src={svgDataUrl(FOOD_SVGS[recipe.key])} alt="" aria-hidden="true" />
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
  onOpenRecipe: (recipe: Recipe) => void
  onOpenPlanner: () => void
  onOpenAi: () => void
  onOpenIllustration?: () => void
  onOpenAgent: (text: string) => void
  onSelectTab: (tab: AppTab) => void
  onToast: (message: string) => void
  onCue?: (cue: AudioCue) => void
}

export function RecipeScene(props: RecipeSceneProps) {
  const [question, setQuestion] = useState('今晚用番茄和鸡蛋能做什么？')
  const cue = props.onCue ?? (() => undefined)
  const tools = [
    { cls: 'a', icon: 'heart' as const, title: '个人收藏食谱', sub: 'FAVORITES', action: () => { cue('tick'); props.onToast('FAV · 已打开个人收藏食谱') } },
    { cls: 'b', icon: 'rice' as const, title: '饮食模式', sub: 'DIET MODE', action: () => { cue('tick'); props.onSelectTab('me'); props.onToast('DIET · 可在我的页面调整') } },
    { cls: 'c', icon: 'calendar' as const, title: '周规划', sub: 'MEAL PLAN', action: props.onOpenPlanner },
    { cls: 'd', icon: 'bot' as const, title: 'AI 食谱推荐', sub: 'FROM FRIDGE', action: props.onOpenAi },
    { cls: 'e', icon: 'rice' as const, title: '菜谱插画', sub: 'IMAGE2 · 4 STYLES', action: props.onOpenIllustration ?? (() => props.onToast('请使用 Web Preview 体验插画生成')) },
  ]

  return (
    <section
      className={`tab${props.active === false ? '' : ' active'}`}
      data-tab="recipe"
      data-testid="recipe-scene"
      hidden={props.active === false}
    >
      <div className="section-title"><span className="en">RECIPE LAB</span><span className="cn">食谱工坊</span><span className="badge">LOCAL PREVIEW</span></div>
      <div className="recipe-tool-grid">
        {tools.map((tool) => (
          <button className={`action-btn recipe-tool ${tool.cls}`} type="button" key={tool.title} onClick={tool.action}>
            <PixelIcon name={tool.icon} className="pxi" />
            <span className="atitle">{tool.title}</span>
            <span className="asub">{tool.sub}</span>
          </button>
        ))}
      </div>
      <div className="section-title"><span className="en">TODAY</span><span className="cn">今日推荐</span><span className="badge">TAP MENU</span></div>
      <div className="recipe-strip">
        {RECIPES.map((recipe) => <RecipeMini recipe={recipe} key={recipe.id} onOpen={props.onOpenRecipe} />)}
      </div>
      <div className="section-title"><span className="en">CHAT BOT</span><span className="cn">语音问食谱</span></div>
      <div className="recipe-bot">
        <div className="recipe-bot-head">
          <div className="recipe-bot-avatar"><PixelIcon name="bot" className="pxi" /></div>
          <div><div className="recipe-bot-title">Recipe Agent</div><div className="recipe-bot-sub">ASK BY VOICE · 根据冰箱库存回答</div></div>
        </div>
        <div className="recipe-bot-row">
          <input className="recipe-bot-input" value={question} onChange={(event) => setQuestion(event.target.value)} />
          <button className="recipe-voice-btn" type="button" onClick={() => props.onOpenAgent(question.trim() || '今晚吃什么？')}>
            <PixelIcon name="mic" className="pxi" />语音
          </button>
        </div>
      </div>
    </section>
  )
}
