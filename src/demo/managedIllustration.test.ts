import { describe, expect, it, vi } from 'vitest'
import { createManagedIllustration } from './managedIllustration'

const recipe = {
  id: 'recipe',
  title: '测试食谱',
  ingredients: [{ name: '番茄' }],
  steps: Array.from({ length: 7 }, (_, index) => ({
    order: index + 1,
    action: `步骤 ${index + 1}`,
  })),
}

describe('managed Image2 adapter', () => {
  it('converts every requested page into a released job result', async () => {
    const requester = vi
      .fn()
      .mockResolvedValueOnce(new Blob(['one'], { type: 'image/png' }))
      .mockResolvedValueOnce(new Blob(['two'], { type: 'image/png' }))
    const adapter = createManagedIllustration(requester, {
      createObjectURL: (blob) => `blob:${blob.size}`,
      revokeObjectURL: vi.fn(),
    })

    const job = await adapter.start({
      contractVersion: 1,
      recipe,
      styleId: 'xiaohei',
    })

    expect(job.status).toBe('succeeded')
    expect(job.pages.map((page) => page.index)).toEqual([1, 2])
    expect(requester).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pageIndexes: [1] }),
    )
    expect(requester).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pageIndexes: [2] }),
    )
  })

  it('preserves completed pages when a later page fails', async () => {
    const requester = vi
      .fn()
      .mockResolvedValueOnce(new Blob(['one'], { type: 'image/png' }))
      .mockRejectedValueOnce(new Error('gateway down'))
    const adapter = createManagedIllustration(requester, {
      createObjectURL: () => 'blob:page-1',
      revokeObjectURL: vi.fn(),
    })

    const job = await adapter.start({
      contractVersion: 1,
      recipe,
      styleId: 'xiaohei',
    })

    expect(job).toMatchObject({
      status: 'failed',
      completedPages: 1,
      totalPages: 2,
      pages: [{ index: 1, imageUrl: 'blob:page-1' }],
      error: { code: 'IMAGE_UNAVAILABLE' },
    })
  })

  it('revokes generated object URLs when removed or disposed', async () => {
    const revokeObjectURL = vi.fn()
    const adapter = createManagedIllustration(
      vi.fn().mockResolvedValue(new Blob(['one'], { type: 'image/png' })),
      {
        createObjectURL: () => 'blob:page',
        revokeObjectURL,
      },
    )
    const first = await adapter.start({
      contractVersion: 1,
      recipe: { ...recipe, steps: recipe.steps.slice(0, 1) },
      styleId: 'xiaohei',
    })
    const second = await adapter.start({
      contractVersion: 1,
      recipe: { ...recipe, id: 'recipe-2', steps: recipe.steps.slice(0, 1) },
      styleId: 'xiaohei',
    })

    await adapter.remove(first.id)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:page')
    adapter.dispose()
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
    await expect(adapter.getJob(second.id)).rejects.toThrow(
      '食谱插画任务不存在',
    )
  })
})
