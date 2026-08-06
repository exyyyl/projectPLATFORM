import { Loader2 } from 'lucide-react'

/** Экран на время восстановления сессии — до него неизвестно, пускать или нет. */
export function AuthPending() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Проверка сессии</span>
    </div>
  )
}
