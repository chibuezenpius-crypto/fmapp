import type { MatchCommentaryEvent, MatchEvent, MatchInfo, MatchLineup, MatchLineupPlayer, MatchStats, Player } from '../types/game'
import { createCommentaryGenerator } from './commentary/engine'

export interface MatchTactics {
  pressingIntensity: number
  tempo: number
  style: string
  lineup?: string[]
}

export interface MatchSimulationInput {
  match: MatchInfo
  homeSquad: Player[]
  awaySquad: Player[]
  seed: number
  homeTactics?: Partial<MatchTactics>
  awayTactics?: Partial<MatchTactics>
}

export interface MatchSimulationResult {
  match: MatchInfo
  events: MatchEvent[]
}

export function matchSeedFromId(matchId: string): number {
  let hash = 2166136261
  for (let index = 0; index < matchId.length; index += 1) {
    hash ^= matchId.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

interface RuntimePlayer {
  player: Player
  lineup: MatchLineupPlayer
  x: number
  y: number
  fatigue: number
}

interface RuntimeTeam {
  side: 'home' | 'away'
  id: string
  template: MatchLineup
  squad: RuntimePlayer[]
  bench: RuntimePlayer[]
  substitutionsUsed: number
  pressing: number
  tempo: number
  style: string
}

interface Point {
  x: number
  y: number
}

const PITCH_LENGTH = 105
const PITCH_WIDTH = 68
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const clampPoint = (point: Point): Point => ({ x: clamp(point.x, 0, PITCH_LENGTH), y: clamp(point.y, 0, PITCH_WIDTH) })

function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const randomInt = (random: () => number, min: number, max: number) => min + Math.floor(random() * (max - min + 1))
const distance = (first: Point, second: Point) => Math.hypot(first.x - second.x, first.y - second.y)

function buildTeam(
  side: 'home' | 'away',
  id: string,
  lineup: MatchLineup,
  squad: Player[],
  tactics: Partial<MatchTactics> = {},
): RuntimeTeam {
  const starters = lineup.startingXI.map((entry) => {
    const player = squad.find((candidate) => candidate.id === entry.playerId)
      ?? squad.find((candidate) => candidate.name === entry.name)
    if (!player) throw new Error(`Cannot resolve match lineup player "${entry.name}" for club "${id}".`)
    return {
      player,
      lineup: entry,
      x: entry.y / 100 * PITCH_LENGTH,
      y: entry.x / 100 * PITCH_WIDTH,
      fatigue: 0,
    }
  })
  if (starters.length !== 11) throw new Error(`Match lineup for club "${id}" must contain exactly 11 starters.`)
  const bench = lineup.substitutes.flatMap((entry) => {
    const player = squad.find((candidate) => candidate.id === entry.playerId)
      ?? squad.find((candidate) => candidate.name === entry.name)
    return player ? [{ player, lineup: entry, x: entry.y / 100 * PITCH_LENGTH, y: entry.x / 100 * PITCH_WIDTH, fatigue: 0 }] : []
  })
  const style = tactics.style ?? 'Balanced'
  return {
    side,
    id,
    template: lineup,
    squad: starters,
    bench,
    substitutionsUsed: 0,
    pressing: clamp((tactics.pressingIntensity ?? 55) + (style === 'Gegenpress' ? 8 : style === 'Park the Bus' ? 6 : style === 'Counter-Attack' ? -8 : 0), 0, 100),
    tempo: clamp(tactics.tempo ?? 50, 0, 100),
    style,
  }
}

function nearest(point: Point, team: RuntimeTeam) {
  return team.squad.reduce((best, candidate) => distance(point, candidate) < distance(point, best) ? candidate : best)
}

function playersForAction(team: RuntimeTeam) {
  return team.squad.filter((player) => player.player.position !== 'GK')
}

function relationshipBonus(first: Player, second: Player) {
  const firstOpinion = first.relationships.teammates.find((item) => item.playerName === second.name)?.relationship
  const secondOpinion = second.relationships.teammates.find((item) => item.playerName === first.name)?.relationship
  const ratings = [firstOpinion, secondOpinion].filter((rating): rating is number => rating !== undefined)
  if (ratings.length === 0) return 0
  return ((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) - 50) * 0.0008
}

function moraleModifier(player: Player) {
  switch (player.morale) {
    case 'Very Good': return 0.04
    case 'Good': return 0.02
    case 'Okay': return 0
    case 'Poor': return -0.04
  }
}

function effective(player: RuntimePlayer, skill: keyof Player['attributes'], time: number) {
  const currentFatigue = clamp(player.fatigue + time / 5400 * (100 - player.player.attributes.stamina) * 0.18, 0, 40)
  const form = clamp((player.player.form - 6) / 20, -0.1, 0.1)
  const condition = 0.75 + player.player.fitness / 400
  const trait = player.player.personalInfo.characterTrait === 'Consistent' ? 1.015 : 1
  return player.player.attributes[skill] * condition * (1 - currentFatigue / 250) * (1 + form + moraleModifier(player.player)) * trait
}

function emit(
  events: MatchEvent[],
  matchId: string,
  time: number,
  type: MatchEvent['type'],
  team: RuntimeTeam,
  actor: RuntimePlayer,
  point: Point,
  outcome: string,
  details: Pick<MatchEvent, 'target' | 'targetId' | 'data'> = {},
) {
  events.push({
    id: `${matchId}:event:${events.length + 1}`,
    matchId,
    sequence: events.length + 1,
    elapsedSeconds: Math.floor(time),
    type,
    team: team.side,
    playerId: actor.player.id,
    player: actor.player.name,
    x: Math.round(point.x * 10) / 10,
    y: Math.round(point.y * 10) / 10,
    outcome,
    ...details,
  })
}

function selectReceiver(team: RuntimeTeam, carrier: RuntimePlayer, direction: number, random: () => number) {
  const candidates = playersForAction(team).filter((candidate) => candidate.player.id !== carrier.player.id)
  const ranked = candidates.sort((first, second) => {
    const firstProgress = (first.x - carrier.x) * direction
    const secondProgress = (second.x - carrier.x) * direction
    return Math.abs(firstProgress - 8) - Math.abs(secondProgress - 8)
  })
  return ranked[Math.floor(random() * Math.min(5, ranked.length))]
}

function toCommentaryEvent(event: MatchEvent, detail: string): MatchCommentaryEvent {
  return {
    eventId: event.id,
    minute: Math.floor(event.elapsedSeconds / 60),
    second: event.elapsedSeconds % 60,
    team: event.team,
    type: event.type,
    player: event.player,
    detail,
    x: event.x,
    y: event.y,
  }
}

function calculateStats(events: MatchEvent[]): MatchStats {
  const homePossession = events.filter((event) => event.type === 'Possession' && event.team === 'home').reduce((sum, event) => sum + Number(event.data?.durationSeconds ?? 0), 0)
  const awayPossession = events.filter((event) => event.type === 'Possession' && event.team === 'away').reduce((sum, event) => sum + Number(event.data?.durationSeconds ?? 0), 0)
  const possessionTotal = Math.max(1, homePossession + awayPossession)
  const sideCount = (type: MatchEvent['type'], side: 'home' | 'away', predicate?: (event: MatchEvent) => boolean) =>
    events.filter((event) => event.type === type && event.team === side && (!predicate || predicate(event))).length
  const passes = (side: 'home' | 'away') => events.filter((event) => event.type === 'Pass' && event.team === side)
  const accuracy = (side: 'home' | 'away') => {
    const attempts = passes(side)
    return attempts.length ? Math.round(attempts.filter((event) => event.outcome === 'complete').length / attempts.length * 100) : 0
  }
  return {
    possession: (() => {
      const home = Math.round(homePossession / possessionTotal * 100)
      return { home, away: 100 - home }
    })(),
    shots: { home: sideCount('Shot', 'home'), away: sideCount('Shot', 'away') },
    shotsOnTarget: {
      home: sideCount('Shot', 'home', (event) => event.outcome === 'on-target'),
      away: sideCount('Shot', 'away', (event) => event.outcome === 'on-target'),
    },
    passAccuracy: { home: accuracy('home'), away: accuracy('away') },
    fouls: { home: sideCount('Foul', 'home'), away: sideCount('Foul', 'away') },
  }
}

function simulateHalf(
  home: RuntimeTeam,
  away: RuntimeTeam,
  random: () => number,
  events: MatchEvent[],
  matchId: string,
  half: 0 | 1,
) {
  const baseTime = half * 2700
  let clock = 0
  for (let possessionIndex = 0; clock < 2700 && possessionIndex < 60; possessionIndex += 1) {
    const duration = Math.min(randomInt(random, 58, 108), 2700 - clock)
    if (duration <= 0) break
    const attacking = random() < 0.5 ? home : away
    const defending = attacking === home ? away : home
    const direction = attacking.side === 'home'
      ? (half === 0 ? -1 : 1)
      : (half === 0 ? 1 : -1)
    const options = playersForAction(attacking)
    let carrier = options[randomInt(random, 0, options.length - 1)]
    let point = clampPoint({ x: carrier.x, y: carrier.y })
    const possessionTime = baseTime + clock
    emit(events, matchId, possessionTime, 'Possession', attacking, carrier, point, 'started', { data: { durationSeconds: duration } })
    const actionCount = randomInt(random, 2, 5)
    let previousPasser: RuntimePlayer | undefined
    let possessionBroken = false

    for (let action = 0; action < actionCount; action += 1) {
      const time = baseTime + clock + duration * (action + 1) / (actionCount + 1)
      const marker = nearest(point, defending)
      const pressure = clamp(1 - distance(point, marker) / 15, 0, 1) * (0.4 + defending.pressing / 100)
      const foulChance = 0.025 + pressure * 0.065
      if (random() < foulChance) {
        emit(events, matchId, time, 'Foul', defending, marker, point, 'foul-committed', { target: carrier.player.name, targetId: carrier.player.id })
        if (random() < 0.16) emit(events, matchId, time, 'Yellow Card', defending, marker, point, 'caution')
        possessionBroken = true
        break
      }

      const goalDistance = direction === -1 ? point.x : PITCH_LENGTH - point.x
      const shotChance = goalDistance < 38 ? clamp(0.28 + (38 - goalDistance) / 55 + effective(carrier, 'finishing', time) / 1200, 0.12, 0.78) : goalDistance < 52 ? 0.14 : goalDistance < 63 ? 0.06 : 0.012
      if (random() < shotChance) {
        const distanceToGoal = Math.max(1, goalDistance)
        const keeper = defending.squad.find((candidate) => candidate.player.position === 'GK') ?? defending.squad[0]
        const onTargetChance = clamp(0.5 + (effective(carrier, 'finishing', time) - 60) * 0.007 - distanceToGoal * 0.0018 - pressure * 0.06, 0.14, 0.9)
        const onTarget = random() < onTargetChance
        emit(events, matchId, time, 'Shot', attacking, carrier, point, onTarget ? 'on-target' : 'off-target', { target: onTarget ? keeper.player.name : undefined, targetId: onTarget ? keeper.player.id : undefined, data: { distance: Math.round(distanceToGoal), pressure: Math.round(pressure * 100) } })
        if (onTarget) {
          const goalChance = clamp(0.25 + (effective(carrier, 'finishing', time) - 60) * 0.004 - distanceToGoal * 0.002 - (effective(keeper, 'positioning', time) - 60) * 0.001 + (attacking.side === 'home' ? 0.025 : 0), 0.035, 0.62)
          if (random() < goalChance) {
            emit(events, matchId, time + 1, 'Goal', attacking, carrier, point, 'scored', { target: previousPasser?.player.name, targetId: previousPasser?.player.id, data: { distance: Math.round(distanceToGoal) } })
          } else {
            emit(events, matchId, time + 1, 'Save', defending, keeper, point, 'saved', { target: carrier.player.name, targetId: carrier.player.id })
          }
        } else {
          emit(events, matchId, time + 1, 'Miss', attacking, carrier, point, 'off-target', { data: { distance: Math.round(distanceToGoal) } })
        }
        possessionBroken = true
        break
      }

      const pass = random() < 0.72
      if (pass) {
        const receiver = selectReceiver(attacking, carrier, direction, random)
        const passingSkill = effective(carrier, 'passing', time) * 0.65 + effective(carrier, 'decisions', time) * 0.2 + effective(receiver, 'firstTouch', time) * 0.15
        const styleBonus = attacking.style === 'Tiki-Taka' ? 0.045 : attacking.style === 'Direct Passing' ? -0.015 : 0
        const probability = clamp(0.81 + (passingSkill - 65) * 0.003 - pressure * 0.12 + relationshipBonus(carrier.player, receiver.player) + styleBonus, 0.35, 0.96)
        const complete = random() < probability
        const progress = randomInt(random, 3, 12) * (attacking.tempo > 70 ? 1.12 : 1)
        const end = clampPoint({ x: point.x + direction * progress, y: point.y + randomInt(random, -8, 8) })
        emit(events, matchId, time, 'Pass', attacking, carrier, end, complete ? 'complete' : 'intercepted', { target: receiver.player.name, targetId: receiver.player.id, data: { probability: Math.round(probability * 100), distance: Math.round(distance(point, end)) } })
        if (complete) {
          previousPasser = carrier
          receiver.x = end.x
          receiver.y = end.y
          carrier = receiver
          point = end
        } else {
          const interceptor = nearest(end, defending)
          emit(events, matchId, time + 1, 'Interception', defending, interceptor, end, 'intercepted', { target: carrier.player.name, targetId: carrier.player.id })
          possessionBroken = true
          break
        }
      } else {
        const dribbleSkill = effective(carrier, 'dribbling', time)
        const complete = random() < clamp(0.61 + (dribbleSkill - 60) * 0.005 - pressure * 0.2, 0.18, 0.93)
        const end = clampPoint({ x: point.x + direction * randomInt(random, 2, 8), y: point.y + randomInt(random, -5, 5) })
        emit(events, matchId, time, 'Carry', attacking, carrier, end, complete ? 'advanced' : 'tackled', { target: marker.player.name, targetId: marker.player.id })
        if (complete) {
          carrier.x = end.x
          carrier.y = end.y
          point = end
        } else {
          emit(events, matchId, time + 1, 'Tackle', defending, marker, end, 'won', { target: carrier.player.name, targetId: carrier.player.id })
          possessionBroken = true
          break
        }
      }
      carrier.fatigue = clamp(carrier.fatigue + 0.3 + (100 - carrier.player.attributes.stamina) / 300, 0, 40)
    }

    if (!possessionBroken && random() < 0.012) {
      const injured = carrier
      emit(events, matchId, baseTime + clock + duration, 'Injury', attacking, injured, point, 'minor', { data: { expectedWeeks: 1 } })
    }
    clock += duration
    const matchTime = baseTime + clock
    if (matchTime >= 3900 && attacking.substitutionsUsed < 2 && attacking.bench.length > 0 && random() < 0.11) {
      const outgoing = [...attacking.squad].filter((player) => player.player.position !== 'GK').sort((first, second) => second.fatigue - first.fatigue)[0]
      if (outgoing) {
        const benchIndex = attacking.bench.findIndex((player) => player.player.position === outgoing.player.position)
        const replacement = attacking.bench.splice(benchIndex < 0 ? 0 : benchIndex, 1)[0]
        const squadIndex = attacking.squad.findIndex((player) => player.player.id === outgoing.player.id)
        const incoming: RuntimePlayer = {
          ...replacement,
          lineup: { ...outgoing.lineup, id: replacement.player.id, playerId: replacement.player.id, name: replacement.player.name, shirtNumber: replacement.player.shirtNumber },
          x: outgoing.x,
          y: outgoing.y,
          fatigue: 0,
        }
        attacking.squad[squadIndex] = incoming
        attacking.substitutionsUsed += 1
        emit(events, matchId, matchTime, 'Substitution', attacking, incoming, { x: outgoing.x, y: outgoing.y }, 'entered', { target: outgoing.player.name, targetId: outgoing.player.id })
      }
    }
  }
}

export function simulateMatch(input: MatchSimulationInput): MatchSimulationResult {
  if (!Number.isSafeInteger(input.seed)) throw new RangeError('Match seed must be a safe integer.')
  if (input.match.status !== 'Upcoming') throw new Error(`Cannot simulate a match with status "${input.match.status}".`)
  const random = createRandom(input.seed)
  const home = buildTeam('home', input.match.homeClubId, input.match.lineups.home, input.homeSquad, input.homeTactics)
  const away = buildTeam('away', input.match.awayClubId, input.match.lineups.away, input.awaySquad, input.awayTactics)
  const events: MatchEvent[] = []
  const homeKickoff = home.squad.find((player) => player.player.position !== 'GK')!
  const awayKickoff = away.squad.find((player) => player.player.position !== 'GK')!

  emit(events, input.match.id, 0, 'Kick Off', home, homeKickoff, { x: 52.5, y: 34 }, 'started')
  simulateHalf(home, away, random, events, input.match.id, 0)
  emit(events, input.match.id, 2700, 'Half Time', home, homeKickoff, { x: 52.5, y: 34 }, 'whistle')
  for (const player of [...home.squad, ...home.bench, ...away.squad, ...away.bench]) {
    player.x = PITCH_LENGTH - player.x
  }
  simulateHalf(home, away, random, events, input.match.id, 1)
  const endTime = 5400 + randomInt(random, 60, 300)
  emit(events, input.match.id, endTime, 'Full Time', away, awayKickoff, { x: 52.5, y: 34 }, 'whistle')

  const homeGoals = events.filter((event) => event.type === 'Goal' && event.team === 'home').length
  const awayGoals = events.filter((event) => event.type === 'Goal' && event.team === 'away').length
  const narrate = createCommentaryGenerator({ random: createRandom((input.seed ^ 0x9e3779b9) >>> 0) })
  const commentaryContext = { homeTeamName: input.match.homeClubName, awayTeamName: input.match.awayClubName }
  const commentary = events.flatMap((event) => {
    const text = narrate(event, commentaryContext)
    return text === null ? [] : [toCommentaryEvent(event, text)]
  })
  const finalLineup = (team: RuntimeTeam): MatchLineup => {
    const activeIds = new Set(team.squad.map((player) => player.player.id))
    return {
      ...team.template,
      startingXI: team.squad.map((player) => ({
        ...player.lineup,
        id: player.player.id,
        playerId: player.player.id,
        name: player.player.name,
        shirtNumber: player.player.shirtNumber,
      })),
      substitutes: team.template.substitutes.filter((player) => !activeIds.has(player.playerId ?? player.id)),
    }
  }
  const completed: MatchInfo = {
    ...input.match,
    status: 'Completed',
    score: { home: homeGoals, away: awayGoals },
    stats: calculateStats(events),
    commentary,
    simulationSeed: input.seed,
    eventLog: events,
    lineups: { home: finalLineup(home), away: finalLineup(away) },
  }
  return { match: completed, events }
}
