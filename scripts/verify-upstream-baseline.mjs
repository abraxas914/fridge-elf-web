import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SHA = /^[0-9a-f]{7,40}$/i
const TAG = /^v\d+\.\d+\.\d+$/

export function validateBaseline(baseline) {
  const errors = []
  if (
    baseline.repository !==
    'https://github.com/YantingShen-dev/fridge_app.git'
  ) {
    errors.push('unexpected upstream repository')
  }
  if (!TAG.test(baseline.tag ?? '')) errors.push('invalid semantic tag')
  if (!SHA.test(baseline.commit ?? '')) errors.push('invalid commit')
  if (baseline.sourcePath !== 'apps/android/web') {
    errors.push('invalid source path')
  }
  if (!Array.isArray(baseline.allowedOverrides)) {
    errors.push('missing overrides')
  }
  if (!baseline.files || typeof baseline.files !== 'object') {
    errors.push('missing files')
  }
  return errors
}

export async function verifyBaselineFiles(
  baseline,
  root = process.cwd(),
) {
  const errors = validateBaseline(baseline)
  const allowed = new Set(baseline.allowedOverrides)
  let checkedFiles = 0
  for (const [path, expected] of Object.entries(baseline.files ?? {})) {
    if (allowed.has(path)) continue
    try {
      const content = await readFile(resolve(root, path))
      const actual = createHash('sha256').update(content).digest('hex')
      checkedFiles += 1
      if (actual !== expected) errors.push(`upstream drift: ${path}`)
    } catch {
      errors.push(`missing upstream file: ${path}`)
    }
  }
  return { checkedFiles, errors }
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (isMain) {
  const baseline = JSON.parse(
    await readFile(resolve('config/upstream-baseline.json'), 'utf8'),
  )
  const result = await verifyBaselineFiles(baseline)
  if (result.errors.length) {
    result.errors.forEach((error) => console.error(error))
    process.exitCode = 1
  } else {
    console.info(
      `Verified ${result.checkedFiles} upstream product files`,
    )
  }
}
