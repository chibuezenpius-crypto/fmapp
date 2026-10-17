import { useSyncExternalStore } from 'react'
import rawGlobalLeagues from '../data/globalLeaguesAndTeams.json'
import { club, createTieFixture, getSeasonLeagueFixtures, league, leagueStandings, ownLeagueRules, SEASON_START_DATE } from '../data/mockData'
import { getCompetitionRules } from '../data/competitionRules'
import { getClubSquad } from '../data/clubSquads'
import type { GlobalLeaguesDatabase, LeagueCompetition, LeagueStanding, MatchInfo, Player } from '../types/game'
import { matchSeedFromId, simulateMatch, type MatchTactics } from '../simulation/matchEngine'
import { clearSimulatedMatches, loadSimulatedMatches, saveSimulatedMatches } from '../simulation/persistence'
import { deriveSeasonTies, type LeagueRankings, type ScoreLookup, type SeasonTies, type TieSpec } from '../simulation/competitions'
import { clubStrength, quickResult } from '../simulation/quickResult'
import { applySimulatedResults } from '../simulation/season'
import { computePlayerStats, computeTeamStats } from '../simulation/stats'
import { DEFAULT_SLOTS, fitPlayersToSlots } from '../utils/lineup'

const DATE_KEY = 'fmapp-game-date-v4'
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

export interface SeasonRecord {
  season: number
  label: string
  /** League ID -> club IDs from champion downwards; seeds the next season's qualification. */
  tables: LeagueRankings
  summaries: Record<string, { champion: string; runnerUp: string; points: number }>
}

const HISTORY_KEY = 'fmapp-season-history-v1'
const countries = (rawGlobalLeagues as unknown as GlobalLeaguesDatabase).countries
export const seasonLabel = (season: number) => `${2026 + season}/${String((27 + season) % 100).padStart(2, '0')}`

function loadHistory(): SeasonRecord[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is SeasonRecord => typeof item === 'object' && item !== null && typeof item.season === 'number' && typeof item.tables === 'object') : []
  } catch {
    return []
  }
}

let history: SeasonRecord[] = loadHistory()
const currentSeason = () => history.length

const involvesUser = (match: { homeClubId: string; awayClubId: string }) => match.homeClubId === club.id || match.awayClubId === club.id
/** Fully simulated (events, commentary, saved): the user's own matches and the rest of the user's league. */
const isFullSimulation = (match: MatchInfo) => match.leagueId === league.id || involvesUser(match)

const tieFixtures = new Map<string, MatchInfo>()
const tieFixture = (tie: TieSpec) => {
  let fixture = tieFixtures.get(tie.id)
  if (!fixture) {
    fixture = createTieFixture(tie)
    tieFixtures.set(tie.id, fixture)
  }
  return fixture
}

const backgroundResults = new Map<string, MatchInfo>()
/** Quick deterministic result for matches that are not fully simulated; never saved because it is reproducible. */
function backgroundResult(fixture: MatchInfo): MatchInfo {
  let result = backgroundResults.get(fixture.id)
  if (!result) {
    result = quickResult(fixture, clubStrength(fixture.homeClubId, getClubSquad(fixture.homeClubId)), clubStrength(fixture.awayClubId, getClubSquad(fixture.awayClubId)))
    backgroundResults.set(fixture.id, result)
  }
  return result
}

const scoreLookup = (done: Record<string, MatchInfo>, asOf: string): ScoreLookup => (tie) => {
  const saved = done[tie.id]?.score
  if (saved) return saved
  if (tie.homeId === club.id || tie.awayId === club.id || tie.date > asOf) return undefined
  return backgroundResult(tieFixture(tie)).score
}

/** Every fixture of the current season (all leagues, cups, continental ties) that exists given the results so far. */
function seasonFixtures(done: Record<string, MatchInfo>, asOf: string): { fixtures: MatchInfo[]; ties: SeasonTies } {
  const season = currentSeason()
  const ties = deriveSeasonTies(season, season > 0 ? history[season - 1]?.tables : undefined, scoreLookup(done, asOf))
  return { fixtures: [...getSeasonLeagueFixtures(season), ...ties.ties.map(tieFixture)], ties }
}

const resolveFixture = (fixture: MatchInfo, done: Record<string, MatchInfo>, asOf: string): MatchInfo =>
  done[fixture.id] ?? (!isFullSimulation(fixture) && fixture.date <= asOf ? backgroundResult(fixture) : fixture)

const savedDate = loadDate()
const loaded = loadSimulatedMatches((done) => seasonFixtures(done, savedDate).fixtures)
let date = loaded.error ? SEASON_START_DATE : savedDate
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
  season: number
  seasonLabel: string
  history: SeasonRecord[]
}

function buildView(): GameView {
  const resolved = seasonFixtures(results, date).fixtures.map((fixture) => resolveFixture(fixture, results, date))
  const completed = resolved.filter((match) => match.status === 'Completed')
  const leagueResults = completed.filter((match) => match.leagueId === league.id)
  const standings = applySimulatedResults(league.standings, leagueResults, ownLeagueRules)
  const formByClub = new Map(standings.map((standing) => [standing.clubId, standing.form]))
  const meetings = new Map<string, MatchInfo[]>()
  for (const match of completed) {
    const key = [match.homeClubId, match.awayClubId].sort().join('|')
    meetings.set(key, [...(meetings.get(key) ?? []), match])
  }
  const matches = resolved.map((fixture): MatchInfo => {
    if (fixture.status === 'Completed') return fixture
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
    .sort((first, second) => `${first.date}${first.kickOff}`.localeCompare(`${second.date}${second.kickOff}`))
  return {
    revision,
    date,
    matches,
    standings,
    ownStanding: standings.find((standing) => standing.clubId === club.id),
    nextFixture: upcoming[0],
    upcoming,
    playerStats: computePlayerStats(leagueResults),
    teamStats: computeTeamStats(standings, leagueResults),
    message,
    season: currentSeason(),
    seasonLabel: seasonLabel(currentSeason()),
    history,
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
/**
 * Once the Club World Cup final is played the season is over: archive the final tables (they seed next season's
 * qualification), drop the finished season's saved results, and let the next season's calendar generate itself.
 */
function rollOverSeason(): boolean {
  const { fixtures, ties } = seasonFixtures(results, date)
  if (!ties.complete) return false
  const resolved = fixtures.map((fixture) => resolveFixture(fixture, results, date)).filter((match) => match.status === 'Completed')
  const tables: LeagueRankings = {}
  const summaries: SeasonRecord['summaries'] = {}
  for (const country of countries) {
    const rows = applySimulatedResults(leagueStandings(country), resolved.filter((match) => match.leagueId === country.id), getCompetitionRules(country.id))
    tables[country.id] = rows.map((row) => row.clubId)
    summaries[country.id] = { champion: rows[0].clubName, runnerUp: rows[1].clubName, points: rows[0].points }
  }
  history = [...history, { season: history.length, label: seasonLabel(history.length), tables, summaries }]
  results = {}
  return true
}

function commit(newResults: MatchInfo[], nextDate?: string) {
  results = { ...results, ...Object.fromEntries(newResults.map((result) => [result.id, result])) }
  if (nextDate) date = nextDate
  let startedSeason = ''
  while (rollOverSeason()) startedSeason = seasonLabel(currentSeason())
  try {
    saveSimulatedMatches(results, club.id)
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    if (nextDate) window.localStorage.setItem(DATE_KEY, nextDate)
    message = startedSeason ? `The season is over. The ${startedSeason} calendar has been scheduled automatically.` : ''
  } catch (error) {
    message = error instanceof Error ? `Progress was applied, but it could not be saved: ${error.message}` : 'Progress was applied, but it could not be saved.'
  }
  notify()
}
const fail = (text: string, error: unknown) => {
  message = error instanceof Error ? `${text}: ${error.message}` : `${text}.`
  notify()
}

/** Moves the calendar to `targetDate` and plays every fixture that falls due on the way, including knockout rounds those results unlock. */
function advanceTo(targetDate: string) {
  try {
    const played: Record<string, MatchInfo> = {}
    for (;;) {
      const done = { ...results, ...played }
      const due = seasonFixtures(done, targetDate).fixtures.filter((match) => !done[match.id] && isFullSimulation(match) && match.date <= targetDate)
        .sort((first, second) => first.date.localeCompare(second.date) || first.id.localeCompare(second.id))
      if (due.length === 0) break
      for (const fixture of due) played[fixture.id] = simulateFixture(fixture)
    }
    commit(Object.values(played), targetDate)
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
