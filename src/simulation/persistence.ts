import type { MatchCommentaryEvent, MatchEvent, MatchInfo, MatchLineup, MatchStats } from '../types/game'
import type { PlayerConditionState } from './playerCondition'

const STORAGE_KEY = 'fmapp-simulated-matches-v5'
const PLAYER_CONDITION_KEY = 'fmapp-player-condition-v1'

interface SavedMatchResult {
  id: string
  score: NonNullable<MatchInfo['score']>
  stats: MatchStats
  lineups: MatchInfo['lineups']
  commentary: MatchCommentaryEvent[]
  simulationSeed: number
  eventLog: MatchEvent[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isScore = (value: unknown): value is SavedMatchResult['score'] =>
  isRecord(value) && Number.isInteger(value.home) && Number.isInteger(value.away) && Number(value.home) >= 0 && Number(value.away) >= 0

function isMatchStats(value: unknown): value is MatchStats {
  if (!isRecord(value)) return false
  return ['possession', 'shots', 'shotsOnTarget', 'passAccuracy', 'fouls'].every((key) => {
    const pair = value[key]
    return isRecord(pair) && isFiniteNumber(pair.home) && isFiniteNumber(pair.away)
  })
}

function isLineup(value: unknown): value is MatchLineup {
  if (!isRecord(value) || typeof value.formation !== 'string' || typeof value.coach !== 'string') return false
  const validPlayer = (player: unknown) => isRecord(player)
    && typeof player.id === 'string'
    && typeof player.name === 'string'
    && Number.isInteger(player.shirtNumber)
    && typeof player.position === 'string'
    && isFiniteNumber(player.x)
    && isFiniteNumber(player.y)
  return Array.isArray(value.startingXI) && value.startingXI.length === 11 && value.startingXI.every(validPlayer)
    && Array.isArray(value.substitutes) && value.substitutes.every(validPlayer)
}

function isCommentary(value: unknown): value is MatchCommentaryEvent[] {
  return Array.isArray(value) && value.every((event) => isRecord(event)
    && Number.isInteger(event.minute)
    && (event.second === undefined || Number.isInteger(event.second))
    && (event.team === 'home' || event.team === 'away')
    && typeof event.type === 'string'
    && typeof event.player === 'string'
    && typeof event.detail === 'string')
}

function isEventLog(value: unknown, matchId: string): value is MatchEvent[] {
  let previous = 0
  return Array.isArray(value) && value.every((event) => {
    if (!isRecord(event) || typeof event.sequence !== 'number' || event.sequence <= previous) return false
    previous = event.sequence
    return typeof event.id === 'string'
      && event.matchId === matchId
      && Number.isInteger(event.elapsedSeconds)
      && typeof event.type === 'string'
      && (event.team === 'home' || event.team === 'away')
      && typeof event.playerId === 'string'
      && typeof event.player === 'string'
      && isFiniteNumber(event.x)
      && isFiniteNumber(event.y)
      && typeof event.outcome === 'string'
  })
}

function isSavedResult(value: unknown): value is SavedMatchResult {
  return isRecord(value)
    && typeof value.id === 'string'
    && isScore(value.score)
    && isMatchStats(value.stats)
    && isRecord(value.lineups)
    && isLineup(value.lineups.home)
    && isLineup(value.lineups.away)
    && isCommentary(value.commentary)
    && Number.isSafeInteger(value.simulationSeed)
    && isEventLog(value.eventLog, value.id)
}

/**
 * `fixturesFor` returns every fixture that exists given the results restored so far, so that knockout rounds
 * created from earlier results can be matched to their saved results too.
 */
export function loadSimulatedMatches(fixturesFor: (completed: Record<string, MatchInfo>) => readonly MatchInfo[]): { matches: Record<string, MatchInfo>; error: string } {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return { matches: {}, error: '' }
    const parsed: unknown = JSON.parse(stored)
    if (!isRecord(parsed) || parsed.version !== 5 || !isRecord(parsed.matches)) {
      return { matches: {}, error: 'Saved match results have an unsupported format. Start a new game to replace this save.' }
    }
    const results: Record<string, MatchInfo> = {}
    const pending = new Map(Object.entries(parsed.matches))
    while (pending.size > 0) {
      const restorable = fixturesFor(results).filter((fixture) => pending.has(fixture.id))
      if (restorable.length === 0) return { matches: {}, error: 'A saved match result is invalid. Start a new game to replace this save.' }
      for (const fixture of restorable) {
        const value = pending.get(fixture.id)
        if (!isSavedResult(value) || value.id !== fixture.id) {
          return { matches: {}, error: 'A saved match result is invalid. Start a new game to replace this save.' }
        }
        results[fixture.id] = { ...fixture, ...value, status: 'Completed' }
        pending.delete(fixture.id)
      }
    }
    return { matches: results, error: '' }
  } catch (error) {
    return {
      matches: {},
      error: error instanceof Error ? `Could not load saved match results: ${error.message}` : 'Could not load saved match results.',
    }
  }
}

// Matches that do not involve the user's club are stored compactly to stay within the localStorage quota.
const KEY_EVENT_TYPES = new Set<MatchEvent['type']>(['Goal', 'Save', 'Yellow Card', 'Red Card', 'Substitution', 'Foul'])

export function saveSimulatedMatches(matches: Record<string, MatchInfo>, ownClubId: string): void {
  const saved: Record<string, SavedMatchResult> = Object.fromEntries(Object.entries(matches).map(([id, match]) => {
    if (match.status !== 'Completed' || !match.score || !match.stats || match.simulationSeed === undefined || !match.eventLog) {
      throw new Error(`Cannot save incomplete match result "${id}".`)
    }
    const own = match.homeClubId === ownClubId || match.awayClubId === ownClubId
    return [id, {
      id,
      score: match.score,
      stats: match.stats,
      lineups: own ? match.lineups : {
        home: { ...match.lineups.home, substitutes: [] },
        away: { ...match.lineups.away, substitutes: [] },
      },
      commentary: own ? match.commentary : [],
      simulationSeed: match.simulationSeed,
      eventLog: own ? match.eventLog : match.eventLog.filter((event) => KEY_EVENT_TYPES.has(event.type)),
    }]
  }))
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 5, matches: saved }))
}

export function clearSimulatedMatches(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

export function loadPlayerConditions(): { state: PlayerConditionState; error: string } {
  try {
    const stored = window.localStorage.getItem(PLAYER_CONDITION_KEY)
    if (!stored) return { state: {}, error: '' }
    const parsed: unknown = JSON.parse(stored)
    if (!isRecord(parsed)) return { state: {}, error: 'Saved player condition data has an invalid format. Reset the game to replace this save.' }
    const state: PlayerConditionState = {}
    for (const [playerId, value] of Object.entries(parsed)) {
      if (!isRecord(value)) return { state: {}, error: `Saved condition data for player "${playerId}" is invalid. Reset the game to replace this save.` }
      const fitness = value.fitness
      const lastUpdated = value.lastUpdated
      const injuryUntil = value.injuryUntil
      if (!isFiniteNumber(fitness) || fitness < 0 || fitness > 100
        || typeof lastUpdated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(lastUpdated)
        || (injuryUntil !== undefined && (typeof injuryUntil !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(injuryUntil)))) {
        return { state: {}, error: `Saved condition data for player "${playerId}" is invalid. Reset the game to replace this save.` }
      }
      state[playerId] = { fitness, lastUpdated, ...(typeof injuryUntil === 'string' ? { injuryUntil } : {}) }
    }
    return { state, error: '' }
  } catch (error) {
    return { state: {}, error: error instanceof Error ? `Could not load player condition data: ${error.message}` : 'Could not load player condition data.' }
  }
}

export function savePlayerConditions(state: PlayerConditionState): void {
  window.localStorage.setItem(PLAYER_CONDITION_KEY, JSON.stringify(state))
}

export function clearPlayerConditions(): void {
  window.localStorage.removeItem(PLAYER_CONDITION_KEY)
}
