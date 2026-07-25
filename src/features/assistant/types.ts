export interface AssistantJob {
  id: string
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  reply?: string
  error?: string
}
