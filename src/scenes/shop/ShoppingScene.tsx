import { useState } from 'react'
import type { AudioCue } from '../../app/ports'
import { FOOD_SVGS } from '../../catalog/foodCatalog'
import { svgDataUrl } from '../../catalog/pixelIcons'
import { SHOP_ITEMS } from '../../fixtures/goldenFixture'
import './ShoppingScene.css'

type ShopItem = {
  id: string
  key: (typeof SHOP_ITEMS)[number]['key']
  name: string
  reason: string
  quantity: string
  done: boolean
}

interface ShoppingSceneProps {
  active?: boolean
  missingIngredients: readonly string[]
  onToast: (message: string) => void
  onCue?: (cue: AudioCue) => void
}

export function ShoppingScene({
  active = true,
  missingIngredients,
  onToast,
  onCue = () => undefined,
}: ShoppingSceneProps) {
  const [items, setItems] = useState<ShopItem[]>(() =>
    SHOP_ITEMS.map((item) => ({ ...item })),
  )
  const left = items.filter((item) => !item.done).length

  return (
    <section
      className={`tab${active ? ' active' : ''}`}
      data-tab="shop"
      data-testid="shop-scene"
      hidden={!active}
    >
      <div className="shop-summary">
        <div><h3>◆ 采购清单</h3><p>SHOPPING LIST · LOCAL PREVIEW</p></div>
        <button
          className="shop-gen-btn"
          type="button"
          onClick={() => {
            onCue('ding')
            onToast('SCAN · 已从冰箱缺货扫描重新生成')
          }}
        >
          ↻ 生成
        </button>
      </div>
      <div className="section-title">
        <span className="en">TODAY</span><span className="cn">今天要买</span>
        <span className="badge">{left} 项</span>
      </div>
      <div className="shop-list-card">
        {items.map((item, index) => (
          <button
            className={`shop-item${item.done ? ' done' : ''}`}
            type="button"
            aria-pressed={item.done}
            key={item.id}
            onClick={() => {
              onCue(item.done ? 'tick' : 'success')
              setItems((current) =>
                current.map((candidate, candidateIndex) =>
                  candidateIndex === index
                    ? { ...candidate, done: !candidate.done }
                    : candidate,
                ),
              )
            }}
          >
            <span className="shop-check">{item.done ? '✓' : ''}</span>
            <span className="shop-icon">
              <img
                src={svgDataUrl(FOOD_SVGS[item.key])}
                alt=""
                aria-hidden="true"
              />
            </span>
            <span className="shop-name-wrap">
              <span className="shop-name">{item.name}</span>
              <span className="shop-reason">{item.reason}</span>
            </span>
            <span className="shop-qty">{item.quantity}</span>
          </button>
        ))}
      </div>
      <div className="section-title">
        <span className="en">FROM PLANNER</span>
        <span className="cn">来自周菜谱</span>
      </div>
      <div className="p-card planner-derived">
        {missingIngredients.length ? (
          <>
            <b>本周还需购买：</b><br />
            {missingIngredients.map((ingredient) => (
              <span key={ingredient}>• {ingredient}<br /></span>
            ))}
          </>
        ) : (
          <>还没有规划本周菜谱。<br />去「食谱 · 周规划」加菜，购物清单会自动填充。</>
        )}
      </div>
    </section>
  )
}
