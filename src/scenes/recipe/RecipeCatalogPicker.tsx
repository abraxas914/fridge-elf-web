import { useMemo, useState } from 'react'
import {
  RECIPE_CATEGORIES,
  type RecipeCategory,
  type SavedRecipe,
} from '../../app/recipes'
import { FOOD_SVGS, UNKNOWN_FOOD_SVG } from '../../catalog/foodCatalog'
import { svgDataUrl } from '../../catalog/pixelIcons'
import { recipeIngredients } from './recipeContent'
import './RecipeCatalogPicker.css'

interface RecipeCatalogPickerProps {
  recipes: readonly SavedRecipe[]
  selectedId?: string
  onSelect: (recipe: SavedRecipe) => void
  onOpen?: (recipe: SavedRecipe) => void
  actionLabel?: string
  onAction?: (recipe: SavedRecipe) => void
}

type CategoryFilter = RecipeCategory | ''

const normalize = (value: string) =>
  value.trim().toLocaleLowerCase('zh-CN')

function searchableText(recipe: SavedRecipe) {
  return normalize([
    recipe.cn,
    recipe.name,
    ...recipe.tags,
    ...recipe.need,
    ...recipeIngredients(recipe).map((item) => item.name),
  ].join(' '))
}

function recipeIcon(recipe: SavedRecipe) {
  return svgDataUrl(
    recipe.key === 'unknown' ? UNKNOWN_FOOD_SVG : FOOD_SVGS[recipe.key],
  )
}

export function RecipeCatalogPicker({
  recipes,
  selectedId,
  onSelect,
  onOpen,
  actionLabel,
  onAction,
}: RecipeCatalogPickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('')
  const normalizedQuery = normalize(query)
  const filteredRecipes = useMemo(
    () => recipes.filter((recipe) => {
      if (category && recipe.category !== category) return false
      return !normalizedQuery || searchableText(recipe).includes(normalizedQuery)
    }),
    [category, normalizedQuery, recipes],
  )
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedId)
  const resultLabel = category
    ? `${category} · ${filteredRecipes.length} 道`
    : `共 ${filteredRecipes.length} 道`

  return (
    <section className="recipe-catalog-picker" aria-label="食谱选择器">
      <div className="recipe-catalog-controls">
        <label>
          <span>搜索食谱</span>
          <input
            aria-label="搜索食谱"
            type="search"
            value={query}
            placeholder="搜菜名、食材或标签"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span>食谱类别</span>
          <select
            aria-label="食谱类别"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as CategoryFilter)
            }
          >
            <option value="">全部类别</option>
            {RECIPE_CATEGORIES.map((value) => (
              <option value={value} key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="recipe-catalog-count" aria-live="polite">
        {resultLabel}
      </div>

      {filteredRecipes.length ? (
        <div className="recipe-catalog-grid">
          {filteredRecipes.map((recipe) => (
            <button
              aria-label={`选择${recipe.cn}`}
              aria-pressed={recipe.id === selectedRecipe?.id}
              className={`recipe-catalog-card${
                recipe.id === selectedRecipe?.id ? ' selected' : ''
              }`}
              key={recipe.id}
              type="button"
              onClick={() => onSelect(recipe)}
            >
              <img src={recipeIcon(recipe)} alt="" aria-hidden="true" />
              <span className="recipe-catalog-card-copy">
                <b>{recipe.cn}</b>
                <small>
                  {recipe.category ?? '未分类'}
                  {recipe.time > 0 ? ` · ${recipe.time} 分钟` : ''}
                </small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="recipe-catalog-empty">
          <p>没有找到符合条件的食谱</p>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setCategory('')
            }}
          >
            清除筛选
          </button>
        </div>
      )}

      {selectedRecipe ? (
        <article className="recipe-catalog-preview">
          <header>
            <img src={recipeIcon(selectedRecipe)} alt="" aria-hidden="true" />
            <div>
              <h3>{selectedRecipe.cn}</h3>
              <p>
                {selectedRecipe.category ?? '未分类'}
                {selectedRecipe.time > 0
                  ? ` · ${selectedRecipe.time} 分钟`
                  : ''}
              </p>
            </div>
            {selectedRecipe.source === 'seed' ? (
              <span className="recipe-seed-badge">演示食谱</span>
            ) : null}
          </header>
          <div className="recipe-preview-tags">
            {selectedRecipe.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="recipe-preview-columns">
            <div>
              <h4>食材</h4>
              <ul>
                {recipeIngredients(selectedRecipe).map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    {item.name}{item.amount ? ` · ${item.amount}` : ''}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>步骤</h4>
              <ol>
                {(selectedRecipe.steps ?? []).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
          <div className="recipe-preview-actions">
            {onOpen ? (
              <button type="button" onClick={() => onOpen(selectedRecipe)}>
                查看完整食谱
              </button>
            ) : null}
            {actionLabel && onAction ? (
              <button
                className="primary"
                type="button"
                onClick={() => onAction(selectedRecipe)}
              >
                {actionLabel}
              </button>
            ) : null}
          </div>
        </article>
      ) : null}
    </section>
  )
}
