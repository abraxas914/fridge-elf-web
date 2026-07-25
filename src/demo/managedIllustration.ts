import {
  requestDemoIllustration,
  type DemoIllustrationInput,
} from '../ai/demoApi'
import type { RecipeIllustrationPort } from '../app/ports'
import { buildRecipeIllustrationPlan } from '../features/recipeIllustration/recipePlan'
import type {
  RecipeIllustrationJob,
  RecipeIllustrationRequest,
} from '../features/recipeIllustration/types'

export type DemoIllustrationRequester = (
  input: DemoIllustrationInput,
) => Promise<Blob>

interface ObjectUrlPort {
  createObjectURL(blob: Blob): string
  revokeObjectURL(url: string): void
}

export interface ManagedIllustrationPort extends RecipeIllustrationPort {
  dispose(): void
}

function copyJob(job: RecipeIllustrationJob): RecipeIllustrationJob {
  return {
    ...job,
    pages: job.pages.map((page) => ({ ...page })),
    ...(job.error ? { error: { ...job.error } } : {}),
  }
}

function requestedPageIndexes(request: RecipeIllustrationRequest) {
  const available = new Set(
    buildRecipeIllustrationPlan(request.recipe).pages.map(
      (page) => page.index,
    ),
  )
  const indexes = request.pageIndexes ?? [...available]
  return Array.from(
    new Set(indexes.filter((index) => available.has(index))),
  ).sort((a, b) => a - b)
}

export function createManagedIllustration(
  requester: DemoIllustrationRequester = requestDemoIllustration,
  urls: ObjectUrlPort = {
    createObjectURL: URL.createObjectURL.bind(URL),
    revokeObjectURL: URL.revokeObjectURL.bind(URL),
  },
): ManagedIllustrationPort {
  const jobs = new Map<string, RecipeIllustrationJob>()
  let sequence = 0

  return {
    async start(request) {
      const id = `managed-image-${++sequence}`
      const pageIndexes = requestedPageIndexes(request)
      const job: RecipeIllustrationJob = {
        id,
        status: 'running',
        completedPages: 0,
        totalPages: pageIndexes.length,
        pages: [],
      }
      jobs.set(id, job)

      try {
        for (const index of pageIndexes) {
          const blob = await requester({
            ...request,
            pageIndexes: [index],
          })
          job.pages.push({
            index,
            imageUrl: urls.createObjectURL(blob),
          })
          job.completedPages = job.pages.length
        }
        job.status = 'succeeded'
      } catch {
        job.status = 'failed'
        job.error = {
          code: 'IMAGE_UNAVAILABLE',
          message: '图片生成暂时不可用，请稍后重新尝试。',
        }
      }

      return copyJob(job)
    },
    async getJob(jobId) {
      const job = jobs.get(jobId)
      if (!job) throw new Error('食谱插画任务不存在')
      return copyJob(job)
    },
    async remove(jobId) {
      const job = jobs.get(jobId)
      if (!job) return
      for (const page of job.pages) {
        urls.revokeObjectURL(page.imageUrl)
      }
      jobs.delete(jobId)
    },
    dispose() {
      for (const job of jobs.values()) {
        for (const page of job.pages) {
          urls.revokeObjectURL(page.imageUrl)
        }
      }
      jobs.clear()
    },
  }
}
