import { RouterProvider } from 'react-router-dom'

import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/providers/auth-provider'
import { AvatarProvider } from '@/providers/avatar-provider'
import { QueryProvider } from '@/providers/query-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { router } from '@/router'

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryProvider>
          <AuthProvider>
            <AvatarProvider>
              <RouterProvider router={router} />
              <Toaster />
            </AvatarProvider>
          </AuthProvider>
        </QueryProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
