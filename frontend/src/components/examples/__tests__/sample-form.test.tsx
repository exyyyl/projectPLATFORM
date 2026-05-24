import { describe, expect, it } from 'vitest'

import { SampleForm } from '../sample-form'
import { renderWithProviders, screen, userEvent } from '@/test/utils'

describe('SampleForm', () => {
  it('renders email and name inputs', () => {
    renderWithProviders(<SampleForm />)

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Имя')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SampleForm />)

    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(await screen.findByText('Введите корректный email')).toBeInTheDocument()
    expect(await screen.findByText('Минимум 2 символа')).toBeInTheDocument()
  })

  it('shows email validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SampleForm />)

    await user.type(screen.getByPlaceholderText('Email'), 'invalid')
    await user.type(screen.getByPlaceholderText('Имя'), 'Тест')
    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(await screen.findByText('Введите корректный email')).toBeInTheDocument()
  })
})
