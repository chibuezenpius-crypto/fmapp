import rawGlobalLeagues from '../data/globalLeaguesAndTeams.json'
import { club, getTransferMarketPlayers, getWageRoom, playerClubName } from '../data/mockData'
import { CLUB_WORLD_CUP_ID, CONTINENTAL_COMPETITIONS, DOMESTIC_CUPS } from '../simulation/competitions'
import { findWorldCountry } from '../worldCountries'
import { DEFAULT_SLOTS, fitPlayersToSlots } from '../utils/lineup'
import { getAskingPrice } from './transfers'
import type { GlobalLeaguesDatabase, MatchInfo, Player } from '../types/game'
import type { GameView } from './gameStore'

/** Pure view-model helpers for the dashboard and header. No React, no mutation. */
const leagueCountries = new Map((rawGlobalLeagues as unknown as GlobalLeaguesDatabase).countries.map((league) => [league.id, league]))

export const formatMoney = (amount: number) => Math.abs(amount) >= 1_000_000 ? `£${(amount / 1_000_000).toFixed(1)}M` : `£${Math.round(amount / 1000)}K`

export function teamOverall(players: Player[]) {
  const top = [...players].sort((a, b) => b.overall - a.overall).slice(0, 11)
  return top.length ? Math.round(top.reduce((sum, player) => sum + player.overall, 0) / top.length) : 0
}

export function managerProgress(view: GameView) {
  const own = view.ownStanding
  const earned = 1245 + view.season * 900 + (own ? own.won * 60 + own.drawn * 25 + own.lost * 10 : 0)
  const perLevel = 2000
  return { level: 9 + club.manager.reputation + Math.floor(earned / perLevel), xp: earned % perLevel, xpMax: perLevel }
}

export const reputationLabel = (prestige: number) => prestige >= 80 ? 'Global' : prestige >= 60 ? 'Continental' : prestige >= 40 ? 'National' : 'Regional'

export type FinancialHealth = { label: 'Healthy' | 'Stable' | 'Tight' | 'At risk'; tone: 'good' | 'ok' | 'warn' | 'bad' }

export function financialHealth(): FinancialHealth {
  const wageRoom = getWageRoom()
  if (wageRoom < 0) return { label: 'At risk', tone: 'bad' }
  if (club.finances.balance < 1_000_000) return { label: 'Tight', tone: 'warn' }
  return wageRoom < club.finances.weeklyWages * 0.05 ? { label: 'Stable', tone: 'ok' } : { label: 'Healthy', tone: 'good' }
}

export function daysUntil(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)
}

export const countdownLabel = (days: number) => days <= 0 ? 'Matchday' : days === 1 ? 'Tomorrow' : `In ${days} days`

export type NewsRegion = 'Europe' | 'Africa' | 'Asia' | 'Americas'
export const NEWS_REGIONS: NewsRegion[] = ['Europe', 'Africa', 'Asia', 'Americas']

export interface NewsItem {
  id: string
  region: NewsRegion
  competition: string
  headline: string
  detail: string
  date: string
}

const toRegion = (confederation: string | undefined): NewsRegion | null =>
  confederation === 'Europe' || confederation === 'Africa' || confederation === 'Asia' ? confederation
    : confederation === 'North America' || confederation === 'South America' ? 'Americas' : null

function regionFor(match: MatchInfo): NewsRegion | null {
  const continental = CONTINENTAL_COMPETITIONS.find((spec) => spec.id === match.leagueId)
  if (continental) return toRegion(continental.confederations[0])
  if (match.leagueId === CLUB_WORLD_CUP_ID) return null
  const domesticId = DOMESTIC_CUPS.find((cup) => cup.id === match.leagueId)?.leagueId ?? match.leagueId
  const countryCode = leagueCountries.get(domesticId)?.countryCode
  return countryCode ? toRegion(findWorldCountry(countryCode)?.confederation) : null
}

/** Latest results from other competitions, newest first, at most `perRegion` per region. */
export function buildNews(view: GameView, perRegion = 3): NewsItem[] {
  const counts: Record<NewsRegion, number> = { Europe: 0, Africa: 0, Asia: 0, Americas: 0 }
  const items: NewsItem[] = []
  const recent = view.matches.filter((match) => match.status === 'Completed' && match.score && match.homeClubId !== club.id && match.awayClubId !== club.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  for (const match of recent) {
    const region = regionFor(match)
    if (!region || counts[region] >= perRegion || !match.score) continue
    counts[region] += 1
    items.push({ id: match.id, region, competition: match.competition, headline: `${match.homeClubName} ${match.score.home}–${match.score.away} ${match.awayClubName}`, detail: match.competition, date: match.date })
  }
  return items
}

export interface ExpectedLineup {
  formation: string
  slots: { label: string; x: number; y: number; player: Player | null }[]
  averageOverall: number
}

/** The saved 4-3-3 XI when it is still valid, otherwise the best available XI for that shape. Injured players are skipped. */
export function expectedLineup(date: string): ExpectedLineup {
  const available = club.squad.filter((player) => !(player.injuryUntil !== undefined && player.injuryUntil > date))
  let savedIds: string[] = []
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem('fmapp-tactics') ?? 'null')
    if (saved && typeof saved === 'object' && (saved as { formation?: unknown }).formation === '4-3-3' && Array.isArray((saved as { lineup?: unknown }).lineup)) savedIds = (saved as { lineup: unknown[] }).lineup.filter((id): id is string => typeof id === 'string')
  } catch { savedIds = [] }
  const savedPlayers = savedIds.map((id) => available.find((player) => player.id === id))
  const ids = savedPlayers.length === DEFAULT_SLOTS.length && savedPlayers.every(Boolean) ? savedIds : fitPlayersToSlots(DEFAULT_SLOTS, available)
  const slots = DEFAULT_SLOTS.map((slot, index) => ({ label: slot.label, x: slot.x, y: slot.y, player: available.find((player) => player.id === ids[index]) ?? null }))
  const filled = slots.filter((slot) => slot.player)
  return { formation: '4-3-3', slots, averageOverall: filled.length ? Math.round(filled.reduce((sum, slot) => sum + (slot.player?.overall ?? 0), 0) / filled.length) : 0 }
}

export interface Rumour {
  player: Player
  clubName: string
  price: number
  affordable: boolean
}

/** A rotating shortlist of notable market players, stable for a given in-game day. */
export function buildRumours(date: string, count = 3): Rumour[] {
  const minimum = teamOverall(club.squad) - 2
  const pool = getTransferMarketPlayers().filter((player) => player.overall >= minimum && player.contract.clubId).sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id))
  if (!pool.length) return []
  const offset = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000) % pool.length
  return Array.from({ length: Math.min(count, pool.length) }, (_, index) => {
    const player = pool[(offset + index) % pool.length]
    const price = getAskingPrice(player)
    return { player, clubName: playerClubName(player.contract.clubId), price, affordable: price <= club.finances.transferBudget }
  })
}
