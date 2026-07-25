import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const lockPath = resolve('config/upstream-baseline.json')
const lock = JSON.parse(await readFile(lockPath, 'utf8'))
const allowed = new Set(lock.allowedOverrides)

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await filesUnder(path))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }
  return files
}

const files = {}
for (const root of lock.productRoots) {
  for (const absolute of await filesUnder(resolve(root))) {
    const path = relative(process.cwd(), absolute)
    if (allowed.has(path)) continue
    const content = await readFile(absolute)
    files[path] = createHash('sha256').update(content).digest('hex')
  }
}

lock.files = Object.fromEntries(
  Object.entries(files).sort(([left], [right]) =>
    left.localeCompare(right),
  ),
)
await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
