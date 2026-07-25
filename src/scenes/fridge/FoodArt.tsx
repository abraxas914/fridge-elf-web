import type { PresentedFood } from '../../app/types'
import { FOOD_SVGS, UNKNOWN_FOOD_SVG } from '../../catalog/foodCatalog'
import { MOLD_SVG } from '../../catalog/moldSvgs'
import { svgDataUrl } from '../../catalog/pixelIcons'

interface FoodArtProps {
  food: PresentedFood
  mold?: boolean
}

export function FoodArt({ food, mold = false }: FoodArtProps) {
  const source =
    food.key === 'unknown' ? UNKNOWN_FOOD_SVG : FOOD_SVGS[food.key]

  return (
    <>
      <img
        className="food-art"
        src={svgDataUrl(source)}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      {mold ? (
        <img
          className="mold-overlay"
          src={svgDataUrl(MOLD_SVG)}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      ) : null}
    </>
  )
}
