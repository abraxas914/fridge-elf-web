import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IllustrationModal } from './IllustrationModal'

const RECIPE = `# 番茄炒蛋
食材：
- 番茄：2个
- 鸡蛋：3个
步骤：
1. 番茄切块。
2. 鸡蛋打散。
3. 中火炒鸡蛋后盛出。
4. 放入番茄和鸡蛋翻炒。`

describe('IllustrationModal', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:illustration'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('offers four fixed styles without requiring a signed URL', () => {
    render(
      <IllustrationModal
        defaultRecipeText={RECIPE}
        requester={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /小黑手绘/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /水彩厨房/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /亚麻手帖/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /像素小人/ })).toBeVisible()
    expect(screen.queryByText(/演示链接无效/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /生成插画/ })).toBeEnabled()
  })

  it('generates each planned page and renders binary results', async () => {
    const requester = vi.fn().mockResolvedValue(
      new Blob([new Uint8Array([137, 80, 78, 71])], {
        type: 'image/png',
      }),
    )
    render(
      <IllustrationModal
        defaultRecipeText={RECIPE}
        requester={requester}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /水彩厨房/ }))
    fireEvent.click(screen.getByRole('button', { name: /生成插画/ }))

    await waitFor(() => expect(requester).toHaveBeenCalledOnce())
    expect(requester.mock.calls[0][0]).toMatchObject({
      contractVersion: 1,
      recipe: {
        title: '番茄炒蛋',
        ingredients: [
          { name: '番茄', amount: '2个' },
          { name: '鸡蛋', amount: '3个' },
        ],
      },
      styleId: 'watercolor-kitchen',
      pageIndexes: [1],
    })
    expect(await screen.findByRole('img', { name: /番茄炒蛋.*第 1 页/ })).toHaveAttribute(
      'src',
      'blob:illustration',
    )
  })

  it('generates a seven-step recipe as two independent Image2 calls', async () => {
    const createObjectURL = vi
      .fn()
      .mockReturnValueOnce('blob:page-1')
      .mockReturnValueOnce('blob:page-2')
    URL.createObjectURL = createObjectURL
    const requester = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Blob([new Uint8Array([137, 80, 78, 71])], {
          type: 'image/png',
        }),
      ),
    )
    const sevenSteps = `${RECIPE}
5. 加盐调味。
6. 翻炒均匀。
7. 盛入盘中。`
    render(
      <IllustrationModal
        defaultRecipeText={sevenSteps}
        requester={requester}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /生成插画/ }))

    await waitFor(() => expect(requester).toHaveBeenCalledTimes(2))
    expect(
      requester.mock.calls.map((call) => call[0].pageIndexes),
    ).toEqual([[1], [2]])
    expect(await screen.findAllByRole('img')).toHaveLength(2)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })
})
