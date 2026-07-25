import { useState } from 'react'
import type { PresentedFood } from '../../app/types'
import { FoodArt } from './FoodArt'

interface FoodDetailModalProps {
  food: PresentedFood
  onRemove?: (food: PresentedFood) => Promise<void>
  onRemoveBatch?: (id: string) => Promise<void>
  onUpdateQuantity?: (id: string, quantity: string) => Promise<void>
}

function statusText(remain: number | null) {
  if (remain === null) return '--'
  if (remain <= 1) return '! 请尽快食用（已长毛！）'
  if (remain <= 3) return 'DUE · 建议本周吃完'
  return '✓ 状态新鲜'
}

function suggestUsage(food: PresentedFood) {
  const map: Record<string, string> = {
    ingredient: '做汤 / 快炒 / 炖煮，也可以交给冰箱 Agent 组合成菜谱',
    drink: '直接饮用 / 搭配早餐 / 做奶昔',
    other: '搭配主食 / 烘焙 / 快手加餐',
    unknown: '可向冰箱 Agent 询问适合的做法',
  }
  return map[food.category] ?? ''
}

function parseQuantity(value: string) {
  const match = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(value.trim())
  return match ? { amount: Number(match[1]), unit: match[2] } : null
}

export function FoodDetailModal({
  food,
  onRemove,
  onRemoveBatch,
  onUpdateQuantity,
}: FoodDetailModalProps) {
  const remain = food.expiresInDays
  const [removing, setRemoving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState(food.batches[0]?.id ?? '')
  const [takeAmount, setTakeAmount] = useState('')
  const activeBatch = food.batches.find((batch) => batch.id === selectedBatch)
  const parsedBatch = activeBatch ? parseQuantity(activeBatch.quantity) : null

  return (
    <>
      <div className="food-detail-art">
        <FoodArt food={food} mold={remain !== null && remain <= 1} />
      </div>
      <div className="modal-row">
        <span className="label">数量</span><span>{food.quantity}</span>
      </div>
      <div className="modal-row">
        <span className="label">热量</span>
        <span>{food.kcal === null ? '--' : food.kcal} kcal / 100g</span>
      </div>
      <div className="modal-row">
        <span className="label">买入日期</span><span>{food.addedDate}</span>
      </div>
      <div className="modal-row">
        <span className="label">同日批次</span><span>{food.batchCount} 批</span>
      </div>
      <div className="modal-row">
        <span className="label">已存放</span>
        <span>{food.addedDaysAgo === null ? '--' : food.addedDaysAgo} 天</span>
      </div>
      <div className="modal-row">
        <span className="label">剩余保质</span>
        <span>{remain === null ? '--' : remain} 天</span>
      </div>
      <div className="modal-row">
        <span className="label">状态</span><span>{statusText(remain)}</span>
      </div>
      <div className="food-detail-usage">
        <b>♥ 推荐做法：</b><br />{suggestUsage(food)}
      </div>
      {onUpdateQuantity && onRemoveBatch ? (
        <div className="food-partial-remove">
          <b>取出部分数量</b>
          <label>
            选择批次
            <select value={selectedBatch} onChange={(event) => setSelectedBatch(event.target.value)}>
              {food.batches.map((batch, index) => (
                <option value={batch.id} key={batch.id}>
                  批次 {index + 1} · {batch.quantity} · 到期 {batch.expiryDate}
                </option>
              ))}
            </select>
          </label>
          {parsedBatch ? (
            <div className="food-partial-row">
              <input
                type="number"
                min="0.01"
                max={parsedBatch.amount}
                step="0.01"
                value={takeAmount}
                placeholder={`最多 ${parsedBatch.amount}${parsedBatch.unit}`}
                onChange={(event) => setTakeAmount(event.target.value)}
              />
              <button
                type="button"
                disabled={removing}
                onClick={async () => {
                  const amount = Number(takeAmount)
                  if (!activeBatch || !Number.isFinite(amount) || amount <= 0) return
                  setRemoving(true)
                  try {
                    if (amount >= parsedBatch.amount) {
                      await onRemoveBatch(activeBatch.id)
                    } else {
                      const remaining = Number((parsedBatch.amount - amount).toFixed(2))
                      await onUpdateQuantity(
                        activeBatch.id,
                        `${remaining}${parsedBatch.unit}`,
                      )
                    }
                    setTakeAmount('')
                  } finally {
                    setRemoving(false)
                  }
                }}
              >
                确认取出
              </button>
            </div>
          ) : (
            <small>当前数量不是数字格式，可使用下方“全部取出”。</small>
          )}
        </div>
      ) : null}
      {onRemove ? (
        confirming ? (
          <div className="food-remove-confirm">
            <p>
              确认已食用或取出“{food.name}”？
              {food.batchCount > 1 ? ` 将移除同日合并的 ${food.batchCount} 批。` : ''}
            </p>
            <div>
              <button type="button" onClick={() => setConfirming(false)}>取消</button>
              <button
                className="danger"
                type="button"
                disabled={removing}
                onClick={async () => {
                  setRemoving(true)
                  try {
                    await onRemove(food)
                  } finally {
                    setRemoving(false)
                  }
                }}
              >
                {removing ? '正在同步...' : '确认取出'}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="food-remove-button"
            type="button"
            onClick={() => setConfirming(true)}
          >
            取出 / 已食用
          </button>
        )
      ) : null}
    </>
  )
}
