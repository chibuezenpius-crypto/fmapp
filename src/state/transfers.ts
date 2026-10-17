import { club, getFFPWageLimit, getTransferMarketPlayers, getWageBudgetLimit, isOwnPlayer, ownLeagueRules, playerClubName, removeFromList, reorderClubSquad, SQUAD_MAX, SQUAD_MIN } from '../data/mockData'
import { getClubSquad, getCachedSquads } from '../data/clubSquads'
import { createRng, generatePlayer } from '../utils/proceduralGenerator'
import type { Player } from '../types/game'
import { addGameWarning, getDate, LEDGER_KEY, notify, onSeasonRollover, reportGameMessage } from './gameStore'
import { catchUpPlayers, markPlayersCurrent, seasonStartYear } from './progression'
import { readSeasonsElapsed } from './saveData'
import './economy'
import { allFacilitiesMaxed, FACILITY_INFO, FACILITY_LEVEL_KEY, FACILITY_UPGRADE_COSTS, isFacilityUpgrade, STADIUM_UPGRADE_GROWTH, type FacilityUpgrade } from './facilities'

export interface BidTerms {
  fee: number
  /** 1 = the player's current wage demand. */
  wageMultiplier: number
  years: number
}

export interface DealResult {
  status: 'accepted' | 'rejected' | 'counter' | 'failed'
  message: string
  counterFee?: number
}

type LedgerEntry =
  | { type: 'sign'; playerId: string; fromClubId: string; fee: number; wage: number; endDate: string; date: string }
  | { type: 'release'; playerId: string; date: string }
  | { type: 'renew'; playerId: string; wage: number; endDate: string; date: string; offer?: Player['contract']['offerHistory'][number] }
  | { type: 'offer'; playerId: string; date: string; offer: Player['contract']['offerHistory'][number] }
  | { type: 'facility'; facility: FacilityUpgrade; date: string }
  | { type: 'board'; reason: BoardFundingReason; requested: number; granted: number; date: string }

export type BoardFundingReason = 'Squad development' | 'Facilities'
export interface BoardRequest { reason: BoardFundingReason; requested: number; granted: number; date: string }
export type { FacilityUpgrade } from './facilities'
export { FACILITY_UPGRADE_COSTS } from './facilities'

const money = (amount: number) => `£${(amount / 1000000).toFixed(1)}m`
const round = (value: number, step: number) => Math.round(value / step) * step
function wageRuleFailure(proposedWeeklyWages: number) {
  if (!ownLeagueRules.financial.blockOverspending) return ''
  if (proposedWeeklyWages > getWageBudgetLimit()) return `The wage bill would exceed the £${Math.round(getWageBudgetLimit()).toLocaleString('en-GB')}/wk budget limit.`
  if (proposedWeeklyWages > getFFPWageLimit()) return `The wage bill would exceed the FFP wage-to-income limit of £${Math.round(getFFPWageLimit()).toLocaleString('en-GB')}/wk.`
  return ''
}

const contractEnd = (years: number) => {
  const now = new Date(`${getDate()}T12:00:00Z`)
  const year = now.getUTCFullYear() + (now.getUTCMonth() >= 6 ? 1 : 0) + years
  return `${year}-06-30`
}

// ---------- Valuation ----------
function isFirstChoice(player: Player) {
  const squad = getClubSquad(player.contract.clubId)
  return [...squad].sort((a, b) => b.overall - a.overall).slice(0, 11).some((member) => member.id === player.id)
}

/** The selling club's asking price: market value plus a seeded premium, higher for first-choice starters. */
export function getAskingPrice(player: Player): number {
  if (!player.contract.clubId) return 0
  const premium = 1 + createRng(`bid:${player.id}`)() * 0.3
  return round(player.value * premium * (isFirstChoice(player) ? 1.1 : 1), 50000)
}

/** Weekly wage the player demands to join the user's club. */
export function getWageDemand(player: Player): number {
  const ambitious = player.overall >= 70 && club.prestige < 60
  return round(player.contract.weeklyWage * (ambitious ? 1.1 : 1), 50)
}

// ---------- Ledger ----------
let ledgerCache: { raw: string; entries: LedgerEntry[] } | null = null
function readLedger(): LedgerEntry[] {
  const saved = window.localStorage.getItem(LEDGER_KEY)
  if (!saved) return []
  if (ledgerCache?.raw === saved) return ledgerCache.entries
  try {
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.every(isLedgerEntry)) throw new Error('The transfer ledger has an invalid format.')
    ledgerCache = { raw: saved, entries: parsed }
    return parsed
  } catch (error) {
    throw new Error(error instanceof Error ? `Could not read the transfer ledger: ${error.message}` : 'Could not read the transfer ledger.')
  }
}

function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entry = value as Record<string, unknown>
  if (typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false
  if (entry.type === 'facility') return isFacilityUpgrade(entry.facility)
  if (entry.type === 'board') return (entry.reason === 'Squad development' || entry.reason === 'Facilities') && Number.isFinite(entry.requested) && Number.isFinite(entry.granted)
  if (typeof entry.playerId !== 'string') return false
  if (entry.type === 'sign') return typeof entry.fromClubId === 'string' && Number.isFinite(entry.fee) && Number.isFinite(entry.wage) && typeof entry.endDate === 'string'
  if (entry.type === 'release') return true
  if (entry.type === 'offer') return isContractOffer(entry.offer)
  return entry.type === 'renew' && Number.isFinite(entry.wage) && typeof entry.endDate === 'string' && (entry.offer === undefined || isContractOffer(entry.offer))
}

function isContractOffer(value: unknown): value is Player['contract']['offerHistory'][number] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const offer = value as Record<string, unknown>
  return typeof offer.clubName === 'string' && typeof offer.date === 'string'
    && (offer.status === 'Accepted' || offer.status === 'Declined')
    && Number.isFinite(offer.weeklyWage) && typeof offer.reason === 'string'
}

function record(entry: LedgerEntry): string | null {
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify([...readLedger(), entry]))
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'The transfer ledger could not be saved.'
  }
}

// ---------- Mutations (shared by live deals and ledger replay) ----------
function nextShirtNumber() {
  const used = new Set(club.squad.map((member) => member.shirtNumber))
  let number = 1
  while (used.has(number)) number += 1
  return number
}

function applySign(player: Player, fromClubId: string, fee: number, wage: number, endDate: string, date: string) {
  const fromName = fromClubId ? playerClubName(fromClubId) : 'Free Agent'
  removeFromList(fromClubId ? getClubSquad(fromClubId) : undefined, player)
  removeFromList(getTransferMarketPlayers(), player)
  club.finances.transferBudget -= fee
  club.finances.balance -= fee
  club.finances.weeklyWages += wage
  player.contract = { ...player.contract, clubId: club.id, weeklyWage: wage, endDate, startDate: date, squadRole: 'Squad Player' }
  player.shirtNumber = nextShirtNumber()
  player.transferHistory = [{ date, fromClub: fromName, toClub: club.name, fee, type: fee > 0 ? 'Permanent' : 'Free Transfer' }, ...player.transferHistory]
  club.squad.push(player)
  reorderClubSquad()
}

function applyRelease(player: Player) {
  removeFromList(club.squad, player)
  club.finances.weeklyWages -= player.contract.weeklyWage
  player.contract = { ...player.contract, clubId: '', squadRole: 'Squad Player' }
  const market = getTransferMarketPlayers()
  if (!market.some((candidate) => candidate.id === player.id)) market.push(player)
}

function applyRenew(player: Player, wage: number, endDate: string) {
  club.finances.weeklyWages += wage - player.contract.weeklyWage
  player.contract = { ...player.contract, weeklyWage: wage, endDate }
}

function applyFacility(facility: FacilityUpgrade) {
  club.facilities[FACILITY_LEVEL_KEY[facility]] += 1
  club.finances.balance -= FACILITY_UPGRADE_COSTS[facility]
  if (facility === 'stadium') {
    club.stadium.capacity = Math.round(club.stadium.capacity * (1 + STADIUM_UPGRADE_GROWTH) / 100) * 100
    club.finances.ticketSalesPerHomeMatch = Math.round(club.finances.ticketSalesPerHomeMatch * (1 + STADIUM_UPGRADE_GROWTH) / 100) * 100
  }
}

function applyBoardFunding(reason: BoardFundingReason, granted: number) {
  if (granted <= 0) return
  club.finances.balance += granted
  if (reason === 'Squad development') club.finances.transferBudget += granted
}

// ---------- Board meetings ----------
const ORIGINAL_TRANSFER_BUDGET = club.finances.transferBudget
/** Requests are a share of the budget the club started with, not of whatever is left. */
export const BOARD_REQUEST_PERCENTS = [10, 25, 50, 75]
export const BOARD_REQUEST_COOLDOWN_DAYS = 30
export const boardRequestAmount = (percent: number) => round(ORIGINAL_TRANSFER_BUDGET * percent / 100, 5000)

export function getBoardRequests(): BoardRequest[] {
  try {
    return readLedger().flatMap((entry) => entry.type === 'board' ? [{ reason: entry.reason, requested: entry.requested, granted: entry.granted, date: entry.date }] : [])
  } catch {
    return []
  }
}

/** Money the board handed over recently makes it less patient: up to 20 points off board confidence for 120 days. */
export function boardGoodwillPenalty(today: string): number {
  const limit = Date.parse(`${today}T12:00:00Z`) - 120 * 86_400_000
  const recent = getBoardRequests().filter((request) => Date.parse(`${request.date}T12:00:00Z`) >= limit).reduce((sum, request) => sum + request.granted, 0)
  return Math.min(20, Math.round(recent / ORIGINAL_TRANSFER_BUDGET * 12))
}

export function boardCooldownDaysLeft(): number {
  const last = getBoardRequests().at(-1)
  if (!last) return 0
  const elapsed = Math.round((Date.parse(`${getDate()}T12:00:00Z`) - Date.parse(`${last.date}T12:00:00Z`)) / 86_400_000)
  return Math.max(0, BOARD_REQUEST_COOLDOWN_DAYS - elapsed)
}

/** The board funds up to a ceiling that grows with its confidence; it never funds a club that is over its wage limit. */
export function requestBoardFunds(reason: BoardFundingReason, percent: number, boardConfidence: number, wageOverLimit: boolean): DealResult {
  if (reason !== 'Squad development' && reason !== 'Facilities') return { status: 'failed', message: 'Choose a reason for the request.' }
  if (!BOARD_REQUEST_PERCENTS.includes(percent)) return { status: 'failed', message: 'Choose one of the listed amounts.' }
  const requested = boardRequestAmount(percent)
  const wait = boardCooldownDaysLeft()
  if (wait > 0) return { status: 'failed', message: `The board has already met you recently. Ask again in ${wait} day${wait === 1 ? '' : 's'}.` }
  const date = getDate()
  let granted = 0
  let message: string
  if (wageOverLimit) message = 'The board will not release more money while the wage bill is over the limit. Reduce wages first.'
  else if (reason === 'Facilities' && allFacilitiesMaxed(club.facilities)) message = 'Every facility is already at its maximum level, so the board sees no need for funds.'
  else {
    const ceilingPercent = Math.max(0, (boardConfidence - 40) / 60) * 100
    granted = Math.min(requested, boardRequestAmount(Math.floor(ceilingPercent / 5) * 5))
    message = granted >= requested ? `The board approves the full £${requested.toLocaleString('en-GB')} for ${reason.toLowerCase()}.`
      : granted > 0 ? `The board will only commit £${granted.toLocaleString('en-GB')} of the £${requested.toLocaleString('en-GB')} you asked for. Deliver results to earn more trust.`
        : 'The board declines. It does not have enough confidence in you yet.'
  }
  const persistError = record({ type: 'board', reason, requested, granted, date })
  if (persistError) return { status: 'failed', message: `The decision was not recorded because it could not be saved: ${persistError}` }
  applyBoardFunding(reason, granted)
  notify()
  return { status: granted >= requested ? 'accepted' : granted > 0 ? 'counter' : 'rejected', message, counterFee: granted }
}

// ---------- Public actions ----------
export function upgradeFacility(facility: FacilityUpgrade): string {
  if (!isFacilityUpgrade(facility)) return 'That facility cannot be upgraded.'
  const levelKey = FACILITY_LEVEL_KEY[facility]
  const cost = FACILITY_UPGRADE_COSTS[facility]
  if (club.facilities[levelKey] >= club.facilities.maxLevel) return 'This facility is already at its maximum level.'
  if (club.finances.balance < cost) return `The club needs £${cost.toLocaleString('en-GB')} to upgrade this facility.`
  const persistError = record({ type: 'facility', facility, date: getDate() })
  if (persistError) return `The upgrade was not completed because it could not be saved: ${persistError}`
  applyFacility(facility)
  notify()
  return `${FACILITY_INFO[facility].name} upgraded to level ${club.facilities[levelKey]}.`
}

export function submitBid(player: Player, terms: BidTerms): DealResult {
  const date = getDate()
  const free = !player.contract.clubId
  if (isOwnPlayer(player)) return { status: 'failed', message: `${player.name} is already in your squad.` }
  if (!getTransferMarketPlayers().some((candidate) => candidate.id === player.id)) return { status: 'failed', message: `${player.name} is no longer available in the transfer market.` }
  if (!Number.isFinite(terms.fee) || terms.fee < 0 || !Number.isFinite(terms.wageMultiplier) || terms.wageMultiplier < 0.5 || terms.wageMultiplier > 2.5 || !Number.isInteger(terms.years) || terms.years < 1 || terms.years > 5) {
    return { status: 'failed', message: 'The offer terms are invalid.' }
  }
  if (club.squad.length >= SQUAD_MAX) return { status: 'failed', message: `Your squad is full (${SQUAD_MAX} players).` }

  const fee = free ? 0 : terms.fee
  const wage = round(getWageDemand(player) * terms.wageMultiplier, 50)
  const demand = getWageDemand(player)

  if (fee > club.finances.transferBudget || fee > club.finances.balance) return { status: 'failed', message: `You cannot afford ${money(fee)}. Your budget is ${money(Math.min(club.finances.transferBudget, club.finances.balance))}.` }

  if (!free) {
    const clause = player.contract.releaseClause
    const clauseMet = clause !== undefined && fee >= clause
    if (!clauseMet) {
      const seller = getClubSquad(player.contract.clubId)
      if (seller.length <= SQUAD_MIN) return { status: 'rejected', message: `The club will not sell: they would fall below the minimum squad size of ${SQUAD_MIN}.` }
      const asking = getAskingPrice(player)
      if (fee < asking) {
        if (fee >= asking * 0.85) {
          return { status: 'counter', counterFee: asking, message: `Counter-offer: the club will accept ${money(asking)}.` }
        }
        return { status: 'rejected', message: `The club rejected your ${money(fee)} bid. They value him far higher.` }
      }
    }
  }

  const wageFailure = wageRuleFailure(club.finances.weeklyWages + wage)
  if (wageFailure) {
    return { status: 'failed', message: `Financial fair play: ${wageFailure}` }
  }
  if (wage < demand) {
    return { status: 'rejected', message: `${player.name} rejected personal terms: he wants at least £${demand.toLocaleString('en-GB')}/wk.` }
  }

  const fromClubId = player.contract.clubId
  const endDate = contractEnd(terms.years)
  const persistError = record({ type: 'sign', playerId: player.id, fromClubId, fee, wage, endDate, date })
  if (persistError) return { status: 'failed', message: `The deal was not completed because it could not be saved: ${persistError}` }
  applySign(player, fromClubId, fee, wage, endDate, date)
  notify()
  return { status: 'accepted', message: `${player.name} signed for ${fee > 0 ? money(fee) : 'free'} on £${wage.toLocaleString('en-GB')}/wk until ${endDate.slice(0, 4)}.` }
}

export function releasePlayer(player: Player): string {
  if (!isOwnPlayer(player)) return 'This player is not in your squad.'
  if (club.squad.length <= SQUAD_MIN) return `You need at least ${SQUAD_MIN} players in the squad.`
  const persistError = record({ type: 'release', playerId: player.id, date: getDate() })
  if (persistError) return `The release was not completed because it could not be saved: ${persistError}`
  applyRelease(player)
  notify()
  return `${player.name} has been released and is now a free agent.`
}

export function renewContract(player: Player, years: number, raisePercent: number): DealResult {
  if (!isOwnPlayer(player)) return { status: 'failed', message: `${player.name} is not in your squad.` }
  if (!Number.isInteger(years) || years < 1 || years > 5 || !Number.isFinite(raisePercent) || raisePercent < 0 || raisePercent > 100) {
    return { status: 'failed', message: 'The contract offer terms are invalid.' }
  }
  const needed = { 'Very Good': 0, Good: 5, Okay: 10, Poor: 20 }[player.morale]
  const wage = round(player.contract.weeklyWage * (1 + raisePercent / 100), 50)
  const date = getDate()
  let reason = 'Happy with the project and terms'
  let accepted = raisePercent >= needed
  if (!accepted) reason = `Wants a wage rise of at least ${needed}%`
  else {
    const failure = wageRuleFailure(club.finances.weeklyWages + wage - player.contract.weeklyWage)
    if (failure) {
      accepted = false
      reason = `The club cannot afford this wage under financial fair play: ${failure}`
    }
  }
  const offer = { clubName: club.name, date, status: accepted ? 'Accepted' as const : 'Declined' as const, weeklyWage: wage, reason }
  if (!accepted) {
    const persistError = record({ type: 'offer', playerId: player.id, date, offer })
    if (persistError) return { status: 'failed', message: `The offer was not recorded because it could not be saved: ${persistError}` }
    player.contract = { ...player.contract, offerHistory: [offer, ...player.contract.offerHistory] }
    notify()
    return { status: 'rejected', message: `${player.name} rejected the offer: ${reason}.` }
  }
  const endDate = contractEnd(years)
  const persistError = record({ type: 'renew', playerId: player.id, wage, endDate, date, offer })
  if (persistError) return { status: 'failed', message: `The renewal was not completed because it could not be saved: ${persistError}` }
  player.contract = { ...player.contract, offerHistory: [offer, ...player.contract.offerHistory] }
  applyRenew(player, wage, endDate)
  notify()
  return { status: 'accepted', message: `${player.name} signed a ${years}-year deal on £${wage.toLocaleString('en-GB')}/wk.` }
}

// ---------- Season rollover: ageing, expiring contracts and a fresh free-agent pool ----------
const FREE_AGENTS_PER_SEASON = 12

function restockFreeAgents(season: number) {
  const market = getTransferMarketPlayers()
  const fresh = Array.from({ length: FREE_AGENTS_PER_SEASON }, (_, index) => generatePlayer({ seed: `free-agents:${season}:${index}`, currentDate: `${seasonStartYear(season)}-08-01`, ageRange: [19, 34] }))
  markPlayersCurrent(fresh, season)
  for (const player of fresh) if (!market.some((candidate) => candidate.id === player.id)) market.push(player)
}

function handleRollover(season: number) {
  for (const squad of getCachedSquads()) catchUpPlayers(squad, season, true)
  catchUpPlayers(club.squad, season, false)
  catchUpPlayers(getTransferMarketPlayers(), season, false)
  restockFreeAgents(season)

  const start = `${seasonStartYear(season)}-08-01`
  const expiring = club.squad.filter((player) => player.contract.endDate < start).sort((first, second) => second.overall - first.overall)
  if (expiring.length === 0) return
  const date = getDate()
  const kept: string[] = []
  const left: string[] = []
  let size = club.squad.length
  // The three best expiring players, and anyone needed to keep the minimum squad, are extended a year on the same wage.
  expiring.forEach((player, index) => {
    if (index < 3 || size <= SQUAD_MIN) {
      const endDate = `${seasonStartYear(season) + 1}-06-30`
      if (!record({ type: 'renew', playerId: player.id, wage: player.contract.weeklyWage, endDate, date })) {
        applyRenew(player, player.contract.weeklyWage, endDate)
        kept.push(player.name)
      }
    } else if (!record({ type: 'release', playerId: player.id, date })) {
      applyRelease(player)
      size -= 1
      left.push(player.name)
    }
  })
  addGameWarning([
    kept.length ? `${kept.join(', ')} had expiring contracts and were extended by a year.` : '',
    left.length ? `${left.join(', ')} left as free agents when their contracts expired.` : '',
  ].filter(Boolean).join(' '))
}

onSeasonRollover(handleRollover)
for (let season = 1; season <= readSeasonsElapsed(); season += 1) restockFreeAgents(season)

// ---------- Restore a saved game ----------
function restoreTransfers() {
  try {
    for (const entry of readLedger()) {
      if (entry.type === 'sign') {
        const player = (entry.fromClubId ? getClubSquad(entry.fromClubId) : getTransferMarketPlayers()).find((member) => member.id === entry.playerId)
          ?? getTransferMarketPlayers().find((member) => member.id === entry.playerId)
        if (!player) throw new Error(`Cannot restore transfer for player "${entry.playerId}".`)
        applySign(player, entry.fromClubId, entry.fee, entry.wage, entry.endDate, entry.date)
      } else if (entry.type === 'facility') {
        applyFacility(entry.facility)
      } else if (entry.type === 'board') {
        applyBoardFunding(entry.reason, entry.granted)
      } else {
        const player = club.squad.find((member) => member.id === entry.playerId)
        if (!player) throw new Error(`Cannot restore contract update for player "${entry.playerId}".`)
        if (entry.type === 'release') applyRelease(player)
        else if (entry.type === 'renew') {
          applyRenew(player, entry.wage, entry.endDate)
          if (entry.offer) player.contract = { ...player.contract, offerHistory: [entry.offer, ...player.contract.offerHistory] }
        } else player.contract = { ...player.contract, offerHistory: [entry.offer, ...player.contract.offerHistory] }
      }
    }
  } catch (error) {
    reportGameMessage(error instanceof Error ? error.message : 'Could not restore saved transfers.')
  }
}

restoreTransfers()
