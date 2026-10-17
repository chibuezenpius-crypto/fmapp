import { describe, expect, it } from 'vitest'
import type { LeagueStanding, MatchInfo } from '../types/game'
import { applySimulatedResults } from './season'

const standing = (clubId: string): LeagueStanding => ({
  position: 0,
  clubId,
  clubName: clubId,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  form: [],
})

function completedMatch(id: string, matchday: number, homeClubId: string, awayClubId: string, homeGoals: number, awayGoals: number): MatchInfo {
  return {
    id,
    leagueId: 'test-league',
    season: 0,
    competition: 'Test League',
    matchday,
    date: `2026-08-${String(matchday).padStart(2, '0')}`,
    kickOff: '15:00',
    homeClubId,
    homeClubName: homeClubId,
    awayClubId,
    awayClubName: awayClubId,
    venue: '',
    referee: '',
    weather: '',
    status: 'Completed',
    score: { home: homeGoals, away: awayGoals },
    formation: { home: '4-4-2', away: '4-4-2' },
    coaches: { home: '', away: '' },
    keyPlayers: { home: '', away: '' },
    lastFiveForm: { home: [], away: [] },
    headToHead: { homeWins: 0, draws: 0, awayWins: 0, recentMeetings: [] },
    lineups: {
      home: { formation: '4-4-2', coach: '', startingXI: [], substitutes: [] },
      away: { formation: '4-4-2', coach: '', startingXI: [], substitutes: [] },
    },
    commentary: [],
    simulationSeed: 1,
  }
}

describe('league standings', () => {
  it('uses head-to-head before overall goal difference when the rules require it', () => {
    const matches = [
      completedMatch('a-b', 1, 'A', 'B', 1, 0),
      completedMatch('a-c', 2, 'A', 'C', 1, 0),
      completedMatch('b-c', 3, 'B', 'C', 10, 0),
      completedMatch('b-d', 4, 'B', 'D', 20, 0),
      completedMatch('a-d', 5, 'A', 'D', 1, 0),
    ]
    const table = applySimulatedResults(['A', 'B', 'C', 'D'].map(standing), matches)
    const teamA = table.findIndex((team) => team.clubId === 'A')
    const teamB = table.findIndex((team) => team.clubId === 'B')

    expect(table[teamB].goalDifference).toBeGreaterThan(table[teamA].goalDifference)
    expect(teamA).toBeLessThan(teamB)
  })
})
