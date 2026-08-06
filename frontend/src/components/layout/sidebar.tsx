import { useQuery } from '@tanstack/react-query'
import { BookOpen, GraduationCap, Home, LogOut, Newspaper } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useAuth } from '@/hooks/use-auth'
import { useAvatar } from '@/hooks/use-avatar'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Главная', icon: Home },
  { to: '/courses', label: 'Курсы', icon: BookOpen },
  { to: '/news', label: 'Новости', icon: Newspaper },
]

type HealthResponse = { status: string; timestamp: string }

/** Наполнение панели. Одно и то же на десктопе и в мобильной шторке. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const { config: avatarConfig } = useAvatar()
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthResponse>('/health'),
  })

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <GraduationCap className="size-6 shrink-0 text-primary" />
        <span className="truncate font-semibold">projectPLATFORM</span>
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
        aria-label="Основная навигация"
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <link.icon className="size-4 shrink-0" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t p-3">
        <div className="flex items-center justify-between gap-2 px-1 pb-3">
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

        <Link
          to="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <UserAvatar name={user?.fullName} config={avatarConfig} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.fullName}</div>
            <div className="truncate text-xs text-muted-foreground">
              {user?.email}
            </div>
          </div>
        </Link>

        <Button
          variant="ghost"
          className="mt-1 w-full justify-start text-muted-foreground"
          onClick={() => void logout()}
        >
          <LogOut />
          Выйти
        </Button>
      </div>
    </>
  )
}

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {/*
        Десктоп и мобильная шторка — два отдельных рендера, а не одна панель со
        сдвигом. Спрятанная сдвигом панель остаётся в потоке фокуса: по Tab на
        телефоне можно уехать в невидимые ссылки. display:none такого не даёт.
      */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <SidebarContent />
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Закрыть меню"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r bg-card shadow-xl">
            <SidebarContent onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  )
}
