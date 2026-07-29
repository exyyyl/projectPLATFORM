/* eslint-disable react-refresh/only-export-components */

import { Toaster as Sonner } from 'sonner'

import { useTheme } from '@/hooks/use-theme'

export function Toaster() {
  const { resolved } = useTheme()

  return (
    <Sonner
      theme={resolved}
      richColors
      position="bottom-right"
      toastOptions={{
        className: 'font-sans',
      }}
    />
  )
}
