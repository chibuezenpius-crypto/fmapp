import type { Club, League, LeagueCategory, LeagueCompetition, LeagueStanding, MatchInfo, MatchLineupPlayer, ManagerProfile, Player, PlayerAttributes, RefereeProfile } from '../types/game'

const attributeBase: PlayerAttributes = {
  crossing: 10, dribbling: 10, finishing: 10, firstTouch: 10, heading: 10, longShots: 10,
  marking: 10, passing: 10, tackling: 10, technique: 10, vision: 10, teamwork: 10,
  decisions: 10, determination: 10, offTheBall: 10, positioning: 10, leadership: 10,
  workRate: 10, pace: 10, acceleration: 10, stamina: 10, strength: 10, agility: 10,
  jumpingReach: 10,
}

function createPlayer(
  id: string,
  name: string,
  shirtNumber: number,
  position: Player['position'],
  age: number,
  overall: number,
  potential: number,
  value: number,
  attributes: Partial<PlayerAttributes>,
): Player {
  return {
    id, name, shirtNumber, position, age, overall, potential, value,
    fitness: 92 + shirtNumber % 8,
    form: 6.4 + (shirtNumber % 5) * 0.3,
    morale: shirtNumber % 4 === 0 ? 'Very Good' : 'Good',
    attributes: { ...attributeBase, ...attributes },
    personalInfo: {
      dateOfBirth: `${2026 - age}-04-${String((shirtNumber % 27) + 1).padStart(2, '0')}`,
      placeOfBirth: ['Manchester', 'Liverpool', 'Leeds', 'Bristol', 'London'][shirtNumber % 5],
      nationalities: [
        { country: ['England', 'England', 'Nigeria', 'England', 'Portugal', 'England', 'Nigeria', 'Scotland', 'Portugal', 'Ireland', 'Wales'][shirtNumber - 1], code: ['ENG', 'ENG', 'NGA', 'ENG', 'POR', 'ENG', 'NGA', 'SCO', 'POR', 'IRL', 'WAL'][shirtNumber - 1], type: 'Primary' },
        { country: ['Wales', 'Ireland', 'England', 'Wales', 'Spain', 'Ghana', 'Ghana', 'England', 'Angola', 'England', 'Ireland'][shirtNumber - 1], code: ['WAL', 'IRL', 'ENG', 'WAL', 'ESP', 'GHA', 'GHA', 'ENG', 'ANG', 'ENG', 'IRL'][shirtNumber - 1], type: 'Secondary' },
      ],
      languages: [{ name: 'English', proficiency: 'Native' }],
      preferredFoot: shirtNumber % 3 === 0 ? 'Left' : 'Right',
      heightCm: 174 + (shirtNumber % 13),
      hobbies: ['Golf', 'Music'],
      teamOpinion: 70 + (shirtNumber % 25),
      personality: ['Model Professional', 'Resolute', 'Perfectionist', 'Driven', 'Professional'][shirtNumber % 5],
      characterTrait: shirtNumber % 2 === 0 ? 'Professional' : 'Loyal',
    },
    contract: {
      clubId: 'northbridge-fc',
      startDate: '2024-07-01',
      endDate: '2028-06-30',
      weeklyWage: 4500 + (overall - 70) * 500,
      squadRole: overall >= 80 ? 'Key Player' : overall >= 75 ? 'Regular Starter' : 'Squad Player',
      ...(shirtNumber === 9 ? { releaseClause: 28000000 } : {}),
      ...(shirtNumber === 10 ? { sponsor: { brand: 'Northstar', annualValue: 24000, endDate: '2027-06-30' } } : {}),
      interestedClubs: [
        { clubName: 'Westhaven Athletic', interest: 'Scouting', lastContact: '2026-10-08' },
        { clubName: 'Redmere City', interest: 'Monitoring', lastContact: '2026-09-21' },
      ],
      offerHistory: [
        { clubName: 'Oldcastle Rovers', date: '2026-07-12', status: 'Declined', weeklyWage: 18000, reason: 'Player chose to stay at Northbridge' },
        { clubName: 'Seaborne FC', date: '2025-01-18', status: 'Accepted', weeklyWage: 12000, reason: 'Agreed terms before joining Northbridge' },
      ],
    },
    transferHistory: [{
      date: '2024-07-01', fromClub: shirtNumber % 2 === 0 ? 'Eastford Town' : 'Free Agent',
      toClub: 'Northbridge FC', fee: shirtNumber % 2 === 0 ? 1200000 : 0,
      type: shirtNumber % 2 === 0 ? 'Permanent' : 'Free Transfer',
    }],
    seasonStats: [
      { season: '2024/25', clubName: 'Eastford Town', appearances: 14 + shirtNumber % 4, goals: shirtNumber === 9 ? 8 : shirtNumber === 10 ? 4 : 1, assists: shirtNumber % 5, cleanSheets: shirtNumber === 1 ? 5 : 0, averageRating: 6.6 + (shirtNumber % 4) * 0.1 },
      { season: '2025/26', clubName: 'Northbridge FC', appearances: 29 + shirtNumber % 3, goals: shirtNumber === 9 ? 16 : shirtNumber === 10 ? 9 : 2, assists: 2 + shirtNumber % 5, cleanSheets: shirtNumber === 1 ? 9 : 0, averageRating: 6.9 + (shirtNumber % 4) * 0.1 },
      { season: '2026/27', clubName: 'Northbridge FC', appearances: 11, goals: shirtNumber === 9 ? 7 : shirtNumber === 10 ? 4 : 1, assists: 1 + shirtNumber % 3, cleanSheets: shirtNumber === 1 ? 4 : 0, averageRating: 7.0 + (shirtNumber % 4) * 0.1 },
    ],
    careerTotals: {
      appearances: 54 + shirtNumber % 6,
      goals: shirtNumber === 9 ? 31 : shirtNumber === 10 ? 18 : 4 + shirtNumber % 3,
      assists: 8 + shirtNumber % 8,
      cleanSheets: shirtNumber === 1 ? 18 : 0,
      trophies: shirtNumber % 3 === 0 ? 1 : 0,
    },
    relationships: {
      manager: 76 + shirtNumber % 20,
      teammates: [
        { playerName: 'Finn Gallagher', relationship: 88, note: 'Strong understanding on the pitch' },
        { playerName: 'Rory Campbell', relationship: 79, note: 'Good training-ground connection' },
        { playerName: 'Lewis Grant', relationship: 67, note: 'Professional relationship' },
      ].filter((teammate) => teammate.playerName !== name),
      favoritePersonnel: ['Alex Morgan', 'Rory Campbell'],
      dislikedPersonnel: ['Gareth Nolan'],
    },
    achievements: {
      trophies: shirtNumber % 3 === 0 ? [{ season: '2025/26', title: 'North Country Premier', detail: 'League champions with Northbridge FC' }] : [],
      individualAwards: shirtNumber === 9 ? [{ season: '2025/26', title: 'Golden Boot', detail: 'Top scorer with 16 league goals' }] : [],
      seasonRecognitions: shirtNumber === 10 ? [{ season: '2025/26', title: 'Team of the Season', detail: 'North Country Premier selection' }] : [],
    },
  }
}

export const squad: Player[] = [
  createPlayer('p-01', 'Elliot Ward', 1, 'GK', 29, 78, 79, 5200000, { positioning: 16, decisions: 15, jumpingReach: 16, teamwork: 14 }),
  createPlayer('p-02', 'Callum Price', 2, 'D (R)', 25, 75, 79, 4100000, { crossing: 15, pace: 15, tackling: 14, stamina: 15 }),
  createPlayer('p-03', 'Tariq Mensah', 3, 'D (L)', 23, 76, 83, 5900000, { crossing: 14, pace: 16, marking: 14, agility: 15 }),
  createPlayer('p-04', 'Lewis Grant', 4, 'D (C)', 28, 79, 79, 6800000, { heading: 16, marking: 16, tackling: 15, strength: 16 }),
  createPlayer('p-05', 'Mateo Silva', 5, 'D (C)', 26, 77, 80, 6200000, { heading: 15, marking: 15, passing: 13, positioning: 15 }),
  createPlayer('p-06', 'Noah Bennett', 6, 'DM', 24, 78, 84, 8200000, { tackling: 16, passing: 15, teamwork: 16, stamina: 16 }),
  createPlayer('p-07', 'Jamie Okafor', 7, 'M (R)', 22, 77, 86, 9600000, { dribbling: 16, crossing: 15, pace: 17, acceleration: 17 }),
  createPlayer('p-08', 'Rory Campbell', 8, 'M (C)', 27, 80, 81, 10400000, { passing: 17, vision: 16, technique: 16, decisions: 16 }),
  createPlayer('p-09', 'Adrian Costa', 9, 'ST (C)', 25, 82, 85, 15800000, { finishing: 17, firstTouch: 16, offTheBall: 17, pace: 15 }),
  createPlayer('p-10', 'Finn Gallagher', 10, 'AM (C)', 24, 81, 87, 17200000, { dribbling: 16, technique: 17, vision: 17, longShots: 15 }),
  createPlayer('p-11', 'Dylan Hughes', 11, 'M (L)', 21, 74, 85, 7100000, { dribbling: 15, crossing: 14, pace: 16, determination: 16 }),
]

export const club: Club = {
  id: 'northbridge-fc',
  name: 'Northbridge FC',
  nickname: 'The Foundry',
  shortName: 'NBR',
  founded: 1898,
  colors: { primary: '#d4f34a', secondary: '#13221c' },
  prestige: 74,
  manager: { name: 'Alex Morgan', nationality: 'English', age: 38, reputation: 3 },
  stadium: { name: 'Foundry Park', capacity: 28450, attendance: 24118 },
  finances: { transferBudget: 12500000, wageBudget: 248000, weeklyWages: 193500, balance: 18400000, sponsorshipIncomeAnnual: 6800000, ticketSalesPerHomeMatch: 684000, operationsPerMonth: 2250000 },
  sponsors: [
    { name: 'Northstar Energy', valueAnnual: 4200000, category: 'Front of shirt', endDate: '2028-06-30' },
    { name: 'Foundry Bank', valueAnnual: 1800000, category: 'Official partner', endDate: '2027-06-30' },
    { name: 'Kestrel Sports', valueAnnual: 800000, category: 'Kit supplier', endDate: '2029-06-30' },
  ],
  facilities: { trainingLevel: 4, youthLevel: 3, maxLevel: 5 },
  staff: [
    { id: 'staff-manager', name: 'Alex Morgan', role: 'Manager', nationality: 'English', age: 38, profileId: 'alex-morgan' },
    { id: 'staff-assistant', name: 'Priya Shah', role: 'Assistant Manager', nationality: 'English', age: 44, profileId: 'priya-shah' },
    { id: 'staff-coach-1', name: 'Martin Keane', role: 'First Team Coach', nationality: 'Irish', age: 51, profileId: 'martin-keane' },
    { id: 'staff-coach-2', name: 'Luis Ortega', role: 'Technical Coach', nationality: 'Spanish', age: 39, profileId: 'luis-ortega' },
    { id: 'staff-scout', name: 'Diana Okoye', role: 'Chief Scout', nationality: 'Nigerian', age: 42, profileId: 'diana-okoye' },
    { id: 'staff-physio', name: 'Owen Ellis', role: 'Head Physio', nationality: 'Welsh', age: 36, profileId: 'owen-ellis' },
  ],
  history: {
    achievements: [
      { season: '2025/26', title: 'North Country Premier Champions', detail: 'First league title in 38 years' },
      { season: '2023/24', title: 'North Cup Winners', detail: 'Won the final 2-1 at Foundry Park' },
      { season: '2018/19', title: 'Promotion', detail: 'Promoted as second-division runners-up' },
    ],
    records: [
      { title: 'Most appearances', record: '412 appearances', holder: 'Arthur Bell' },
      { title: 'Most goals', record: '186 goals', holder: 'Eddie Shaw' },
      { title: 'Biggest win', record: '8-0 vs Millbrook', holder: 'League Cup · 1974' },
    ],
    pastSeasonPositions: [
      { season: '2025/26', competition: 'North Country Premier', position: 1, teamCount: 20 },
      { season: '2024/25', competition: 'North Country Premier', position: 6, teamCount: 20 },
      { season: '2023/24', competition: 'North Country Premier', position: 9, teamCount: 20 },
      { season: '2022/23', competition: 'North Country Premier', position: 12, teamCount: 20 },
    ],
  },
  formation: '4-2-3-1',
  leagueId: 'north-country-premier',
  nextMatchId: 'match-01',
  squad,
}

export const league: League = {
  id: 'north-country-premier',
  name: 'North Country Premier',
  country: 'England',
  season: '2026/27',
  matchday: 12,
  totalMatchdays: 38,
  standings: [
    { position: 1, clubId: 'westhaven', clubName: 'Westhaven Athletic', played: 11, won: 8, drawn: 2, lost: 1, goalsFor: 24, goalsAgainst: 10, goalDifference: 14, points: 26, form: ['W', 'W', 'D', 'W', 'W'] },
    { position: 2, clubId: club.id, clubName: club.name, played: 11, won: 7, drawn: 3, lost: 1, goalsFor: 21, goalsAgainst: 10, goalDifference: 11, points: 24, form: ['W', 'D', 'W', 'W', 'D'] },
    { position: 3, clubId: 'redmere', clubName: 'Redmere City', played: 11, won: 7, drawn: 1, lost: 3, goalsFor: 20, goalsAgainst: 13, goalDifference: 7, points: 22, form: ['L', 'W', 'W', 'D', 'W'] },
    { position: 4, clubId: 'oldcastle', clubName: 'Oldcastle Rovers', played: 11, won: 6, drawn: 3, lost: 2, goalsFor: 18, goalsAgainst: 12, goalDifference: 6, points: 21, form: ['D', 'W', 'W', 'L', 'W'] },
    { position: 5, clubId: 'seaborne', clubName: 'Seaborne FC', played: 11, won: 6, drawn: 2, lost: 3, goalsFor: 19, goalsAgainst: 15, goalDifference: 4, points: 20, form: ['W', 'L', 'W', 'D', 'W'] },
  ],
}

export const managerProfiles: ManagerProfile[] = [
  {
    id: 'alex-morgan', name: 'Alex Morgan', age: 38, nationality: 'English', languages: [{ name: 'English', proficiency: 'Native' }],
    attributes: { tacticalKnowledge: 16, manManagement: 15, discipline: 14 }, personality: 'Progressive Builder', preferredFormation: '4-3-3',
    tacticalDNA: [{ label: 'Passing', value: 'Short and patient' }, { label: 'Pressing', value: 'High intensity' }, { label: 'Tempo', value: 'Quick transitions' }],
    trophies: [{ season: '2025/26', title: 'North Country Premier', clubName: 'Northbridge FC' }],
    awards: [{ season: '2025/26', title: 'Manager of the Season', detail: 'Led Northbridge to the league title' }],
    seasonRecords: [
      { season: '2026/27', clubName: 'Northbridge FC', wins: 7, draws: 3, losses: 1 },
      { season: '2025/26', clubName: 'Northbridge FC', wins: 25, draws: 8, losses: 5 },
      { season: '2024/25', clubName: 'Northbridge FC', wins: 18, draws: 9, losses: 11 },
    ],
  },
  ...([
    ['priya-shah', 'Priya Shah', 44, 'English', '4-2-3-1', 'Collaborative Mentor'],
    ['martin-keane', 'Martin Keane', 51, 'Irish', '4-4-2', 'Calm Organizer'],
    ['luis-ortega', 'Luis Ortega', 39, 'Spanish', '4-3-3', 'Technical Innovator'],
    ['diana-okoye', 'Diana Okoye', 42, 'Nigerian', '4-2-3-1', 'Analytical Scout'],
    ['owen-ellis', 'Owen Ellis', 36, 'Welsh', '4-3-3', 'Player Advocate'],
    ['thomas-ivers', 'Thomas Ivers', 47, 'English', '4-3-3', 'Front-Foot Leader'],
    ['daniel-ferreira', 'Daniel Ferreira', 43, 'Portuguese', '4-2-3-1', 'Tactical Pragmatist'],
  ] as const).map(([id, name, age, nationality, formation, personality]) => ({
    id, name, age: Number(age), nationality, languages: [{ name: nationality === 'Spanish' ? 'Spanish' : 'English', proficiency: 'Native' as const }],
    attributes: { tacticalKnowledge: 13, manManagement: 14, discipline: 13 }, personality, preferredFormation: formation,
    tacticalDNA: [{ label: 'Passing', value: 'Balanced' }, { label: 'Pressing', value: 'Mid block' }, { label: 'Tempo', value: 'Measured' }],
    trophies: [], awards: [], seasonRecords: [{ season: '2026/27', clubName: nationality === 'Portuguese' ? 'Redmere City' : 'Westhaven Athletic', wins: 7, draws: 2, losses: 2 }],
  })),
]

export const refereeProfiles: RefereeProfile[] = [
  { id: 'martin-ellery', name: 'Martin Ellery', age: 46, nationality: 'English', countryCode: 'ENG', languages: [{ name: 'English', proficiency: 'Native' }], strictness: 'Balanced', yellowCardsPerMatch: 3.8, redCardsPerMatch: 0.16, foulThreshold: 13 },
  { id: 'stephen-marsh', name: 'Stephen Marsh', age: 41, nationality: 'Welsh', countryCode: 'WAL', languages: [{ name: 'English', proficiency: 'Native' }, { name: 'Welsh', proficiency: 'Fluent' }], strictness: 'Strict', yellowCardsPerMatch: 4.6, redCardsPerMatch: 0.24, foulThreshold: 11 },
]

const defaultLeagueRules = ['Three points for a win, one for a draw.', 'Bottom three clubs are relegated at season end.', 'Maximum of five substitutions across three stoppages.', 'Squads must register no more than 25 senior players.']

function createCompetition(id: string, name: string, country: string, category: LeagueCategory, format: 'League' | 'Cup'): LeagueCompetition {
  const standings = league.standings.map((standing, index) => ({
    ...standing,
    clubName: index === 1 ? club.name : category === 'Domestic Leagues' && country === 'England' ? standing.clubName : `${['Westhaven', 'Northbridge', 'Redmere', 'Oldcastle', 'Seaborne'][index]} ${country === 'Nigeria' ? 'United' : country === 'Spain' ? 'CF' : 'FC'}`,
  }))
  const additionalClubNames = [
    'Kingsbridge Athletic', 'Northport County', 'Harrowgate FC', 'Lakeside Rovers', 'Stonefield Town',
    'Riverside Albion', 'Dunmore City', 'Ashcombe United', 'Portwell FC', 'Briarwood Town',
    'Eastmoor Athletic', 'Cedar Vale FC', 'Millbrook Rovers', 'Southgate County', 'Westcliff Town',
  ]
  const fullStandings: LeagueStanding[] = [...standings, ...additionalClubNames.map((baseName, index) => {
    const points = 18 - index
    const won = Math.floor(points / 3)
    const drawn = points % 3
    const goalsFor = 18 - Math.floor(index / 2)
    const goalDifference = 2 - index
    const goalsAgainst = goalsFor - goalDifference
    const suffix = country === 'Nigeria' ? 'United' : country === 'Spain' ? 'CF' : 'FC'
    return {
      position: index + 6,
      clubId: `${id}-club-${index + 6}`,
      clubName: `${baseName.replace(/ (Athletic|County|FC|Rovers|Town|City|Albion|United)$/, '')} ${suffix}`,
      played: 11,
      won,
      drawn,
      lost: 11 - won - drawn,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
      form: (index % 3 === 0 ? ['W', 'D', 'L', 'W', 'L'] : ['D', 'L', 'W', 'L', 'D']) as ('W' | 'D' | 'L')[],
    }
  })]
  const playerStats = {
    goals: club.squad.map((player) => ({ playerId: player.id, name: player.name, clubName: club.name, value: player.careerTotals.goals })).sort((first, second) => second.value - first.value).slice(0, 5),
    assists: club.squad.map((player) => ({ playerId: player.id, name: player.name, clubName: club.name, value: player.careerTotals.assists })).sort((first, second) => second.value - first.value).slice(0, 5),
    cleanSheets: club.squad.filter((player) => player.position === 'GK').map((player) => ({ playerId: player.id, name: player.name, clubName: club.name, value: player.careerTotals.cleanSheets })),
  }
  return {
    id, name, country, category, season: '2026/27', matchday: format === 'Cup' ? 4 : 12, totalMatchdays: format === 'Cup' ? 8 : 38,
    standings: fullStandings, playerStats,
    teamStats: fullStandings.slice(0, 5).map((standing, index) => ({ clubId: standing.clubId, clubName: standing.clubName, possession: 58 - index * 3, goals: standing.goalsFor, cleanSheets: 5 - Math.floor(index / 2), cards: 12 + index * 2 })),
    rules: format === 'Cup' ? ['Single-match knockout rounds until the semi-final.', 'Extra time and penalties if scores are level.', 'Five substitutions are permitted.', 'The winner qualifies for next season’s continental competition.'] : defaultLeagueRules,
    history: [
      { season: '2025/26', champion: standings[0].clubName, runnerUp: standings[1].clubName, points: 82 },
      { season: '2024/25', champion: standings[2].clubName, runnerUp: standings[0].clubName, points: 78 },
      { season: '2023/24', champion: standings[1].clubName, runnerUp: standings[3].clubName, points: 75 },
    ],
  }
}

export const leagueCompetitions: LeagueCompetition[] = [
  createCompetition(league.id, league.name, 'England', 'Domestic Leagues', 'League'),
  createCompetition('eng-championship', 'Championship', 'England', 'Domestic Leagues', 'League'),
  createCompetition('eng-fa-cup', 'FA Cup', 'England', 'Domestic Leagues', 'Cup'),
  createCompetition('nga-premier', 'Premier League', 'Nigeria', 'Domestic Leagues', 'League'),
  createCompetition('nga-championship', 'Championship', 'Nigeria', 'Domestic Leagues', 'League'),
  createCompetition('nga-federation-cup', 'Federation Cup', 'Nigeria', 'Domestic Leagues', 'Cup'),
  createCompetition('esp-primera', 'Primera División', 'Spain', 'Domestic Leagues', 'League'),
  createCompetition('esp-segunda', 'Segunda División', 'Spain', 'Domestic Leagues', 'League'),
  createCompetition('esp-copa', 'Copa Nacional', 'Spain', 'Domestic Leagues', 'Cup'),
  createCompetition('por-primeira', 'Primeira Liga', 'Portugal', 'Domestic Leagues', 'League'),
  createCompetition('por-taca', 'Taça Nacional', 'Portugal', 'Domestic Leagues', 'Cup'),
  createCompetition('sco-premiership', 'Premiership', 'Scotland', 'Domestic Leagues', 'League'),
  createCompetition('sco-championship', 'Championship', 'Scotland', 'Domestic Leagues', 'League'),
  createCompetition('sco-cup', 'Scottish Cup', 'Scotland', 'Domestic Leagues', 'Cup'),
  createCompetition('irl-premier', 'Premier Division', 'Ireland', 'Domestic Leagues', 'League'),
  createCompetition('irl-cup', 'FAI Cup', 'Ireland', 'Domestic Leagues', 'Cup'),
  createCompetition('wal-premier', 'Cymru Premier', 'Wales', 'Domestic Leagues', 'League'),
  createCompetition('gha-premier', 'Premier League', 'Ghana', 'Domestic Leagues', 'League'),
  createCompetition('ang-girabola', 'Girabola', 'Angola', 'Domestic Leagues', 'League'),
  createCompetition('continental-champions', 'Champions Cup', 'Europe', 'Continental Competitions', 'League'),
  createCompetition('continental-league', 'Continental League', 'Europe', 'Continental Competitions', 'League'),
  createCompetition('continental-africa', 'African Champions League', 'Africa', 'Continental Competitions', 'League'),
  createCompetition('international-world', 'World Cup', 'International', 'International', 'Cup'),
  createCompetition('international-euro', 'European Nations Cup', 'Europe', 'International', 'Cup'),
  createCompetition('international-afcon', 'African Nations Cup', 'Africa', 'International', 'Cup'),
]

export const transferMarketPlayers: Player[] = [
  ...club.squad,
  {
    ...club.squad[8], id: 'market-01', name: 'Victor Nwankwo', shirtNumber: 19, age: 23, position: 'ST (C)', overall: 79, value: 12600000,
    personalInfo: { ...club.squad[8].personalInfo, nationalities: [{ country: 'Nigeria', code: 'NGA', type: 'Primary' }, { country: 'Angola', code: 'ANG', type: 'Secondary' }] },
    contract: { ...club.squad[8].contract, clubId: 'redmere', releaseClause: 18000000 },
  },
  {
    ...club.squad[3], id: 'market-02', name: 'Mateo Alvarez', shirtNumber: 5, age: 26, position: 'D (C)', overall: 80, value: 14800000,
    personalInfo: { ...club.squad[3].personalInfo, nationalities: [{ country: 'Spain', code: 'ESP', type: 'Primary' }, { country: 'England', code: 'ENG', type: 'Secondary' }] },
    contract: { ...club.squad[3].contract, clubId: 'oldcastle', releaseClause: 22000000 },
  },
]

const northbridgeStartingXI: MatchLineupPlayer[] = [
  { id: 'nbr-1', playerId: 'p-01', name: 'Elliot Ward', shirtNumber: 1, position: 'GK', x: 50, y: 91 },
  { id: 'nbr-2', playerId: 'p-02', name: 'Callum Price', shirtNumber: 2, position: 'RB', x: 84, y: 77 },
  { id: 'nbr-3', playerId: 'p-04', name: 'Lewis Grant', shirtNumber: 4, position: 'CB', x: 62, y: 78 },
  { id: 'nbr-4', playerId: 'p-05', name: 'Mateo Silva', shirtNumber: 5, position: 'CB', x: 38, y: 78 },
  { id: 'nbr-5', playerId: 'p-03', name: 'Tariq Mensah', shirtNumber: 3, position: 'LB', x: 16, y: 77 },
  { id: 'nbr-6', playerId: 'p-06', name: 'Noah Bennett', shirtNumber: 6, position: 'DM', x: 50, y: 63 },
  { id: 'nbr-7', playerId: 'p-08', name: 'Rory Campbell', shirtNumber: 8, position: 'CM', x: 36, y: 53 },
  { id: 'nbr-8', playerId: 'p-10', name: 'Finn Gallagher', shirtNumber: 10, position: 'CM', x: 64, y: 53 },
  { id: 'nbr-9', playerId: 'p-07', name: 'Jamie Okafor', shirtNumber: 7, position: 'RW', x: 83, y: 35 },
  { id: 'nbr-10', playerId: 'p-09', name: 'Adrian Costa', shirtNumber: 9, position: 'ST', x: 50, y: 28 },
  { id: 'nbr-11', playerId: 'p-11', name: 'Dylan Hughes', shirtNumber: 11, position: 'LW', x: 17, y: 35 },
]

const westhavenStartingXI: MatchLineupPlayer[] = [
  { id: 'wha-1', name: 'Peter Lang', shirtNumber: 1, position: 'GK', x: 50, y: 9 },
  { id: 'wha-2', name: 'Owen Miles', shirtNumber: 2, position: 'RB', x: 16, y: 23 },
  { id: 'wha-3', name: 'Darius Cole', shirtNumber: 5, position: 'CB', x: 38, y: 22 },
  { id: 'wha-4', name: 'Benji Stone', shirtNumber: 4, position: 'CB', x: 62, y: 22 },
  { id: 'wha-5', name: 'Luis Romero', shirtNumber: 3, position: 'LB', x: 84, y: 23 },
  { id: 'wha-6', name: 'Caleb Frost', shirtNumber: 6, position: 'DM', x: 50, y: 38 },
  { id: 'wha-7', name: 'Marcus Bell', shirtNumber: 8, position: 'CM', x: 35, y: 47 },
  { id: 'wha-8', name: 'Tomas Gray', shirtNumber: 10, position: 'CM', x: 65, y: 47 },
  { id: 'wha-9', name: 'Kai Turner', shirtNumber: 7, position: 'RW', x: 17, y: 65 },
  { id: 'wha-10', name: 'Drew Wallace', shirtNumber: 9, position: 'ST', x: 50, y: 72 },
  { id: 'wha-11', name: 'Isaac Webb', shirtNumber: 11, position: 'LW', x: 83, y: 65 },
]

const northbridgeBench: MatchLineupPlayer[] = [
  { id: 'nbr-sub-12', name: 'Harvey Cole', shirtNumber: 12, position: 'GK', x: 0, y: 0 },
  { id: 'nbr-sub-14', name: 'Ben Turner', shirtNumber: 14, position: 'DEF', x: 0, y: 0 },
  { id: 'nbr-sub-16', name: 'Isaac Doyle', shirtNumber: 16, position: 'MID', x: 0, y: 0 },
  { id: 'nbr-sub-18', name: 'Theo Martin', shirtNumber: 18, position: 'MID', x: 0, y: 0 },
  { id: 'nbr-sub-20', name: 'Rafael Costa', shirtNumber: 20, position: 'FWD', x: 0, y: 0 },
]

const westhavenBench: MatchLineupPlayer[] = [
  { id: 'wha-sub-12', name: 'Sam Riley', shirtNumber: 12, position: 'GK', x: 0, y: 0 },
  { id: 'wha-sub-14', name: 'Milo Evans', shirtNumber: 14, position: 'DEF', x: 0, y: 0 },
  { id: 'wha-sub-16', name: 'George Nwosu', shirtNumber: 16, position: 'MID', x: 0, y: 0 },
  { id: 'wha-sub-18', name: 'Leo Finch', shirtNumber: 18, position: 'MID', x: 0, y: 0 },
  { id: 'wha-sub-20', name: 'Alfie Brooks', shirtNumber: 20, position: 'FWD', x: 0, y: 0 },
]

const recentMeetings = [
  { date: '2026-03-14', homeClubName: 'Northbridge FC', awayClubName: 'Westhaven Athletic', homeScore: 2, awayScore: 1 },
  { date: '2025-11-02', homeClubName: 'Westhaven Athletic', awayClubName: 'Northbridge FC', homeScore: 1, awayScore: 1 },
  { date: '2025-04-19', homeClubName: 'Northbridge FC', awayClubName: 'Westhaven Athletic', homeScore: 0, awayScore: 2 },
  { date: '2024-12-07', homeClubName: 'Westhaven Athletic', awayClubName: 'Northbridge FC', homeScore: 0, awayScore: 1 },
]

export const nextMatch: MatchInfo = {
  id: 'match-01',
  competition: league.name,
  matchday: 12,
  date: '2026-10-17',
  kickOff: '15:00',
  homeClubId: club.id,
  homeClubName: club.name,
  awayClubId: 'westhaven',
  awayClubName: 'Westhaven Athletic',
  venue: club.stadium.name,
  referee: 'Martin Ellery',
  weather: 'Cloudy, 14°C',
  status: 'Upcoming',
  formation: { home: club.formation, away: '4-3-3' },
  coaches: { home: club.manager.name, away: 'Thomas Ivers' },
  keyPlayers: { home: 'Adrian Costa', away: 'Marcus Bell' },
  lastFiveForm: { home: ['W', 'D', 'W', 'W', 'D'], away: ['W', 'W', 'D', 'W', 'W'] },
  headToHead: { homeWins: 8, draws: 6, awayWins: 6, recentMeetings },
  lineups: {
    home: { formation: '4-3-3', coach: club.manager.name, startingXI: northbridgeStartingXI, substitutes: northbridgeBench },
    away: { formation: '4-3-3', coach: 'Thomas Ivers', startingXI: westhavenStartingXI, substitutes: westhavenBench },
  },
  commentary: [],
  stats: undefined,
}

export const recentMatch: MatchInfo = {
  id: 'match-previous',
  competition: league.name,
  matchday: 11,
  date: '2026-10-10',
  kickOff: '15:00',
  homeClubId: club.id,
  homeClubName: club.name,
  awayClubId: 'redmere',
  awayClubName: 'Redmere City',
  venue: club.stadium.name,
  referee: 'Stephen Marsh',
  weather: 'Light rain, 12°C',
  status: 'Completed',
  score: { home: 2, away: 1 },
  formation: { home: '4-3-3', away: '4-2-3-1' },
  coaches: { home: club.manager.name, away: 'Daniel Ferreira' },
  keyPlayers: { home: 'Finn Gallagher', away: 'Nico Silva' },
  lastFiveForm: { home: ['W', 'D', 'W', 'W', 'D'], away: ['L', 'W', 'D', 'L', 'W'] },
  headToHead: {
    homeWins: 11,
    draws: 4,
    awayWins: 7,
    recentMeetings: [
      { date: '2026-10-10', homeClubName: club.name, awayClubName: 'Redmere City', homeScore: 2, awayScore: 1 },
      { date: '2026-02-21', homeClubName: 'Redmere City', awayClubName: club.name, homeScore: 0, awayScore: 0 },
      { date: '2025-09-13', homeClubName: club.name, awayClubName: 'Redmere City', homeScore: 1, awayScore: 2 },
      { date: '2025-03-08', homeClubName: 'Redmere City', awayClubName: club.name, homeScore: 1, awayScore: 3 },
    ],
  },
  lineups: {
    home: { formation: '4-3-3', coach: club.manager.name, startingXI: northbridgeStartingXI, substitutes: northbridgeBench },
    away: {
      formation: '4-2-3-1', coach: 'Daniel Ferreira',
      startingXI: [
        { id: 'red-1', name: 'Oscar Knight', shirtNumber: 1, position: 'GK', x: 50, y: 9 },
        { id: 'red-2', name: 'Toby Lane', shirtNumber: 2, position: 'RB', x: 16, y: 23 },
        { id: 'red-3', name: 'Ethan Vale', shirtNumber: 5, position: 'CB', x: 38, y: 22 },
        { id: 'red-4', name: 'Rui Mendes', shirtNumber: 4, position: 'CB', x: 62, y: 22 },
        { id: 'red-5', name: 'Aaron Bell', shirtNumber: 3, position: 'LB', x: 84, y: 23 },
        { id: 'red-6', name: 'Nico Silva', shirtNumber: 6, position: 'DM', x: 38, y: 43 },
        { id: 'red-7', name: 'Jonas Park', shirtNumber: 8, position: 'DM', x: 62, y: 43 },
        { id: 'red-8', name: 'Mason King', shirtNumber: 10, position: 'AM', x: 50, y: 55 },
        { id: 'red-9', name: 'Caleb Ward', shirtNumber: 7, position: 'RW', x: 17, y: 65 },
        { id: 'red-10', name: 'Hugo Alves', shirtNumber: 9, position: 'ST', x: 50, y: 72 },
        { id: 'red-11', name: 'Elliot James', shirtNumber: 11, position: 'LW', x: 83, y: 65 },
      ],
      substitutes: westhavenBench,
    },
  },
  commentary: [
    { minute: 90, team: 'home', type: 'Foul', player: 'Lewis Grant', detail: 'Wins the final aerial duel as the referee blows for full time.' },
    { minute: 86, team: 'away', type: 'Red Card', player: 'Rui Mendes', detail: 'Sent off for a second bookable offence after stopping a counter.' },
    { minute: 84, team: 'home', type: 'Substitution', player: 'Rafael Costa', detail: 'Replaces Adrian Costa for the closing minutes.' },
    { minute: 78, team: 'away', type: 'Save', player: 'Elliot Ward', detail: 'Gets down quickly to turn Silva’s low drive around the post.' },
    { minute: 71, team: 'away', type: 'Yellow Card', player: 'Nico Silva', detail: 'Booked for a late challenge in midfield.' },
    { minute: 63, team: 'home', type: 'Goal', player: 'Finn Gallagher', detail: 'Finds the bottom corner after a neat exchange with Costa.' },
    { minute: 52, team: 'away', type: 'Goal', player: 'Hugo Alves', detail: 'Levels the score with a header from the six-yard box.' },
    { minute: 38, team: 'home', type: 'Goal', player: 'Adrian Costa', detail: 'Turns home Okafor’s driven cross at the near post.' },
    { minute: 24, team: 'home', type: 'Yellow Card', player: 'Noah Bennett', detail: 'Cautioned for stopping a counter-attack.' },
  ],
  stats: {
    possession: { home: 56, away: 44 },
    shots: { home: 15, away: 9 },
    shotsOnTarget: { home: 7, away: 3 },
    passAccuracy: { home: 86, away: 79 },
    fouls: { home: 11, away: 14 },
  },
}

export const matchFixtures: MatchInfo[] = [recentMatch, nextMatch]