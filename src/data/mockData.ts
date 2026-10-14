import type { Club, League, MatchInfo, Player, PlayerAttributes } from '../types/game'

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
  keyPlayers: { home: 'Adrian Costa', away: 'Marcus Bell' },
}