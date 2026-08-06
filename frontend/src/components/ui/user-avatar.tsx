import type { ReactElement } from 'react'

import type { AvatarConfig, AvatarShape } from '@/lib/avatar'
import { getAvatarColorValue } from '@/lib/avatar'
import { cn, getInitials } from '@/lib/utils'

/** Фигуры в системе координат 100x100, чтобы аватар масштабировался любым размером. */
const shapes: Record<AvatarShape, ReactElement> = {
  circle: <circle cx="50" cy="50" r="50" />,
  rounded: <rect width="100" height="100" rx="28" />,
  hexagon: <polygon points="50,1 93,25.5 93,74.5 50,99 7,74.5 7,25.5" />,
  diamond: <polygon points="50,0 100,50 50,100 0,50" />,
  shield: (
    <path d="M50 0 L100 18 V56 C100 81 78 96 50 100 C22 96 0 81 0 56 V18 Z" />
  ),
}

export function UserAvatar({
  name,
  config,
  className,
}: {
  name: string | undefined | null
  config: AvatarConfig
  className?: string
}) {
  const initials = getInitials(name)

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('size-8 shrink-0', className)}
      role="img"
      aria-label={name ? `Аватар: ${name}` : 'Аватар пользователя'}
    >
      <g fill={getAvatarColorValue(config.color)}>{shapes[config.shape]}</g>
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize="38"
        fontWeight="600"
        fontFamily="inherit"
      >
        {initials}
      </text>
    </svg>
  )
}
