import { useQuery } from '@tanstack/react-query'

import { ThemeToggle } from '@/components/ui/theme-toggle'
import { apiFetch } from '@/lib/api'

type HealthResponse = { status: string; timestamp: string }

export function Header() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthResponse>('/health'),
  })

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">
            projectPLATFORM
          </h1>
          <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary sm:inline-block">
            dev
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            API:{' '}
            {health.isLoading ? (
              'проверка...'
            ) : health.isError ? (
              <span className="text-destructive">недоступен</span>
            ) : (
              <span className="text-success">{health.data?.status}</span>
            )}
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
