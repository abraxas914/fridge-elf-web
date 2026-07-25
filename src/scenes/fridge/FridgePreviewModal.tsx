import type { PresentedFood } from '../../app/types'
import { FoodArt } from './FoodArt'

interface FridgePreviewModalProps {
  items: readonly PresentedFood[]
}

export function FridgePreviewModal({ items }: FridgePreviewModalProps) {
  return (
    <>
      <div className="peek-cam">
        <span className="rec" />
        CAM LIVE · 冰箱内摄像头
        <span className="info">{items.length} items · 4°C · 2 min ago</span>
      </div>
      <div className="peek-grid">
        {items.map((food) => (
          <div
            className={`peek-cell${
              food.expiresInDays !== null && food.expiresInDays <= 1
                ? ' urgent'
                : ''
            }`}
            key={food.id}
          >
            <FoodArt food={food} />
            <div className="n">{food.name}</div>
          </div>
        ))}
      </div>
      <div className="peek-tip">
        TIP · 出门在外快速查冰箱<br />超市里避免重复购买
      </div>
    </>
  )
}
