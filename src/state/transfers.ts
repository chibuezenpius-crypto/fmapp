import { club, getTransferMarketPlayers, isOwnPlayer, ownLeagueRules, playerClubName, removeFromList, reorderClubSquad, SQUAD_MAX, SQUAD_MIN } from '../data/mockData'
import { getClubSquad } from '../data/clubSquads'
import { createRng } from '../utils/proceduralGenerator'
import type { Player } from '../types/game'
import { getDate, LEDGER_KEY, notify } from './gameStore'

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
  | { type: 'renew'; playerId: string; wage: number; endDate: string; date: string }

const money = (amount: number) => `£${(amount / 1000000).toFixed(1)}m`
const round = (value: number, step: number) => Math.round(value / step) * step
const wageLimit = () => club.finances.wageBudget * ownLeagueRules.financial.wageBudgetTolerance

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
function readLedger(): LedgerEntry[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LEDGER_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed as LedgerEntry[] : []
  } catch {
    return []
  }
}

function record(entry: LedgerEntry) {
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify([...readLedger(), entry]))
  } catch {
    // The deal still applies for this session even if persistence is unavailable.
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
  getTransferMarketPlayers().push(player)
}

function applyRenew(player: Player, wage: number, endDate: string) {
  club.finances.weeklyWages += wage - player.contract.weeklyWage
  player.contract = { ...player.contract, weeklyWage: wage, endDate }
}

// ---------- Public actions ----------
export function submitBid(player: Player, terms: BidTerms): DealResult {
  const date = getDate()
  const free = !player.contract.clubId
  if (isOwnPlayer(player)) return { status: 'failed', message: `${player.name} is already in your squad.` }
  if (club.squad.length >= SQUAD_MAX) return { status: 'failed', message: `Your squad is full (${SQUAD_MAX} players).` }

  const fee = free ? 0 : terms.fee
  const wage = round(getWageDemand(player) * terms.wageMultiplier, 50)
  const demand = getWageDemand(player)

  if (fee > club.finances.transferBudget) return { status: 'failed', message: `You cannot afford ${money(fee)}. Your budget is ${money(club.finances.transferBudget)}.` }

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

  if (ownLeagueRules.financial.blockOverspending && club.finances.weeklyWages + wage > wageLimit()) {
    return { status: 'failed', message: `Financial fair play: this ${wage.toLocaleString('en-GB')}/wk wage would take the wage bill above the £${Math.round(wageLimit()).toLocaleString('en-GB')}/wk limit.` }
  }
  if (wage < demand) {
    return { status: 'rejected', message: `${player.name} rejected personal terms: he wants at least £${demand.toLocaleString('en-GB')}/wk.` }
  }

  const fromClubId = player.contract.clubId
  const endDate = contractEnd(terms.years)
  applySign(player, fromClubId, fee, wage, endDate, date)
  record({ type: 'sign', playerId: player.id, fromClubId, fee, wage, endDate, date })
  notify()
  return { status: 'accepted', message: `${player.name} signed for ${fee > 0 ? money(fee) : 'free'} on £${wage.toLocaleString('en-GB')}/wk until ${endDate.slice(0, 4)}.` }
}

export function releasePlayer(player: Player): string {
  if (!isOwnPlayer(player)) return 'This player is not in your squad.'
  if (club.squad.length <= SQUAD_MIN) return `You need at least ${SQUAD_MIN} players in the squad.`
  applyRelease(player)
  record({ type: 'release', playerId: player.id, date: getDate() })
  notify()
  return `${player.name} has been released and is now a free agent.`
}

export function renewContract(player: Player, years: number, raisePercent: number): DealResult {
  const needed = { 'Very Good': 0, Good: 5, Okay: 10, Poor: 20 }[player.morale]
  const wage = round(player.contract.weeklyWage * (1 + raisePercent / 100), 50)
  const date = getDate()
  let reason = 'Happy with the project and terms'
  let accepted = raisePercent >= needed
  if (!accepted) reason = `Wants a wage rise of at least ${needed}%`
  else if (ownLeagueRules.financial.blockOverspending && club.finances.weeklyWages + wage - player.contract.weeklyWage > wageLimit()) {
    accepted = false
    reason = 'The club cannot afford this wage under financial fair play'
  }
  player.contract = { ...player.contract, offerHistory: [{ clubName: club.name, date, status: accepted ? 'Accepted' : 'Declined', weeklyWage: wage, reason }, ...player.contract.offerHistory] }
  if (!accepted) {
    notify()
    return { status: 'rejected', message: `${player.name} rejected the offer: ${reason}.` }
  }
  const endDate = contractEnd(years)
  applyRenew(player, wage, endDate)
  record({ type: 'renew', playerId: player.id, wage, endDate, date })
  notify()
  return { status: 'accepted', message: `${player.name} signed a ${years}-year deal on £${wage.toLocaleString('en-GB')}/wk.` }
}

// ---------- Restore a saved game ----------
function restoreTransfers() {
  for (const entry of readLedger()) {
    if (entry.type === 'sign') {
      const player = (entry.fromClubId ? getClubSquad(entry.fromClubId) : getTransferMarketPlayers()).find((member) => member.id === entry.playerId)
        ?? getTransferMarketPlayers().find((member) => member.id === entry.playerId)
      if (player) applySign(player, entry.fromClubId, entry.fee, entry.wage, entry.endDate, entry.date)
    } else {
      const player = club.squad.find((member) => member.id === entry.playerId)
      if (!player) continue
      if (entry.type === 'release') applyRelease(player)
      else applyRenew(player, entry.wage, entry.endDate)
    }
  }
}

restoreTransfers()
