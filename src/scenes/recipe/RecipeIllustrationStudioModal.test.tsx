import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { RecipeIllustrationPort } from '../../app/ports'
import { RECIPES } from '../../fixtures/goldenFixture'
import { RecipeIllustrationStudioModal } from './RecipeIllustrationStudioModal'

function illustration(): RecipeIllustrationPort {
  const result = {
    id: 'studio-image-1',
    status: 'succeeded' as const,
    completedPages: 1,
    totalPages: 1,
    pages: [
      {
        index: 1,
        imageUrl: 'blob:https://demo.local/studio-image-1',
      },
    ],
  }
  return {
    start: vi.fn(async () => result),
    getJob: vi.fn(async () => result),
    remove: vi.fn(),
  }
}

describe('RecipeIllustrationStudioModal', () => {
  it('keeps preset choices in one horizontal row above the generator', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/scenes/recipe/RecipeScene.css'),
      'utf8',
    )
    const sourceListRule = css.match(
      /\.recipe-source-list\s*\{([^}]+)\}/,
    )?.[1]

    expect(sourceListRule).toContain('grid-auto-flow: column')
    expect(sourceListRule).toContain('overflow-x: auto')
  })

  it('generates one image from a selected preset recipe', async () => {
    const port = illustration()
    render(
      <RecipeIllustrationStudioModal
        recipes={RECIPES}
        illustration={port}
        managed
      />,
    )

    expect(
      screen.getByRole('button', { name: '选择食谱' }),
    ).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(
      screen.getByRole('button', { name: /番茄鸡蛋轻食碗/ }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: '生成食谱插画' }),
    )

    await waitFor(() =>
      expect(port.start).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndexes: [1],
          recipe: expect.objectContaining({
            title: '番茄鸡蛋轻食碗',
          }),
        }),
      ),
    )
    expect(await screen.findAllByRole('img')).toHaveLength(1)
  })

  it('turns pasted recipe text into the same single-image request', async () => {
    const port = illustration()
    render(
      <RecipeIllustrationStudioModal
        recipes={RECIPES}
        illustration={port}
        managed
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '粘贴食谱' }))
    fireEvent.change(
      screen.getByRole('textbox', { name: '粘贴食谱正文' }),
      {
        target: {
          value: `凉拌黄瓜
食材
- 黄瓜 1根
- 蒜 2瓣
步骤
1. 黄瓜拍碎
2. 加入蒜和调味料
3. 拌匀装盘`,
        },
      },
    )
    fireEvent.click(
      screen.getByRole('button', { name: '生成食谱插画' }),
    )

    await waitFor(() =>
      expect(port.start).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndexes: [1],
          recipe: expect.objectContaining({
            title: '凉拌黄瓜',
            ingredients: expect.arrayContaining([
              { name: '黄瓜', amount: '1根' },
            ]),
          }),
        }),
      ),
    )
  })

  it('shows an inline error and never sends invalid pasted text', () => {
    const port = illustration()
    render(
      <RecipeIllustrationStudioModal
        recipes={RECIPES}
        illustration={port}
        managed
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '粘贴食谱' }))
    fireEvent.change(
      screen.getByRole('textbox', { name: '粘贴食谱正文' }),
      { target: { value: '只有一道菜的简单描述' } },
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      '请粘贴包含菜名、食材和步骤的食谱',
    )
    expect(
      screen.getByRole('button', { name: '生成食谱插画' }),
    ).toBeDisabled()
    expect(port.start).not.toHaveBeenCalled()
  })
})
