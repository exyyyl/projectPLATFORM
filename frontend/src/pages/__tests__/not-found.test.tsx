import { describe, expect, it } from 'vitest'

import { NotFoundPage } from '../not-found'
import { renderWithProviders, screen } from '@/test/utils'

describe('NotFoundPage', () => {
  it('renders 404 heading and link to home', () => {
    renderWithProviders(<NotFoundPage />)

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Страница не найдена')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/')
  })
})
