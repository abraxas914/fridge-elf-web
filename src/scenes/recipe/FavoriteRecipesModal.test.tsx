import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SavedRecipe } from '../../app/recipes'
import { FavoriteRecipesModal } from './FavoriteRecipesModal'

const seedRecipe: SavedRecipe = {
  id: 'recipe-seed',
  key: 'tomato',
  name: 'SEED',
  cn: '演示番茄',
  kcal: null,
  time: 0,
  tags: ['演示'],
  match: false,
  need: ['tomato'],
  desc: '',
  ingredients: [{ key: 'tomato', name: '番茄' }],
  steps: ['番茄切块。', '下锅翻炒。', '调味装盘。'],
  category: '炒菜',
  source: 'seed',
}

const userRecipe: SavedRecipe = {
  ...seedRecipe,
  id: 'favorite-user',
  key: 'unknown',
  name: 'CUSTOM',
  cn: '自建食谱',
  category: undefined,
  source: 'user',
}

describe('FavoriteRecipesModal', () => {
  it('browses all recipes and opens the selected recipe', () => {
    const onOpen = vi.fn()
    render(
      <FavoriteRecipesModal
        recipes={[seedRecipe, userRecipe]}
        onDelete={vi.fn()}
        onOpen={onOpen}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox', { name: '搜索食谱' })).toBeVisible()
    expect(screen.getByText('演示食谱')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '查看完整食谱' }))
    expect(onOpen).toHaveBeenCalledWith(seedRecipe)
  })

  it('keeps seed recipes read-only and custom recipes editable', () => {
    const onDelete = vi.fn()
    render(
      <FavoriteRecipesModal
        recipes={[seedRecipe, userRecipe]}
        onDelete={onDelete}
        onOpen={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /编辑演示番茄/ }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /删除演示番茄/ }))
      .not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /选择自建食谱/ }))
    expect(screen.getByRole('button', { name: '编辑自建食谱' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '删除自建食谱' }))
    expect(onDelete).toHaveBeenCalledWith('favorite-user')
  })

  it('keeps the new recipe action', () => {
    render(
      <FavoriteRecipesModal
        recipes={[seedRecipe]}
        onDelete={vi.fn()}
        onOpen={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '＋ 新建食谱' }))
    expect(screen.getByLabelText('食谱名称')).toBeVisible()
  })
})
