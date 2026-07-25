import type { PresentedFood } from '../../app/types'
import { FoodArt } from './FoodArt'

interface FoodDetailModalProps {
  food: PresentedFood
}

function statusText(remain: number | null) {
  if (remain === null) return '--'
  if (remain <= 1) return '! 请尽快食用（已长毛！）'
  if (remain <= 3) return 'DUE · 建议本周吃完'
  return '✓ 状态新鲜'
}

function suggestUsage(food: PresentedFood) {
  const map: Record<string, string> = {
    veg: '切段做汤 / 快炒 / 凉拌',
    fruit: '直接食用 / 打成奶昔 / 做水果沙拉',
    meat: '解冻后煎烤 / 炖煮 / 分装冷冻',
    dairy: '搭配麦片 / 烘焙 / 做布丁',
    stg: '调味使用 / 烘焙必备',
  }
  return map[food.category] ?? ''
}

export function FoodDetailModal({ food }: FoodDetailModalProps) {
  const remain = food.expiresInDays

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
    </>
  )
}
