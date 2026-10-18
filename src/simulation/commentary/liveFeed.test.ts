import { describe, expect, it } from 'vitest'
import { getClubSquad } from '../../data/clubSquads'
import { getSeasonLeagueFixtures } from '../../data/mockData'
import { simulateMatch } from '../matchEngine'
import { buildLiveFeed, MAX_LINES_PER_MINUTE } from './liveFeed'

describe('live commentary feed', () => {
  it('has a line every match minute and never more than three per minute', () => {
    const fixtures = getSeasonLeagueFixtures(0)
    for (let seed = 1; seed <= 20; seed += 1) {
      const fixture = fixtures[seed % fixtures.length]
      const { match } = simulateMatch({ match: fixture, homeSquad: getClubSquad(fixture.homeClubId), awaySquad: getClubSquad(fixture.awayClubId), seed })
      const feed = buildLiveFeed(match)
      const lastMinute = Math.floor(match.eventLog![match.eventLog!.length - 1].elapsedSeconds / 60)
      const perMinute = new Map<number, number>()
      for (const entry of feed) perMinute.set(Math.floor(entry.at), (perMinute.get(Math.floor(entry.at)) ?? 0) + 1)
      for (let minute = 0; minute <= lastMinute; minute += 1) {
        expect(perMinute.get(minute) ?? 0).toBeGreaterThanOrEqual(1)
        expect(perMinute.get(minute) ?? 0).toBeLessThanOrEqual(MAX_LINES_PER_MINUTE)
      }
      const goals = feed.filter((entry) => entry.type === 'Goal')
      expect(goals.filter((entry) => entry.team === 'home')).toHaveLength(match.score!.home)
      expect(goals.filter((entry) => entry.team === 'away')).toHaveLength(match.score!.away)
      expect(feed.every((entry) => entry.detail.length > 0 && !entry.detail.includes('{'))).toBe(true)
      expect(buildLiveFeed(match)).toEqual(feed)
    }
  })
})
