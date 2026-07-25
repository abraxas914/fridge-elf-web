import { useEffect, useRef, useState } from 'react'
import type { SpeechSession } from '../../app/ports'
import type { SavedRecipe } from '../../app/recipes'
import type { PlannerState } from '../../app/types'
import type { AssistantShoppingItem } from '../../bridge/types'
import {
  FOOD_SVGS,
  UNKNOWN_FOOD_SVG,
  foodCatalogEntries,
  type FoodKey,
} from '../../catalog/foodCatalog'
import { PixelIcon, svgDataUrl } from '../../catalog/pixelIcons'
import { SHOP_ITEMS } from '../../fixtures/goldenFixture'
import './ShoppingScene.css'

export type ShopItem = {
  id: string
  key: FoodKey | 'unknown'
  name: string
  reason: string
  quantity: string
  done: boolean
}

function keyForName(name: string): FoodKey | 'unknown' {
  const normalized = name.trim().toLocaleLowerCase('zh-CN')
  return foodCatalogEntries.find((entry) =>
    [entry.name, entry.englishName, ...(entry.aliases ?? [])].some(
      (candidate) => candidate.toLocaleLowerCase('zh-CN') === normalized,
    ),
  )?.key ?? 'unknown'
}

export function createShopItem(
  item: AssistantShoppingItem,
  source = '手动添加',
): ShopItem {
  return {
    id: `shop-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    key: keyForName(item.name),
    name: item.name.trim(),
    reason: item.reason.trim() || source,
    quantity: item.quantity.trim() || '1份',
    done: false,
  }
}

export const initialShopItems = (): ShopItem[] => {
  try {
    const saved = JSON.parse(localStorage.getItem('fridge-shopping-v1') ?? 'null')
    if (Array.isArray(saved)) return saved as ShopItem[]
  } catch {
    // Use the starter list when local data is unavailable.
  }
  return SHOP_ITEMS.map((item) => ({ ...item }))
}

interface ShoppingSceneProps {
  items?: ShopItem[]
  missingIngredients: readonly string[]
  planner?: PlannerState
  recipes?: readonly SavedRecipe[]
  onItemsChange?: (items: ShopItem[]) => void
  onVoiceStart?: () => SpeechSession<AssistantShoppingItem[]>
  onToast: (message: string) => void
}

export function ShoppingScene({
  items: controlledItems,
  missingIngredients,
  planner,
  recipes = [],
  onItemsChange,
  onVoiceStart,
  onToast,
}: ShoppingSceneProps) {
  const [fallbackItems, setFallbackItems] = useState(initialShopItems)
  const items = controlledItems ?? fallbackItems
  const changeItems = onItemsChange ?? setFallbackItems
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1份')
  const [listening, setListening] = useState(false)
  const speechSession = useRef<SpeechSession<AssistantShoppingItem[]> | null>(null)
  const left = items.filter((item) => !item.done).length

  useEffect(() => {
    localStorage.setItem('fridge-shopping-v1', JSON.stringify(items))
  }, [items])

  const addManual = () => {
    if (!name.trim()) {
      onToast('请输入要购买的食物')
      return
    }
    changeItems([
      ...items,
      createShopItem({ name, quantity, reason: '手动添加' }),
    ])
    setName('')
    setQuantity('1份')
    onToast('已加入采购清单')
  }

  return (
    <section className="tab active" data-tab="shop" data-testid="shop-scene">
      <div className="entry-composer shop-entry">
        <div className="entry-composer-head">
          <span className="entry-composer-icon">
            <PixelIcon name="mealbox" className="pxi" />
          </span>
          <div>
            <div className="entry-composer-title">添加采购项</div>
            <div className="entry-composer-subtitle">MANUAL + VOICE</div>
          </div>
        </div>
        <div className="entry-fields">
          <input value={name} placeholder="例如：五花肉" onChange={(event) => setName(event.target.value)} />
          <input value={quantity} aria-label="采购数量" onChange={(event) => setQuantity(event.target.value)} />
        </div>
        <div className="entry-actions">
          <button className="entry-action" type="button" aria-label="手动添加采购项" onClick={addManual}>
            <PixelIcon name="plus" className="pxi" />
            手动添加
          </button>
          <button
            className="entry-action voice"
            type="button"
            disabled={listening}
            onPointerDown={(event) => {
              if (listening) return
              event.currentTarget.setPointerCapture(event.pointerId)
              setListening(true)
              const session = onVoiceStart?.()
              if (!session) {
                setListening(false)
                onToast('请在手机 App 中使用语音添加')
                return
              }
              speechSession.current = session
              void session.result.then((spokenItems) => {
                changeItems([
                  ...items,
                  ...spokenItems.map((item) => createShopItem(item, '语音添加')),
                ])
                onToast(`语音添加 ${spokenItems.length} 项`)
              }).catch((error) => {
                onToast(error instanceof Error ? error.message : '语音添加失败')
              }).finally(() => {
                setListening(false)
                speechSession.current = null
              })
            }}
            onPointerUp={() => speechSession.current?.stop()}
            onPointerCancel={() => speechSession.current?.stop()}
            onContextMenu={(event) => event.preventDefault()}
            onClick={(event) => event.preventDefault()}
          >
            <PixelIcon name="mic" className="pxi" />
            {listening ? '松开发送' : '按住说话'}
          </button>
        </div>
      </div>

      <div className="section-title">
        <span className="en">TODAY</span><span className="cn">今天要买</span>
        <span className="badge">{left} 项</span>
      </div>
      <div className="shop-list-card">
        {items.length ? items.map((item, index) => (
          <div className={`shop-item${item.done ? ' done' : ''}`} key={item.id}>
            <button
              className="shop-check"
              type="button"
              aria-pressed={item.done}
              aria-label={`${item.done ? '恢复' : '完成'} ${item.name}`}
              onClick={() =>
                changeItems(items.map((candidate, candidateIndex) =>
                  candidateIndex === index ? { ...candidate, done: !candidate.done } : candidate,
                ))
              }
            >
              {item.done ? '✓' : ''}
            </button>
            <span className="shop-icon">
              <img
                src={svgDataUrl(item.key === 'unknown' ? UNKNOWN_FOOD_SVG : FOOD_SVGS[item.key])}
                alt=""
                aria-hidden="true"
              />
            </span>
            <span className="shop-name-wrap">
              <span className="shop-name">{item.name}</span>
              <span className="shop-reason">{item.reason}</span>
            </span>
            <span className="shop-qty">{item.quantity}</span>
            <button
              className="shop-remove"
              type="button"
              aria-label={`删除 ${item.name}`}
              onClick={() => changeItems(items.filter((_, candidateIndex) => candidateIndex !== index))}
            >
              ×
            </button>
          </div>
        )) : <p className="shop-empty">采购清单还是空的。</p>}
      </div>

      <div className="section-title">
        <span className="en">FROM PLANNER</span>
        <span className="cn">来自周食谱</span>
      </div>
      <div className="p-card planner-derived">
        {planner ? (
          <div className="shop-week-plan">
            {Object.entries(planner).flatMap(([day, meals]) => {
              const labels: Record<string, string> = {
                mon: '周一', tue: '周二', wed: '周三', thu: '周四',
                fri: '周五', sat: '周六', sun: '周日',
              }
              const mealLabels = {
                breakfast: '早餐',
                lunch: '午餐',
                dinner: '晚餐',
              }
              return Object.entries(meals).map(([meal, recipeId]) => {
                const recipe = recipes.find((value) => value.id === recipeId)
                return recipe ? (
                  <span key={`${day}-${meal}`}>
                    <b>{labels[day]} · {mealLabels[meal as keyof typeof mealLabels]}</b>
                    {recipe.cn}
                  </span>
                ) : null
              })
            })}
          </div>
        ) : null}
        {missingIngredients.length ? (
          <>
            <b>本周还需购买：</b><br />
            {missingIngredients.map((ingredient) => (
              <span key={ingredient}>• {ingredient}<br /></span>
            ))}
          </>
        ) : (
          <>还没有规划本周食谱。<br />去「食谱 · 周规划」加菜，购物清单会自动填充。</>
        )}
      </div>
    </section>
  )
}
