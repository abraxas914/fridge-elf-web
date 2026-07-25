import { useEffect, useState } from 'react'
import type { AssistantPort } from '../../app/ports'
import type { AssistantJob } from './types'

export function AssistantResult({
  assistant,
  message,
}: {
  assistant: AssistantPort
  message: string
}) {
  const [job, setJob] = useState<AssistantJob | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let timer: number | undefined

    const readUntilDone = async (current: AssistantJob) => {
      if (!active) return
      setJob(current)
      if (current.status !== 'queued' && current.status !== 'running') return
      timer = window.setTimeout(async () => {
        try {
          const next = await assistant.getAssistantJob(current.id)
          await readUntilDone(next)
        } catch (reason) {
          if (active) {
            setError(reason instanceof Error ? reason.message : '请求失败')
          }
        }
      }, 750)
    }

    void assistant
      .startAssistant(message)
      .then(readUntilDone)
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : '请求失败')
        }
      })

    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [assistant, message])

  if (error) return <div role="alert">{error}</div>
  if (!job || job.status === 'queued' || job.status === 'running') {
    return <div role="status">正在准备建议…</div>
  }
  if (job.status === 'failed') {
    return <div role="alert">{job.error ?? '请求失败'}</div>
  }
  return <div className="recipe-agent-answer">{job.reply}</div>
}
