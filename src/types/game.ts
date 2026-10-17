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
  nationalities: { country: string; code: string; type: 'Primary' | 'Secondary' }[]
  languages: { name: string; proficiency: 'Basic' | 'Conversational' | 'Fluent' | 'Native' }[]
  preferredFoot: 'Left' | 'Right' | 'Both'
  heightCm: number
  hobbies: string[]
  teamOpinion: number
  personality: string
  characterTrait: string
  nationalTeamRepresentation?: { country: string; code: string }
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
  injuryUntil?: string
  form: number
  morale: 'Very Good' | 'Good' | 'Okay' | 'Poor'
  moodBadges?: string[]
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
  prestige: number
  manager: { name: string; nationality: string; age: number; reputation: number }
  stadium: { name: string; capacity: number; attendance: number }
  finances: { transferBudget: number; wageBudget: number; weeklyWages: number; balance: number; sponsorshipIncomeAnnual: number; ticketSalesPerHomeMatch: number; operationsPerMonth: number }
  sponsors: { name: string; valueAnnual: number; category: string; endDate: string }[]
  facilities: { trainingLevel: number; youthLevel: number; stadiumLevel: number; medicalLevel: number; analysisLevel: number; scoutingLevel: number; maxLevel: number }
  staff: { id: string; name: string; role: string; nationality: string; age: number; profileId: string }[]
  history: {
    achievements: { season: string; title: string; detail: string }[]
    records: { title: string; record: string; holder: string }[]
    pastSeasonPositions: { season: string; competition: string; position: number; teamCount: number }[]
  }
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

export type LeagueCategory = 'Domestic Leagues' | 'Continental Competitions' | 'International'

export interface LeagueCompetition {
  id: string
  name: string
  country: string
  category: LeagueCategory
  season: string
  matchday: number
  totalMatchdays: number
  standings: LeagueStanding[]
  playerStats: {
    goals: { playerId: string; name: string; clubName: string; value: number; apps: number }[]
    assists: { playerId: string; name: string; clubName: string; value: number; apps: number }[]
    cleanSheets: { playerId: string; name: string; clubName: string; value: number; apps: number }[]
    cards: { playerId: string; name: string; clubName: string; value: number; apps: number; yellow: number; red: number }[]
    rating: { playerId: string; name: string; clubName: string; value: number; apps: number }[]
  }
  teamStats: { clubId: string; clubName: string; possession: number; goals: number; cleanSheets: number; cards: number }[]
  rules: string[]
  history: { season: string; champion: string; runnerUp: string; points: number }[]
}

export interface ProceduralClubBadge {
  viewBox: string
  shape: 'shield'
  initials: string
  primaryColor: string
  secondaryColor: string
}

export interface GlobalLeagueTeam {
  id: string
  name: string
  founded: number
  colors: { primary: string; secondary: string }
  badge: ProceduralClubBadge
  standing: LeagueStanding
}

export interface GlobalCountryLeague {
  id: string
  name: string
  countryCode: string
  countryName: string
  flagCode: string
  season: string
  teams: GlobalLeagueTeam[]
}

export interface GlobalLeaguesDatabase {
  metadata: { countryCount: number; clubsPerCountry: number; teamCount: number }
  countries: GlobalCountryLeague[]
}

export interface TournamentGroup {
  name: string
  countryCodes: string[]
}

export interface TournamentStage {
  id: string
  name: string
  format: 'groups' | 'knockout'
  groups?: TournamentGroup[]
  rounds?: string[]
  advancement?: string
}

export interface InternationalTournament {
  id: string
  name: string
  category: 'Continental Competitions' | 'International'
  region: string
  season: string
  hostCountryCodes: string[]
  eligibleCountryCodes: string[]
  qualifiedCountryCodes?: string[]
  stages: TournamentStage[]
  rules: string[]
  history: { season: string; champion: string; runnerUp: string }[]
}

export interface WorldCountry {
  code: string
  name: string
  flagCode: string
  confederation: string
}

export interface WorldCountriesDatabase {
  countryCount: number
  confederations: string[]
  countries: WorldCountry[]
}

export interface InternationalTournamentsDatabase {
  metadata: { version: string; description: string }
  tournaments: InternationalTournament[]
}

export interface ManagerProfile {
  id: string
  name: string
  age: number
  nationality: string
  languages: { name: string; proficiency: 'Basic' | 'Conversational' | 'Fluent' | 'Native' }[]
  attributes: { tacticalKnowledge: number; manManagement: number; discipline: number }
  personality: string
  preferredFormation: string
  tacticalDNA: { label: string; value: string }[]
  trophies: { season: string; title: string; clubName: string }[]
  awards: { season: string; title: string; detail: string }[]
  seasonRecords: { season: string; clubName: string; wins: number; draws: number; losses: number }[]
}

export interface RefereeProfile {
  id: string
  name: string
  age: number
  nationality: string
  countryCode: string
  languages: { name: string; proficiency: 'Basic' | 'Conversational' | 'Fluent' | 'Native' }[]
  strictness: 'Lenient' | 'Balanced' | 'Strict'
  yellowCardsPerMatch: number
  redCardsPerMatch: number
  foulThreshold: number
}

export type PersonnelProfile =
  | { type: 'Manager'; profile: ManagerProfile }
  | { type: 'Referee'; profile: RefereeProfile }

export type MatchEventType =
  | 'Kick Off' | 'Possession' | 'Pass' | 'Carry' | 'Interception'
  | 'Shot' | 'Goal' | 'Save' | 'Miss' | 'Foul' | 'Tackle' | 'Yellow Card'
  | 'Red Card' | 'Offside' | 'Injury' | 'Substitution' | 'Half Time' | 'Full Time'

export interface MatchEvent {
  id: string
  matchId: string
  sequence: number
  elapsedSeconds: number
  type: MatchEventType
  team: 'home' | 'away'
  playerId: string
  player: string
  targetId?: string
  target?: string
  x: number
  y: number
  outcome: string
  data?: Record<string, number | string | boolean>
}

export interface MatchInfo {
  id: string
  /** ID of the league or cup this match belongs to; the single key used to scope fixtures. */
  leagueId: string
  /** 0-based season the fixture belongs to. */
  season: number
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
  coaches: { home: string; away: string }
  keyPlayers: { home: string; away: string }
  lastFiveForm: { home: ('W' | 'D' | 'L')[]; away: ('W' | 'D' | 'L')[] }
  headToHead: {
    homeWins: number
    draws: number
    awayWins: number
    recentMeetings: { date: string; homeClubName: string; awayClubName: string; homeScore: number; awayScore: number }[]
  }
  lineups: { home: MatchLineup; away: MatchLineup }
  commentary: MatchCommentaryEvent[]
  stats?: MatchStats
  simulationSeed?: number
  eventLog?: MatchEvent[]
}

export interface MatchLineupPlayer {
  id: string
  playerId?: string
  name: string
  shirtNumber: number
  position: string
  x: number
  y: number
}

export interface MatchLineup {
  formation: string
  coach: string
  startingXI: MatchLineupPlayer[]
  substitutes: MatchLineupPlayer[]
}

export interface MatchCommentaryEvent {
  minute: number
  second?: number
  eventId?: string
  team: 'home' | 'away'
  type: MatchEventType
  player: string
  detail: string
  x?: number
  y?: number
}

export interface MatchStats {
  possession: { home: number; away: number }
  shots: { home: number; away: number }
  shotsOnTarget: { home: number; away: number }
  passAccuracy: { home: number; away: number }
  fouls: { home: number; away: number }
}

export interface ClubConfidenceItem {
  percentage: number
  status: 'Critical' | 'Poor' | 'Moderate' | 'Good' | 'Very Good' | 'Exceptional'
  note: string
}

export interface ClubConfidenceData {
  board: ClubConfidenceItem
  fan: ClubConfidenceItem
  manager: ClubConfidenceItem
  player: ClubConfidenceItem
}

export interface SquadHealthMetrics {
  activeInjuries: number
  injuriesNote: string
  suspensions: number
  suspensionsNote: string
  squadMorale: 'Very Good' | 'Good' | 'Okay' | 'Poor'
  moralePercentage: number
  teamChemistry: number
  chemistryNote: string
  averageFitness: number
}

export type DevelopmentPace = 'Slow' | 'Steady' | 'Fast' | 'Explosive'

export interface YouthManager {
  id: string
  name: string
  nationality: string
  nationalityCode: string
  age: number
  philosophy: string
  coachingRating: number
  scoutingNetwork: number
  weeklyWage: number
}

export interface AcademyProspect {
  player: Player
  potentialLow: number
  potentialHigh: number
  pace: DevelopmentPace
  country: string
  countryCode: string
}
