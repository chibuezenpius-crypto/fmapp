import { useSyncExternalStore } from 'react'
import { club, league, matchFixtures, ownLeagueRules, SEASON_START_DATE } from '../data/mockData'
import { getClubSquad } from '../data/clubSquads'
import type { LeagueCompetition, LeagueStanding, MatchInfo, Player } from '../types/game'
import { matchSeedFromId, simulateMatch, type MatchTactics } from '../simulation/matchEngine'
import { clearSimulatedMatches, loadSimulatedMatches, saveSimulatedMatches } from '../simulation/persistence'
import { applySimulatedResults } from '../simulation/season'
import { computePlayerStats, computeTeamStats } from '../simulation/stats'
import { DEFAULT_SLOTS, fitPlayersToSlots } from '../utils/lineup'

const DATE_KEY = 'fmapp-game-date-v2'
export const LEDGER_KEY = 'fmapp-transfer-ledger-v1'
const TACTICS_KEY = 'fmapp-tactics'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const tacticStyles = ['Gegenpress', 'Tiki-Taka', 'Counter-Attack', 'Direct Passing', 'Park the Bus']

const parseDate = (value: string) => new Date(`${value}T12:00:00Z`)
export const addDays = (value: string, days: number) => {
  const date = parseDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function describeDate(value: string) {
  const date = parseDate(value)
  const part = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(date)
  return {
    day: `${date.getUTCDate()} ${part({ month: 'short' }).toUpperCase()}`,
    weekday: part({ weekday: 'long' }).toUpperCase(),
    long: `${part({ weekday: 'long' }).toUpperCase()}, ${date.getUTCDate()} ${part({ month: 'long' }).toUpperCase()}`,
    month: `${part({ month: 'long' }).toUpperCase()} ${date.getUTCFullYear()}`,
  }
}

function readMatchTactics(): MatchTactics {
  const saved = window.localStorage.getItem(TACTICS_KEY)
  if (!saved) return { pressingIntensity: 55, tempo: 50, style: 'Gegenpress' }
  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Saved tactics are unreadable. Open Tactics and save your setup again.')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Saved tactics have an invalid format.')
  const values = parsed as Record<string, unknown>
  const pressing = values.pressingIntensity ?? 'Standard'
  const tempo = values.matchTempo ?? 'Balanced'
  const style = values.tacticalDNA ?? 'Gegenpress'
  const pressingValues: Record<string, number> = { Low: 30, Standard: 55, High: 80 }
  const tempoValues: Record<string, number> = { Slow: 30, Balanced: 50, Fast: 75 }
  if (typeof pressing !== 'string' || !(pressing in pressingValues)) throw new Error('Saved pressing intensity is invalid. Open Tactics and save your setup again.')
  if (typeof tempo !== 'string' || !(tempo in tempoValues)) throw new Error('Saved match tempo is invalid. Open Tactics and save your setup again.')
  if (typeof style !== 'string' || !tacticStyles.includes(style)) throw new Error('Saved tactical style is invalid. Open Tactics and save your setup again.')
  const lineup = values.lineup
  if (lineup !== undefined && (!Array.isArray(lineup) || !lineup.every((id) => typeof id === 'string'))) {
    throw new Error('Saved lineup is invalid. Open Tactics and save your setup again.')
  }
  return { pressingIntensity: pressingValues[pressing], tempo: tempoValues[tempo], style, ...(Array.isArray(lineup) ? { lineup } : {}) }
}

function refreshMatchLineup(template: MatchInfo['lineups']['home'], squad: Player[], side: 'home' | 'away', preferredIds?: string[]) {
  const preferred = preferredIds?.length === 11 && new Set(preferredIds).size === 11 && preferredIds.every((id) => squad.some((player) => player.id === id))
    ? preferredIds
    : fitPlayersToSlots(DEFAULT_SLOTS, squad)
  const starters = preferred.map((id) => squad.find((player) => player.id === id)).filter((player): player is Player => player !== undefined)
  const startingXI = DEFAULT_SLOTS.map((slot, index) => {
    const player = squad.find((candidate) => candidate.id === preferred[index]) ?? starters[index]
    if (!player) throw new Error(`Unable to fill the ${slot.label} position in the match lineup.`)
    return {
      id: `${player.id}-match-${index}`,
      playerId: player.id,
      name: player.name,
      shirtNumber: player.shirtNumber,
      position: slot.label,
      x: side === 'home' ? slot.x : 100 - slot.x,
      y: side === 'home' ? slot.y : 100 - slot.y,
    }
  })
  const selectedIds = new Set(startingXI.map((player) => player.playerId))
  const substitutes = [...squad].filter((player) => !selectedIds.has(player.id)).sort((a, b) => b.overall - a.overall).slice(0, 7)
    .map((player, index) => ({ id: `${player.id}-sub-${index}`, playerId: player.id, name: player.name, shirtNumber: player.shirtNumber, position: player.position, x: 0, y: 0 }))
  return { ...template, formation: '4-3-3', startingXI, substitutes }
}

export function simulateFixture(fixture: MatchInfo): MatchInfo {
  const tactics = readMatchTactics()
  const homeSquad = fixture.homeClubId === club.id ? club.squad : getClubSquad(fixture.homeClubId)
  const awaySquad = fixture.awayClubId === club.id ? club.squad : getClubSquad(fixture.awayClubId)
  const homeLineup = refreshMatchLineup(fixture.lineups.home, homeSquad, 'home', fixture.homeClubId === club.id ? tactics.lineup : undefined)
  const awayLineup = refreshMatchLineup(fixture.lineups.away, awaySquad, 'away', fixture.awayClubId === club.id ? tactics.lineup : undefined)
  return simulateMatch({
    match: { ...fixture, lineups: { home: homeLineup, away: awayLineup }, formation: { home: homeLineup.formation, away: awayLineup.formation } },
    homeSquad,
    awaySquad,
    seed: matchSeedFromId(fixture.id),
    homeTactics: fixture.homeClubId === club.id ? tactics : undefined,
    awayTactics: fixture.awayClubId === club.id ? tactics : undefined,
  }).match
}

// ---------- Store ----------
function loadDate() {
  const saved = window.localStorage.getItem(DATE_KEY)
  return saved && ISO_DATE.test(saved) && !Number.isNaN(parseDate(saved).getTime()) ? saved : SEASON_START_DATE
}

const loaded = loadSimulatedMatches(matchFixtures)
let date = loaded.error ? SEASON_START_DATE : loadDate()
let results: Record<string, MatchInfo> = loaded.matches
let message = loaded.error
let revision = 0
let cached: { revision: number; view: GameView } | null = null
const listeners = new Set<() => void>()

/** Tells every subscribed screen that game state changed (day advanced, transfer done, match played). */
export function notify() {
  revision += 1
  listeners.forEach((listener) => listener())
}

export function reportGameMessage(text: string) {
  message = text
  notify()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export interface GameView {
  revision: number
  date: string
  matches: MatchInfo[]
  standings: LeagueStanding[]
  ownStanding: LeagueStanding | undefined
  nextFixture: MatchInfo | undefined
  upcoming: MatchInfo[]
  playerStats: LeagueCompetition['playerStats']
  teamStats: LeagueCompetition['teamStats']
  message: string
}

function buildView(): GameView {
  const completed = Object.values(results)
  const standings = applySimulatedResults(league.standings, completed, ownLeagueRules)
  const formByClub = new Map(standings.map((standing) => [standing.clubId, standing.form]))
  const meetings = new Map<string, MatchInfo[]>()
  for (const match of completed) {
    const key = [match.homeClubId, match.awayClubId].sort().join('|')
    meetings.set(key, [...(meetings.get(key) ?? []), match])
  }
  const matches = matchFixtures.map((fixture): MatchInfo => {
    const result = results[fixture.id]
    if (result) return result
    const past = (meetings.get([fixture.homeClubId, fixture.awayClubId].sort().join('|')) ?? []).sort((a, b) => b.date.localeCompare(a.date))
    return {
      ...fixture,
      lastFiveForm: { home: formByClub.get(fixture.homeClubId) ?? [], away: formByClub.get(fixture.awayClubId) ?? [] },
      headToHead: {
        homeWins: past.filter((match) => match.score && (match.homeClubId === fixture.homeClubId ? match.score.home > match.score.away : match.score.away > match.score.home)).length,
        draws: past.filter((match) => match.score && match.score.home === match.score.away).length,
        awayWins: past.filter((match) => match.score && (match.homeClubId === fixture.homeClubId ? match.score.away > match.score.home : match.score.home > match.score.away)).length,
        recentMeetings: past.slice(0, 5).map((match) => ({ date: match.date, homeClubName: match.homeClubName, awayClubName: match.awayClubName, homeScore: match.score?.home ?? 0, awayScore: match.score?.away ?? 0 })),
      },
    }
  })
  const upcoming = matches.filter((match) => match.status === 'Upcoming' && (match.homeClubId === club.id || match.awayClubId === club.id))
  return {
    revision,
    date,
    matches,
    standings,
    ownStanding: standings.find((standing) => standing.clubId === club.id),
    nextFixture: upcoming[0],
    upcoming,
    playerStats: computePlayerStats(completed),
    teamStats: computeTeamStats(standings, completed),
    message,
  }
}

export const getDate = () => date

export function getGameView(): GameView {
  if (!cached || cached.revision !== revision) cached = { revision, view: buildView() }
  return cached.view
}

export const useGame = (): GameView => {
  useSyncExternalStore(subscribe, () => revision)
  return getGameView()
}

// ---------- Actions ----------
function commit(newResults: MatchInfo[], nextDate?: string) {
  results = { ...results, ...Object.fromEntries(newResults.map((result) => [result.id, result])) }
  if (nextDate) date = nextDate
  try {
    saveSimulatedMatches(results, club.id)
    if (nextDate) window.localStorage.setItem(DATE_KEY, nextDate)
    message = ''
  } catch (error) {
    message = error instanceof Error ? `Progress was applied, but it could not be saved: ${error.message}` : 'Progress was applied, but it could not be saved.'
  }
  notify()
}

const fail = (text: string, error: unknown) => {
  message = error instanceof Error ? `${text}: ${error.message}` : `${text}.`
  notify()
}

/** Moves the calendar to `targetDate` and plays every fixture that falls due on the way. */
function advanceTo(targetDate: string) {
  try {
    const due = getGameView().matches.filter((match) => match.status === 'Upcoming' && match.date <= targetDate)
      .sort((first, second) => first.date.localeCompare(second.date) || first.id.localeCompare(second.id))
    commit(due.map(simulateFixture), targetDate)
  } catch (error) {
    fail('Could not advance', error)
  }
}

export const advanceDay = () => advanceTo(addDays(date, 1))

export function advanceToNextMatch() {
  const next = getGameView().nextFixture
  if (!next) {
    message = 'The season is complete: no fixtures remain.'
    notify()
    return
  }
  advanceTo(next.date > date ? next.date : addDays(date, 1))
}

export function playMatch(matchId: string) {
  const fixture = getGameView().matches.find((match) => match.id === matchId)
  if (!fixture || fixture.status !== 'Upcoming') return
  try {
    commit([simulateFixture(fixture)])
  } catch (error) {
    fail('The match could not be simulated', error)
  }
}

export function clearMessage() {
  if (!message) return
  message = ''
  notify()
}

/** Wipes the save (results, calendar, transfer ledger) and restarts from a fresh season. */
export function resetGame() {
  clearSimulatedMatches()
  window.localStorage.removeItem(DATE_KEY)
  window.localStorage.removeItem(LEDGER_KEY)
  window.location.reload()
}
