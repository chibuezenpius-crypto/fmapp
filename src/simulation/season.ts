import type { LeagueStanding, MatchInfo } from '../types/game'
import type { CompetitionRules, Tiebreaker } from '../data/competitionRules'

const DEFAULT_POINTS = { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 }
const DEFAULT_TIEBREAKERS: Tiebreaker[] = ['Head-to-head', 'Goal difference', 'Goals scored', 'Wins']

const tiebreakerValue = (standing: LeagueStanding, rule: Tiebreaker) =>
  rule === 'Goal difference' ? standing.goalDifference : rule === 'Goals scored' ? standing.goalsFor : rule === 'Wins' ? standing.won : 0

interface HeadToHeadStanding {
  points: number
  goalsFor: number
  goalsAgainst: number
  wins: number
}

function headToHeadTables(standings: readonly LeagueStanding[], matches: readonly MatchInfo[], rules: Pick<CompetitionRules, 'pointsForWin' | 'pointsForDraw' | 'pointsForLoss'>) {
  const byPoints = new Map<number, LeagueStanding[]>()
  for (const standing of standings) byPoints.set(standing.points, [...(byPoints.get(standing.points) ?? []), standing])
  const metrics = new Map<string, HeadToHeadStanding>()

  for (const group of byPoints.values()) {
    if (group.length < 2) continue
    const clubIds = new Set(group.map((standing) => standing.clubId))
    for (const clubId of clubIds) metrics.set(clubId, { points: 0, goalsFor: 0, goalsAgainst: 0, wins: 0 })
    for (const match of matches) {
      if (!match.score || !clubIds.has(match.homeClubId) || !clubIds.has(match.awayClubId)) continue
      const home = metrics.get(match.homeClubId)!
      const away = metrics.get(match.awayClubId)!
      home.goalsFor += match.score.home
      home.goalsAgainst += match.score.away
      away.goalsFor += match.score.away
      away.goalsAgainst += match.score.home
      if (match.score.home > match.score.away) {
        home.points += rules.pointsForWin
        home.wins += 1
        away.points += rules.pointsForLoss
      } else if (match.score.away > match.score.home) {
        away.points += rules.pointsForWin
        away.wins += 1
        home.points += rules.pointsForLoss
      } else {
        home.points += rules.pointsForDraw
        away.points += rules.pointsForDraw
      }
    }
  }
  return metrics
}

/** Applies completed fixtures to a zeroed table using the competition's points and tiebreak rules. */
export function applySimulatedResults(
  base: readonly LeagueStanding[],
  matches: readonly MatchInfo[],
  rules: Pick<CompetitionRules, 'pointsForWin' | 'pointsForDraw' | 'pointsForLoss' | 'tiebreakers'> = { ...DEFAULT_POINTS, tiebreakers: DEFAULT_TIEBREAKERS },
): LeagueStanding[] {
  const standings = base.map((standing) => ({ ...standing, form: [...standing.form] }))
  const byClub = new Map(standings.map((standing) => [standing.clubId, standing]))
  const appendForm = (form: LeagueStanding['form'], result: LeagueStanding['form'][number]): LeagueStanding['form'] => [...form, result].slice(-5)
  const results = matches.filter((match) => match.status === 'Completed' && match.simulationSeed !== undefined && match.score)
    .sort((first, second) => first.date.localeCompare(second.date) || first.matchday - second.matchday || first.id.localeCompare(second.id))

  for (const match of results) {
    const home = byClub.get(match.homeClubId)
    const away = byClub.get(match.awayClubId)
    if (!home || !away || home.clubId === away.clubId || !match.score) continue
    const { home: homeGoals, away: awayGoals } = match.score
    home.played += 1
    away.played += 1
    home.goalsFor += homeGoals
    home.goalsAgainst += awayGoals
    away.goalsFor += awayGoals
    away.goalsAgainst += homeGoals
    home.goalDifference = home.goalsFor - home.goalsAgainst
    away.goalDifference = away.goalsFor - away.goalsAgainst

    if (homeGoals > awayGoals) {
      home.won += 1
      home.points += rules.pointsForWin
      away.lost += 1
      away.points += rules.pointsForLoss
      home.form = appendForm(home.form, 'W')
      away.form = appendForm(away.form, 'L')
    } else if (awayGoals > homeGoals) {
      away.won += 1
      away.points += rules.pointsForWin
      home.lost += 1
      home.points += rules.pointsForLoss
      home.form = appendForm(home.form, 'L')
      away.form = appendForm(away.form, 'W')
    } else {
      home.drawn += 1
      away.drawn += 1
      home.points += rules.pointsForDraw
      away.points += rules.pointsForDraw
      home.form = appendForm(home.form, 'D')
      away.form = appendForm(away.form, 'D')
    }
  }

  const headToHead = headToHeadTables(standings, results, rules)
  const compareHeadToHead = (first: LeagueStanding, second: LeagueStanding) => {
    const firstStats = headToHead.get(first.clubId)
    const secondStats = headToHead.get(second.clubId)
    if (!firstStats || !secondStats) return 0
    const firstValues = [firstStats.points, firstStats.goalsFor - firstStats.goalsAgainst, firstStats.goalsFor, firstStats.wins]
    const secondValues = [secondStats.points, secondStats.goalsFor - secondStats.goalsAgainst, secondStats.goalsFor, secondStats.wins]
    for (let index = 0; index < firstValues.length; index += 1) {
      if (firstValues[index] !== secondValues[index]) return secondValues[index] - firstValues[index]
    }
    return 0
  }

  return standings
    .sort((first, second) => {
      if (second.points !== first.points) return second.points - first.points
      for (const rule of rules.tiebreakers) {
        const difference = rule === 'Head-to-head'
          ? compareHeadToHead(first, second)
          : tiebreakerValue(second, rule) - tiebreakerValue(first, rule)
        if (difference !== 0) return difference
      }
      return first.clubName.localeCompare(second.clubName)
    })
    .map((standing, index) => ({ ...standing, position: index + 1 }))
}
