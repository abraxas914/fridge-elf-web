import { useMemo, useState } from 'react'
import type { RecipeIllustrationPort } from '../../app/ports'
import { RecipeIllustrationPanel } from '../../features/recipeIllustration/RecipeIllustrationPanel'
import type { RecipeIllustrationRecipe } from '../../features/recipeIllustration/types'
import { parsePastedRecipe } from './pastedRecipe'
import { RecipeCatalogPicker } from './RecipeCatalogPicker'
import { toIllustrationRecipe } from './recipeContent'
import type { Recipe } from './RecipeScene'

interface RecipeIllustrationStudioModalProps {
  recipes: readonly Recipe[]
  illustration: RecipeIllustrationPort
  managed: boolean
}

type RecipeSourceMode = 'preset' | 'paste'

const PASTE_EXAMPLE = `番茄炒蛋
食材
- 番茄 2个
- 鸡蛋 3个
步骤
1. 番茄切块
2. 鸡蛋炒熟
3. 合炒调味`

function pastedRecipeState(source: string): {
  recipe: RecipeIllustrationRecipe | null
  error: string
} {
  if (!source.trim()) return { recipe: null, error: '' }
  try {
    return { recipe: parsePastedRecipe(source), error: '' }
  } catch (cause) {
    return {
      recipe: null,
      error:
        cause instanceof Error
          ? cause.message
          : '请粘贴包含菜名、食材和步骤的食谱',
    }
  }
}

export function RecipeIllustrationStudioModal({
  recipes,
  illustration,
  managed,
}: RecipeIllustrationStudioModalProps) {
  const [mode, setMode] = useState<RecipeSourceMode>('preset')
  const [selectedRecipeId, setSelectedRecipeId] = useState(
    recipes[0]?.id ?? '',
  )
  const [pastedText, setPastedText] = useState('')
  const parsedPaste = useMemo(
    () => pastedRecipeState(pastedText),
    [pastedText],
  )
  const selectedRecipe =
    recipes.find((recipe) => recipe.id === selectedRecipeId) ??
    recipes[0]
  const illustrationRecipe =
    mode === 'preset'
      ? selectedRecipe
        ? toIllustrationRecipe(selectedRecipe)
        : null
      : parsedPaste.recipe

  return (
    <div className="recipe-illustration-studio">
      <p className="recipe-studio-intro">
        选择现有食谱，或粘贴自己的食谱文字，转换为一张 AI 食谱插画。
      </p>
      <div
        aria-label="食谱输入方式"
        className="recipe-source-switch"
        role="group"
      >
        <button
          aria-pressed={mode === 'preset'}
          type="button"
          onClick={() => setMode('preset')}
        >
          选择食谱
        </button>
        <button
          aria-pressed={mode === 'paste'}
          type="button"
          onClick={() => setMode('paste')}
        >
          粘贴食谱
        </button>
      </div>

      {mode === 'preset' ? (
        <RecipeCatalogPicker
          recipes={recipes}
          selectedId={selectedRecipe?.id}
          onSelect={(recipe) => setSelectedRecipeId(recipe.id)}
        />
      ) : (
        <div className="recipe-paste-field">
          <label htmlFor="recipe-illustration-paste">
            粘贴食谱正文
          </label>
          <textarea
            id="recipe-illustration-paste"
            placeholder={PASTE_EXAMPLE}
            rows={10}
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
          />
          <small>请包含菜名、食材和带序号或项目符号的步骤。</small>
          {parsedPaste.error ? (
            <div className="recipe-source-error" role="alert">
              {parsedPaste.error}
            </div>
          ) : null}
        </div>
      )}

      {illustrationRecipe ? (
        <RecipeIllustrationPanel
          key={`${mode}-${illustrationRecipe.id}`}
          illustration={illustration}
          managed={managed}
          recipe={illustrationRecipe}
          singleImage
        />
      ) : (
        <section
          aria-label="食谱插画"
          className="recipe-illustration-panel recipe-studio-empty"
        >
          <button
            className="recipe-illustration-primary"
            disabled
            type="button"
          >
            生成食谱插画
          </button>
        </section>
      )}
    </div>
  )
}
