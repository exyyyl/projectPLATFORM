import { useContext } from 'react'

import { AvatarCtx } from '@/providers/avatar-context'

export function useAvatar() {
  const ctx = useContext(AvatarCtx)
  if (!ctx) throw new Error('useAvatar must be used within AvatarProvider')
  return ctx
}
