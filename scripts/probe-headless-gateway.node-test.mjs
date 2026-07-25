import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatProbeReport,
  summarizeCompletionPayload,
  summarizeModelPayload,
} from './probe-headless-gateway.mjs'

test('reports only response structure and never provider content', () => {
  const secret = 'sk-test-secret-that-must-never-appear'
  const providerText = 'sensitive completion text'
  const report = formatProbeReport({
    modelsStatus: 200,
    modelsShape: summarizeModelPayload({
      data: [{ id: 'gpt-5.4' }, { id: 'claude-sonnet-4-6' }],
    }),
    completionStatus: 200,
    completionModel: 'gpt-5.4',
    completionShape: summarizeCompletionPayload({
      choices: [{ message: { content: providerText } }],
    }),
  })

  assert.match(report, /models status=200 shape=data-array:2/)
  assert.match(
    report,
    /completion status=200 model=gpt-5\.4 shape=choices-message-content/,
  )
  assert.doesNotMatch(report, new RegExp(secret))
  assert.doesNotMatch(report, new RegExp(providerText))
  assert.doesNotMatch(report, /authorization|Bearer|prompt/i)
})
