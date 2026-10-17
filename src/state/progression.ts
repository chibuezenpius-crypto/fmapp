import { createRng } from '../utils/proceduralGenerator'
import type { Player } from '../types/game'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
/** The in-game season index `season` (1 = the first rollover) starts on 1 August of this year. */
export const seasonStartYear = (season: number) => 2026 + season

function shiftAttributes(target: unknown, delta: number) {
  if (!target || typeof target !== 'object') return
  const record = target as Record<string, unknown>
  for (const key of Object.keys(record)) {
    const value = record[key]
    if (typeof value === 'number') record[key] = clamp(Math.round(value + delta), 1, 99)
    else shiftAttributes(value, delta)
  }
}

/** Rating change for one season: youngsters improve towards their potential, veterans decline. */
export function seasonDelta(age: number, roll: number, headroom: number) {
  let delta: number
  if (age <= 20) delta = 1 + Math.floor(roll * 4)
  else if (age <= 23) delta = Math.floor(roll * 4)
  else if (age <= 28) delta = Math.floor(roll * 4) - 1
  else if (age <= 31) delta = Math.floor(roll * 3) - 2
  else delta = Math.floor(roll * 3) - 3
  return delta > 0 ? Math.min(delta, Math.max(0, headroom)) : delta
}

/** Ages one player by a season: rating, attributes, value and potential move together. Deterministic per player and season. */
export function progressPlayer(player: Player, season: number, extendContract: boolean) {
  const random = createRng(`${player.id}:progress:${season}`)
  const delta = seasonDelta(player.age, random(), player.potential - player.overall)
  const nextAge = player.age + 1
  player.age = nextAge
  player.overall = clamp(player.overall + delta, 30, 99)
  shiftAttributes(player.attributes, delta)
  const agePenalty = nextAge >= 33 ? 0.8 : nextAge >= 30 ? 0.92 : 1
  player.value = Math.max(10000, Math.round(player.value * (1 + delta * 0.06) * agePenalty / 10000) * 10000)
  player.potential = nextAge >= 29 ? player.overall : Math.max(player.overall, player.potential)
  const newSeasonStart = `${seasonStartYear(season)}-08-01`
  if (extendContract && player.contract.clubId && player.contract.endDate < newSeasonStart) {
    player.contract = { ...player.contract, endDate: `${seasonStartYear(season) + 1 + Math.floor(random() * 3)}-06-30` }
  }
}

const appliedSeasons = new WeakMap<Player, number>()

/** Brings players up to `target` elapsed seasons exactly once each, so a reloaded save matches the live game. */
export function catchUpPlayers(players: Player[], target: number, extendContracts: boolean) {
  for (const player of players) {
    for (let season = (appliedSeasons.get(player) ?? 0) + 1; season <= target; season += 1) progressPlayer(player, season, extendContracts)
    appliedSeasons.set(player, Math.max(appliedSeasons.get(player) ?? 0, target))
  }
}

/** Marks players generated mid-game as already up to date for `season`, so only later seasons age them. */
export function markPlayersCurrent(players: Player[], season: number) {
  for (const player of players) appliedSeasons.set(player, season)
}
