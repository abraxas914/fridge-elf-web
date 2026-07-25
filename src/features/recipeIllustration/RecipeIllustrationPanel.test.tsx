import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type {
  CredentialPort,
  RecipeIllustrationPort,
} from '../../app/ports'
import type {
  CredentialStatus,
  CredentialSummaries,
} from '../credentials/types'
import type {
  RecipeIllustrationJob,
  RecipeIllustrationRecipe,
} from './types'
import { RecipeIllustrationPanel } from './RecipeIllustrationPanel'

const RECIPE: RecipeIllustrationRecipe = {
  id: 'recipe-test',
  title: '番茄炒蛋',
  ingredients: [
    { name: '番茄', amount: '2个' },
    { name: '鸡蛋', amount: '3个' },
  ],
  steps: [
    { order: 1, action: '搅匀鸡蛋', target: '鸡蛋' },
    { order: 2, action: '番茄切块', target: '番茄' },
  ],
}

function provider(status: CredentialStatus): CredentialPort {
  return {
    getSummaries: async (): Promise<CredentialSummaries> => ({
      assistant: {
        capability: 'assistant',
        status: 'verified',
        providerId: 'custom',
        providerLabel: '测试服务',
        modelId: 'chat-test',
      },
      'recipe-illustration': {
        capability: 'recipe-illustration',
        status,
        providerId: status === 'not_configured' ? '' : 'custom',
        providerLabel: status === 'not_configured' ? '' : '测试服务',
        modelId: status === 'not_configured' ? '' : 'image-test',
      },
    }),
    saveConfig: vi.fn(),
    removeConfig: vi.fn(),
  }
}

function illustration(
  started: RecipeIllustrationJob = {
    id: 'job-1',
    status: 'succeeded',
    completedPages: 1,
    totalPages: 1,
    pages: [
      {
        index: 1,
        imageUrl:
          'https://appassets.androidplatform.net/generated/job-1/1.png',
      },
    ],
  },
): RecipeIllustrationPort {
  return {
    start: vi.fn(async () => started),
    getJob: vi.fn(async () => started),
    remove: vi.fn(),
  }
}

describe('RecipeIllustrationPanel', () => {
  it('routes an unconfigured user to the device-only settings', async () => {
    const onConfigure = vi.fn()
    const { container } = render(
      <RecipeIllustrationPanel
        credentials={provider('not_configured')}
        illustration={illustration()}
        onConfigure={onConfigure}
        recipe={RECIPE}
      />,
    )

    const button = await screen.findByRole('button', {
      name: '去配置',
    })
    fireEvent.click(button)
    expect(onConfigure).toHaveBeenCalledOnce()
    expect(
      screen.getByText('配置密钥后生成'),
    ).toBeVisible()
    expect(container.textContent).not.toMatch(
      /BYOK|Image2|gpt-image-2|原生层|Web storage|API Key|请求端点/i,
    )
  })

  it('offers four styles and starts with the selected pixel-person profile', async () => {
    const port = illustration()
    render(
      <RecipeIllustrationPanel
        credentials={provider('saved')}
        illustration={port}
        onConfigure={vi.fn()}
        recipe={RECIPE}
      />,
    )

    expect(await screen.findAllByRole('radio')).toHaveLength(4)
    fireEvent.click(screen.getByRole('radio', { name: '像素小人' }))
    fireEvent.click(
      screen.getByRole('button', { name: '生成食谱插画' }),
    )

    await waitFor(() =>
      expect(port.start).toHaveBeenCalledWith(
        expect.objectContaining({ styleId: 'pixel-person' }),
      ),
    )
    expect(
      await screen.findByRole('img', {
        name: '番茄炒蛋 · 像素小人 · 第1页',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: '重新生成第1页' }),
    ).toBeVisible()
  })

  it('polls a running job and announces page progress', async () => {
    const running: RecipeIllustrationJob = {
      id: 'job-running',
      status: 'running',
      completedPages: 0,
      totalPages: 1,
      pages: [],
    }
    const succeeded: RecipeIllustrationJob = {
      ...running,
      status: 'succeeded',
      completedPages: 1,
      pages: [
        {
          index: 1,
          imageUrl:
            'https://appassets.androidplatform.net/generated/job-running/1.png',
        },
      ],
    }
    const port: RecipeIllustrationPort = {
      start: vi.fn(async () => running),
      getJob: vi.fn(async () => succeeded),
      remove: vi.fn(),
    }
    render(
      <RecipeIllustrationPanel
        credentials={provider('verified')}
        illustration={port}
        onConfigure={vi.fn()}
        pollIntervalMs={1}
        recipe={RECIPE}
      />,
    )

    fireEvent.click(
      await screen.findByRole('button', {
        name: '生成食谱插画',
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      '正在生成第 1/1 页',
    )
    expect(
      await screen.findByRole('img', {
        name: '番茄炒蛋 · 小黑手绘 · 第1页',
      }),
    ).toBeVisible()
  })

  it('shows a recoverable generation error', async () => {
    const port = illustration({
      id: 'job-failed',
      status: 'failed',
      completedPages: 0,
      totalPages: 1,
      pages: [],
      error: {
        code: 'IMAGE_GENERATION_FAILED',
        message: '服务暂时不可用',
      },
    })
    render(
      <RecipeIllustrationPanel
        credentials={provider('saved')}
        illustration={port}
        onConfigure={vi.fn()}
        recipe={RECIPE}
      />,
    )

    fireEvent.click(
      await screen.findByRole('button', {
        name: '生成食谱插画',
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '服务暂时不可用',
    )
    expect(
      screen.getByRole('button', { name: '重新生成食谱插画' }),
    ).toBeVisible()
  })

  it('regenerates one page without discarding the other result pages', async () => {
    const first: RecipeIllustrationJob = {
      id: 'job-full',
      status: 'succeeded',
      completedPages: 2,
      totalPages: 2,
      pages: [
        {
          index: 1,
          imageUrl:
            'https://appassets.androidplatform.net/generated/job-full/1.png',
        },
        {
          index: 2,
          imageUrl:
            'https://appassets.androidplatform.net/generated/job-full/2.png',
        },
      ],
    }
    const regenerated: RecipeIllustrationJob = {
      id: 'job-page-2',
      status: 'succeeded',
      completedPages: 1,
      totalPages: 1,
      pages: [
        {
          index: 2,
          imageUrl:
            'https://appassets.androidplatform.net/generated/job-page-2/2.png',
        },
      ],
    }
    const port: RecipeIllustrationPort = {
      start: vi
        .fn()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(regenerated),
      getJob: vi.fn(),
      remove: vi.fn(),
    }
    render(
      <RecipeIllustrationPanel
        credentials={provider('saved')}
        illustration={port}
        onConfigure={vi.fn()}
        recipe={{
          ...RECIPE,
          steps: Array.from({ length: 7 }, (_, index) => ({
            order: index + 1,
            action: `步骤${index + 1}`,
          })),
        }}
      />,
    )

    fireEvent.click(
      await screen.findByRole('button', {
        name: '生成食谱插画',
      }),
    )
    await screen.findByRole('button', { name: '重新生成第2页' })
    fireEvent.click(
      screen.getByRole('button', { name: '重新生成第2页' }),
    )

    await waitFor(() => {
      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(2)
      expect(images[0]).toHaveAttribute(
        'src',
        'https://appassets.androidplatform.net/generated/job-full/1.png',
      )
      expect(images[1]).toHaveAttribute(
        'src',
        'https://appassets.androidplatform.net/generated/job-page-2/2.png',
      )
    })
  })
})
