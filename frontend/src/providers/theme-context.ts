import { createContext } from 'react'

type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextValue {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

export const ThemeCtx = createContext<ThemeContextValue | null>(null)
