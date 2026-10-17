import rawGlobalLeagues from './globalLeaguesAndTeams.json'
import { findGeneratedClub, getClubSquad } from './clubSquads'
import { createRng, generatePlayerIdentity } from '../utils/proceduralGenerator'
import { DEFAULT_SLOTS, fitPlayersToSlots } from '../utils/lineup'
import { getCompetitionRules, describeRules } from './competitionRules'
import type {
  Club, GlobalCountryLeague, GlobalLeagueTeam, GlobalLeaguesDatabase, League, LeagueCompetition, LeagueStanding,
  ManagerProfile, MatchInfo, MatchLineup, MatchLineupPlayer, Player, ProceduralClubBadge, RefereeProfile, SquadHealthMetrics,
} from '../types/game'

export const DEFAULT_CLUB_ID = 'nga-06'

const globalLeagues = (rawGlobalLeagues as unknown as GlobalLeaguesDatabase).countries
const teamIndex = new Map<string, { team: GlobalLeagueTeam; league: GlobalCountryLeague }>()
for (const countryLeague of globalLeagues) for (const team of countryLeague.teams) teamIndex.set(team.id, { team, league: countryLeague })

export const getTeam = (clubId: string) => teamIndex.get(clubId)?.team
export const getClubBadge = (clubId: string): ProceduralClubBadge => getTeam(clubId)?.badge ?? { viewBox: '0 0 48 56', shape: 'shield', initials: '?', primaryColor: '#335', secondaryColor: '#ccd' }
export const getClubIdByName = (name: string) => [...teamIndex.values()].find((entry) => entry.team.name === name)?.team.id

const ownEntry = teamIndex.get(DEFAULT_CLUB_ID)!
const ownTeam = ownEntry.team
const ownLeague = ownEntry.league

const emptyStanding = (team: GlobalLeagueTeam, position: number): LeagueStanding => ({
  position, clubId: team.id, clubName: team.name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [],
})

/** A fresh table: every club on 0 played / 0 points, listed alphabetically. */
export const leagueStandings = (countryLeague: GlobalCountryLeague): LeagueStanding[] =>
  [...countryLeague.teams].sort((a, b) => a.name.localeCompare(b.name)).map((team, index) => emptyStanding(team, index + 1))

export const totalMatchdays = (countryLeague: GlobalCountryLeague) => (countryLeague.teams.length - 1) * 2

const startersFirst = (players: Player[]) => {
  const starters = fitPlayersToSlots([
    { position: 'GK' }, { position: 'D (R)' }, { position: 'D (L)' }, { position: 'D (C)' }, { position: 'D (C)' }, { position: 'DM' },
    { position: 'M (R)' }, { position: 'M (C)' }, { position: 'ST (C)' }, { position: 'AM (C)' }, { position: 'M (L)' },
  ], players).map((id) => players.find((player) => player.id === id)!)
  return [...starters, ...players.filter((player) => !starters.includes(player))]
}

// Starters come first in a fixed order so index-based views (club pitch) stay stable.
const orderedSquad = (clubId: string) => startersFirst(getClubSquad(clubId))

export const squad: Player[] = orderedSquad(DEFAULT_CLUB_ID)

/** Re-sorts the live club roster in place after a signing or departure. */
export function reorderClubSquad() {
  const ordered = startersFirst([...club.squad])
  club.squad.splice(0, club.squad.length, ...ordered)
}

const weeklyWages = squad.reduce((sum, player) => sum + player.contract.weeklyWage, 0)

export const club: Club = {
  id: ownTeam.id,
  name: ownTeam.name,
  nickname: 'The Bridgemen',
  shortName: 'ONC',
  founded: ownTeam.founded,
  colors: ownTeam.colors,
  prestige: 58,
  manager: { name: 'Emeka Nwosu', nationality: 'Nigerian', age: 46, reputation: 3 },
  stadium: { name: 'Niger Bridge Arena', capacity: 22400, attendance: 17850 },
  finances: { transferBudget: 3500000, wageBudget: Math.round(weeklyWages * 1.25 / 500) * 500, weeklyWages, balance: 6200000, sponsorshipIncomeAnnual: 2600000, ticketSalesPerHomeMatch: 214000, operationsPerMonth: 640000 },
  sponsors: [
    { name: 'Anambra Breweries', valueAnnual: 1500000, category: 'Front of shirt', endDate: '2028-06-30' },
    { name: 'Bridgehead Bank', valueAnnual: 700000, category: 'Official partner', endDate: '2027-06-30' },
    { name: 'Kestrel Sports', valueAnnual: 400000, category: 'Kit supplier', endDate: '2029-06-30' },
  ],
  facilities: { trainingLevel: 3, youthLevel: 3, stadiumLevel: 3, maxLevel: 5 },
  staff: [
    { id: 'staff-manager', name: 'Emeka Nwosu', role: 'Manager', nationality: 'Nigerian', age: 46, profileId: 'emeka-nwosu' },
    { id: 'staff-assistant', name: 'Ngozi Okafor', role: 'Assistant Manager', nationality: 'Nigerian', age: 41, profileId: 'ngozi-okafor' },
    { id: 'staff-coach-1', name: 'Chukwudi Eze', role: 'First Team Coach', nationality: 'Nigerian', age: 52, profileId: 'chukwudi-eze' },
    { id: 'staff-coach-2', name: 'Luis Ortega', role: 'Technical Coach', nationality: 'Spanish', age: 39, profileId: 'luis-ortega' },
    { id: 'staff-scout', name: 'Adaeze Obi', role: 'Chief Scout', nationality: 'Nigerian', age: 38, profileId: 'adaeze-obi' },
    { id: 'staff-physio', name: 'Owen Ellis', role: 'Head Physio', nationality: 'Welsh', age: 36, profileId: 'owen-ellis' },
  ],
  history: { achievements: [], records: [], pastSeasonPositions: [] },
  formation: '4-3-3',
  leagueId: ownLeague.id,
  nextMatchId: '',
  squad,
}

const standings = leagueStandings(ownLeague)
export const league: League = {
  id: ownLeague.id,
  name: ownLeague.name,
  country: ownLeague.countryName,
  season: ownLeague.season,
  matchday: 0,
  totalMatchdays: totalMatchdays(ownLeague),
  standings,
}

const clubShortName = (clubId: string) => getTeam(clubId)?.name ?? clubId

// ---------- Personnel ----------
const managerIdentity = (clubId: string, countryCode: string) => {
  const identity = generatePlayerIdentity({ birthCountryCode: countryCode, random: createRng(`${clubId}:manager`) })
  const random = createRng(`${clubId}:manager:traits`)
  const formations = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2']
  const personalities = ['Front-Foot Leader', 'Tactical Pragmatist', 'Calm Organizer', 'Progressive Builder', 'Player Advocate']
  return { identity, age: 38 + Math.floor(random() * 22), formation: formations[Math.floor(random() * formations.length)], personality: personalities[Math.floor(random() * personalities.length)] }
}

const opponentManagers = new Map<string, ManagerProfile>()
const managerFor = (clubId: string): ManagerProfile => {
  if (clubId === club.id) return ownManager
  const cached = opponentManagers.get(clubId)
  if (cached) return cached
  const entry = teamIndex.get(clubId)!
  const { identity, age, formation, personality } = managerIdentity(clubId, entry.league.countryCode)
  const rank = entry.team.standing.position
  const profile: ManagerProfile = {
    id: `manager-${clubId}`, name: identity.name, age, nationality: identity.birthCountry, languages: identity.languages.slice(0, 2),
    attributes: { tacticalKnowledge: 16 - Math.floor(rank / 6), manManagement: 15 - Math.floor(rank / 7), discipline: 14 },
    personality, preferredFormation: formation,
    tacticalDNA: [{ label: 'Passing', value: 'Balanced' }, { label: 'Pressing', value: 'Mid block' }, { label: 'Tempo', value: 'Measured' }],
    trophies: [], awards: [], seasonRecords: [],
  }
  opponentManagers.set(clubId, profile)
  return profile
}

const ownManager: ManagerProfile = {
  id: 'emeka-nwosu', name: club.manager.name, age: club.manager.age, nationality: club.manager.nationality,
  languages: [{ name: 'English', proficiency: 'Native' }, { name: 'Igbo', proficiency: 'Native' }],
  attributes: { tacticalKnowledge: 15, manManagement: 16, discipline: 14 }, personality: 'Progressive Builder', preferredFormation: club.formation,
  tacticalDNA: [{ label: 'Passing', value: 'Short and patient' }, { label: 'Pressing', value: 'High intensity' }, { label: 'Tempo', value: 'Quick transitions' }],
  trophies: [],
  awards: [],
  seasonRecords: [],
}

const staffProfiles: ManagerProfile[] = ([
  ['ngozi-okafor', 'Ngozi Okafor', 41, 'Nigerian', '4-2-3-1', 'Collaborative Mentor', 'English'],
  ['chukwudi-eze', 'Chukwudi Eze', 52, 'Nigerian', '4-4-2', 'Calm Organizer', 'English'],
  ['luis-ortega', 'Luis Ortega', 39, 'Spanish', '4-3-3', 'Technical Innovator', 'Spanish'],
  ['adaeze-obi', 'Adaeze Obi', 38, 'Nigerian', '4-2-3-1', 'Analytical Scout', 'English'],
  ['owen-ellis', 'Owen Ellis', 36, 'Welsh', '4-3-3', 'Player Advocate', 'English'],
] as const).map(([id, name, age, nationality, formation, personality, language]) => ({
  id, name, age: Number(age), nationality, languages: [{ name: language, proficiency: 'Native' as const }],
  attributes: { tacticalKnowledge: 13, manManagement: 14, discipline: 13 }, personality, preferredFormation: formation,
  tacticalDNA: [{ label: 'Passing', value: 'Balanced' }, { label: 'Pressing', value: 'Mid block' }, { label: 'Tempo', value: 'Measured' }],
  trophies: [], awards: [], seasonRecords: [],
}))

export const refereeProfiles: RefereeProfile[] = [
  { id: 'samuel-adeyemi', name: 'Samuel Adeyemi', age: 44, nationality: 'Nigerian', countryCode: 'NGA', languages: [{ name: 'English', proficiency: 'Native' }, { name: 'Yoruba', proficiency: 'Native' }], strictness: 'Balanced', yellowCardsPerMatch: 3.8, redCardsPerMatch: 0.16, foulThreshold: 13 },
  { id: 'ibrahim-danjuma', name: 'Ibrahim Danjuma', age: 40, nationality: 'Nigerian', countryCode: 'NGA', languages: [{ name: 'English', proficiency: 'Native' }, { name: 'Hausa', proficiency: 'Native' }], strictness: 'Strict', yellowCardsPerMatch: 4.6, redCardsPerMatch: 0.24, foulThreshold: 11 },
]

// ---------- Fixtures ----------
const bestPlayer = new Map<MatchLineup, string>()
const lineupFor = (clubId: string, side: 'home' | 'away'): MatchLineup => {
  const players = clubId === club.id ? squad : getClubSquad(clubId)
  const ids = fitPlayersToSlots(DEFAULT_SLOTS, players)
  const starters = ids.map((id) => players.find((player) => player.id === id)!)
  const bench = players.filter((player) => !ids.includes(player.id)).sort((a, b) => b.overall - a.overall).slice(0, 7)
  const toLineupPlayer = (player: Player, index: number, slot?: (typeof DEFAULT_SLOTS)[number]): MatchLineupPlayer => ({
    id: `${clubId}-${index + 1}`, playerId: player.id, name: player.name, shirtNumber: player.shirtNumber,
    position: slot?.label ?? player.position, x: slot ? (side === 'home' ? slot.x : 100 - slot.x) : 0, y: slot ? (side === 'home' ? slot.y : 100 - slot.y) : 0,
  })
  const lineup: MatchLineup = {
    formation: '4-3-3', coach: managerFor(clubId).name,
    startingXI: starters.map((player, index) => toLineupPlayer(player, index, DEFAULT_SLOTS[index])),
    substitutes: bench.map((player, index) => toLineupPlayer(player, index + 11)),
  }
  bestPlayer.set(lineup, [...starters].sort((a, b) => b.overall - a.overall)[0].name)
  return lineup
}

const keyPlayer = (lineup: MatchLineup) => bestPlayer.get(lineup) ?? lineup.startingXI[0].name

const baseMatch = (id: string, matchday: number, date: string, kickOff: string, homeId: string, awayId: string, referee: string, weather: string): MatchInfo => {
  const lineups = { home: lineupFor(homeId, 'home'), away: lineupFor(awayId, 'away') }
  return {
    id, competition: league.name, matchday, date, kickOff,
    homeClubId: homeId, homeClubName: clubShortName(homeId), awayClubId: awayId, awayClubName: clubShortName(awayId),
    venue: homeId === club.id ? club.stadium.name : `${clubShortName(homeId)} Stadium`,
    referee, weather, status: 'Upcoming',
    formation: { home: lineups.home.formation, away: lineups.away.formation },
    coaches: { home: lineups.home.coach, away: lineups.away.coach },
    keyPlayers: { home: keyPlayer(lineups.home), away: keyPlayer(lineups.away) },
    lastFiveForm: { home: [], away: [] },
    headToHead: { homeWins: 0, draws: 0, awayWins: 0, recentMeetings: [] },
    lineups, commentary: [], stats: undefined,
  }
}

// ---------- Generated season fixtures ----------
export const SEASON_START_DATE = '2026-08-01'
const FIRST_MATCHDAY_DATE = '2026-08-08'
const weatherPool = ['Clear, 28°C', 'Cloudy, 27°C', 'Humid, 26°C', 'Light rain, 24°C', 'Warm, 30°C', 'Overcast, 25°C']

const addDaysIso = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

/** Double round-robin (circle method): every club meets every other home and away. */
function generateRoundRobin(clubIds: string[]): { homeId: string; awayId: string }[][] {
  const ids = [...clubIds]
  if (ids.length % 2 === 1) ids.push('')
  const rounds: { homeId: string; awayId: string }[][] = []
  const half = ids.length / 2
  for (let round = 0; round < ids.length - 1; round += 1) {
    const pairs: { homeId: string; awayId: string }[] = []
    for (let index = 0; index < half; index += 1) {
      const first = ids[index]
      const second = ids[ids.length - 1 - index]
      if (!first || !second) continue
      const flip = (round + index) % 2 === 1
      pairs.push(flip ? { homeId: second, awayId: first } : { homeId: first, awayId: second })
    }
    rounds.push(pairs)
    ids.splice(1, 0, ids.pop()!)
  }
  return [...rounds, ...rounds.map((pairs) => pairs.map(({ homeId, awayId }) => ({ homeId: awayId, awayId: homeId })))]
}

const buildSeasonFixtures = (): MatchInfo[] => {
  const rounds = generateRoundRobin(ownLeague.teams.map((team) => team.id).sort())
  return rounds.flatMap((pairs, roundIndex) => pairs.map(({ homeId, awayId }, pairIndex) => {
    const own = homeId === club.id || awayId === club.id
    return baseMatch(
      `${ownLeague.id}-md${String(roundIndex + 1).padStart(2, '0')}-${String(pairIndex + 1).padStart(2, '0')}`,
      roundIndex + 1,
      addDaysIso(FIRST_MATCHDAY_DATE, roundIndex * 7),
      own ? '15:00' : pairIndex % 2 === 0 ? '15:00' : '17:30',
      homeId,
      awayId,
      refereeProfiles[(roundIndex + pairIndex) % refereeProfiles.length].name,
      weatherPool[(roundIndex * 3 + pairIndex) % weatherPool.length],
    )
  }))
}

export const matchFixtures: MatchInfo[] = buildSeasonFixtures()
export const clubFixtures: MatchInfo[] = matchFixtures.filter((match) => match.homeClubId === club.id || match.awayClubId === club.id)
club.nextMatchId = clubFixtures[0]?.id ?? ''

export const managerProfiles: ManagerProfile[] = [
  ownManager,
  ...staffProfiles,
  ...ownLeague.teams.filter((team) => team.id !== club.id).map((team) => managerFor(team.id)),
]

// ---------- Live dashboard metrics (read at render time so every screen stays in sync) ----------
export const getWageRoom = () => club.finances.wageBudget - club.finances.weeklyWages

export function getSquadHealth(): SquadHealthMetrics {
  const players = club.squad
  return {
    activeInjuries: 0,
    injuriesNote: 'Full squad available',
    suspensions: 0,
    suspensionsNote: 'No disciplinary bans',
    squadMorale: 'Good',
    moralePercentage: Math.round(players.reduce((sum, player) => sum + player.personalInfo.teamOpinion, 0) / players.length),
    teamChemistry: 78,
    chemistryNote: 'Settling into a shared system',
    averageFitness: Math.round(players.reduce((sum, player) => sum + player.fitness, 0) / players.length),
  }
}

// ---------- Cups & continental competitions (zeroed tables until fixtures are played) ----------
const defaultCupRules = ['The winner qualifies for next season’s continental competition.']

const competitionFromClubs = (id: string, name: string, country: string, category: LeagueCompetition['category'], teams: GlobalLeagueTeam[], rounds: number, rules: string[]): LeagueCompetition => {
  const table: LeagueStanding[] = teams.map((team, index) => emptyStanding(team, index + 1)).sort((a, b) => a.clubName.localeCompare(b.clubName)).map((standing, index) => ({ ...standing, position: index + 1 }))
  return {
    id, name, country, category, season: ownLeague.season, matchday: 0, totalMatchdays: rounds, standings: table,
    playerStats: { goals: [], assists: [], cleanSheets: [], cards: [], rating: [] },
    teamStats: [],
    rules: describeRules(getCompetitionRules(id), rules), history: [],
  }
}

const leagueTeams = (leagueId: string, from: number, to: number) =>
  [...globalLeagues.find((item) => item.id === leagueId)!.teams].sort((a, b) => a.standing.position - b.standing.position).slice(from, to)

const cupTeams = (leagueId: string) => leagueTeams(leagueId, 0, 8)
const topClubs = (leagueIds: string[], from: number, to: number) => leagueIds.flatMap((leagueId) => leagueTeams(leagueId, from, to))

export const leagueCompetitions: LeagueCompetition[] = [
  competitionFromClubs('nga-federation-cup', 'Federation Cup', 'Nigeria', 'Domestic Leagues', cupTeams('nga-top-division').filter((team) => team.id !== club.id).slice(0, 7).concat(ownTeam), 4, defaultCupRules),
  competitionFromClubs('eng-fa-cup', 'FA Cup', 'England', 'Domestic Leagues', cupTeams('eng-top-division'), 4, defaultCupRules),
  competitionFromClubs('esp-copa', 'Copa Nacional', 'Spain', 'Domestic Leagues', cupTeams('esp-top-division'), 4, defaultCupRules),
  competitionFromClubs('por-taca', 'Taça Nacional', 'Portugal', 'Domestic Leagues', cupTeams('por-top-division'), 4, defaultCupRules),
  competitionFromClubs('sco-cup', 'Scottish Cup', 'Scotland', 'Domestic Leagues', cupTeams('sco-top-division'), 4, defaultCupRules),
  competitionFromClubs('irl-cup', 'FAI Cup', 'Ireland', 'Domestic Leagues', cupTeams('irl-top-division'), 4, defaultCupRules),
  competitionFromClubs('continental-champions', 'Champions Cup', 'Europe', 'Continental Competitions', topClubs(['eng-top-division', 'esp-top-division', 'ger-top-division', 'ita-top-division'], 0, 4), 6, ['Top four clubs from each major league qualify.']),
  competitionFromClubs('continental-league', 'Continental League', 'Europe', 'Continental Competitions', topClubs(['fra-top-division', 'por-top-division', 'ned-top-division', 'bel-top-division'], 0, 4), 6, ['Clubs finishing just outside the top spots qualify.']),
  competitionFromClubs('continental-africa', 'African Champions League', 'Africa', 'Continental Competitions', topClubs(['nga-top-division', 'gha-top-division', 'egy-top-division', 'mar-top-division'], 0, 4), 6, ['Top four clubs from each qualifying league enter.']),
]

// ---------- Transfer market (players from other clubs) ----------
let marketCache: Player[] | null = null
export function getTransferMarketPlayers(): Player[] {
  if (marketCache) return marketCache
  const sources = [...leagueTeams(ownLeague.id, 0, 18), ...['eng-top-division', 'esp-top-division', 'por-top-division', 'gha-top-division', 'bra-top-division'].flatMap((id) => leagueTeams(id, 0, 6))]
  marketCache = sources.filter((team) => team.id !== club.id).flatMap((team) => [...getClubSquad(team.id)].sort((a, b) => b.overall - a.overall).slice(0, 3))
  return marketCache
}

export const playerClubName = (clubId: string) => findGeneratedClub(clubId)?.clubName ?? 'Free Agent'

export const ownLeagueRules = getCompetitionRules(ownLeague.id)
export const SQUAD_MIN = ownLeagueRules.squadMin
export const SQUAD_MAX = ownLeagueRules.squadMax
export const isOwnPlayer = (player: Player) => club.squad.some((member) => member.id === player.id)

export const removeFromList = (list: Player[] | undefined, player: Player) => {
  const index = list ? list.findIndex((member) => member.id === player.id) : -1
  if (list && index >= 0) list.splice(index, 1)
}
