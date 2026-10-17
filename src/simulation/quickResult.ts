import { createRng } from '../utils/proceduralGenerator'
import { matchSeedFromId } from './matchEngine'
import type { MatchInfo, MatchStats, Player } from '../types/game'

/**
 * Fast, deterministic result generator for fixtures the user's club is not part of.
 * It is a pure function of the fixture ID and the two squads' 1-100 ratings, so results need no saving.
 */
const strengthCache = new Map<string, { signature: string; strength: number }>()

export function clubStrength(clubId: string, squad: readonly Player[]): number {
  const signature = squad.map((player) => `${player.id}:${player.overall}:${player.fitness}`).join('|')
  const cached = strengthCache.get(clubId)
  if (cached?.signature === signature) return cached.strength
  const effectiveOverall = (player: Player) => player.overall * (0.75 + player.fitness / 400)
  const top = [...squad].sort((a, b) => effectiveOverall(b) - effectiveOverall(a)).slice(0, 14)
  const strength = top.reduce((sum, player) => sum + effectiveOverall(player), 0) / Math.max(1, top.length)
  strengthCache.set(clubId, { signature, strength })
  return strength
}

const poisson = (rate: number, random: () => number) => {
  const limit = Math.exp(-rate)
  let goals = 0
  let product = random()
  while (product > limit && goals < 9) {
    goals += 1
    product *= random()
  }
  return goals
}

const between = (random: () => number, low: number, high: number) => Math.round(low + random() * (high - low))

export function quickResult(fixture: MatchInfo, homeStrength: number, awayStrength: number): MatchInfo {
  const random = createRng(`quick-${fixture.id}`)
  const edge = (homeStrength - awayStrength) / 40
  const home = poisson(Math.min(4, Math.max(0.3, 1.45 * Math.exp(edge) + 0.15)), random)
  const away = poisson(Math.min(4, Math.max(0.3, 1.15 * Math.exp(-edge))), random)
  const homePossession = Math.min(72, Math.max(32, Math.round(50 + edge * 12 + (random() - 0.5) * 10)))
  const shotsHome = Math.max(home, between(random, 7, 15) + Math.round(edge * 3))
  const shotsAway = Math.max(away, between(random, 6, 13) - Math.round(edge * 3))
  const stats: MatchStats = {
    possession: { home: homePossession, away: 100 - homePossession },
    shots: { home: shotsHome, away: shotsAway },
    shotsOnTarget: { home: Math.min(shotsHome, home + between(random, 1, 4)), away: Math.min(shotsAway, away + between(random, 1, 4)) },
    passAccuracy: { home: between(random, 72, 89), away: between(random, 72, 89) },
    fouls: { home: between(random, 8, 15), away: between(random, 8, 15) },
  }
  return { ...fixture, status: 'Completed', score: { home, away }, stats, simulationSeed: matchSeedFromId(fixture.id) }
}
