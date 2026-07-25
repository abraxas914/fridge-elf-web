export type IllustrationStyleId =
  | 'xiaohei'
  | 'pixel-person'
  | 'linen-zine'
  | 'watercolor-kitchen'

export type LegacyIllustrationStyleId = 'watercolor' | 'pixel-doodle'

export interface IllustrationStyle {
  id: IllustrationStyleId
  name: string
  englishName: string
  description: string
  characterName: string
  characterLabel: string
  visualPrompt: string
  layoutPrompt: string
}

export interface RecipeIngredient {
  name: string
  amount: string
}

export interface RecipeStep {
  order: number
  action: string
  target: string
  time: string
  heat: string
  doneness: string
}

export interface RecipePage {
  page: number
  isFirst: boolean
  isFinal: boolean
  displayTitle: string
  pageMarker: string
  steps: number[]
  composition: string
  characterActions: Array<{ step: number; action: string }>
  tools: Array<{ step: number; items: string[] }>
  labels: Array<{ step: number; text: string }>
  arrowOrder: number[]
}

export interface RecipePlan {
  title: string
  servings?: string
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  pages: RecipePage[]
}

export interface RecipeIllustrationRecipeV1 {
  id: string
  title: string
  servings?: string
  ingredients: Array<{ name: string; amount?: string }>
  steps: Array<{
    order: number
    action: string
    target?: string
    time?: string
    heat?: string
    doneness?: string
  }>
}

export interface RecipeIllustrationRequestV1 {
  contractVersion: 1
  recipe: RecipeIllustrationRecipeV1
  styleId: IllustrationStyleId
  pageIndexes?: number[]
}

export const ILLUSTRATION_STYLES: readonly IllustrationStyle[] = [
  {
    id: 'xiaohei',
    name: '小黑手绘',
    englishName: 'XIAOHEI INK',
    description: '黑白细线 · 冷幽默',
    characterName: 'Xiaohei',
    characterLabel: 'solid-black Xiaohei with white dot eyes and thin limbs',
    layoutPrompt:
      'Use open whitespace rather than boxes. Connect cells with thin black dashed hand-drawn arrows.',
    visualPrompt:
      'Pure white background. Minimalist black thin slightly wobbly hand-drawn lines, sparse gray hatching only, deadpan humor, generous whitespace. Black and white only. No color, paper texture, shadow, gradient, realistic kitchen, PPT boxes, cards, or infographic chrome.',
  },
  {
    id: 'pixel-person',
    name: '像素小人',
    englishName: 'PIXEL PERSON',
    description: '五色像素 · 小厨师',
    characterName: 'Pixel Cook',
    characterLabel:
      'small clearly human pixel cook with a human head, torso, two arms, two legs and hands',
    layoutPrompt:
      'Use precise 16px rounded cells filled #F0F0F0 with 24px gutters. Connect them with straight segments and 90-degree bends in #2D2D2D.',
    visualPrompt:
      'Pure white #FFFFFF background. Clean flat vector pixel-doodle style with uniform 2–3px #2D2D2D lines. Strict five-color palette only: #2D2D2D, #FF6B35, #4ECDC4, #FFE0D6, #F0F0F0. No horse, animal, mascot, furry, tail, muzzle, paw, claw or hoof traits. No gradients, shadows, perspective, watercolor, texture, or extra colors. At most 2–3 tiny pixel decorations.',
  },
  {
    id: 'linen-zine',
    name: '亚麻手帖',
    englishName: 'LINEN ZINE',
    description: '编辑手帖 · 温手主角',
    characterName: 'Wenshou',
    characterLabel:
      'simplified editorial-illustration hands Wenshou, deep caramel outline, optional linen cuff',
    layoutPrompt:
      'Use 16px rounded rectangular cells, 24px gutters, thin olive-brown borders, colored number badges, and exactly one hero color block. Connect cells with straight clean dashed arrows.',
    visualPrompt:
      'Flat light cream #FDF6EC background with no visible texture. Confident consistent deep caramel #4A3D2A lines. Sage #A8C5A0, coral #E8A895, and warm gold #D4B776 accents. Flat ingredient silhouettes and a bold poster-like completed dish. No watercolor, grain, gradients, shadows, or floating decoration.',
  },
  {
    id: 'watercolor-kitchen',
    name: '水彩厨房',
    englishName: 'WATERCOLOR',
    description: '温暖水彩 · 小刺猬',
    characterName: 'Xiaoci',
    characterLabel:
      'small round hedgehog Xiaoci in olive-brown ink, soft watercolor fill, dot eyes and tiny paws',
    layoutPrompt:
      'Step cells have organic irregular boundaries made by soft watercolor wash blobs, never geometric rectangles. Connect them with thin curved dotted olive-brown arrows.',
    visualPrompt:
      'Light cream background #FDF6EC with barely visible paper grain. Warm olive-brown #7A6B4E loose ink lines. Soft watercolor washes: sage #A8C5A0, coral #E8A895, and warm gold #D4B776. The completed dish is the richest watercolor element. No flat vector icons, geometric grid, bold blocks, or commercial poster styling.',
  },
] as const

const STYLE_BY_ID = new Map(
  ILLUSTRATION_STYLES.map((style) => [style.id, style]),
)

const SECTION_INGREDIENTS = /^(?:#+\s*)?(?:食材|材料|配料)\s*[：:]?\s*$/
const SECTION_STEPS = /^(?:#+\s*)?(?:步骤|做法|制作步骤)\s*[：:]?\s*$/
const SERVINGS = /^(?:份量|分量|用量|人数)\s*[：:]\s*(.+)$/
const ORDERED_STEP =
  /^(?:步骤\s*)?([0-9]{1,2}|[一二三四五六七八九十]+)\s*[.、）):：]\s*(.+)$/
const BULLET = /^\s*[-*+•]\s*/
const AMOUNT =
  /^(.*?)(?:\s+|[：:])((?:约\s*)?(?:\d+(?:\.\d+)?(?:\/\d+)?|半|一|两|二|三|四|五|六|七|八|九|十).+|适量|少许)$/
const TIME =
  /(?:约\s*)?\d+(?:\.\d+)?(?:\s*[-–~至]\s*\d+(?:\.\d+)?)?\s*(?:秒钟?|分钟|小时)/g
const HEAT = /(?:小火|中小火|中火|中大火|大火|文火|旺火)/
const DONENESS = /至([^，。；\n]{1,12})/

function compactText(text: string, max: number) {
  return Array.from(text.trim()).slice(0, max).join('')
}

function cleanLine(line: string) {
  return line.trim().replace(/\r/g, '')
}

function parseIngredient(line: string): RecipeIngredient | null {
  const value = cleanLine(line).replace(BULLET, '').replace(/[，。,；;]+$/, '')
  if (!value) return null
  const match = value.match(AMOUNT)
  if (!match) return { name: value, amount: '' }
  return { name: match[1].trim(), amount: match[2].trim() }
}

function compressIngredients(
  ingredients: RecipeIngredient[],
): RecipeIngredient[] {
  if (ingredients.length <= 8) return ingredients
  const kept = ingredients.slice(0, 7)
  const grouped = ingredients.slice(7)
  const seasoningPattern =
    /盐|糖|油|醋|酱|胡椒|香料|味精|鸡精|料酒|孜然|花椒/
  const allSeasonings = grouped.every((item) => seasoningPattern.test(item.name))
  const detail = grouped
    .map((item) => `${item.name}${item.amount ? ` ${item.amount}` : ''}`)
    .join('、')
  return [
    ...kept,
    {
      name: `${allSeasonings ? '其他调味料' : '其他食材'}（${detail}）`,
      amount: '',
    },
  ]
}

function inferTools(action: string) {
  if (/切|剁|拍开|切碎|切片|切块|切丝/.test(action)) return ['刀', '砧板']
  if (/烤/.test(action)) return ['烤盘', '烤箱']
  if (/沥|滤/.test(action)) return ['筛网']
  if (/煎|炒|翻炒|倒油|锅中|开火/.test(action)) return ['锅', '锅铲']
  if (/煮|炖|焖/.test(action)) return ['锅']
  if (/搅|拌|打散|打匀|打发/.test(action)) return ['碗', '搅拌器具']
  if (/盛|装碗/.test(action)) return ['碗', '勺']
  if (/撒|调味|加入|放入|倒入/.test(action)) return ['容器']
  return []
}

function makeLabel(action: string) {
  const withoutPunctuation = action.replace(/[，。；、,.!?！？：:]/g, '')
  return compactText(withoutPunctuation, 10)
}

function buildPages(title: string, steps: RecipeStep[]): RecipePage[] {
  const total = Math.ceil(steps.length / 6)
  return Array.from({ length: total }, (_, index) => {
    const pageSteps = steps.slice(index * 6, index * 6 + 6)
    const orders = pageSteps.map((step) => step.order)
    const isFirst = index === 0
    const isFinal = index === total - 1
    return {
      page: index + 1,
      isFirst,
      isFinal,
      displayTitle: title,
      pageMarker: `第${index + 1}/${total}页`,
      steps: orders,
      composition: isFirst
        ? `顶部标题与食材；中部${pageSteps.length}格蛇形步骤；${isFinal ? '底部完成料理' : '底部克制预览'}`
        : `顶部精简标题与页码；中部${pageSteps.length}格蛇形步骤；${isFinal ? '底部完成料理' : '底部留白'}`,
      characterActions: pageSteps.map((step) => ({
        step: step.order,
        action: step.action,
      })),
      tools: pageSteps.map((step) => ({
        step: step.order,
        items: inferTools(step.action),
      })),
      labels: pageSteps.map((step) => ({
        step: step.order,
        text: makeLabel(step.action),
      })),
      arrowOrder: orders,
    }
  })
}

export function compileRecipePlan(source: string): RecipePlan {
  if (typeof source !== 'string' || source.length > 4_000) {
    throw new Error('食谱正文必须是 1–4000 个字符')
  }
  const lines = source.split('\n').map(cleanLine)
  const nonEmpty = lines.filter(Boolean)
  const first = nonEmpty[0]?.replace(/^#+\s*/, '').trim() ?? ''
  const title = compactText(first, 12)

  let section: 'ingredients' | 'steps' | null = null
  let servings: string | undefined
  const ingredients: RecipeIngredient[] = []
  const steps: RecipeStep[] = []

  for (const rawLine of lines.slice(lines.indexOf(nonEmpty[0]) + 1)) {
    if (!rawLine) continue
    if (SECTION_INGREDIENTS.test(rawLine)) {
      section = 'ingredients'
      continue
    }
    if (SECTION_STEPS.test(rawLine)) {
      section = 'steps'
      continue
    }
    const servingsMatch = rawLine.match(SERVINGS)
    if (servingsMatch) {
      servings = servingsMatch[1].trim()
      continue
    }
    const stepMatch = rawLine.replace(BULLET, '').match(ORDERED_STEP)
    if (stepMatch) {
      section = 'steps'
      const action = stepMatch[2].trim()
      steps.push({
        order: steps.length + 1,
        action,
        target: action,
        time: action.match(TIME)?.join('；') ?? '',
        heat: action.match(HEAT)?.[0] ?? '',
        doneness: action.match(DONENESS)?.[1]?.trim() ?? '',
      })
      continue
    }
    if (section === 'ingredients') {
      const ingredient = parseIngredient(rawLine)
      if (ingredient) ingredients.push(ingredient)
    }
  }

  if (!title || ingredients.length === 0 || steps.length === 0) {
    throw new Error('请输入包含菜名、食材和编号步骤的中文食谱')
  }

  const plan: RecipePlan = {
    title,
    ingredients: compressIngredients(ingredients),
    steps,
    pages: buildPages(title, steps),
  }
  if (servings) plan.servings = servings
  return plan
}

export function isIllustrationStyleId(
  value: unknown,
): value is IllustrationStyleId {
  return typeof value === 'string' && STYLE_BY_ID.has(value as IllustrationStyleId)
}

export function normalizeIllustrationStyleId(
  value: unknown,
): IllustrationStyleId | null {
  if (isIllustrationStyleId(value)) return value
  if (value === 'watercolor') return 'watercolor-kitchen'
  if (value === 'pixel-doodle') return 'pixel-person'
  return null
}

export function createRecipeIllustrationRequestV1(
  plan: RecipePlan,
  styleId: IllustrationStyleId,
  pageIndexes: number[],
  recipeId = 'web-preview-recipe',
): RecipeIllustrationRequestV1 {
  return {
    contractVersion: 1,
    recipe: {
      id: recipeId,
      title: plan.title,
      ...(plan.servings ? { servings: plan.servings } : {}),
      ingredients: plan.ingredients.map(({ name, amount }) => ({
        name,
        ...(amount ? { amount } : {}),
      })),
      steps: plan.steps.map(
        ({ order, action, target, time, heat, doneness }) => ({
          order,
          action,
          ...(target ? { target } : {}),
          ...(time ? { time } : {}),
          ...(heat ? { heat } : {}),
          ...(doneness ? { doneness } : {}),
        }),
      ),
    },
    styleId,
    pageIndexes,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
) {
  const value = record[key]
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > maxLength
  ) {
    throw new Error(`食谱字段 ${key} 无效`)
  }
  return value.trim()
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
) {
  const value = record[key]
  if (value === undefined) return ''
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new Error(`食谱字段 ${key} 无效`)
  }
  return value.trim()
}

export function buildRecipePlanFromStructuredRecipe(
  value: unknown,
): RecipePlan {
  if (!isRecord(value)) throw new Error('结构化食谱无效')
  requiredString(value, 'id', 128)
  const title = requiredString(value, 'title', 12)
  const servings = optionalString(value, 'servings', 64)
  if (
    !Array.isArray(value.ingredients) ||
    value.ingredients.length < 1 ||
    value.ingredients.length > 100
  ) {
    throw new Error('食材列表无效')
  }
  if (
    !Array.isArray(value.steps) ||
    value.steps.length < 1 ||
    value.steps.length > 72
  ) {
    throw new Error('步骤列表无效')
  }

  const ingredients = value.ingredients.map((item) => {
    if (!isRecord(item)) throw new Error('食材条目无效')
    return {
      name: requiredString(item, 'name', 64),
      amount: optionalString(item, 'amount', 64),
    }
  })
  const steps = value.steps.map((item, index) => {
    if (!isRecord(item) || item.order !== index + 1) {
      throw new Error('食谱步骤必须从 1 开始连续递增')
    }
    return {
      order: index + 1,
      action: requiredString(item, 'action', 500),
      target: optionalString(item, 'target', 500),
      time: optionalString(item, 'time', 100),
      heat: optionalString(item, 'heat', 100),
      doneness: optionalString(item, 'doneness', 100),
    }
  })
  const plan: RecipePlan = {
    title,
    ingredients: compressIngredients(ingredients),
    steps,
    pages: buildPages(title, steps),
  }
  if (servings) plan.servings = servings
  return plan
}

export function buildIllustrationPrompt(
  plan: RecipePlan,
  styleId: IllustrationStyleId,
  pageNumber: number,
) {
  const style = STYLE_BY_ID.get(styleId)
  const page = plan.pages[pageNumber - 1]
  if (!style || !page) throw new Error('未知的插画风格或页码')
  const stepByOrder = new Map(plan.steps.map((step) => [step.order, step]))
  const actionByOrder = new Map(
    page.characterActions.map((item) => [item.step, item.action]),
  )
  const toolsByOrder = new Map(
    page.tools.map((item) => [item.step, item.items]),
  )
  const labelsByOrder = new Map(
    page.labels.map((item) => [item.step, item.text]),
  )

  const lockedText = [
    `- Display title: "${page.displayTitle}"`,
    `- Page marker: "${page.pageMarker}"`,
    ...(page.isFirst
      ? plan.ingredients.map(
          (item) =>
            `- Ingredient: "${item.name}${item.amount ? ` ${item.amount}` : ''}"`,
        )
      : []),
    ...page.labels.map((item) => `- Step label: "${item.text}"`),
  ].join('\n')

  const stepLines = page.steps
    .map((order) => {
      const step = stepByOrder.get(order)
      if (!step) throw new Error(`缺少步骤 ${order}`)
      const facts = [
        step.time && `Time: ${step.time}.`,
        step.heat && `Heat: ${step.heat}.`,
        step.doneness && `Doneness: ${step.doneness}.`,
      ]
        .filter(Boolean)
        .join(' ')
      return `${order}. ${style.characterName} action: ${actionByOrder.get(order)} Target: ${step.target}. Tools: ${(toolsByOrder.get(order) ?? []).join('、') || 'none shown unless required'}. Exact label: "${labelsByOrder.get(order)}". ${facts}`.trim()
    })
    .join('\n')

  return `Generate one standalone recipe instruction page, exactly 1200×1440 pixels in a 5:6 portrait aspect ratio.

PAGE
RecipePlan flags: is_first=${page.isFirst}; is_final=${page.isFinal}.
Draw the exact display title "${page.displayTitle}" and exact page marker "${page.pageMarker}".

EXACT CHINESE TEXT — draw only these quoted strings, verbatim:
${lockedText}
Do not add, paraphrase, translate, correct, or decorate any Chinese text.

LAYOUT
Keep every element inside a 10% safe margin.
${page.isFirst ? 'Place the title and compact ingredient area at the top.' : 'Place only the short title and page marker at the top. Do not repeat the ingredient area.'}
Place steps in a two-column by three-row middle area. Use only the required cells.
${page.isFinal ? `End with the completed dish "${plan.title}" at the bottom.` : 'Do not depict the completed dish as the result of unfinished steps.'}
Follow this exact snake order: ${page.arrowOrder.join(' → ')}.
${style.layoutPrompt}

STEPS
${stepLines}
Preserve the given numbers and order. Every ${style.characterName} (${style.characterLabel}) must grip, move, or control the food or tool performing the actual cooking action. No observing, sign-holding, pointing, idle hands, or decorative character.

VISUAL STYLE
${style.visualPrompt}

TEXT LOCK
Do not invent any quantity, time, temperature, heat, cut size, doneness, safety advice, serving advice, title, caption, label, speech, watermark, or decorative text. Draw no text beyond the exact quoted strings above.`
}
