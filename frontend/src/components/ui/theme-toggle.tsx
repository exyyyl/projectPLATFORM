/* eslint-disable react-refresh/only-export-components */

import { Monitor, Moon, Sun } from 'lucide-react'

import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

const modes = [
  { value: 'light' as const, icon: Sun, label: 'Светлая' },
  { value: 'dark' as const, icon: Moon, label: 'Тёмная' },
  { value: 'system' as const, icon: Monitor, label: 'Системная' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}
