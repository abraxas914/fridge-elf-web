export async function inlineViteHtml(html, readAsset) {
  let result = html.replace(
    /[ \t]*<link\b[^>]*\brel="modulepreload"[^>]*>\s*/g,
    '',
  )

  result = await replaceAsync(
    result,
    /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g,
    async (_match, assetPath) => {
      const css = await requireAsset(readAsset, assetPath)
      return `<style>${css.replaceAll('</style', '<\\/style')}</style>`
    },
  )

  return replaceAsync(
    result,
    /<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g,
    async (_match, assetPath) => {
      const javascript = await requireAsset(readAsset, assetPath)
      return `<script type="module">${javascript.replaceAll(
        '</script',
        '<\\/script',
      )}</script>`
    },
  )
}

async function requireAsset(readAsset, assetPath) {
  const content = await readAsset(assetPath)
  if (typeof content !== 'string') {
    throw new Error(`Missing Vite asset: ${assetPath}`)
  }
  return content
}

async function replaceAsync(source, pattern, replacer) {
  const matches = [...source.matchAll(pattern)]
  const replacements = await Promise.all(
    matches.map((match) => replacer(...match)),
  )
  let index = 0
  return source.replace(pattern, () => replacements[index++])
}
