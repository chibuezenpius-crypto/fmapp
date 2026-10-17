import { describe, expect, it } from 'vitest'
import { squad } from '../data/mockData'
import { isUnavailable, recoverPlayerToDate, type PlayerConditionState } from './playerCondition'

describe('player condition', () => {
  it('recovers fitness between dates and clears an expired injury', () => {
    const player = structuredClone(squad[0])
    player.fitness = 70
    player.injuryUntil = '2026-08-03'
    const state: PlayerConditionState = {
      [player.id]: { fitness: 70, lastUpdated: '2026-08-01', injuryUntil: '2026-08-03' },
    }

    recoverPlayerToDate(player, '2026-08-03', state)

    expect(player.fitness).toBe(76)
    expect(isUnavailable(player, '2026-08-03')).toBe(false)
    expect(state[player.id].lastUpdated).toBe('2026-08-03')
  })

  it('does not recover fitness beyond the 100-point cap', () => {
    const player = structuredClone(squad[0])
    player.fitness = 99
    const state: PlayerConditionState = {
      [player.id]: { fitness: 99, lastUpdated: '2026-08-01' },
    }

    recoverPlayerToDate(player, '2026-08-03', state)

    expect(player.fitness).toBe(100)
  })
})
