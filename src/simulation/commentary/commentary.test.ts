import { describe, expect, it } from 'vitest'
import { getClubSquad } from '../../data/clubSquads'
import { getSeasonLeagueFixtures } from '../../data/mockData'
import { simulateMatch } from '../matchEngine'
import { commentaryTemplates } from './templates'

const ALLOWED_PLACEHOLDERS = new Set(['playerName', 'teamName', 'opponentName', 'targetName', 'zone', 'minute', 'distance'])

describe('commentary templates', () => {
  it('gives every situation at least 10 usable lines, even when no target player exists', () => {
    for (const [key, pool] of Object.entries(commentaryTemplates)) {
      expect(new Set(pool).size, `${key} has duplicates`).toBe(pool.length)
      expect(pool.length, `${key} needs 10+ templates`).toBeGreaterThanOrEqual(10)
      const withoutTarget = pool.filter((template) => !template.includes('{targetName}'))
      expect(withoutTarget.length, `${key} needs 10+ target-free templates`).toBeGreaterThanOrEqual(10)
    }
  })

  it('only uses known placeholders', () => {
    for (const pool of Object.values(commentaryTemplates)) {
      for (const template of pool) {
        for (const match of template.matchAll(/\{(\w+)\}/g)) expect(ALLOWED_PLACEHOLDERS.has(match[1])).toBe(true)
      }
    }
  })
})

describe('commentary coverage of simulated matches', () => {
  it('narrates injuries and red cards that appear in the event log', () => {
    const fixtures = getSeasonLeagueFixtures(0)
    let injuries = 0
    let reds = 0
    for (let seed = 1; seed <= 60; seed += 1) {
      const fixture = fixtures[seed % fixtures.length]
      const { match } = simulateMatch({ match: fixture, homeSquad: getClubSquad(fixture.homeClubId), awaySquad: getClubSquad(fixture.awayClubId), seed })
      const narrated = new Set(match.commentary.map((entry) => entry.eventId))
      for (const event of match.eventLog ?? []) {
        if (event.type === 'Injury') { injuries += 1; expect(narrated.has(event.id)).toBe(true) }
        if (event.type === 'Red Card') { reds += 1; expect(narrated.has(event.id)).toBe(true) }
      }
      expect(match.commentary.every((entry) => entry.detail.length > 0 && !entry.detail.includes('{'))).toBe(true)
    }
    expect(injuries).toBeGreaterThan(0)
    expect(reds).toBeGreaterThan(0)
  })
})
