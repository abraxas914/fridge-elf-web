import { useRef, useState } from 'react'
import type { SpeechSession } from '../../app/ports'
import type { PresentedFood } from '../../app/types'
import { PixelIcon } from '../../catalog/pixelIcons'
import { FoodCard } from './FoodCard'
import './FridgeScene.css'

type FilterCategory = 'all' | 'ingredient' | 'drink' | 'other'
type FreshnessFilter = 'all' | 'expiring' | 'urgent'

const filters: readonly { category: FilterCategory; label: string }[] = [
  { category: 'all', label: '✦ 全部' },
  { category: 'ingredient', label: '食材' },
  { category: 'drink', label: '饮品' },
  { category: 'other', label: '其他' },
]

interface FridgeSceneProps {
  items: readonly PresentedFood[]
  onOpenFood: (food: PresentedFood) => void
  onAddFood?: () => void
  onVoiceStart?: () => SpeechSession<number>
  onToast?: (message: string) => void
  connectionDetail?: string
}

export function FridgeScene({
  items,
  onOpenFood,
  onAddFood,
  onVoiceStart,
  onToast,
  connectionDetail,
}: FridgeSceneProps) {
  const [currentCategory, setCurrentCategory] =
    useState<FilterCategory>('all')
  const [freshnessFilter, setFreshnessFilter] =
    useState<FreshnessFilter>('all')
  const [listening, setListening] = useState(false)
  const speechSession = useRef<SpeechSession<number> | null>(null)
  const used = items.reduce((total, food) => total + food.batchCount, 0)
  const foodKinds = new Set(items.map((food) => food.name)).size
  const categoryItems =
    currentCategory === 'all'
      ? items
      : items.filter((food) => food.category === currentCategory)
  const visibleItems = categoryItems.filter((food) => {
    if (freshnessFilter === 'urgent') {
      return food.expiresInDays !== null && food.expiresInDays <= 1
    }
    if (freshnessFilter === 'expiring') {
      return (
        food.expiresInDays !== null &&
        food.expiresInDays > 1 &&
        food.expiresInDays <= 3
      )
    }
    return true
  })
  const expiring = items
    .filter(
      (food) =>
        food.expiresInDays !== null &&
        food.expiresInDays > 1 &&
        food.expiresInDays <= 3,
    )
    .reduce((total, food) => total + food.batchCount, 0)
  const urgent = items
    .filter(
      (food) =>
        food.expiresInDays !== null && food.expiresInDays <= 1,
    )
    .reduce((total, food) => total + food.batchCount, 0)
  const fresh = Math.max(0, used - expiring - urgent)

  return (
    <section
      className="tab active"
      data-tab="fridge"
      data-testid="fridge-scene"
    >
      {onAddFood ? (
        <div className="entry-composer inventory-entry">
          <div className="entry-composer-head">
            <span className="entry-composer-icon">
              <PixelIcon name="box" className="pxi" />
            </span>
            <div>
              <div className="entry-composer-title">添加库存食物</div>
              <div className="entry-composer-subtitle">MANUAL + VOICE</div>
            </div>
          </div>
          <div className="entry-sync-detail">
            {connectionDetail ?? '连接中'}
          </div>
          <div className="entry-actions">
            <button className="entry-action" type="button" onClick={onAddFood}>
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
                  onToast?.('请在手机 App 中使用语音添加')
                  return
                }
                speechSession.current = session
                void session.result.then((count) => {
                  onToast?.(`语音添加 ${count} 项食物`)
                }).catch((error) => {
                  onToast?.(
                    error instanceof Error ? error.message : '语音添加失败',
                  )
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
      ) : null}
      <div className="storage-wrap">
        <div className="storage-head">
          <div className="l">
            <PixelIcon name="box" className="icon pxi storage-px" />
            <span className="lbl">LIVE · 实时库存</span>
          </div>
          <div className="val">
            <span>{used}</span><span className="pct">批</span>
          </div>
        </div>
        <div className="inventory-health-bar" aria-label="库存新鲜度分布">
          <span className="fresh" style={{ flexGrow: fresh }} />
          <span className="expiring" style={{ flexGrow: expiring }} />
          <span className="urgent" style={{ flexGrow: urgent }} />
        </div>
        <div className="storage-tip ok">
          {foodKinds} 种食物 · {used} 个录入批次 · 无虚构容量上限
        </div>
      </div>
      <div className="fridge-stats">
        <button
          aria-pressed={freshnessFilter === 'all'}
          className={`stat-cell a${freshnessFilter === 'all' ? ' active' : ''}`}
          type="button"
          onClick={() => setFreshnessFilter('all')}
        >
          <span className="stat-num">{used}</span>
          <span className="stat-lbl">总食材</span>
        </button>
        <button
          aria-pressed={freshnessFilter === 'expiring'}
          className={`stat-cell b${freshnessFilter === 'expiring' ? ' active' : ''}`}
          type="button"
          onClick={() => setFreshnessFilter('expiring')}
        >
          <span className="stat-num">{expiring}</span>
          <span className="stat-lbl">将过期</span>
        </button>
        <button
          aria-pressed={freshnessFilter === 'urgent'}
          className={`stat-cell c${freshnessFilter === 'urgent' ? ' active' : ''}`}
          type="button"
          onClick={() => setFreshnessFilter('urgent')}
        >
          <span className="stat-num">{urgent}</span>
          <span className="stat-lbl">紧急</span>
        </button>
      </div>
      <div className="filter-row">
        {filters.map((filter) => (
          <button
            className={`filter-chip${
              currentCategory === filter.category ? ' on' : ''
            }`}
            type="button"
            key={filter.category}
            onClick={() => setCurrentCategory(filter.category)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="food-grid">
        {visibleItems.length ? (
          visibleItems.map((food) => (
            <FoodCard food={food} key={food.id} onOpen={onOpenFood} />
          ))
        ) : (
          <p className="food-filter-empty">当前筛选下没有食物</p>
        )}
      </div>
    </section>
  )
}
