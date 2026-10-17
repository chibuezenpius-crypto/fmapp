import { describe, expect, it } from 'vitest'
import { getClubSquad } from '../data/clubSquads'
import { getSeasonLeagueFixtures } from '../data/mockData'
import { simulateMatch } from './matchEngine'

describe('seeded match simulation', () => {
  it('reproduces the same event log and score for the same fixture and seed', () => {
    const fixture = getSeasonLeagueFixtures(0)[0]
    const input = {
      match: fixture,
      homeSquad: getClubSquad(fixture.homeClubId),
      awaySquad: getClubSquad(fixture.awayClubId),
      seed: 41723,
    }

    const first = simulateMatch(input)
    const second = simulateMatch(input)

    expect(second.events).toEqual(first.events)
    expect(second.match.score).toEqual(first.match.score)
    expect(second.match.commentary).toEqual(first.match.commentary)
  })
})
