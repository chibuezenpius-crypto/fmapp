import type { Player } from '../types/game'
import { fitPlayersToSlots } from '../utils/lineup'

/** Number of substitutes named in a matchday squad. */
export const BENCH_SIZE = 7
const TACTICS_KEY = 'fmapp-tactics'
const DEFAULT_POSITIONS = ['GK', 'D (R)', 'D (C)', 'D (C)', 'D (L)', 'DM', 'M (C)', 'M (C)', 'M (R)', 'ST (C)', 'M (L)'].map((position) => ({ position }))

function readSaved(): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(TACTICS_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

const idList = (value: unknown): string[] | undefined => Array.isArray(value) && value.every((id) => typeof id === 'string') ? value as string[] : undefined

export const readSavedBenchIds = () => idList(readSaved().bench)

/** The saved starting XI, or the default 4-3-3 pick before the Tactics hub has been used. */
export function readLineupIds(squad: Player[]): string[] {
  const saved = readSaved()
  const ids = idList(saved.lineup)
  if (ids) return [...new Set(ids)].filter((id) => squad.some((player) => player.id === id))
  return fitPlayersToSlots(DEFAULT_POSITIONS, squad)
}

/** Keeps the preferred substitutes that are still valid, then fills the remaining places with the best available players. */
export function normalizeBench(preferred: string[] | undefined, lineup: string[], squad: Player[]): string[] {
  const starting = new Set(lineup)
  const kept = [...new Set(preferred ?? [])].filter((id) => !starting.has(id) && squad.some((player) => player.id === id)).slice(0, BENCH_SIZE)
  const keptSet = new Set(kept)
  const fill = [...squad].filter((player) => !starting.has(player.id) && !keptSet.has(player.id)).sort((first, second) => second.overall - first.overall)
  return [...kept, ...fill.map((player) => player.id)].slice(0, BENCH_SIZE)
}

export function splitSquad(squad: Player[]) {
  const lineup = readLineupIds(squad)
  const benchIds = normalizeBench(readSavedBenchIds(), lineup, squad)
  const byId = (ids: string[]) => ids.map((id) => squad.find((player) => player.id === id)).filter((player): player is Player => player !== undefined)
  const used = new Set([...lineup, ...benchIds])
  return { starters: byId(lineup), bench: byId(benchIds), reserves: squad.filter((player) => !used.has(player.id)) }
}

/** Puts a reserve on the bench in place of the weakest substitute and returns the name of the player who dropped out. */
export function promoteReserve(squad: Player[], reserveId: string): string | null {
  const { bench } = splitSquad(squad)
  const weakest = [...bench].sort((first, second) => first.overall - second.overall)[0]
  if (!weakest) return null
  const next = bench.map((player) => player.id === weakest.id ? reserveId : player.id)
  try {
    window.localStorage.setItem(TACTICS_KEY, JSON.stringify({ ...readSaved(), bench: next }))
  } catch {
    return null
  }
  return weakest.name
}
