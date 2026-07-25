import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RECIPES } from '../../fixtures/goldenFixture'
import { AssistantAnswer } from './AssistantAnswer'

describe('AssistantAnswer', () => {
  it('renders only existing demo recipes returned by the managed Agent', () => {
    const onOpenRecipe = vi.fn()
    render(
      <AssistantAnswer
        question="今晚吃什么？"
        reply={{
          answer: '建议优先处理番茄。',
          recipes: [{
            name: '模型生成食谱',
            reason: '不应写入 Demo',
            availableIngredients: [],
            missingIngredients: [],
            steps: [],
          }],
          shoppingItems: [{
            name: '模型建议采购',
            quantity: '1份',
            reason: '不应写入 Demo',
          }],
          suggestShopping: true,
        }}
        existingRecipes={[RECIPES[0]]}
        onOpenRecipe={onOpenRecipe}
        onAddShopping={vi.fn()}
        onSaveRecipe={vi.fn()}
        readOnly
      />,
    )

    expect(screen.getByText('建议优先处理番茄。')).toBeVisible()
    expect(screen.queryByText('模型生成食谱')).not.toBeInTheDocument()
    expect(screen.queryByText('模型建议采购')).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: /番茄鸡蛋轻食碗/ }),
    )
    expect(onOpenRecipe).toHaveBeenCalledWith(RECIPES[0])
  })
})
