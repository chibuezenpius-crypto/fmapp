import type { MatchInfo, MatchLineup, Player } from '../types/game'
import { shiftDate } from './calendarScheduler'

export interface PlayerCondition {
  fitness: number
  lastUpdated: string
  injuryUntil?: string
}

export type PlayerConditionState = Record<string, PlayerCondition>

const DAY_MS = 86_400_000
const dateTime = (date: string) => Date.parse(`${date}T12:00:00Z`)
const daysBetween = (from: string, to: string) => Math.max(0, Math.floor((dateTime(to) - dateTime(from)) / DAY_MS))
const clampFitness = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

export function recoverPlayerToDate(player: Player, date: string, state: PlayerConditionState) {
  const previous = state[player.id] ?? { fitness: player.fitness, lastUpdated: date, injuryUntil: player.injuryUntil }
  const fitness = clampFitness(previous.fitness + daysBetween(previous.lastUpdated, date) * 3)
  const injuryUntil = previous.injuryUntil && previous.injuryUntil > date ? previous.injuryUntil : undefined
  player.fitness = fitness
  if (injuryUntil) player.injuryUntil = injuryUntil
  else delete player.injuryUntil
  state[player.id] = { fitness, lastUpdated: date, ...(injuryUntil ? { injuryUntil } : {}) }
}

export function applyMatchCondition(
  match: MatchInfo,
  side: 'home' | 'away',
  squad: readonly Player[],
  initialLineup: MatchLineup,
  state: PlayerConditionState,
) {
  const fullTime = match.eventLog?.find((event) => event.type === 'Full Time')?.elapsedSeconds ?? 5400
  const minutesPlayed = new Map<string, number>()
  for (const player of initialLineup.startingXI) minutesPlayed.set(player.playerId ?? player.id, Math.min(90, fullTime / 60))

  for (const event of match.eventLog ?? []) {
    if (event.team !== side || event.type !== 'Substitution') continue
    if (event.targetId) minutesPlayed.set(event.targetId, Math.min(90, event.elapsedSeconds / 60))
    minutesPlayed.set(event.playerId, Math.min(90, Math.max(0, (fullTime - event.elapsedSeconds) / 60)))
  }

  const players = new Map(squad.map((player) => [player.id, player]))
  for (const [playerId, minutes] of minutesPlayed) {
    const player = players.get(playerId)
    if (!player || minutes <= 0) continue
    const previous = state[playerId] ?? { fitness: player.fitness, lastUpdated: match.date }
    const workload = 6 + (100 - player.attributes.stamina) * 0.08
    const fitness = clampFitness(previous.fitness - workload * minutes / 90)
    state[playerId] = { fitness, lastUpdated: match.date, ...(previous.injuryUntil ? { injuryUntil: previous.injuryUntil } : {}) }
    player.fitness = fitness
  }

  for (const event of match.eventLog ?? []) {
    if (event.team !== side || event.type !== 'Injury') continue
    const player = players.get(event.playerId)
    if (!player) continue
    const weeks = typeof event.data?.expectedWeeks === 'number' ? Math.max(1, event.data.expectedWeeks) : 1
    const injuryUntil = shiftDate(match.date, weeks * 7)
    player.injuryUntil = injuryUntil
    const previous = state[player.id] ?? { fitness: player.fitness, lastUpdated: match.date }
    state[player.id] = { ...previous, injuryUntil }
  }
}

export function isUnavailable(player: Player, date: string) {
  return player.injuryUntil !== undefined && player.injuryUntil > date
}
