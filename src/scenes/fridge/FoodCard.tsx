import type { PresentedFood } from '../../app/types'
import { FoodArt } from './FoodArt'

interface FoodCardProps {
  food: PresentedFood
  onOpen: (food: PresentedFood) => void
}

function expiryPresentation(remain: number | null) {
  if (remain === null) return { className: '', text: 'D-?', moldy: false }
  if (remain <= 1) {
    return {
      className: 'bad',
      text: remain === 0 ? 'TODAY' : 'D-1',
      moldy: true,
    }
  }
  if (remain <= 3) {
    return { className: 'warn', text: `D-${remain}`, moldy: false }
  }
  return { className: '', text: `D-${remain}`, moldy: false }
}

export function FoodCard({ food, onOpen }: FoodCardProps) {
  const expiry = expiryPresentation(food.expiresInDays)

  return (
    <button
      className={`food-item${expiry.moldy ? ' moldy' : ''}`}
      type="button"
      data-food-id={food.id}
      data-expiry-date={food.expiryDate}
      aria-label={`${food.name}，${food.quantity}`}
      onClick={() => onOpen(food)}
    >
      {expiry.moldy ? <span className="food-badge">!</span> : null}
      {food.batchCount > 1 ? (
        <span className="food-batch-badge">{food.batchCount} 批</span>
      ) : null}
      <span className="food-icon-wrap">
        <FoodArt food={food} mold={expiry.moldy} />
      </span>
      <span className="food-name">{food.name}</span>
      <span className="food-meta">
        <span className="qty">{food.quantity}</span>
        <span className="kcal">
          {food.kcal === null ? '-- KCAL' : `${food.kcal}K`}
        </span>
      </span>
      <span className={`food-days ${expiry.className}`}>
        {expiry.text}
      </span>
    </button>
  )
}
