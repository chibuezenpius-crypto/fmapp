import type { LeagueCompetition, MatchInfo } from '../types/game'

type PlayerStats = LeagueCompetition['playerStats']
type TeamStats = LeagueCompetition['teamStats']

interface Tally {
  playerId: string
  name: string
  clubName: string
  isKeeper: boolean
  apps: number
  goals: number
  assists: number
  cleanSheets: number
  yellow: number
  red: number
  ratingTotal: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const TOP_COUNT = 10

/** Season leaderboards derived purely from the recorded event logs of completed matches. */
export function computePlayerStats(matches: readonly MatchInfo[]): PlayerStats {
  const tallies = new Map<string, Tally>()
  const tallyFor = (playerId: string, name: string, clubName: string, isKeeper = false) => {
    let tally = tallies.get(playerId)
    if (!tally) {
      tally = { playerId, name, clubName, isKeeper, apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellow: 0, red: 0, ratingTotal: 0 }
      tallies.set(playerId, tally)
    }
    tally.clubName = clubName
    return tally
  }

  for (const match of matches) {
    if (match.status !== 'Completed' || !match.score || !match.eventLog) continue
    const appearances = new Map<string, { tally: Tally; side: 'home' | 'away'; delta: number }>()
    for (const side of ['home', 'away'] as const) {
      const clubName = side === 'home' ? match.homeClubName : match.awayClubName
      for (const entry of match.lineups[side].startingXI) {
        const playerId = entry.playerId ?? entry.id
        const tally = tallyFor(playerId, entry.name, clubName, entry.position === 'GK')
        appearances.set(playerId, { tally, side, delta: 0 })
      }
    }
    for (const event of match.eventLog) {
      const clubName = event.team === 'home' ? match.homeClubName : match.awayClubName
      if (!appearances.has(event.playerId)) {
        appearances.set(event.playerId, { tally: tallyFor(event.playerId, event.player, clubName), side: event.team, delta: 0 })
      }
      if (event.type === 'Substitution' && event.targetId && event.target && !appearances.has(event.targetId)) {
        appearances.set(event.targetId, { tally: tallyFor(event.targetId, event.target, clubName), side: event.team, delta: 0 })
      }
      const actor = appearances.get(event.playerId)
      if (!actor) continue
      if (event.type === 'Goal') {
        actor.tally.goals += 1
        actor.delta += 0.9
        const assist = event.targetId ? appearances.get(event.targetId) : undefined
        if (assist && assist !== actor) {
          assist.tally.assists += 1
          assist.delta += 0.5
        }
      } else if (event.type === 'Yellow Card') {
        actor.tally.yellow += 1
        actor.delta -= 0.3
      } else if (event.type === 'Red Card') {
        actor.tally.red += 1
        actor.delta -= 1.5
      } else if (event.type === 'Save') actor.delta += 0.12
      else if (event.type === 'Tackle' || event.type === 'Interception') actor.delta += 0.08
      else if (event.type === 'Foul') actor.delta -= 0.08
    }
    for (const { tally, side, delta } of appearances.values()) {
      const conceded = side === 'home' ? match.score.away : match.score.home
      const scored = side === 'home' ? match.score.home : match.score.away
      const cleanSheet = conceded === 0
      if (cleanSheet && tally.isKeeper) tally.cleanSheets += 1
      const result = scored > conceded ? 0.3 : scored < conceded ? -0.2 : 0
      tally.apps += 1
      tally.ratingTotal += clamp(6 + delta + result + (cleanSheet && tally.isKeeper ? 0.4 : 0), 3, 10)
    }
  }

  const rows = [...tallies.values()]
  const top = (pick: (tally: Tally) => number, filter: (tally: Tally) => boolean = () => true) => rows
    .filter((tally) => filter(tally) && pick(tally) > 0)
    .map((tally) => ({ playerId: tally.playerId, name: tally.name, clubName: tally.clubName, value: pick(tally), apps: tally.apps }))
    .sort((first, second) => second.value - first.value || first.apps - second.apps || first.name.localeCompare(second.name))
    .slice(0, TOP_COUNT)
  return {
    goals: top((tally) => tally.goals),
    assists: top((tally) => tally.assists),
    cleanSheets: top((tally) => tally.cleanSheets, (tally) => tally.isKeeper),
    cards: rows.filter((tally) => tally.yellow + tally.red > 0)
      .map((tally) => ({ playerId: tally.playerId, name: tally.name, clubName: tally.clubName, value: tally.yellow + tally.red, yellow: tally.yellow, red: tally.red, apps: tally.apps }))
      .sort((first, second) => second.red - first.red || second.value - first.value || first.name.localeCompare(second.name)).slice(0, TOP_COUNT),
    rating: top((tally) => Math.round(tally.ratingTotal / Math.max(1, tally.apps) * 100) / 100, (tally) => tally.apps >= 3),
  }
}

export function computeTeamStats(clubs: readonly { clubId: string; clubName: string }[], matches: readonly MatchInfo[]): TeamStats {
  return clubs.map(({ clubId, clubName }) => {
    let games = 0, possession = 0, goals = 0, cleanSheets = 0, cards = 0
    for (const match of matches) {
      if (match.status !== 'Completed' || !match.score || !match.stats) continue
      const side = match.homeClubId === clubId ? 'home' : match.awayClubId === clubId ? 'away' : null
      if (!side) continue
      games += 1
      possession += match.stats.possession[side]
      goals += match.score[side]
      if (match.score[side === 'home' ? 'away' : 'home'] === 0) cleanSheets += 1
      cards += (match.eventLog ?? []).filter((event) => event.team === side && (event.type === 'Yellow Card' || event.type === 'Red Card')).length
    }
    return { clubId, clubName, possession: games ? Math.round(possession / games) : 0, goals, cleanSheets, cards }
  }).sort((first, second) => second.goals - first.goals || second.cleanSheets - first.cleanSheets || first.clubName.localeCompare(second.clubName))
}
