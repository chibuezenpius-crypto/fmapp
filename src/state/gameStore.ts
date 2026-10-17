import { useSyncExternalStore } from 'react'
import rawGlobalLeagues from '../data/globalLeaguesAndTeams.json'
import { clearOldSeasonFixtureCaches, club, createTieFixture, getSeasonLeagueFixtures, league, leagueStandings, ownLeagueRules, SEASON_START_DATE } from '../data/mockData'
import { getCompetitionRules } from '../data/competitionRules'
import { getClubSquad } from '../data/clubSquads'
import type { GlobalLeaguesDatabase, LeagueCompetition, LeagueStanding, MatchInfo, Player } from '../types/game'
import { matchSeedFromId, simulateMatch, type MatchTactics } from '../simulation/matchEngine'
import { clearPlayerConditions, clearSimulatedMatches, loadPlayerConditions, loadSimulatedMatches, savePlayerConditions, saveSimulatedMatches } from '../simulation/persistence'
import { CLUB_WORLD_CUP_ID, CONTINENTAL_IDS, DOMESTIC_CUPS, deriveSeasonTies, type LeagueRankings, type ScoreLookup, type SeasonTies, type TieSpec } from '../simulation/competitions'
import { clubStrength, quickResult } from '../simulation/quickResult'
import { applySimulatedResults } from '../simulation/season'
import { computePlayerStats, computeTeamStats } from '../simulation/stats'
import { DEFAULT_SLOTS, fitPlayersToSlots } from '../utils/lineup'
import { applyMatchCondition, isUnavailable, recoverPlayerToDate, type PlayerConditionState } from '../simulation/playerCondition'
import { validateSchedule } from '../simulation/calendarScheduler'
import { SPONSORS_KEY, syncSponsors } from './sponsors'
import { injuryDurationScale } from './facilities'
import { syncTraining, TRAINING_KEY } from './training'
import { normalizeBench, readSavedBenchIds } from './matchSquad'

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

function refreshMatchLineup(template: MatchInfo['lineups']['home'], squad: Player[], side: 'home' | 'away', preferredIds?: string[], date = getDate(), preferredBench?: string[]) {
  const available = squad.filter((player) => !isUnavailable(player, date))
  if (available.length < 11) throw new Error(`Club has only ${available.length} fit players available for ${date}.`)
  const preferred = preferredIds?.length === 11 && new Set(preferredIds).size === 11 && preferredIds.every((id) => available.some((player) => player.id === id))
    ? preferredIds
    : fitPlayersToSlots(DEFAULT_SLOTS, available)
  const starters = preferred.map((id) => available.find((player) => player.id === id)).filter((player): player is Player => player !== undefined)
  const startingXI = DEFAULT_SLOTS.map((slot, index) => {
    const player = available.find((candidate) => candidate.id === preferred[index]) ?? starters[index]
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
  const substitutes = normalizeBench(preferredBench, [...selectedIds].filter((id): id is string => typeof id === 'string'), available)
    .map((id) => available.find((player) => player.id === id)).filter((player): player is Player => player !== undefined)
    .map((player, index) => ({ id: `${player.id}-sub-${index}`, playerId: player.id, name: player.name, shirtNumber: player.shirtNumber, position: player.position, x: 0, y: 0 }))
  return { ...template, formation: '4-3-3', startingXI, substitutes }
}

export function simulateFixture(fixture: MatchInfo): MatchInfo {
  const tactics = readMatchTactics()
  const homeSquad = fixture.homeClubId === club.id ? club.squad : getClubSquad(fixture.homeClubId)
  const awaySquad = fixture.awayClubId === club.id ? club.squad : getClubSquad(fixture.awayClubId)
  for (const player of [...homeSquad, ...awaySquad]) recoverPlayerToDate(player, fixture.date, playerConditions)
  const homeLineup = refreshMatchLineup(fixture.lineups.home, homeSquad, 'home', fixture.homeClubId === club.id ? tactics.lineup : undefined, fixture.date, fixture.homeClubId === club.id ? readSavedBenchIds() : undefined)
  const awayLineup = refreshMatchLineup(fixture.lineups.away, awaySquad, 'away', fixture.awayClubId === club.id ? tactics.lineup : undefined, fixture.date, fixture.awayClubId === club.id ? readSavedBenchIds() : undefined)
  const maxSubstitutions = getCompetitionRules(fixture.leagueId).maxSubstitutions
  const result = simulateMatch({
    match: { ...fixture, lineups: { home: homeLineup, away: awayLineup }, formation: { home: homeLineup.formation, away: awayLineup.formation } },
    homeSquad,
    awaySquad,
    seed: matchSeedFromId(fixture.id),
    homeTactics: { ...(fixture.homeClubId === club.id ? tactics : {}), maxSubstitutions },
    awayTactics: { ...(fixture.awayClubId === club.id ? tactics : {}), maxSubstitutions },
  }).match
  applyMatchCondition(result, 'home', homeSquad, homeLineup, playerConditions, fixture.homeClubId === club.id ? injuryDurationScale(club.facilities.medicalLevel) : 1)
  applyMatchCondition(result, 'away', awaySquad, awayLineup, playerConditions, fixture.awayClubId === club.id ? injuryDurationScale(club.facilities.medicalLevel) : 1)
  return result
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

function isSeasonRecord(value: unknown): value is SeasonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (!Number.isSafeInteger(record.season) || typeof record.label !== 'string' || !record.tables || typeof record.tables !== 'object' || Array.isArray(record.tables)
    || !record.summaries || typeof record.summaries !== 'object' || Array.isArray(record.summaries)) return false
  const tables = record.tables as Record<string, unknown>
  const summaries = record.summaries as Record<string, unknown>
  for (const country of countries) {
    const table = tables[country.id]
    const summary = summaries[country.id]
    if (!Array.isArray(table) || !table.every((clubId: unknown) => typeof clubId === 'string')
      || !summary || typeof summary !== 'object' || Array.isArray(summary)) return false
    const summaryRecord = summary as Record<string, unknown>
    if (typeof summaryRecord.champion !== 'string' || typeof summaryRecord.runnerUp !== 'string' || !Number.isFinite(summaryRecord.points)) return false
  }
  return true
}

function loadHistory(): { history: SeasonRecord[]; error: string } {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? '[]')
    if (!Array.isArray(parsed) || !parsed.every(isSeasonRecord)) return { history: [], error: 'Saved season history has an invalid format. Reset the game to replace this save.' }
    return { history: parsed, error: '' }
  } catch (error) {
    return { history: [], error: error instanceof Error ? `Could not load season history: ${error.message}` : 'Could not load season history.' }
  }
}

const loadedHistory = loadHistory()
let history: SeasonRecord[] = loadedHistory.history
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
const validatedScheduleKeys = new Set<string>()
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
  const fixtures = [...getSeasonLeagueFixtures(season), ...ties.ties.map(tieFixture)]
  const key = `${season}:${ties.ties.map((tie) => `${tie.id}:${tie.date}:${tie.homeId}:${tie.awayId}`).join('|')}`
  if (!validatedScheduleKeys.has(key)) {
    const problems = validateSchedule(fixtures.map((match) => ({
      id: match.id,
      date: match.date,
      kind: match.leagueId === CLUB_WORLD_CUP_ID ? 'club-world-cup'
        : CONTINENTAL_IDS.includes(match.leagueId) ? 'continental'
          : DOMESTIC_CUPS.some((cup) => cup.id === match.leagueId) ? 'domestic-cup' : 'league',
      clubIds: [match.homeClubId, match.awayClubId],
    })))
    if (problems.length) throw new Error(`Generated season ${seasonLabel(season)} schedule is invalid: ${problems.join(' ')}`)
    validatedScheduleKeys.add(key)
  }
  return { fixtures, ties }
}

const resolveFixture = (fixture: MatchInfo, done: Record<string, MatchInfo>, asOf: string): MatchInfo =>
  done[fixture.id] ?? (!isFullSimulation(fixture) && fixture.date <= asOf ? backgroundResult(fixture) : fixture)

const savedDate = loadDate()
const loaded = loadSimulatedMatches((done) => seasonFixtures(done, savedDate).fixtures)
let date = loaded.error ? SEASON_START_DATE : savedDate
let results: Record<string, MatchInfo> = loaded.matches
syncSponsors(date)
syncTraining(date)
const loadedPlayerConditions = loadPlayerConditions()
const playerConditions: PlayerConditionState = loadedPlayerConditions.state
for (const country of countries) {
  for (const team of country.teams) {
    for (const player of getClubSquad(team.id)) {
      const condition = playerConditions[player.id]
      if (!condition) continue
      player.fitness = condition.fitness
      if (condition.injuryUntil) player.injuryUntil = condition.injuryUntil
    }
  }
}
let message = [loadedHistory.error, loaded.error, loadedPlayerConditions.error].filter(Boolean).join(' ')
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
  const clubNames = new Map(countries.flatMap((country) => country.teams.map((team) => [team.id, team.name] as const)))
  for (const country of countries) {
    const rows = applySimulatedResults(leagueStandings(country), resolved.filter((match) => match.leagueId === country.id), getCompetitionRules(country.id))
    tables[country.id] = rows.map((row) => row.clubId)
    summaries[country.id] = { champion: rows[0].clubName, runnerUp: rows[1].clubName, points: rows[0].points }
  }
  for (const [competitionId, winner] of Object.entries(ties.winners)) {
    summaries[competitionId] = {
      champion: clubNames.get(winner.champion) ?? winner.champion,
      runnerUp: clubNames.get(winner.runnerUp) ?? winner.runnerUp,
      points: 0,
    }
  }
  history = [...history, { season: history.length, label: seasonLabel(history.length), tables, summaries }]
  results = {}
  clearOldSeasonFixtureCaches(currentSeason())
  tieFixtures.clear()
  backgroundResults.clear()
  validatedScheduleKeys.clear()
  return true
}

function commit(newResults: MatchInfo[], nextDate?: string) {
  results = { ...results, ...Object.fromEntries(newResults.map((result) => [result.id, result])) }
  if (nextDate) date = nextDate
  if (nextDate) syncSponsors(nextDate)
  if (nextDate) syncTraining(nextDate, newResults.filter(involvesUser).length)
  if (nextDate) for (const player of club.squad) recoverPlayerToDate(player, nextDate, playerConditions)
  let startedSeason = ''
  while (rollOverSeason()) startedSeason = seasonLabel(currentSeason())
  try {
    saveSimulatedMatches(results, club.id)
    savePlayerConditions(playerConditions)
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
  advanceTo(fixture.date > date ? fixture.date : date)
}

export function clearMessage() {
  if (!message) return
  message = ''
  notify()
}

/** Wipes the save (results, calendar, transfer ledger) and restarts from a fresh season. */
export function resetGame() {
  clearSimulatedMatches()
  clearPlayerConditions()
  window.localStorage.removeItem(DATE_KEY)
  window.localStorage.removeItem(LEDGER_KEY)
  window.localStorage.removeItem(SPONSORS_KEY)
  window.localStorage.removeItem(TRAINING_KEY)
  window.localStorage.removeItem(HISTORY_KEY)
  window.location.reload()
}
