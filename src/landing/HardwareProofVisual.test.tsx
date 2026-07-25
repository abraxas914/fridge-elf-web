import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HardwareProofVisual } from './HardwareProofVisual'

describe('HardwareProofVisual', () => {
  it('renders the approved lazy image with stable dimensions', () => {
    render(<HardwareProofVisual />)
    const image = screen.getByRole('img', {
      name: '同时运行 Fridge Elf 的手机端与冰箱硬件终端原型',
    })

    expect(image).toHaveAttribute(
      'src',
      '/assets/hardware/fridge-elf-prototype-01-v1.webp',
    )
    expect(image).toHaveAttribute('width', '1434')
    expect(image).toHaveAttribute('height', '1070')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('decoding', 'async')
    expect(screen.getByTestId('hardware-proof')).toHaveAttribute(
      'data-photo-ready',
      'false',
    )
  })

  it('reveals only a loaded photo and records image failure', () => {
    render(<HardwareProofVisual />)
    const image = screen.getByRole('img', {
      name: '同时运行 Fridge Elf 的手机端与冰箱硬件终端原型',
    })
    const proof = screen.getByTestId('hardware-proof')

    fireEvent.load(image)
    expect(proof).toHaveAttribute('data-photo-ready', 'true')
    expect(proof).toHaveAttribute('data-photo-failed', 'false')

    fireEvent.error(image)
    expect(proof).toHaveAttribute('data-photo-ready', 'false')
    expect(proof).toHaveAttribute('data-photo-failed', 'true')
    expect(
      screen.getByRole('img', {
        name: '冰箱旁的小屏与手机共享同一份库存',
      }),
    ).toBeVisible()
  })
})
