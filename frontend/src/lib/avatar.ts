/**
 * Настройки аватара: форма + цвет. Инициалы берутся из имени пользователя.
 *
 * Хранилище — localStorage, потому что в схеме Prisma поля под аватар пока нет.
 * Когда оно появится, менять надо будет только loadAvatar/saveAvatar: остальной
 * код работает с типом AvatarConfig и об источнике данных не знает.
 */

export const AVATAR_SHAPES = [
  'circle',
  'rounded',
  'hexagon',
  'diamond',
  'shield',
] as const

export type AvatarShape = (typeof AVATAR_SHAPES)[number]

export const AVATAR_SHAPE_LABELS: Record<AvatarShape, string> = {
  circle: 'Круг',
  rounded: 'Скруглённый квадрат',
  hexagon: 'Шестиугольник',
  diamond: 'Ромб',
  shield: 'Щит',
}

/** Все цвета достаточно тёмные, чтобы белые инициалы читались в любой теме. */
export const AVATAR_COLORS = [
  { id: 'indigo', label: 'Индиго', value: '#4f46e5' },
  { id: 'violet', label: 'Фиолетовый', value: '#7c3aed' },
  { id: 'sky', label: 'Голубой', value: '#0284c7' },
  { id: 'teal', label: 'Бирюзовый', value: '#0d9488' },
  { id: 'emerald', label: 'Изумрудный', value: '#059669' },
  { id: 'amber', label: 'Янтарный', value: '#d97706' },
  { id: 'rose', label: 'Розовый', value: '#e11d48' },
  { id: 'slate', label: 'Графитовый', value: '#475569' },
] as const

export type AvatarColorId = (typeof AVATAR_COLORS)[number]['id']

export interface AvatarConfig {
  shape: AvatarShape
  color: AvatarColorId
}

export function getAvatarColorValue(id: AvatarColorId): string {
  return (
    AVATAR_COLORS.find((color) => color.id === id)?.value ??
    AVATAR_COLORS[0].value
  )
}

/**
 * Цвет по умолчанию выводится из имени, чтобы у разных людей аватары
 * различались до того, как кто-то что-то настроил.
 */
export function getDefaultAvatar(seed: string | undefined): AvatarConfig {
  const hash = [...(seed ?? '')].reduce(
    (acc, char) => acc + char.codePointAt(0)!,
    0,
  )

  return {
    shape: 'circle',
    color: AVATAR_COLORS[hash % AVATAR_COLORS.length].id,
  }
}

function storageKey(userId: number): string {
  return `projectplatform-avatar-${userId}`
}

function isValidConfig(value: unknown): value is AvatarConfig {
  if (typeof value !== 'object' || value === null) return false

  const config = value as Partial<AvatarConfig>
  return (
    AVATAR_SHAPES.includes(config.shape as AvatarShape) &&
    AVATAR_COLORS.some((color) => color.id === config.color)
  )
}

export function loadAvatar(
  userId: number,
  seed: string | undefined,
): AvatarConfig {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      // содержимое localStorage правит кто угодно — доверять ему нельзя
      if (isValidConfig(parsed)) return parsed
    }
  } catch {
    // недоступное или битое хранилище не должно ронять интерфейс
  }

  return getDefaultAvatar(seed)
}

export function saveAvatar(userId: number, config: AvatarConfig): void {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(config))
  } catch {
    // приватный режим и переполненное хранилище — не повод падать
  }
}
