import { useEffect, useState } from 'react'
import type { RecipeIllustrationPort } from '../../app/ports'
import {
  createBrowserRecipeIllustrationMock,
} from '../../bridge/browserMock'
import { RecipeIllustrationPanel } from '../../features/recipeIllustration/RecipeIllustrationPanel'
import type { Recipe } from './RecipeScene'
import {
  recipeDisplaySteps,
  toIllustrationRecipe,
} from './recipeContent'

const previewIllustration = createBrowserRecipeIllustrationMock()

export function PotTransition() {
  return (
    <div className="pot-stage">
      <svg viewBox="0 0 140 130" shapeRendering="crispEdges" aria-hidden="true">
        <g>
          <rect className="steam" x="55" y="30" width="4" height="4" fill="#FFFFFF" opacity=".7" />
          <rect className="steam" x="60" y="24" width="3" height="3" fill="#FFFFFF" opacity=".7" />
          <rect className="steam s2" x="72" y="28" width="3" height="3" fill="#FFFFFF" opacity=".7" />
          <rect className="steam s2" x="76" y="22" width="4" height="4" fill="#FFFFFF" opacity=".7" />
          <rect className="steam s3" x="82" y="30" width="4" height="4" fill="#FFFFFF" opacity=".7" />
          <rect className="steam s3" x="88" y="26" width="3" height="3" fill="#FFFFFF" opacity=".7" />
        </g>
        <rect x="35" y="55" width="70" height="8" fill="#4A5A5A" stroke="#2B2117" strokeWidth="2" />
        <rect x="26" y="60" width="12" height="6" fill="#5B9E9E" stroke="#2B2117" strokeWidth="2" />
        <rect x="102" y="60" width="12" height="6" fill="#5B9E9E" stroke="#2B2117" strokeWidth="2" />
        <rect x="35" y="63" width="70" height="40" fill="#5B9E9E" stroke="#2B2117" strokeWidth="2" />
        <rect x="40" y="70" width="4" height="4" fill="#7DBFBF" />
        <rect x="44" y="74" width="4" height="4" fill="#7DBFBF" />
        <rect x="96" y="70" width="4" height="4" fill="#7DBFBF" />
        <rect x="92" y="74" width="4" height="4" fill="#7DBFBF" />
        <rect x="37" y="63" width="66" height="4" fill="#F5D078" />
        <circle className="bubble" cx="55" cy="65" r="2.5" fill="#FBF3DB" stroke="#2B2117" strokeWidth=".6" />
        <circle className="bubble b2" cx="70" cy="65" r="3" fill="#FBF3DB" stroke="#2B2117" strokeWidth=".6" />
        <circle className="bubble b3" cx="85" cy="65" r="2" fill="#FBF3DB" stroke="#2B2117" strokeWidth=".6" />
        <circle className="bubble b4" cx="62" cy="65" r="2.5" fill="#FBF3DB" stroke="#2B2117" strokeWidth=".6" />
        <rect x="50" y="104" width="6" height="3" fill="#D9A868" stroke="#2B2117" />
        <rect x="80" y="104" width="6" height="3" fill="#D9A868" stroke="#2B2117" />
        <rect x="68" y="106" width="4" height="2" fill="#E8B84A" stroke="#2B2117" />
        <line x1="35" y1="110" x2="105" y2="110" stroke="#2B2117" strokeWidth="2" />
      </svg>
    </div>
  )
}

interface RecipeDetailModalProps {
  recipe: Recipe
  illustration?: RecipeIllustrationPort
  managed?: boolean
}

export function RecipeDetailModal({
  recipe,
  illustration = previewIllustration,
  managed = true,
}: RecipeDetailModalProps) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 950)
    return () => window.clearTimeout(timer)
  }, [recipe.id])

  if (!ready) {
    return <><PotTransition /><div className="recipe-generating">锅正在咕嘟咕嘟生成步骤…</div></>
  }

  const steps = recipeDisplaySteps(recipe)
  return (
    <>
      <div className="modal-row"><span className="label">用时</span><span>{recipe.time} 分钟</span></div>
      <div className="modal-row"><span className="label">热量</span><span>{recipe.kcal ?? '--'} kcal</span></div>
      <div className="modal-row"><span className="label">匹配</span><span>{recipe.match ? '冰箱有材料' : '需要补货'}</span></div>
      <div className="recipe-description">{recipe.desc}</div>
      <div className="recipe-step-list">{steps.map((step) => <div className="recipe-step" key={step}>{step}</div>)}</div>
      <RecipeIllustrationPanel
        recipe={toIllustrationRecipe(recipe)}
        managed={managed}
        illustration={illustration}
      />
    </>
  )
}
