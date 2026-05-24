import { describe, expect, it } from 'vitest'

import { ThemeToggle } from '../theme-toggle'
import { renderWithProviders, screen, userEvent } from '@/test/utils'

describe('ThemeToggle', () => {
  it('renders three mode buttons', () => {
    renderWithProviders(<ThemeToggle />)

    expect(screen.getByRole('button', { name: 'Светлая' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Тёмная' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Системная' })).toBeInTheDocument()
  })

  it('switches theme on click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Тёмная' }))
    expect(localStorage.getItem('theme')).toBe('dark')

    await user.click(screen.getByRole('button', { name: 'Светлая' }))
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
