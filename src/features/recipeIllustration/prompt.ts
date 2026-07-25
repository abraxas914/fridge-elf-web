import type {
  RecipeIllustrationPagePlan,
  RecipeIllustrationPlan,
  RecipeIllustrationStyleId,
  RecipeIllustrationStep,
} from './types'
import { getRecipeIllustrationStyle } from './styles'

function quoted(value: string): string {
  return `"${value.replaceAll('"', '”')}"`
}

function ingredientLabel(name: string, amount?: string): string {
  return amount ? `${name} ${amount}` : name
}

function stepLabel(step: RecipeIllustrationStep): string {
  return [...step.action.trim()].slice(0, 10).join('')
}

export function buildRecipePagePrompt(
  plan: RecipeIllustrationPlan,
  page: RecipeIllustrationPagePlan,
  styleId: RecipeIllustrationStyleId,
): string {
  const style = getRecipeIllustrationStyle(styleId)
  const exactIngredients = page.displayIngredients
    .map((ingredient) =>
      `- ${quoted(ingredientLabel(ingredient.name, ingredient.amount))}`,
    )
    .join('\n')
  const exactSteps = page.steps
    .map((step) => `- ${quoted(stepLabel(step))}`)
    .join('\n')
  const stepDetails = page.steps
    .map(
      (step) =>
        `${step.order}. ${style.actionSubject} performs ${step.action}` +
        `${step.target ? ` on ${step.target}` : ''}. ` +
        `Exact label: ${quoted(stepLabel(step))}.`,
    )
    .join('\n')
  const arrowOrder = page.steps.map((step) => step.order).join(' → ')

  return `Generate one standalone Chinese recipe instruction page, exactly 1200×1440 pixels in a 5:6 portrait aspect ratio.

PAGE
RecipePlan flags: is_first=${page.isFirst}; is_final=${page.isFinal}.
Display title: ${quoted(plan.recipe.title)}
Page marker: ${quoted(page.marker)}

EXACT CHINESE TEXT — draw only these quoted strings, verbatim:
- ${quoted(plan.recipe.title)}
- ${quoted(page.marker)}
${exactIngredients}
${exactSteps}
Do not add, paraphrase, translate, correct or decorate any Chinese text.

LAYOUT
Keep every element inside a 10% safe margin.
${page.isFirst ? 'Place the compact ingredient area at the top.' : 'Do not repeat the ingredient area on this later page.'}
Place steps in a two-column by three-row snake sequence.
Arrow order: ${arrowOrder}
${page.isFinal ? 'End with the completed dish at the bottom.' : 'Do not show an unfinished dish as completed.'}

STEPS
${stepDetails}
Every action subject must grip, move or control the food or tool that performs the real cooking action. No observing, sign-holding, pointing or decorative character.

VISUAL STYLE
Source profile: ${style.sourceSkill}.
${style.visualPrompt}

TEXT AND FACT LOCK
Do not invent any quantity, time, temperature, heat, cut size, doneness, safety advice, serving advice, title, caption, label, speech, watermark or decorative text. Preserve the given step numbers and order.`
}
