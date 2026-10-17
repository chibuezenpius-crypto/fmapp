import { club, getWageLimit, league } from '../data/mockData'
import { createRng } from '../utils/proceduralGenerator'

export interface SeasonFinance {
  season: string
  revenue: number
  expenses: number
  profit: number
  wageBill: number
  prizeMoney: number
}

export interface RevenueStream { label: string; amount: number }

export interface FinanceForecast {
  season: string
  revenue: number
  expenses: number
  profit: number
  cash: number
  wageBill: number
}

export type FinanceOutlook = 'Positive' | 'Stable' | 'Negative'

export interface FinanceModel {
  current: SeasonFinance
  history: SeasonFinance[]
  forecast: FinanceForecast[]
  streams: RevenueStream[]
  outlook: FinanceOutlook
  risk: number
  wageToRevenue: number
  wageHeadroom: number
}

const HISTORY_SEASONS = 4
const REVENUE_GROWTH = 0.04
const WAGE_GROWTH = 0.03

const round = (value: number) => Math.round(value / 1000) * 1000

/** Annual figures derived from the club's live finances; past seasons are deterministic estimates scaled from them. */
export function buildFinanceModel(season: number, seasonLabel: (season: number) => string): FinanceModel {
  const { finances, prestige } = club
  const homeMatches = league.totalMatchdays / 2
  const matchday = finances.ticketSalesPerHomeMatch * homeMatches
  const broadcast = prestige * 55000
  const streams: RevenueStream[] = [
    { label: 'Sponsorship', amount: finances.sponsorshipIncomeAnnual },
    { label: 'Matchday', amount: matchday },
    { label: 'Broadcast & prize money', amount: broadcast },
  ]
  const revenue = streams.reduce((sum, stream) => sum + stream.amount, 0)
  const wageBill = finances.weeklyWages * 52
  const expenses = wageBill + finances.operationsPerMonth * 12
  const current: SeasonFinance = { season: seasonLabel(season), revenue, expenses, profit: revenue - expenses, wageBill, prizeMoney: broadcast }

  const history: SeasonFinance[] = Array.from({ length: HISTORY_SEASONS }, (_, index) => {
    const back = HISTORY_SEASONS - index
    const random = createRng(`${club.id}:finance:${season - back}`)
    const pastRevenue = revenue * Math.pow(1 - REVENUE_GROWTH, back) * (0.97 + random() * 0.06)
    const pastWages = wageBill * Math.pow(1 - WAGE_GROWTH, back) * (0.97 + random() * 0.06)
    const pastExpenses = pastWages + finances.operationsPerMonth * 12 * Math.pow(0.97, back) * (0.97 + random() * 0.06)
    return {
      season: seasonLabel(season - back),
      revenue: round(pastRevenue), expenses: round(pastExpenses), profit: round(pastRevenue) - round(pastExpenses),
      wageBill: round(pastWages), prizeMoney: round(broadcast * Math.pow(1 - REVENUE_GROWTH, back)),
    }
  })

  let cash = finances.balance
  const forecast: FinanceForecast[] = Array.from({ length: 3 }, (_, index) => {
    const step = index + 1
    const projectedRevenue = revenue * Math.pow(1 + REVENUE_GROWTH, step)
    const projectedWages = wageBill * Math.pow(1 + WAGE_GROWTH, step)
    const projectedExpenses = projectedWages + finances.operationsPerMonth * 12 * Math.pow(1.02, step)
    const profit = projectedRevenue - projectedExpenses
    cash += profit
    return { season: seasonLabel(season + step), revenue: projectedRevenue, expenses: projectedExpenses, profit, cash, wageBill: projectedWages }
  })

  const wageToRevenue = revenue > 0 ? wageBill / revenue : 1
  const outlook: FinanceOutlook = forecast[2].profit > revenue * 0.02 ? 'Positive' : forecast[2].profit < -revenue * 0.02 ? 'Negative' : 'Stable'
  const risk = Math.max(0, Math.min(100, Math.round(wageToRevenue * 150 + (forecast[2].cash < 0 ? 30 : 0) + (forecast[2].profit < 0 ? 15 : 0))))
  return { current, history, forecast, streams, outlook, risk, wageToRevenue, wageHeadroom: getWageLimit() - finances.weeklyWages }
}
