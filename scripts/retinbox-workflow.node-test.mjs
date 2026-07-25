import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const workflow = await readFile(
  new URL('../.github/workflows/deploy-rth.yml', import.meta.url),
  'utf8',
)

test('runs the Retinbox deploy subcommand explicitly', () => {
  assert.match(
    workflow,
    /deno -Ar https:\/\/host\.retiehe\.com\/cli deploy/,
  )
})

test('does not delegate to the upstream action that omits deploy', () => {
  assert.doesNotMatch(
    workflow,
    /rthsoftware\/host-auto-deploy/,
  )
})
