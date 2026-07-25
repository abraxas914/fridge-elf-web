import { describe, expect, it } from 'vitest'
import { parsePastedRecipe } from './pastedRecipe'

describe('parsePastedRecipe', () => {
  it('parses a pasted title, ingredients, and numbered steps', () => {
    expect(
      parsePastedRecipe(`番茄炒蛋
食材
- 番茄 2个
- 鸡蛋 3个
步骤
1. 番茄切块
2. 鸡蛋炒熟
3. 合炒调味`),
    ).toMatchObject({
      title: '番茄炒蛋',
      ingredients: [
        { name: '番茄', amount: '2个' },
        { name: '鸡蛋', amount: '3个' },
      ],
      steps: [
        { order: 1, action: '番茄切块' },
        { order: 2, action: '鸡蛋炒熟' },
        { order: 3, action: '合炒调味' },
      ],
    })
  })

  it('accepts bullet items inside a steps section', () => {
    expect(
      parsePastedRecipe(`凉拌黄瓜
材料
黄瓜 1根
做法
- 拍碎黄瓜
- 加入调味料
- 拌匀装盘`).steps,
    ).toHaveLength(3)
  })

  it('rejects text without ingredients and steps', () => {
    expect(() => parsePastedRecipe('只有一句描述')).toThrow(
      '请粘贴包含菜名、食材和步骤的食谱',
    )
  })

  it('compresses more than six steps without dropping source text', () => {
    const recipe = parsePastedRecipe(`测试菜
食材
- 食材 1份
步骤
1. 动作一
2. 动作二
3. 动作三
4. 动作四
5. 动作五
6. 动作六
7. 动作七`)

    expect(recipe.steps).toHaveLength(6)
    expect(recipe.steps.map((step) => step.action).join('；')).toContain(
      '动作七',
    )
  })
})
