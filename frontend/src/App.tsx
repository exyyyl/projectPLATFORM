import { RouterProvider } from 'react-router-dom'

import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Toaster } from '@/components/ui/toaster'
import { QueryProvider } from '@/providers/query-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { router } from '@/router'

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryProvider>
          <RouterProvider router={router} />
          <Toaster />
        </QueryProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
