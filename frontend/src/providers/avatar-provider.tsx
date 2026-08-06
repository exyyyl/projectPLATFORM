import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useAuth } from '@/hooks/use-auth'
import type { AvatarColorId, AvatarConfig, AvatarShape } from '@/lib/avatar'
import { getDefaultAvatar, loadAvatar, saveAvatar } from '@/lib/avatar'
import { AvatarCtx } from './avatar-context'

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const seed = user?.fullName

  // ленивый инициализатор: localStorage читается один раз при монтировании,
  // а не на каждый рендер
  const [stored, setStored] = useState<AvatarConfig | null>(() =>
    userId === undefined ? null : loadAvatar(userId, seed),
  )

  // Обновления только функциональной формой: иначе два быстрых изменения
  // подряд возьмут одно и то же значение из замыкания и затрут друг друга.
  const setShape = useCallback(
    (shape: AvatarShape) => {
      setStored((current) => ({ ...(current ?? getDefaultAvatar(seed)), shape }))
    },
    [seed],
  )

  const setColor = useCallback(
    (color: AvatarColorId) => {
      setStored((current) => ({ ...(current ?? getDefaultAvatar(seed)), color }))
    },
    [seed],
  )

  const reset = useCallback(() => {
    setStored(getDefaultAvatar(seed))
  }, [seed])

  // запись в хранилище — синхронизация с внешней системой, её место в эффекте
  useEffect(() => {
    if (userId === undefined || stored === null) return
    saveAvatar(userId, stored)
  }, [userId, stored])

  const value = useMemo(
    () => ({
      config: stored ?? getDefaultAvatar(seed),
      setShape,
      setColor,
      reset,
    }),
    [stored, seed, setShape, setColor, reset],
  )

  return <AvatarCtx.Provider value={value}>{children}</AvatarCtx.Provider>
}
