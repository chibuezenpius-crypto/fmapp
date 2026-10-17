import rawGlobalLeagues from '../data/globalLeaguesAndTeams.json'
import { findWorldCountry } from '../worldCountries'
import type { GlobalLeaguesDatabase } from '../types/game'
import { clubWorldCupMatchDate, continentalMatchDate, domesticCupMatchDate } from './calendarScheduler'

/**
 * Cups, continental competitions and the Club World Cup. Pure: no React, no mutation of game data.
 * Qualification uses the previous season's final league tables (`LeagueRankings`); in the first season,
 * where no previous table exists, each club's `standing.position` in the league database is the rank.
 */
const countries = (rawGlobalLeagues as unknown as GlobalLeaguesDatabase).countries

/** League ID -> club IDs ordered from champion downwards. */
export type LeagueRankings = Record<string, string[]>

export interface ContinentalSpec {
  id: string
  name: string
  region: string
  confederations: readonly string[]
  slotsPerLeague: number
  maxField: number
  day: 'Tuesday' | 'Wednesday'
}

export const CONTINENTAL_COMPETITIONS: readonly ContinentalSpec[] = [
  { id: 'champions-cup', name: 'Champions Cup', region: 'Europe', confederations: ['Europe'], slotsPerLeague: 4, maxField: 32, day: 'Tuesday' },
  { id: 'african-champions-super-cup', name: 'African Champions Super Cup', region: 'Africa', confederations: ['Africa'], slotsPerLeague: 2, maxField: 16, day: 'Wednesday' },
  { id: 'asian-club-championship', name: 'Asian Club Championship', region: 'Asia', confederations: ['Asia'], slotsPerLeague: 2, maxField: 16, day: 'Wednesday' },
  { id: 'americas-premier-champions', name: 'Americas Premier Champions', region: 'Americas', confederations: ['North America', 'South America'], slotsPerLeague: 3, maxField: 16, day: 'Wednesday' },
]

export interface DomesticCupSpec {
  id: string
  name: string
  leagueId: string
  country: string
}

export const DOMESTIC_CUPS: readonly DomesticCupSpec[] = [
  { id: 'nga-federation-cup', name: 'Federation Cup', leagueId: 'nga-top-division', country: 'Nigeria' },
  { id: 'eng-fa-cup', name: 'FA Cup', leagueId: 'eng-top-division', country: 'England' },
  { id: 'esp-copa', name: 'Copa Nacional', leagueId: 'esp-top-division', country: 'Spain' },
  { id: 'por-taca', name: 'Taça Nacional', leagueId: 'por-top-division', country: 'Portugal' },
  { id: 'sco-cup', name: 'Scottish Cup', leagueId: 'sco-top-division', country: 'Scotland' },
  { id: 'irl-cup', name: 'FAI Cup', leagueId: 'irl-top-division', country: 'Ireland' },
]

export const CLUB_WORLD_CUP_ID = 'vfa-club-world-cup'
export const CLUB_WORLD_CUP_NAME = 'VFA Club World Cup'
export const CONTINENTAL_IDS = CONTINENTAL_COMPETITIONS.map((spec) => spec.id)
export const CUP_FIELD = 8

export interface Entrant {
  clubId: string
  clubName: string
  countryName: string
  previousRank: number
}

const orderedTeams = (country: (typeof countries)[number], rankings?: LeagueRankings) => {
  const byId = new Map(country.teams.map((team) => [team.id, team]))
  const ranked = rankings?.[country.id]?.map((id) => byId.get(id)).filter((team) => team !== undefined)
  return ranked?.length === country.teams.length ? ranked : [...country.teams].sort((a, b) => a.standing.position - b.standing.position)
}

/** Top `slotsPerLeague` clubs of every league in the confederation(s), best-ranked clubs seeded first, capped at `maxField`. */
export function qualifyClubs(spec: ContinentalSpec, rankings?: LeagueRankings, season = 0): Entrant[] {
  const eligible = countries.filter((country) => spec.confederations.includes(findWorldCountry(country.countryCode)?.confederation ?? ''))
  const offset = eligible.length ? ((season % eligible.length) + eligible.length) % eligible.length : 0
  const rotated = [...eligible.slice(offset), ...eligible.slice(0, offset)]
  const entrants = rotated.flatMap((country, leagueOrder) => orderedTeams(country, rankings)
    .slice(0, spec.slotsPerLeague)
    .map((team, index) => ({ clubId: team.id, clubName: team.name, countryName: country.countryName, previousRank: index + 1, leagueOrder })))
  return entrants
    .sort((a, b) => a.previousRank - b.previousRank || a.leagueOrder - b.leagueOrder)
    .slice(0, spec.maxField)
    .map(({ clubId, clubName, countryName, previousRank }) => ({ clubId, clubName, countryName, previousRank }))
}

/** The eight best-ranked clubs of the cup's league. */
export function qualifyCupClubs(spec: DomesticCupSpec, rankings?: LeagueRankings): Entrant[] {
  const country = countries.find((item) => item.id === spec.leagueId)
  if (!country) return []
  return orderedTeams(country, rankings).slice(0, CUP_FIELD).map((team, index) => ({ clubId: team.id, clubName: team.name, countryName: country.countryName, previousRank: index + 1 }))
}

export interface TieSpec {
  id: string
  season: number
  leagueId: string
  competition: string
  round: number
  roundName: string
  totalRounds: number
  homeId: string
  awayId: string
  date: string
}

export type ScoreLookup = (tie: TieSpec) => { home: number; away: number } | undefined

interface KnockoutSpec {
  id: string
  name: string
  season: number
  slots: readonly (string | null)[]
  dateFor: (round: number, totalRounds: number) => string
}

const pad = (value: number) => String(value).padStart(2, '0')

function roundName(teamsLeft: number) {
  if (teamsLeft === 2) return 'Final'
  if (teamsLeft === 4) return 'Semi-finals'
  if (teamsLeft === 8) return 'Quarter-finals'
  return `Round of ${teamsLeft}`
}

/** Standard seeding order (1 meets the lowest seed, 2 the next lowest, ...). */
function seedOrder(size: number) {
  let order = [1]
  while (order.length < size) {
    const next = order.length * 2
    order = order.flatMap((seed) => [seed, next + 1 - seed])
  }
  return order
}

/** Level ties are settled by a shoot-out that is a pure function of the match ID, so it is reproducible. */
export function shootoutHomeWins(matchId: string) {
  let hash = 2166136261
  for (let index = 0; index < matchId.length; index += 1) hash = Math.imul(hash ^ matchId.charCodeAt(index), 16777619)
  return (hash >>> 0) % 2 === 0
}

export function knockoutWinner(match: { id: string; homeClubId: string; awayClubId: string; score: { home: number; away: number } }) {
  const { home, away } = match.score
  if (home !== away) return home > away ? match.homeClubId : match.awayClubId
  return shootoutHomeWins(match.id) ? match.homeClubId : match.awayClubId
}

interface KnockoutOutcome {
  ties: TieSpec[]
  champion?: string
  runnerUp?: string
}

function deriveKnockout(spec: KnockoutSpec, scoreOf: ScoreLookup): KnockoutOutcome {
  const totalRounds = Math.log2(spec.slots.length)
  const ties: TieSpec[] = []
  let entrants: (string | null)[] = [...spec.slots]
  for (let round = 1; round <= totalRounds; round += 1) {
    const next: (string | null)[] = []
    let finished = true
    let finalists: [string, string] | undefined
    for (let index = 0; index < entrants.length; index += 2) {
      const home = entrants[index]
      const away = entrants[index + 1]
      if (!home || !away) {
        next.push(home ?? away)
        continue
      }
      const id = `y${spec.season}-${spec.id}-r${round}-${pad(index / 2 + 1)}`
      const tie: TieSpec = { id, season: spec.season, leagueId: spec.id, competition: spec.name, round, roundName: roundName(entrants.length), totalRounds, homeId: home, awayId: away, date: spec.dateFor(round, totalRounds) }
      ties.push(tie)
      const score = scoreOf(tie)
      if (!score) {
        finished = false
        next.push(null)
        continue
      }
      next.push(knockoutWinner({ id, homeClubId: home, awayClubId: away, score }))
      finalists = [home, away]
    }
    if (!finished) return { ties }
    entrants = next
    if (round === totalRounds) {
      const champion = next[0] ?? undefined
      return { ties, champion, runnerUp: finalists?.find((clubId) => clubId !== champion) }
    }
  }
  return { ties }
}

const bracketSlots = (entrants: readonly Entrant[]) => {
  const size = 2 ** Math.ceil(Math.log2(entrants.length))
  return seedOrder(size).map((seed) => entrants[seed - 1]?.clubId ?? null)
}

/** Every cup and continental bracket of a season, seeded from the previous season's rankings. */
function seasonBrackets(season: number, rankings?: LeagueRankings): KnockoutSpec[] {
  const cups = DOMESTIC_CUPS.map((spec): KnockoutSpec => ({
    id: spec.id, name: spec.name, season, slots: bracketSlots(qualifyCupClubs(spec, rankings)),
    dateFor: (round, total) => domesticCupMatchDate(round, total, season),
  }))
  const continental = CONTINENTAL_COMPETITIONS.map((spec): KnockoutSpec => ({
    id: spec.id, name: spec.name, season, slots: bracketSlots(qualifyClubs(spec, rankings, season)),
    dateFor: (round, total) => continentalMatchDate(round, total, spec.day, season),
  }))
  return [...continental, ...cups]
}

export interface SeasonTies {
  ties: TieSpec[]
  /** Champions and runners-up of the four continental competitions, known once each final is played. */
  qualifiedForWorldCup: string[]
  /** Winners of every cup and continental final that has been played, keyed by competition ID. */
  winners: Record<string, { champion: string; runnerUp: string }>
  /** True once the Club World Cup final has been played: the season is over. */
  complete: boolean
}

/** Every cup, continental and Club World Cup tie that exists given the results so far. */
export function deriveSeasonTies(season: number, rankings: LeagueRankings | undefined, scoreOf: ScoreLookup): SeasonTies {
  const brackets = seasonBrackets(season, rankings)
  const outcomes = brackets.map((spec) => deriveKnockout(spec, scoreOf))
  const winners: SeasonTies['winners'] = {}
  brackets.forEach((spec, index) => {
    const { champion, runnerUp } = outcomes[index]
    if (champion && runnerUp) winners[spec.id] = { champion, runnerUp }
  })
  const ties = outcomes.flatMap((outcome) => outcome.ties)
  const continental = CONTINENTAL_IDS.map((id) => winners[id])
  if (continental.some((entry) => !entry)) return { ties, qualifiedForWorldCup: [], winners, complete: false }
  const [europe, africa, asia, americas] = continental
  const slots = [europe.champion, asia.runnerUp, africa.champion, americas.runnerUp, americas.champion, africa.runnerUp, asia.champion, europe.runnerUp]
  const world = deriveKnockout({ id: CLUB_WORLD_CUP_ID, name: CLUB_WORLD_CUP_NAME, season, slots, dateFor: (round, total) => clubWorldCupMatchDate(round, total, season) }, scoreOf)
  if (world.champion && world.runnerUp) winners[CLUB_WORLD_CUP_ID] = { champion: world.champion, runnerUp: world.runnerUp }
  return { ties: [...ties, ...world.ties], qualifiedForWorldCup: slots, winners, complete: world.champion !== undefined }
}
