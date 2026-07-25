import type { AssistantRecipe, AssistantReply } from '../../bridge/types'

interface AssistantAnswerProps {
  question: string
  reply: AssistantReply
  onAddShopping: () => void
  onSaveRecipe: (recipe: AssistantRecipe) => void
}

export function AssistantAnswer({
  question,
  reply,
  onAddShopping,
  onSaveRecipe,
}: AssistantAnswerProps) {
  return (
    <div className="assistant-answer">
      <div className="assistant-question">你问：{question}</div>
      <p>{reply.answer}</p>
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
