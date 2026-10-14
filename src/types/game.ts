export type PlayerPosition = 'GK' | 'D (C)' | 'D (L)' | 'D (R)' | 'DM' | 'M (C)' | 'M (L)' | 'M (R)' | 'AM (C)' | 'ST (C)'

export interface PlayerAttributes {
  crossing: number
  dribbling: number
  finishing: number
  firstTouch: number
  heading: number
  longShots: number
  marking: number
  passing: number
  tackling: number
  technique: number
  vision: number
  teamwork: number
  decisions: number
  determination: number
  offTheBall: number
  positioning: number
  leadership: number
  workRate: number
  pace: number
  acceleration: number
  stamina: number
  strength: number
  agility: number
  jumpingReach: number
}

export interface PlayerPersonalInfo {
  dateOfBirth: string
  placeOfBirth: string
  nationalities: string[]
  languages: { name: string; proficiency: 'Basic' | 'Conversational' | 'Fluent' | 'Native' }[]
  preferredFoot: 'Left' | 'Right' | 'Both'
  heightCm: number
  hobbies: string[]
  teamOpinion: number
}

export interface ContractOffer {
  clubName: string
  date: string
  status: 'Accepted' | 'Declined'
  weeklyWage: number
  reason: string
}

export interface InterestedClub {
  clubName: string
  interest: 'Monitoring' | 'Scouting' | 'Offer Made'
  lastContact: string
}

export interface PlayerContract {
  clubId: string
  startDate: string
  endDate: string
  weeklyWage: number
  squadRole: 'Key Player' | 'First Team' | 'Regular Starter' | 'Squad Player' | 'Prospect'
  releaseClause?: number
  sponsor?: { brand: string; annualValue: number; endDate: string }
  interestedClubs: InterestedClub[]
  offerHistory: ContractOffer[]
}

export interface TransferRecord {
  date: string
  fromClub: string
  toClub: string
  fee: number
  type: 'Permanent' | 'Loan' | 'Free Transfer'
}

export interface PlayerSeasonStats {
  season: string
  clubName: string
  appearances: number
  goals: number
  assists: number
  cleanSheets: number
  averageRating: number
}

export interface PlayerCareerTotals {
  appearances: number
  goals: number
  assists: number
  cleanSheets: number
  trophies: number
}

export interface PlayerRelationships {
  manager: number
  teammates: { playerName: string; relationship: number; note: string }[]
  favoritePersonnel: string[]
  dislikedPersonnel: string[]
}

export interface PlayerAchievement {
  season: string
  title: string
  detail: string
}

export interface PlayerAchievements {
  trophies: PlayerAchievement[]
  individualAwards: PlayerAchievement[]
  seasonRecognitions: PlayerAchievement[]
}

export interface Player {
  id: string
  name: string
  shirtNumber: number
  position: PlayerPosition
  age: number
  overall: number
  potential: number
  value: number
  fitness: number
  form: number
  morale: 'Very Good' | 'Good' | 'Okay' | 'Poor'
  attributes: PlayerAttributes
  personalInfo: PlayerPersonalInfo
  contract: PlayerContract
  transferHistory: TransferRecord[]
  seasonStats: PlayerSeasonStats[]
  careerTotals: PlayerCareerTotals
  relationships: PlayerRelationships
  achievements: PlayerAchievements
}

export interface Club {
  id: string
  name: string
  nickname: string
  shortName: string
  founded: number
  colors: { primary: string; secondary: string }
  manager: { name: string; nationality: string; age: number; reputation: number }
  stadium: { name: string; capacity: number; attendance: number }
  finances: { transferBudget: number; wageBudget: number; weeklyWages: number; balance: number }
  formation: string
  leagueId: string
  nextMatchId: string
  squad: Player[]
}

export interface LeagueStanding {
  position: number
  clubId: string
  clubName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: ('W' | 'D' | 'L')[]
}

export interface League {
  id: string
  name: string
  country: string
  season: string
  matchday: number
  totalMatchdays: number
  standings: LeagueStanding[]
}

export interface MatchInfo {
  id: string
  competition: string
  matchday: number
  date: string
  kickOff: string
  homeClubId: string
  homeClubName: string
  awayClubId: string
  awayClubName: string
  venue: string
  referee: string
  weather: string
  status: 'Upcoming' | 'Live' | 'Completed'
  score?: { home: number; away: number }
  formation: { home: string; away: string }
  keyPlayers: { home: string; away: string }
}