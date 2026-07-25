import { useState } from 'react'
import type { AudioCue } from '../../app/ports'
import type { PresentedFood } from '../../app/types'
import { PixelIcon } from '../../catalog/pixelIcons'
import { FoodCard } from './FoodCard'
import './FridgeScene.css'

const STORAGE_TOTAL = 24
const STORAGE_SEGMENTS = 12

type FilterCategory = 'all' | 'ingredient' | 'drink' | 'other'

const filters: readonly { category: FilterCategory; label: string }[] = [
  { category: 'all', label: '✦ 全部' },
  { category: 'ingredient', label: '食材' },
  { category: 'drink', label: '饮品' },
  { category: 'other', label: '其他' },
]

interface FridgeSceneProps {
  active?: boolean
  items: readonly PresentedFood[]
  onOpenFood: (food: PresentedFood) => void
  onCue?: (cue: AudioCue) => void
  onAddFood?: () => void
  connectionDetail?: string
}

export function FridgeScene({
  active = true,
  items,
  onOpenFood,
  onCue = () => undefined,
  onAddFood,
  connectionDetail,
}: FridgeSceneProps) {
  const [currentCategory, setCurrentCategory] =
    useState<FilterCategory>('all')
  const used = items.length
  const pct = Math.round((used / STORAGE_TOTAL) * 100)
  const filled = Math.max(
    1,
    Math.round((pct / 100) * STORAGE_SEGMENTS),
  )
  const left = STORAGE_TOTAL - used
  const storageLabel =
    pct >= 80
      ? 'FULL · 需清理!'
      : pct >= 60
        ? 'FILLING · 空间紧张'
        : 'ROOMY · 空间充足'
  const storageTip =
    pct >= 80
      ? '! 冰箱快满了 · 建议整理一下'
      : pct >= 60
        ? `BOX · 还有 ${left} 个位置 · 空间紧张`
        : `✓ 空间充足 · 还可放 ${left} 件`
  const storageTipClass =
    pct >= 80 ? ' warn' : pct < 60 ? ' ok' : ''
  const visibleItems =
    currentCategory === 'all'
      ? items
      : items.filter((food) => food.category === currentCategory)
  const fixtureStats = items.every((food) => food.source === 'fixture')
  const expiring = fixtureStats
    ? 3
    : items.filter(
        (food) =>
          food.expiresInDays !== null &&
          food.expiresInDays > 1 &&
          food.expiresInDays <= 3,
      ).length
  const urgent = fixtureStats
    ? 2
    : items.filter(
        (food) =>
          food.expiresInDays !== null && food.expiresInDays <= 1,
      ).length

  return (
    <section
      className={`tab${active ? ' active' : ''}`}
      data-tab="fridge"
      data-testid="fridge-scene"
      hidden={!active}
    >
      {onAddFood ? (
        <div className="inventory-actions">
          <span className="inventory-sync-detail">
            {connectionDetail ?? '连接中'}
          </span>
          <button type="button" onClick={onAddFood}>
            + 添加食物
          </button>
        </div>
      ) : null}
      <div className="storage-wrap">
        <div className="storage-head">
          <div className="l">
            <PixelIcon name="box" className="icon pxi storage-px" />
            <span className="lbl">{storageLabel}</span>
          </div>
          <div className="val">
            <span>{used}</span><span className="pct">/24</span>
          </div>
        </div>
        <div className="storage-bar">
          {Array.from({ length: STORAGE_SEGMENTS }, (_, index) => {
            let className = 'storage-seg'
            if (index < filled) {
              className += ' on'
              if (pct >= 80) className += ' low'
              else if (pct >= 60) className += ' mid'
            }
            return (
              <span
                className={className}
                data-testid="storage-segment"
                key={index}
              />
            )
          })}
        </div>
        <div className={`storage-tip${storageTipClass}`}>{storageTip}</div>
      </div>
      <div className="fridge-stats">
        <div className="stat-cell a">
          <span className="stat-num">{used}</span>
          <span className="stat-lbl">总食材</span>
        </div>
        <div className="stat-cell b">
          <span className="stat-num">{expiring}</span>
          <span className="stat-lbl">将过期</span>
        </div>
        <div className="stat-cell c">
          <span className="stat-num">{urgent}</span>
          <span className="stat-lbl">紧急</span>
        </div>
      </div>
      <div className="filter-row">
        {filters.map((filter) => (
          <button
            className={`filter-chip${
              currentCategory === filter.category ? ' on' : ''
            }`}
            type="button"
            key={filter.category}
            onClick={() => {
              onCue('tick')
              setCurrentCategory(filter.category)
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="food-grid">
        {visibleItems.map((food) => (
          <FoodCard
            food={food}
            key={food.id}
            onOpen={(selected) => {
              onCue('tick')
              onOpenFood(selected)
            }}
          />
        ))}
      </div>
    </section>
  )
}
