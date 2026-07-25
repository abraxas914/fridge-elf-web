import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeviceSyncSvg } from './DeviceSyncSvg'
import { FridgeHeroSvg } from './FridgeHeroSvg'
import { FridgeShelfSvg } from './FridgeShelfSvg'
import { LifecycleSvg } from './LifecycleSvg'
import { MultimodalSvg } from './MultimodalSvg'

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

  it('describes lifecycle, shared inventory, and multimodal input scenes', () => {
    render(
      <>
        <LifecycleSvg />
        <DeviceSyncSvg />
        <MultimodalSvg />
      </>,
    )

    expect(
      screen.getByRole('img', {
        name: '食材从购买到再次入库的六步循环',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('img', {
        name: '冰箱旁的小屏与手机共享同一份库存',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('img', {
        name: '语音视觉触摸和文字共同完成食材录入',
      }),
    ).toBeVisible()
  })
})
