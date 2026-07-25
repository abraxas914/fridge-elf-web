import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  validateBaseline,
  verifyBaselineFiles,
} from './verify-upstream-baseline.mjs'

const baseline = JSON.parse(
  await readFile(new URL('../config/upstream-baseline.json', import.meta.url)),
)

test('locks the released product baseline', () => {
  assert.deepEqual(
    {
      repository: baseline.repository,
      tag: baseline.tag,
      commit: baseline.commit,
      sourcePath: baseline.sourcePath,
    },
    {
      repository: 'https://github.com/YantingShen-dev/fridge_app.git',
      tag: 'v1.0.0',
      commit: '50364b2',
      sourcePath: 'apps/android/web',
    },
  )
  assert.deepEqual(validateBaseline(baseline), [])
})

test('verifies the synchronized release product files', async () => {
  const result = await verifyBaselineFiles(baseline)
  assert.deepEqual(result.errors, [])
  assert.ok(result.checkedFiles > 20)
})
