import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FridgeHeroSvg } from './FridgeHeroSvg'
import { FridgeShelfSvg } from './FridgeShelfSvg'

describe('landing illustrations', () => {
  it('describes the hero and daily-problem scenes accessibly', () => {
    render(
      <>
        <FridgeHeroSvg />
        <FridgeShelfSvg />
      </>,
    )

    expect(
      screen.getByRole('img', {
        name: '冰箱精灵在冰箱旁记录食材',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('img', {
        name: '食材在冰箱层架中逐渐被遮挡',
      }),
    ).toBeVisible()
  })
})
