import rawGlobalLeagues from './globalLeaguesAndTeams.json'
import rawInternationalTournaments from './internationalTournaments.json'
import { CLUB_WORLD_CUP_ID, CONTINENTAL_IDS } from '../simulation/competitions'
import type { GlobalLeaguesDatabase, InternationalTournamentsDatabase } from '../types/game'

export type Tiebreaker = 'Head-to-head' | 'Goal difference' | 'Goals scored' | 'Wins'

export interface FinancialRules {
  /** Weekly wage bill may not exceed wageBudget × this multiplier. */
  wageBudgetTolerance: number
  /** Annual income share clubs may commit to wages before FFP sanctions apply. */
  maxWageToIncomeRatio: number
  /** Transfers that would leave the transfer budget negative are blocked. */
  blockOverspending: boolean
}

export interface CompetitionRules {
  competitionId: string
  format: 'League' | 'Cup' | 'Groups and knockout'
  pointsForWin: number
  pointsForDraw: number
  pointsForLoss: number
  tiebreakers: Tiebreaker[]
  promotionSlots: number
  relegationSlots: number
  continentalSlots: number
  squadMin: number
  squadMax: number
  matchdaySquadSize: number
  maxSubstitutions: number
  extraTimeAndPenalties: boolean
  financial: FinancialRules
}

const LEAGUE_TIEBREAKERS: Tiebreaker[] = ['Head-to-head', 'Goal difference', 'Goals scored', 'Wins']
const globalLeagues = (rawGlobalLeagues as unknown as GlobalLeaguesDatabase).countries
const tournaments = (rawInternationalTournaments as unknown as InternationalTournamentsDatabase).tournaments

const topFiveCodes = new Set(['ENG', 'ESP', 'GER', 'ITA', 'FRA'])
const strictCodes = new Set([...topFiveCodes, 'POR', 'NED', 'BEL', 'SCO', 'NOR', 'SWE', 'CRO'])

const baseRules = (competitionId: string): CompetitionRules => ({
  competitionId,
  format: 'League',
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,
  tiebreakers: LEAGUE_TIEBREAKERS,
  promotionSlots: 0,
  relegationSlots: 3,
  continentalSlots: 2,
  squadMin: 18,
  squadMax: 30,
  matchdaySquadSize: 18,
  maxSubstitutions: 5,
  extraTimeAndPenalties: false,
  financial: { wageBudgetTolerance: 1, maxWageToIncomeRatio: 0.7, blockOverspending: true },
})

const registry = new Map<string, CompetitionRules>()

for (const country of globalLeagues) {
  const strict = strictCodes.has(country.countryCode)
  registry.set(country.id, {
    ...baseRules(country.id),
    continentalSlots: topFiveCodes.has(country.countryCode) ? 4 : 2,
    relegationSlots: country.teams.length >= 20 ? 3 : 2,
    squadMax: strict ? 28 : 30,
    financial: {
      wageBudgetTolerance: strict ? 1 : 1.05,
      maxWageToIncomeRatio: strict ? 0.7 : 0.8,
      blockOverspending: true,
    },
  })
}

const cupIds = ['nga-federation-cup', 'eng-fa-cup', 'esp-copa', 'por-taca', 'sco-cup', 'irl-cup']
for (const id of cupIds) {
  registry.set(id, { ...baseRules(id), format: 'Cup', relegationSlots: 0, continentalSlots: 1, extraTimeAndPenalties: true, pointsForWin: 0, pointsForDraw: 0 })
}

for (const id of [...CONTINENTAL_IDS, CLUB_WORLD_CUP_ID]) {
  registry.set(id, { ...baseRules(id), format: 'Cup', relegationSlots: 0, continentalSlots: 0, extraTimeAndPenalties: true, pointsForWin: 0, pointsForDraw: 0, squadMax: 25, matchdaySquadSize: 23 })
}

for (const tournament of tournaments) {
  registry.set(tournament.id, {
    ...baseRules(tournament.id),
    format: 'Groups and knockout',
    relegationSlots: 0,
    continentalSlots: 0,
    extraTimeAndPenalties: true,
    squadMin: 23,
    squadMax: 26,
    matchdaySquadSize: 23,
    financial: { wageBudgetTolerance: 1, maxWageToIncomeRatio: 1, blockOverspending: false },
  })
}

export function getCompetitionRules(competitionId: string): CompetitionRules {
  return registry.get(competitionId) ?? baseRules(competitionId)
}

export function describeRules(rules: CompetitionRules, extra: readonly string[] = []): string[] {
  const lines: string[] = []
  if (rules.format === 'League' || rules.format === 'Groups and knockout') {
    lines.push(`Points: ${rules.pointsForWin} for a win, ${rules.pointsForDraw} for a draw, ${rules.pointsForLoss} for a defeat.`)
    lines.push(`Table order: points, then ${rules.tiebreakers.map((rule) => rule.toLowerCase()).join(', then ')}.`)
  }
  if (rules.format === 'League') {
    lines.push(rules.promotionSlots > 0 ? `${rules.promotionSlots} clubs are promoted each season.` : 'Top division: there is no promotion above this league.')
    lines.push(`${rules.relegationSlots} clubs are relegated at the end of the season.`)
    if (rules.continentalSlots > 0) lines.push(`The top ${rules.continentalSlots} clubs qualify for continental competition.`)
  } else if (rules.format === 'Cup') {
    lines.push('Knockout ties are decided over one match; the higher score advances.')
    if (rules.extraTimeAndPenalties) lines.push('Level ties go to extra time and then a penalty shoot-out.')
  } else {
    lines.push('Group-stage results determine qualification for the knockout rounds.')
    if (rules.extraTimeAndPenalties) lines.push('Knockout ties level after 90 minutes go to extra time and then a penalty shoot-out.')
  }
  lines.push(`Squad size: ${rules.squadMin} to ${rules.squadMax} registered players; ${rules.matchdaySquadSize} in the matchday squad.`)
  lines.push(`Up to ${rules.maxSubstitutions} substitutions are permitted per match.`)
  if (rules.financial.blockOverspending) {
    lines.push(`Financial fair play: the weekly wage bill may not exceed ${Math.round(rules.financial.wageBudgetTolerance * 100)}% of the wage budget, and transfer spending cannot exceed the available budget.`)
    lines.push(`Wages may not exceed ${Math.round(rules.financial.maxWageToIncomeRatio * 100)}% of club income.`)
  }
  return [...lines, ...extra]
}
