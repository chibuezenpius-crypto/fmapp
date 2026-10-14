import rawGlobalLeagues from './globalLeaguesAndTeams.json'
import { findGeneratedClub, getClubSquad } from './clubSquads'
import { createRng, generatePlayerIdentity } from '../utils/proceduralGenerator'
import { DEFAULT_SLOTS, fitPlayersToSlots } from '../utils/lineup'
import type {
  Club, ClubConfidenceData, GlobalCountryLeague, GlobalLeagueTeam, GlobalLeaguesDatabase, League, LeagueCompetition, LeagueStanding,
  ManagerProfile, MatchCommentaryEvent, MatchInfo, MatchLineup, MatchLineupPlayer, Player, ProceduralClubBadge, RefereeProfile, SquadHealthMetrics,
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

export const leagueStandings = (countryLeague: GlobalCountryLeague): LeagueStanding[] =>
  [...countryLeague.teams].sort((a, b) => a.standing.position - b.standing.position).map((team) => ({ ...team.standing, clubId: team.id, clubName: team.name }))

export const currentMatchday = (countryLeague: GlobalCountryLeague) => Math.max(...countryLeague.teams.map((team) => team.standing.played))
export const totalMatchdays = (countryLeague: GlobalCountryLeague) => (countryLeague.teams.length - 1) * 2

// Starters come first in a fixed order so index-based views (club pitch) stay stable.
const orderedSquad = (clubId: string) => {
  const players = getClubSquad(clubId)
  const starters = fitPlayersToSlots([
    { position: 'GK' }, { position: 'D (R)' }, { position: 'D (L)' }, { position: 'D (C)' }, { position: 'D (C)' }, { position: 'DM' },
    { position: 'M (R)' }, { position: 'M (C)' }, { position: 'ST (C)' }, { position: 'AM (C)' }, { position: 'M (L)' },
  ], players).map((id) => players.find((player) => player.id === id)!)
  return [...starters, ...players.filter((player) => !starters.includes(player))]
}

export const squad: Player[] = orderedSquad(DEFAULT_CLUB_ID)

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
  finances: { transferBudget: 3500000, wageBudget: Math.round(weeklyWages * 1.12 / 500) * 500, weeklyWages, balance: 6200000, sponsorshipIncomeAnnual: 2600000, ticketSalesPerHomeMatch: 214000, operationsPerMonth: 640000 },
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
  history: {
    achievements: [
      { season: '2021/22', title: 'Federation Cup Winners', detail: 'Won the final 2-1 at Niger Bridge Arena' },
      { season: '2012/13', title: 'Promotion', detail: 'Promoted as second-division runners-up' },
    ],
    records: [
      { title: 'Most appearances', record: '388 appearances', holder: 'Obiora Anyanwu' },
      { title: 'Most goals', record: '161 goals', holder: 'Ifeanyi Dike' },
      { title: 'Biggest win', record: '7-0 vs Okigwe Bridge', holder: 'Premier League · 1996' },
    ],
    pastSeasonPositions: [
      { season: '2025/26', competition: ownLeague.name, position: 5, teamCount: 18 },
      { season: '2024/25', competition: ownLeague.name, position: 8, teamCount: 18 },
      { season: '2023/24', competition: ownLeague.name, position: 6, teamCount: 18 },
      { season: '2022/23', competition: ownLeague.name, position: 11, teamCount: 18 },
    ],
  },
  formation: '4-3-3',
  leagueId: ownLeague.id,
  nextMatchId: 'match-01',
  squad,
}

const standings = leagueStandings(ownLeague)
const ownStanding = standings.find((standing) => standing.clubId === club.id)!

export const league: League = {
  id: ownLeague.id,
  name: ownLeague.name,
  country: ownLeague.countryName,
  season: ownLeague.season,
  matchday: currentMatchday(ownLeague),
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
    trophies: [], awards: [],
    seasonRecords: [{ season: entry.league.season, clubName: entry.team.name, wins: entry.team.standing.won, draws: entry.team.standing.drawn, losses: entry.team.standing.lost }],
  }
  opponentManagers.set(clubId, profile)
  return profile
}

const ownManager: ManagerProfile = {
  id: 'emeka-nwosu', name: club.manager.name, age: club.manager.age, nationality: club.manager.nationality,
  languages: [{ name: 'English', proficiency: 'Native' }, { name: 'Igbo', proficiency: 'Native' }],
  attributes: { tacticalKnowledge: 15, manManagement: 16, discipline: 14 }, personality: 'Progressive Builder', preferredFormation: club.formation,
  tacticalDNA: [{ label: 'Passing', value: 'Short and patient' }, { label: 'Pressing', value: 'High intensity' }, { label: 'Tempo', value: 'Quick transitions' }],
  trophies: [{ season: '2021/22', title: 'Federation Cup', clubName: club.name }],
  awards: [{ season: '2021/22', title: 'Cup Manager of the Year', detail: `Led ${club.name} to the Federation Cup` }],
  seasonRecords: [
    { season: ownLeague.season, clubName: club.name, wins: ownStanding.won, draws: ownStanding.drawn, losses: ownStanding.lost },
    { season: '2025/26', clubName: club.name, wins: 16, draws: 7, losses: 11 },
    { season: '2024/25', clubName: club.name, wins: 13, draws: 8, losses: 13 },
  ],
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
  trophies: [], awards: [], seasonRecords: [{ season: ownLeague.season, clubName: club.name, wins: ownStanding.won, draws: ownStanding.drawn, losses: ownStanding.lost }],
}))

export const refereeProfiles: RefereeProfile[] = [
  { id: 'samuel-adeyemi', name: 'Samuel Adeyemi', age: 44, nationality: 'Nigerian', countryCode: 'NGA', languages: [{ name: 'English', proficiency: 'Native' }, { name: 'Yoruba', proficiency: 'Native' }], strictness: 'Balanced', yellowCardsPerMatch: 3.8, redCardsPerMatch: 0.16, foulThreshold: 13 },
  { id: 'ibrahim-danjuma', name: 'Ibrahim Danjuma', age: 40, nationality: 'Nigerian', countryCode: 'NGA', languages: [{ name: 'English', proficiency: 'Native' }, { name: 'Hausa', proficiency: 'Native' }], strictness: 'Strict', yellowCardsPerMatch: 4.6, redCardsPerMatch: 0.24, foulThreshold: 11 },
]

// ---------- Fixtures ----------
const opponentIds = { recent: 'nga-07', next: 'nga-01', second: 'nga-08', third: 'nga-02' }

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

const meetings = (homeId: string, awayId: string, referenceDate: string) => {
  const random = createRng(`${[homeId, awayId].sort().join('|')}:h2h`)
  const recentMeetings = [0, 1, 2, 3].map((index) => {
    const home = index % 2 === 0 ? awayId : homeId
    const away = index % 2 === 0 ? homeId : awayId
    const date = new Date(`${referenceDate}T12:00:00`)
    date.setMonth(date.getMonth() - 5 * (index + 1))
    return { date: date.toISOString().slice(0, 10), homeClubName: clubShortName(home), awayClubName: clubShortName(away), homeScore: Math.floor(random() * 4), awayScore: Math.floor(random() * 3) }
  })
  let homeWins = 0, draws = 0, awayWins = 0
  for (const meeting of recentMeetings) {
    const homeSide = meeting.homeClubName === clubShortName(homeId)
    const diff = meeting.homeScore - meeting.awayScore
    if (diff === 0) draws += 1
    else if ((diff > 0) === homeSide) homeWins += 1
    else awayWins += 1
  }
  return { homeWins: homeWins + 4, draws: draws + 2, awayWins: awayWins + 3, recentMeetings }
}

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
    lastFiveForm: { home: [...(teamIndex.get(homeId)!.team.standing.form)], away: [...(teamIndex.get(awayId)!.team.standing.form)] },
    headToHead: meetings(homeId, awayId, date),
    lineups, commentary: [], stats: undefined,
  }
}

const nextMatchday = ownStanding.played + 1

const buildRecentMatch = (): MatchInfo => {
  const match = baseMatch('match-previous', ownStanding.played, '2026-10-10', '15:00', club.id, opponentIds.recent, 'Ibrahim Danjuma', 'Light rain, 24°C')
  const home = match.lineups.home.startingXI
  const away = match.lineups.away.startingXI
  const byLabel = (lineup: MatchLineupPlayer[], label: string, nth = 0) => lineup.filter((player) => player.position === label)[nth]
  const commentary: MatchCommentaryEvent[] = [
    { minute: 90, team: 'home', type: 'Foul', player: byLabel(home, 'CB').name, detail: 'Wins the final aerial duel as the referee blows for full time.' },
    { minute: 86, team: 'away', type: 'Red Card', player: byLabel(away, 'CB', 1).name, detail: 'Sent off for a second bookable offence after stopping a counter.' },
    { minute: 84, team: 'home', type: 'Substitution', player: match.lineups.home.substitutes[match.lineups.home.substitutes.length - 1].name, detail: `Replaces ${byLabel(home, 'ST').name} for the closing minutes.` },
    { minute: 78, team: 'away', type: 'Save', player: byLabel(home, 'GK').name, detail: `Gets down quickly to turn ${byLabel(away, 'CM').name}'s low drive around the post.` },
    { minute: 71, team: 'away', type: 'Yellow Card', player: byLabel(away, 'DM').name, detail: 'Booked for a late challenge in midfield.' },
    { minute: 63, team: 'home', type: 'Goal', player: byLabel(home, 'RW').name, detail: `Finds the bottom corner after a neat exchange with ${byLabel(home, 'ST').name}.` },
    { minute: 52, team: 'away', type: 'Goal', player: byLabel(away, 'ST').name, detail: 'Levels the score with a header from the six-yard box.' },
    { minute: 38, team: 'home', type: 'Goal', player: byLabel(home, 'ST').name, detail: `Turns home ${byLabel(home, 'LW').name}'s driven cross at the near post.` },
    { minute: 24, team: 'home', type: 'Yellow Card', player: byLabel(home, 'DM').name, detail: 'Cautioned for stopping a counter-attack.' },
  ]
  return {
    ...match, status: 'Completed', score: { home: 2, away: 1 }, commentary,
    stats: { possession: { home: 56, away: 44 }, shots: { home: 15, away: 9 }, shotsOnTarget: { home: 7, away: 3 }, passAccuracy: { home: 86, away: 79 }, fouls: { home: 11, away: 14 } },
  }
}

export const recentMatch: MatchInfo = buildRecentMatch()
export const nextMatch: MatchInfo = baseMatch('match-01', nextMatchday, '2026-10-17', '15:00', club.id, opponentIds.next, 'Samuel Adeyemi', 'Cloudy, 27°C')
export const upcomingMatch2: MatchInfo = baseMatch('match-02', nextMatchday + 1, '2026-10-24', '15:00', opponentIds.second, club.id, 'Ibrahim Danjuma', 'Clear, 29°C')
export const upcomingMatch3: MatchInfo = baseMatch('match-03', nextMatchday + 2, '2026-10-31', '17:30', club.id, opponentIds.third, 'Samuel Adeyemi', 'Humid, 26°C')

export const upcomingFixtures: MatchInfo[] = [nextMatch, upcomingMatch2, upcomingMatch3]
export const matchFixtures: MatchInfo[] = [recentMatch, nextMatch, upcomingMatch2, upcomingMatch3]

export const managerProfiles: ManagerProfile[] = [
  ownManager,
  ...staffProfiles,
  ...matchFixtures.flatMap((match) => [match.homeClubId, match.awayClubId]).filter((id, index, all) => id !== club.id && all.indexOf(id) === index).map(managerFor),
]

// ---------- Home dashboard metrics ----------
const leader = standings[0]
const ownForm = ownStanding.form
export const homeMetrics = {
  position: ownStanding.position,
  teamCount: standings.length,
  pointsBehindLeader: leader.points - ownStanding.points,
  leaderName: leader.clubName,
  form: ownForm,
  formSummary: [['W', 'win'], ['D', 'draw'], ['L', 'loss']].map(([code, label]) => { const count = ownForm.filter((result) => result === code).length; return `${count} ${count === 1 ? label : label === 'loss' ? 'losses' : `${label}s`}` }).join(' · '),
  wageRoom: club.finances.wageBudget - club.finances.weeklyWages,
}

export const squadHealthMetrics: SquadHealthMetrics = {
  activeInjuries: 0,
  injuriesNote: 'Full squad available',
  suspensions: 0,
  suspensionsNote: 'No disciplinary bans',
  squadMorale: 'Good',
  moralePercentage: Math.round(squad.reduce((sum, player) => sum + player.personalInfo.teamOpinion, 0) / squad.length),
  teamChemistry: 78,
  chemistryNote: 'Settling into a shared system',
  averageFitness: Math.round(squad.reduce((sum, player) => sum + player.fitness, 0) / squad.length),
}

export const clubConfidence: ClubConfidenceData = {
  board: { percentage: 72, status: 'Good', note: `Pleased with ${ownStanding.position}th place and a healthy wage balance` },
  fan: { percentage: 68, status: 'Good', note: `Looking forward to hosting ${nextMatch.awayClubName}` },
  player: { percentage: 74, status: 'Good', note: 'Solid dressing room faith in the tactical setup' },
}

// ---------- Cups & continental competitions (built from real clubs) ----------
const defaultCupRules = ['Single-match knockout rounds until the semi-final.', 'Extra time and penalties if scores are level.', 'Five substitutions are permitted.', 'The winner qualifies for next season’s continental competition.']

const competitionFromClubs = (id: string, name: string, country: string, category: LeagueCompetition['category'], teams: GlobalLeagueTeam[], rounds: number, rules: string[], history: LeagueCompetition['history']): LeagueCompetition => {
  const random = createRng(`${id}:table`)
  const table: LeagueStanding[] = teams.map((team) => {
    const won = Math.floor(random() * (rounds + 1))
    const drawn = Math.floor(random() * (rounds - won + 1))
    const goalsFor = won * 2 + drawn + Math.floor(random() * 3)
    const goalsAgainst = Math.max(0, goalsFor - won * 2 + Math.floor(random() * 4))
    return { position: 0, clubId: team.id, clubName: team.name, played: rounds, won, drawn, lost: rounds - won - drawn, goalsFor, goalsAgainst, goalDifference: goalsFor - goalsAgainst, points: won * 3 + drawn, form: team.standing.form }
  }).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference).map((standing, index) => ({ ...standing, position: index + 1 }))
  const playerStats = leaguePlayerStats(table.map((standing) => standing.clubId))
  return {
    id, name, country, category, season: ownLeague.season, matchday: rounds, totalMatchdays: rounds, standings: table, playerStats,
    teamStats: table.slice(0, 5).map((standing, index) => ({ clubId: standing.clubId, clubName: standing.clubName, possession: 58 - index * 3, goals: standing.goalsFor, cleanSheets: 4 - Math.floor(index / 2), cards: 8 + index * 2 })),
    rules, history,
  }
}

export function leaguePlayerStats(clubIds: string[]): LeagueCompetition['playerStats'] {
  const rows = clubIds.flatMap((clubId) => getClubSquad(clubId).map((player) => ({ player, clubName: clubShortName(clubId), stats: player.seasonStats[player.seasonStats.length - 1] }))).filter((row) => row.stats)
  const top = (pick: (row: (typeof rows)[number]) => number, filter: (row: (typeof rows)[number]) => boolean = () => true) =>
    rows.filter(filter).map((row) => ({ playerId: row.player.id, name: row.player.name, clubName: row.clubName, value: pick(row) })).sort((a, b) => b.value - a.value).slice(0, 10)
  return {
    goals: top((row) => row.stats.goals),
    assists: top((row) => row.stats.assists),
    cleanSheets: top((row) => row.stats.cleanSheets, (row) => row.player.position === 'GK'),
  }
}

export function leagueHistory(countryLeague: GlobalCountryLeague): LeagueCompetition['history'] {
  const random = createRng(`${countryLeague.id}:history`)
  const contenders = leagueStandings(countryLeague).slice(0, 6).filter((standing) => standing.clubId !== club.id)
  return ['2025/26', '2024/25', '2023/24'].map((season, index) => {
    const champion = contenders[(index * 2) % contenders.length]
    const runnerUp = contenders[(index * 2 + 1) % contenders.length]
    return { season, champion: champion.clubName, runnerUp: runnerUp.clubName, points: 70 + Math.floor(random() * 12) }
  })
}

const leagueTeams = (leagueId: string, from: number, to: number) =>
  [...globalLeagues.find((item) => item.id === leagueId)!.teams].sort((a, b) => a.standing.position - b.standing.position).slice(from, to)

const cupTeams = (leagueId: string) => leagueTeams(leagueId, 0, 8)
const topClubs = (leagueIds: string[], from: number, to: number) => leagueIds.flatMap((leagueId) => leagueTeams(leagueId, from, to))

const cupHistory = (leagueId: string, includeOwn = false): LeagueCompetition['history'] => {
  const teams = cupTeams(leagueId)
  return ['2025/26', '2024/25', '2023/24'].map((season, index) => ({ season, champion: teams[(index + 2) % teams.length].name, runnerUp: teams[(index + 4) % teams.length].name, points: 0 }))
    .concat(includeOwn ? [{ season: '2021/22', champion: club.name, runnerUp: cupTeams(leagueId)[0].name, points: 0 }] : [])
}

export const leagueCompetitions: LeagueCompetition[] = [
  competitionFromClubs('nga-federation-cup', 'Federation Cup', 'Nigeria', 'Domestic Leagues', cupTeams('nga-top-division').filter((team) => team.id !== club.id).slice(0, 7).concat(ownTeam), 4, defaultCupRules, cupHistory('nga-top-division', true)),
  competitionFromClubs('eng-fa-cup', 'FA Cup', 'England', 'Domestic Leagues', cupTeams('eng-top-division'), 4, defaultCupRules, cupHistory('eng-top-division')),
  competitionFromClubs('esp-copa', 'Copa Nacional', 'Spain', 'Domestic Leagues', cupTeams('esp-top-division'), 4, defaultCupRules, cupHistory('esp-top-division')),
  competitionFromClubs('por-taca', 'Taça Nacional', 'Portugal', 'Domestic Leagues', cupTeams('por-top-division'), 4, defaultCupRules, cupHistory('por-top-division')),
  competitionFromClubs('sco-cup', 'Scottish Cup', 'Scotland', 'Domestic Leagues', cupTeams('sco-top-division'), 4, defaultCupRules, cupHistory('sco-top-division')),
  competitionFromClubs('irl-cup', 'FAI Cup', 'Ireland', 'Domestic Leagues', cupTeams('irl-top-division'), 4, defaultCupRules, cupHistory('irl-top-division')),
  competitionFromClubs('continental-champions', 'Champions Cup', 'Europe', 'Continental Competitions', topClubs(['eng-top-division', 'esp-top-division', 'ger-top-division', 'ita-top-division'], 0, 4), 6, ['Group phase followed by knockout rounds.', 'Top four clubs from each major league qualify.', 'Five substitutions are permitted.'], [
    { season: '2025/26', champion: leagueTeams('esp-top-division', 0, 1)[0].name, runnerUp: leagueTeams('eng-top-division', 0, 1)[0].name, points: 0 },
    { season: '2024/25', champion: leagueTeams('ger-top-division', 0, 1)[0].name, runnerUp: leagueTeams('ita-top-division', 0, 1)[0].name, points: 0 },
  ]),
  competitionFromClubs('continental-league', 'Continental League', 'Europe', 'Continental Competitions', topClubs(['fra-top-division', 'por-top-division', 'ned-top-division', 'bel-top-division'], 0, 4), 6, ['Group phase followed by knockout rounds.', 'Clubs finishing just outside the top spots qualify.', 'Five substitutions are permitted.'], [
    { season: '2025/26', champion: leagueTeams('por-top-division', 1, 2)[0].name, runnerUp: leagueTeams('fra-top-division', 1, 2)[0].name, points: 0 },
    { season: '2024/25', champion: leagueTeams('ned-top-division', 0, 1)[0].name, runnerUp: leagueTeams('bel-top-division', 0, 1)[0].name, points: 0 },
  ]),
  competitionFromClubs('continental-africa', 'African Champions League', 'Africa', 'Continental Competitions', topClubs(['nga-top-division', 'gha-top-division', 'egy-top-division', 'mar-top-division'], 0, 4), 6, ['Group phase followed by knockout rounds.', 'Top four clubs from each qualifying league enter.', 'Five substitutions are permitted.'], [
    { season: '2025/26', champion: leagueTeams('egy-top-division', 0, 1)[0].name, runnerUp: leagueTeams('mar-top-division', 0, 1)[0].name, points: 0 },
    { season: '2024/25', champion: leagueTeams('nga-top-division', 0, 1)[0].name, runnerUp: leagueTeams('gha-top-division', 0, 1)[0].name, points: 0 },
  ]),
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


export const SQUAD_MIN = 18
export const SQUAD_MAX = 30
export const isOwnPlayer = (player: Player) => club.squad.some((member) => member.id === player.id)

const removeFrom = (list: Player[] | undefined, player: Player) => {
  const index = list ? list.findIndex((member) => member.id === player.id) : -1
  if (list && index >= 0) list.splice(index, 1)
}

export function releasePlayer(player: Player): string {
  if (!isOwnPlayer(player)) return 'This player is not in your squad.'
  if (club.squad.length <= SQUAD_MIN) return `You need at least ${SQUAD_MIN} players in the squad.`
  removeFrom(club.squad, player)
  club.finances.weeklyWages -= player.contract.weeklyWage
  player.contract = { ...player.contract, clubId: '', squadRole: 'Squad Player' }
  getTransferMarketPlayers().push(player)
  return `${player.name} has been released and is now a free agent.`
}

export function signPlayer(player: Player, fee: number): string {
  if (club.squad.length >= SQUAD_MAX) return `Your squad is full (${SQUAD_MAX}).`
  if (fee > club.finances.transferBudget) return 'You cannot afford this fee.'
  removeFrom(getClubSquad(player.contract.clubId), player)
  removeFrom(getTransferMarketPlayers(), player)
  club.finances.transferBudget -= fee
  club.finances.weeklyWages += player.contract.weeklyWage
  player.contract = { ...player.contract, clubId: club.id }
  player.shirtNumber = Math.max(...club.squad.map((member) => member.shirtNumber)) + 1
  club.squad.push(player)
  return `${player.name} signed for £${(fee / 1000000).toFixed(1)}m.`
}

export function renewContract(player: Player, years: number, weeklyWage: number, status: 'Accepted' | 'Declined', reason: string) {
  player.contract.offerHistory = [{ clubName: club.name, date: '2026-10-15', status, weeklyWage, reason }, ...player.contract.offerHistory]
  if (status !== 'Accepted') return
  club.finances.weeklyWages += weeklyWage - player.contract.weeklyWage
  const end = new Date(`${player.contract.endDate}T12:00:00`)
  end.setFullYear(Math.max(end.getFullYear(), 2026) + years)
  player.contract = { ...player.contract, weeklyWage, endDate: end.toISOString().slice(0, 10) }
}