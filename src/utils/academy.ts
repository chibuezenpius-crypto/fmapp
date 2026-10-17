import { useSyncExternalStore } from 'react'
import { createRng, generatePlayer, generatePlayerIdentity } from './proceduralGenerator'
import type { AcademyProspect, DevelopmentPace, Player, PlayerPosition, YouthManager } from '../types/game'

export const ACADEMY_MIN_AGE = 15
export const ACADEMY_MAX_AGE = 18
export const ACADEMY_MAX_SIZE = 20
export const SENIOR_SQUAD_MAX = 30

const philosophies = ['Technical Development', 'Physical Conditioning', 'Tactical Discipline', 'Attacking Flair', 'Character & Leadership', 'Balanced Pathway']
const managerCountries = ['NGA', 'GHA', 'ENG', 'ESP', 'POR', 'FRA', 'NED', 'BRA', 'ARG', 'GER']
const paces: DevelopmentPace[] = ['Slow', 'Steady', 'Fast', 'Explosive']
const scoutCountries = ['NGA', 'GHA', 'CIV', 'SEN', 'CMR', 'BRA', 'ARG', 'ESP', 'FRA', 'ENG', 'POR', 'NED', 'GER', 'COL', 'JPN']

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD'

export const POSITION_GROUPS: Record<PositionGroup, PlayerPosition[]> = {
  GK: ['GK'],
  DEF: ['D (C)', 'D (L)', 'D (R)'],
  MID: ['DM', 'M (C)', 'M (L)', 'M (R)'],
  FWD: ['AM (C)', 'ST (C)'],
}

export const SCOUT_REGIONS = [
  { code: 'NGA', name: 'Nigeria', domestic: true },
  { code: 'GHA', name: 'Ghana', domestic: false },
  { code: 'CIV', name: 'Ivory Coast', domestic: false },
  { code: 'SEN', name: 'Senegal', domestic: false },
  { code: 'CMR', name: 'Cameroon', domestic: false },
  { code: 'BRA', name: 'Brazil', domestic: false },
  { code: 'ARG', name: 'Argentina', domestic: false },
  { code: 'ESP', name: 'Spain', domestic: false },
]
export const MAX_ACTIVE_MISSIONS = 3

export interface ScoutMission {
  id: string
  regionCode: string
  region: string
  domestic: boolean
  groups: PositionGroup[]
  totalDays: number
  daysLeft: number
  target: number
  found: number
}

export interface ScoutReport {
  id: string
  prospect: AcademyProspect
  date: string
  recommendation: 'Highly Recommended' | 'Recommended' | 'Monitor'
}

export interface AcademyState {
  missions: ScoutMission[]
  reports: ScoutReport[]
  missionCount: number
  daysPassed: number
  manager: YouthManager | null
  prospects: AcademyProspect[]
  candidates: YouthManager[]
  nextIntakeYear: number
  intakeCount: number
  promotedCount: number
  releasedCount: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function generateYouthManager(seed: string, countryCode?: string): YouthManager {
  const random = createRng(seed)
  const code = countryCode ?? managerCountries[Math.floor(random() * managerCountries.length)]
  const identity = generatePlayerIdentity({ birthCountryCode: code, random })
  const coachingRating = clamp(Math.round(52 + random() * 40), 1, 100)
  return {
    id: `youth-mgr-${seed}`,
    name: identity.name,
    nationality: identity.birthCountry,
    nationalityCode: identity.birthCountryCode,
    age: 36 + Math.floor(random() * 26),
    philosophy: philosophies[Math.floor(random() * philosophies.length)],
    coachingRating,
    scoutingNetwork: clamp(Math.round(coachingRating - 14 + random() * 28), 1, 100),
    weeklyWage: Math.round((1800 + coachingRating * 55) / 50) * 50,
  }
}

function developmentPace(age: number, gap: number, coaching: number, random: () => number): DevelopmentPace {
  const score = gap / 4 + coaching / 25 + (18 - age) * 0.4 + random() * 2
  return paces[clamp(Math.floor(score / 2.2), 0, 3)]
}

export function generateProspect(seed: string, clubId: string, youthLevel: number, manager: YouthManager | null, position?: PlayerPosition, forcedNationality?: string): AcademyProspect {
  const random = createRng(`${seed}:picks`)
  const scouting = manager?.scoutingNetwork ?? 25
  const coaching = manager?.coachingRating ?? 30
  const foreign = random() < 0.15 + scouting / 200
  const nationality = forcedNationality ?? (foreign ? scoutCountries[Math.floor(random() * scoutCountries.length)] : 'NGA')
  const targetOVR = Math.round(36 + youthLevel * 2.5 + coaching / 18 + random() * 8)
  const generated = generatePlayer({ seed, clubId, nationality, position, ageRange: [ACADEMY_MIN_AGE, ACADEMY_MAX_AGE], targetOVR })
  const potentialBoost = Math.round(youthLevel * 2 + scouting / 14 + random() * 8)
  const potential = clamp(generated.overall + 8 + potentialBoost + (ACADEMY_MAX_AGE - generated.age) * 2, generated.overall, 94)
  const player: Player = { ...generated, potential, value: Math.round(generated.value * 0.6) }
  const fuzz = Math.max(2, Math.round((100 - scouting) / 12))
  const nat = player.personalInfo.nationalities[0]
  return {
    player,
    potentialLow: clamp(potential - fuzz, player.overall, 99),
    potentialHigh: clamp(potential + fuzz, player.overall, 99),
    pace: developmentPace(player.age, potential - player.overall, coaching, random),
    country: nat?.country ?? 'Nigeria',
    countryCode: nat?.code ?? 'NGA',
  }
}

export function generateIntake(clubId: string, year: number, youthLevel: number, manager: YouthManager | null, scoutingBonus = 0): AcademyProspect[] {
  const scouting = manager?.scoutingNetwork ?? 25
  const size = Math.max(3, 4 + Math.floor(youthLevel / 2) + Math.floor(scouting / 40) + scoutingBonus)
  return Array.from({ length: size }, (_, index) => generateProspect(`${clubId}:intake:${year}:${index}`, clubId, youthLevel, manager))
}

const initialManager = generateYouthManager('onitsha-academy')

export function startMission(state: AcademyState, regionCode: string, groups: PositionGroup[]): AcademyState {
  const region = SCOUT_REGIONS.find((item) => item.code === regionCode) ?? SCOUT_REGIONS[0]
  const scouting = state.manager?.scoutingNetwork ?? 25
  const totalDays = region.domestic ? 7 : 14
  const target = (region.domestic ? 6 : 4) + Math.floor(scouting / 25)
  const mission: ScoutMission = { id: `m${state.missionCount + 1}`, regionCode: region.code, region: region.name, domestic: region.domestic, groups, totalDays, daysLeft: totalDays, target, found: 0 }
  return { ...state, missions: [...state.missions, mission], missionCount: state.missionCount + 1 }
}

const recommendationFor = (prospect: AcademyProspect): ScoutReport['recommendation'] =>
  prospect.player.potential >= 80 ? 'Highly Recommended' : prospect.player.potential >= 70 ? 'Recommended' : 'Monitor'

// Advances the academy clock; finished missions turn their finds into reports.
export function advanceDays(state: AcademyState, clubId: string, youthLevel: number, days: number): AcademyState {
  const reports = [...state.reports]
  const missions: ScoutMission[] = []
  state.missions.forEach((mission) => {
    const daysLeft = Math.max(0, mission.daysLeft - days)
    if (daysLeft > 0) {
      missions.push({ ...mission, daysLeft, found: Math.round(mission.target * (mission.totalDays - daysLeft) / mission.totalDays) })
      return
    }
    const positions = mission.groups.flatMap((group) => POSITION_GROUPS[group])
    for (let index = 0; index < mission.target; index += 1) {
      const seed = `${clubId}:${mission.id}:${index}`
      const position = positions[index % positions.length]
      const prospect = generateProspect(seed, clubId, youthLevel, state.manager, position, mission.regionCode)
      reports.unshift({ id: seed, prospect, date: `Day ${state.daysPassed + days}`, recommendation: recommendationFor(prospect) })
    }
  })
  return { ...state, missions, reports: reports.slice(0, 12), daysPassed: state.daysPassed + days }
}

export const createAcademyState = (clubId: string, youthLevel: number): AcademyState => ({
  missions: [],
  reports: [],
  missionCount: 0,
  daysPassed: 0,
  manager: initialManager,
  prospects: Array.from({ length: 8 }, (_, index) => generateProspect(`${clubId}:academy:${index}`, clubId, youthLevel, initialManager)),
  candidates: ['a', 'b', 'c'].map((key) => generateYouthManager(`${clubId}:candidate:${key}`)),
  nextIntakeYear: 2027,
  intakeCount: 0,
  promotedCount: 0,
  releasedCount: 0,
})

let state: AcademyState | null = null
const listeners = new Set<() => void>()

export function useAcademy(clubId: string, youthLevel: number) {
  state ??= createAcademyState(clubId, youthLevel)
  const snapshot = useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => state as AcademyState)
  const update = (next: AcademyState) => { state = next; listeners.forEach((listener) => listener()) }
  return [snapshot, update] as const
}
