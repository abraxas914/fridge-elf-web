import type { RecipeIllustrationStyleId } from './types'

export interface RecipeIllustrationStyle {
  id: RecipeIllustrationStyleId
  label: string
  sourceSkill: string
  actionSubject: string
  visualPrompt: string
}

export const RECIPE_ILLUSTRATION_STYLES:
  readonly RecipeIllustrationStyle[] = [
    {
      id: 'xiaohei',
      label: '小黑手绘',
      sourceSkill: 'recipe-xiaohei-illustrations',
      actionSubject: 'Xiaohei',
      visualPrompt:
        'Pure white background; minimalist black thin slightly wobbly hand-drawn lines; sparse gray hatching only. The recurring solid-black Xiaohei character has white dot eyes and thin limbs. In every step Xiaohei must grip, move or control the exact food or tool. No color, texture, shadow, gradient, PPT boxes or decorative mascot pose.',
    },
    {
      id: 'pixel-person',
      label: '像素小人',
      sourceSkill: 'recipe-pixel-doodle-illustrations',
      actionSubject: 'the same human pixel cook',
      visualPrompt:
        'Pure white background and clean flat pixel-doodle composition. The recurring character is a clearly human pixel cook with a human head, torso, two arms, two legs and hands. Strict five-color palette: #2D2D2D, #FF6B35, #4ECDC4, #FFE0D6 and #F0F0F0. Uniform 2-3px lines, rounded step cells and 90-degree pixel arrows; no horse, no animal, no mascot, no furry, tail, muzzle, paw, claw or hoof traits; no gradient, shadow, watercolor or texture.',
    },
    {
      id: 'linen-zine',
      label: '亚麻手帖',
      sourceSkill: 'recipe-linen-zine-illustrations',
      actionSubject: 'Wenshou editorial hands',
      visualPrompt:
        'Flat light-cream #FDF6EC background without texture; deep caramel #4A3D2A consistent editorial lines. Wenshou is a pair of simplified hands that must grip and control the exact food or tool in every step. Use 16px rounded cells, 24px gutters, sage #A8C5A0, coral #E8A895 and gold #D4B776 badges, one hero color block and flat ingredient silhouettes. No watercolor, floating decoration, gradient, shadow or idle hand gestures.',
    },
    {
      id: 'watercolor-kitchen',
      label: '水彩厨房',
      sourceSkill: 'recipe-watercolor-kitchen-illustrations',
      actionSubject: 'Xiaoci the small hedgehog',
      visualPrompt:
        'Light cream #FDF6EC background with barely visible paper grain; warm olive-brown #7A6B4E hand-drawn ink and soft watercolor fills. Xiaoci is a small round hedgehog who must grip and control the exact food or tool in every step. Use organic watercolor wash boundaries in sage #A8C5A0, coral #E8A895 and gold #D4B776, curved dotted arrows and at most three tiny decorations. No geometric grid, flat vector blocks, pure black linework or pure white background.',
    },
  ] as const

export function getRecipeIllustrationStyle(
  id: RecipeIllustrationStyleId,
): RecipeIllustrationStyle {
  const style = RECIPE_ILLUSTRATION_STYLES.find(
    (candidate) => candidate.id === id,
  )
  if (!style) throw new Error(`Unknown recipe illustration style: ${id}`)
  return style
}
