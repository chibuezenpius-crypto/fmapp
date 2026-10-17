import { describe, expect, it } from 'vitest'
import { getFixturesByLeague, getSeasonLeagueFixtures } from './mockData'

describe('league fixture scoping', () => {
  it('returns only fixtures owned by the requested competition', () => {
    const allFixtures = getSeasonLeagueFixtures(0)
    const fixtures = getFixturesByLeague('nga-top-division', allFixtures)

    expect(fixtures.length).toBeGreaterThan(0)
    expect(fixtures.every((fixture) => fixture.leagueId === 'nga-top-division')).toBe(true)
    expect(fixtures.length).toBe(allFixtures.filter((fixture) => fixture.leagueId === 'nga-top-division').length)
  })
})
