import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SavedRecipe } from '../../app/recipes'
import { RecipeCatalogPicker } from './RecipeCatalogPicker'

const recipes: SavedRecipe[] = [
  {
    id: 'recipe-braised-eggplant',
    key: 'unknown',
    name: 'BRAISED EGGPLANT',
    cn: '红烧茄子',
    kcal: null,
    time: 0,
    tags: ['下饭', '素食'],
    match: false,
    need: ['茄子', 'garlic'],
    desc: '茄子烧至入味。',
    category: '炒菜',
    ingredients: [
      { name: '茄子', amount: '500g' },
      { name: '大蒜', amount: '3瓣' },
    ],
    steps: ['茄子切块。', '大蒜炒香。', '加入茄子烧至入味。'],
    source: 'seed',
  },
  {
    id: 'recipe-apple-tea',
    key: 'apple',
    name: 'APPLE TEA',
    cn: '苹果红茶',
    kcal: null,
    time: 3,
    tags: ['热饮'],
    match: false,
    need: ['apple'],
    desc: '苹果风味热饮。',
    category: '饮品',
    ingredients: [{ key: 'apple', name: '苹果' }],
    steps: ['茶包入杯。', '倒入热水。', '焖泡后饮用。'],
    source: 'seed',
  },
]

describe('RecipeCatalogPicker', () => {
  it('searches title, ingredient, and tag', () => {
    render(
      <RecipeCatalogPicker
        recipes={recipes}
        onSelect={vi.fn()}
      />,
    )
    const search = screen.getByRole('searchbox', { name: '搜索食谱' })

    fireEvent.change(search, { target: { value: '茄子' } })
    expect(screen.getByRole('button', { name: /选择红烧茄子/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: /选择苹果红茶/ }))
      .not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: '热饮' } })
    expect(screen.getByRole('button', { name: /选择苹果红茶/ })).toBeVisible()

    fireEvent.change(search, { target: { value: 'garlic' } })
    expect(screen.getByRole('button', { name: /选择红烧茄子/ })).toBeVisible()
  })

  it('filters categories and reports the result count', () => {
    render(
      <RecipeCatalogPicker
        recipes={recipes}
        onSelect={vi.fn()}
      />,
    )

    const category = screen.getByRole('combobox', { name: '食谱类别' })
    expect(within(category).getAllByRole('option')).toHaveLength(16)
    fireEvent.change(category, { target: { value: '饮品' } })

    expect(screen.getByText('饮品 · 1 道')).toBeVisible()
    expect(screen.getByRole('button', { name: /选择苹果红茶/ })).toBeVisible()
  })

  it('shows an empty state and can clear filters', () => {
    render(
      <RecipeCatalogPicker
        recipes={recipes}
        onSelect={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索食谱' }), {
      target: { value: '不存在' },
    })

    expect(screen.getByText('没有找到符合条件的食谱')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '清除筛选' }))
    expect(screen.getByText('共 2 道')).toBeVisible()
  })

  it('selects a card and previews ingredients and real steps', () => {
    const onSelect = vi.fn()
    render(
      <RecipeCatalogPicker
        recipes={recipes}
        selectedId="recipe-braised-eggplant"
        onSelect={onSelect}
      />,
    )

    const selected = screen.getByRole('button', { name: /选择红烧茄子/ })
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('茄子 · 500g')).toBeVisible()
    expect(screen.getByText('加入茄子烧至入味。')).toBeVisible()
    expect(screen.queryByText('0 分钟')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /选择苹果红茶/ }))
    expect(onSelect).toHaveBeenCalledWith(recipes[1])
  })

  it('runs an optional action for the selected recipe', () => {
    const onAction = vi.fn()
    render(
      <RecipeCatalogPicker
        actionLabel="加入这餐"
        onAction={onAction}
        onSelect={vi.fn()}
        recipes={recipes}
        selectedId="recipe-apple-tea"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '加入这餐' }))
    expect(onAction).toHaveBeenCalledWith(recipes[1])
  })
})
