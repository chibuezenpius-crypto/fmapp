import type { LeagueStanding, MatchInfo } from '../types/game'
import type { CompetitionRules, Tiebreaker } from '../data/competitionRules'

const DEFAULT_POINTS = { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 }
const DEFAULT_TIEBREAKERS: Tiebreaker[] = ['Goal difference', 'Goals scored', 'Wins']

const tiebreakerValue = (standing: LeagueStanding, rule: Tiebreaker) =>
  rule === 'Goal difference' ? standing.goalDifference : rule === 'Goals scored' ? standing.goalsFor : standing.won

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

  return standings
    .sort((first, second) => {
      if (second.points !== first.points) return second.points - first.points
      for (const rule of rules.tiebreakers) {
        const difference = tiebreakerValue(second, rule) - tiebreakerValue(first, rule)
        if (difference !== 0) return difference
      }
      return first.clubName.localeCompare(second.clubName)
    })
    .map((standing, index) => ({ ...standing, position: index + 1 }))
}
