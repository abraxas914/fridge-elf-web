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

  it('offers four fixed styles and refuses an invalid demo link', () => {
    render(
      <IllustrationModal
        defaultRecipeText={RECIPE}
        demoToken=""
        fetcher={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /小黑手绘/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /水彩厨房/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /亚麻手帖/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /像素小人/ })).toBeVisible()
    expect(screen.getByText(/演示链接无效/)).toBeVisible()
    expect(screen.getByRole('button', { name: /生成插画/ })).toBeDisabled()
  })

  it('generates each planned page and renders binary results', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'x-recipe-page': '1',
          'x-recipe-pages': '1',
        },
      }),
    )
    render(
      <IllustrationModal
        defaultRecipeText={RECIPE}
        demoToken="valid-token"
        fetcher={fetcher}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /水彩厨房/ }))
    fireEvent.click(screen.getByRole('button', { name: /生成插画/ }))

    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce())
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
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
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({
      'x-demo-token': 'valid-token',
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
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { 'content-type': 'image/png' },
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
        demoToken="valid-token"
        fetcher={fetcher}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /生成插画/ }))

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    expect(
      fetcher.mock.calls.map(
        (call) => JSON.parse(String(call[1]?.body)).pageIndexes,
      ),
    ).toEqual([[1], [2]])
    expect(await screen.findAllByRole('img')).toHaveLength(2)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })
})
