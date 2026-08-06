import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useAuth } from '@/hooks/use-auth'
import { useAvatar } from '@/hooks/use-avatar'
import {
  AVATAR_COLORS,
  AVATAR_SHAPES,
  AVATAR_SHAPE_LABELS,
  getAvatarColorValue,
} from '@/lib/avatar'
import { cn } from '@/lib/utils'

export function AvatarPicker() {
  const { user } = useAuth()
  const { config, setShape, setColor, reset } = useAvatar()

  return (
    <section
      className="rounded-xl border bg-card p-5"
      aria-labelledby="avatar-picker-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="avatar-picker-title" className="text-lg font-semibold">
            Аватар
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Выберите форму и цвет — инициалы подставятся из имени.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw />
          Сбросить
        </Button>
      </div>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
        <UserAvatar
          name={user?.fullName}
          config={config}
          className="size-24 self-center sm:self-start"
        />

        <div className="flex-1 space-y-5">
          <fieldset>
            <legend className="text-sm font-medium">Форма</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATAR_SHAPES.map((shape) => {
                const isActive = config.shape === shape
                return (
                  <button
                    key={shape}
                    type="button"
                    aria-label={AVATAR_SHAPE_LABELS[shape]}
                    aria-pressed={isActive}
                    onClick={() => setShape(shape)}
                    className={cn(
                      'rounded-xl border p-2 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      isActive
                        ? 'border-primary bg-accent'
                        : 'hover:bg-accent/50',
                    )}
                  >
                    <UserAvatar
                      name={user?.fullName}
                      config={{ ...config, shape }}
                      className="size-10"
                    />
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Цвет</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => {
                const isActive = config.color === color.id
                return (
                  <button
                    key={color.id}
                    type="button"
                    aria-label={color.label}
                    aria-pressed={isActive}
                    onClick={() => setColor(color.id)}
                    style={{ backgroundColor: getAvatarColorValue(color.id) }}
                    className={cn(
                      'size-9 rounded-full transition-transform',
                      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      isActive
                        ? 'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-card'
                        : 'hover:scale-105',
                    )}
                  />
                )
              })}
            </div>
          </fieldset>
        </div>
      </div>
    </section>
  )
}
