import { createContext } from 'react'

import type { AvatarColorId, AvatarConfig, AvatarShape } from '@/lib/avatar'

export interface AvatarContextValue {
  config: AvatarConfig
  setShape: (shape: AvatarShape) => void
  setColor: (color: AvatarColorId) => void
  reset: () => void
}

export const AvatarCtx = createContext<AvatarContextValue | null>(null)
