import type { MatchInfo } from '../types/game'

export interface CashFlowInput {
  prestige: number
  sponsorshipIncomeAnnual: number
  weeklyWages: number
  operationsPerMonth: number
}

export const broadcastAnnual = (prestige: number) => Math.round(prestige * 90000)

/** Net cash movement for `days` days: sponsors and TV money in, wages and running costs out. */
export function cashFlowForDays(input: CashFlowInput, days: number) {
  const income = (input.sponsorshipIncomeAnnual + broadcastAnnual(input.prestige)) / 365 * days
  const expenses = input.weeklyWages / 7 * days + input.operationsPerMonth * 12 / 365 * days
  return Math.round(income - expenses)
}

export const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000))

export function matchdayIncome(played: MatchInfo[], clubId: string, ticketSales: number) {
  return played.filter((match) => match.homeClubId === clubId && match.status === 'Completed').length * ticketSales
}
