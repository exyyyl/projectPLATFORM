import { describe, expect, it } from 'vitest'

import { Button } from '../button'
import { renderWithProviders, screen } from '@/test/utils'

describe('Button', () => {
  it('renders with text', () => {
    renderWithProviders(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('renders as child element when asChild is true', () => {
    renderWithProviders(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>,
    )
    expect(screen.getByRole('link', { name: 'Link' })).toBeInTheDocument()
  })

  it('is disabled when disabled prop is passed', () => {
    renderWithProviders(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
