import type {
  RecipeIllustrationIngredient,
  RecipeIllustrationRecipe,
  RecipeIllustrationStep,
} from '../../features/recipeIllustration/types'

const INGREDIENT_HEADING = /^(食材|材料|用料)(清单)?[：:]?$/
const STEP_HEADING = /^(步骤|做法|制作方法)[：:]?$/
const NUMBERED_STEP = /^(?:步骤\s*)?\d+\s*[.、)）：:]\s*(.+)$/
const BULLET = /^[-*•·]\s*/
const AMOUNT =
  /^(.+?)[\s：:]+((?:约\s*)?(?:\d+(?:\.\d+)?\s*)?(?:克|g|千克|kg|毫升|ml|升|l|个|颗|只|根|片|勺|茶匙|汤匙|杯|碗|份|把|瓣|块|条|盒|袋|罐|张)|适量|少许)$/i
const MAX_POSTER_STEPS = 6

function cleanLine(line: string) {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(BULLET, '')
    .trim()
}

function parseIngredient(line: string): RecipeIllustrationIngredient {
  const match = cleanLine(line).match(AMOUNT)
  if (!match) return { name: cleanLine(line) }
  return {
    name: match[1].trim(),
    amount: match[2].replace(/\s+/g, ''),
  }
}

function compressSteps(actions: string[]): RecipeIllustrationStep[] {
  if (actions.length <= MAX_POSTER_STEPS) {
    return actions.map((action, index) => ({
      order: index + 1,
      action,
    }))
  }

  const buckets = Array.from(
    { length: MAX_POSTER_STEPS },
    () => [] as string[],
  )
  actions.forEach((action, index) => {
    const bucket = Math.min(
      MAX_POSTER_STEPS - 1,
      Math.floor((index * MAX_POSTER_STEPS) / actions.length),
    )
    buckets[bucket].push(action)
  })
  return buckets.map((bucket, index) => ({
    order: index + 1,
    action: bucket.join('；'),
  }))
}

function recipeId(source: string) {
  let hash = 2166136261
  for (const character of source) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return `pasted-${(hash >>> 0).toString(36)}`
}

export function parsePastedRecipe(
  source: string,
): RecipeIllustrationRecipe {
  const lines = source.split(/\r?\n/).map((line) => line.trim())
  const firstIndex = lines.findIndex(Boolean)
  const title =
    firstIndex >= 0 ? cleanLine(lines[firstIndex]).slice(0, 80) : ''
  let section: 'ingredients' | 'steps' | null = null
  const ingredients: RecipeIllustrationIngredient[] = []
  const actions: string[] = []

  for (const sourceLine of lines.slice(firstIndex + 1)) {
    if (!sourceLine) continue
    const line = cleanLine(sourceLine)
    if (INGREDIENT_HEADING.test(line)) {
      section = 'ingredients'
      continue
    }
    if (STEP_HEADING.test(line)) {
      section = 'steps'
      continue
    }

    const numbered = line.match(NUMBERED_STEP)
    if (numbered) {
      section = 'steps'
      actions.push(numbered[1].trim())
      continue
    }
    if (section === 'ingredients') {
      ingredients.push(parseIngredient(sourceLine))
    } else if (section === 'steps') {
      actions.push(line)
    }
  }

  if (!title || ingredients.length === 0 || actions.length === 0) {
    throw new Error('请粘贴包含菜名、食材和步骤的食谱')
  }

  return {
    id: recipeId(source),
    title,
    ingredients,
    steps: compressSteps(actions),
  }
}
