import type { AssistantRecipe, AssistantReply } from '../../bridge/types'
import type { SavedRecipe } from '../../app/recipes'
import { RecipeMini } from './RecipeScene'

interface AssistantAnswerProps {
  question: string
  reply: AssistantReply
  existingRecipes?: SavedRecipe[]
  onOpenRecipe?: (recipe: SavedRecipe) => void
  onAddShopping: () => void
  onSaveRecipe: (recipe: AssistantRecipe) => void
}

export function AssistantAnswer({
  question,
  reply,
  existingRecipes = [],
  onOpenRecipe,
  onAddShopping,
  onSaveRecipe,
}: AssistantAnswerProps) {
  return (
    <div className="assistant-answer">
      <div className="assistant-question">你问：{question}</div>
      <p>{reply.answer}</p>
      {existingRecipes.length && onOpenRecipe ? (
        <div className="recipe-strip">
          {existingRecipes.map((recipe) => (
            <RecipeMini
              key={recipe.id}
              recipe={recipe}
              label="AGENT PICK"
              onOpen={onOpenRecipe}
            />
          ))}
        </div>
      ) : null}
      {reply.recipes?.map((recipe) => (
        <article className="assistant-recipe" key={recipe.name}>
          <h3>{recipe.name}</h3>
          <p>{recipe.reason}</p>
          {recipe.availableIngredients?.length ? (
            <div><b>冰箱已有：</b>{recipe.availableIngredients.join('、')}</div>
          ) : null}
          {recipe.missingIngredients?.length ? (
            <div><b>还需要：</b>{recipe.missingIngredients.join('、')}</div>
          ) : null}
          {recipe.steps?.length ? (
            <ol>{recipe.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          ) : null}
          <button
            className="assistant-save-recipe"
            type="button"
            onClick={() => onSaveRecipe(recipe)}
          >
            ♡ 收藏这份食谱
          </button>
        </article>
      ))}
      {reply.shoppingItems?.length ? (
        <div className="assistant-shopping">
          <b>建议采购</b>
          {reply.shoppingItems.map((item) => (
            <span key={`${item.name}-${item.quantity}`}>
              {item.name} · {item.quantity}
            </span>
          ))}
          <button type="button" onClick={onAddShopping}>
            加入采购清单并前往查看
          </button>
        </div>
      ) : null}
    </div>
  )
}
