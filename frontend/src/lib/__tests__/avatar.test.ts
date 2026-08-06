import { beforeEach, describe, expect, it } from 'vitest'

import {
  getDefaultAvatar,
  loadAvatar,
  saveAvatar,
  type AvatarConfig,
} from '../avatar'

const userId = 42

describe('avatar storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns a default config when nothing is stored', () => {
    const config = loadAvatar(userId, 'Анна Викторова')

    expect(config.shape).toBe('circle')
    expect(config.color).toBeTruthy()
  })

  it('derives the default colour from the seed deterministically', () => {
    expect(getDefaultAvatar('Анна Викторова')).toEqual(
      getDefaultAvatar('Анна Викторова'),
    )
  })

  it('gives different defaults to different names', () => {
    const names = ['Анна Викторова', 'Иван Петров', 'Пётр Сидоров']
    const colours = new Set(names.map((name) => getDefaultAvatar(name).color))

    expect(colours.size).toBeGreaterThan(1)
  })

  it('round-trips a saved config', () => {
    const config: AvatarConfig = { shape: 'hexagon', color: 'rose' }
    saveAvatar(userId, config)

    expect(loadAvatar(userId, 'Анна Викторова')).toEqual(config)
  })

  it('keeps configs of different users apart', () => {
    saveAvatar(1, { shape: 'diamond', color: 'teal' })
    saveAvatar(2, { shape: 'shield', color: 'amber' })

    expect(loadAvatar(1, 'a')).toEqual({ shape: 'diamond', color: 'teal' })
    expect(loadAvatar(2, 'b')).toEqual({ shape: 'shield', color: 'amber' })
  })

  it('falls back to the default when stored data is malformed', () => {
    const cases = [
      'not json at all',
      JSON.stringify({ shape: 'triangle', color: 'rose' }),
      JSON.stringify({ shape: 'circle', color: 'neon' }),
      JSON.stringify(null),
    ]

    for (const raw of cases) {
      localStorage.setItem(`projectplatform-avatar-${userId}`, raw)
      expect(loadAvatar(userId, 'Анна Викторова')).toEqual(
        getDefaultAvatar('Анна Викторова'),
      )
    }
  })
})
