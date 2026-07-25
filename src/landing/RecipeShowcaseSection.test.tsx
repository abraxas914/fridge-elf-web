import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecipeShowcase } from './RecipeShowcaseSection'

describe('RecipeShowcase', () => {
  it('renders image-only recipe output with the second image active', () => {
    render(<RecipeShowcase />)

    expect(
      screen.getByRole('heading', {
        name: '把做饭这件事，画得更简单。',
      }),
    ).toBeVisible()
    expect(screen.getByText('从食材到上桌，一眼看懂。')).toBeVisible()
    expect(screen.getAllByRole('img')).toHaveLength(4)
    expect(screen.getByTestId('recipe-showcase-image-2')).toHaveAttribute(
      'data-active',
      'true',
    )
    expect(document.body).not.toHaveTextContent(/风格|Skill|小黑/)
  })

  it('uses responsive, complete recipe images with neutral paths', () => {
    render(<RecipeShowcase />)

    const dishNames = ['酸辣土豆丝', '香菇青菜', '宫保鸡丁', '鸡蛋饼']

    screen.getAllByRole('img').forEach((image, index) => {
      expect(image).toHaveAttribute(
        'src',
        `/assets/recipe/recipe-sample-0${index + 1}-v2.webp`,
      )
      expect(image).toHaveAttribute(
        'srcset',
        expect.stringContaining(`recipe-sample-0${index + 1}-v2@2x.webp`),
      )
      expect(image).toHaveAttribute('width', '1200')
      expect(image).toHaveAttribute('height', '1440')
      expect(image).toHaveAttribute(
        'alt',
        `${dishNames[index]}食谱插画示例`,
      )
    })
  })

  it('switches the active image and keeps the demo link same-origin', () => {
    const onOpenDemo = vi.fn()
    render(<RecipeShowcase onOpenDemo={onOpenDemo} />)

    fireEvent.click(
      screen.getByRole('button', {
        name: '查看鸡蛋饼食谱插画示例',
      }),
    )
    expect(screen.getByTestId('recipe-showcase-image-4')).toHaveAttribute(
      'data-active',
      'true',
    )

    fireEvent.click(screen.getByRole('link', { name: '开始制作' }))
    expect(onOpenDemo).toHaveBeenCalledOnce()
    expect(screen.getByRole('link', { name: '开始制作' })).toHaveAttribute(
      'href',
      '/demo',
    )
  })
})
