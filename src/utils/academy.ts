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

export interface AcademyState {
  manager: YouthManager | null
  prospects: AcademyProspect[]
  candidates: YouthManager[]
  nextIntakeYear: number
  intakeCount: number
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

export function generateProspect(seed: string, clubId: string, youthLevel: number, manager: YouthManager | null, position?: PlayerPosition): AcademyProspect {
  const random = createRng(`${seed}:picks`)
  const scouting = manager?.scoutingNetwork ?? 25
  const coaching = manager?.coachingRating ?? 30
  const foreign = random() < 0.15 + scouting / 200
  const nationality = foreign ? scoutCountries[Math.floor(random() * scoutCountries.length)] : 'NGA'
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

export function generateIntake(clubId: string, year: number, youthLevel: number, manager: YouthManager | null): AcademyProspect[] {
  const scouting = manager?.scoutingNetwork ?? 25
  const size = 4 + Math.floor(youthLevel / 2) + Math.floor(scouting / 40)
  return Array.from({ length: size }, (_, index) => generateProspect(`${clubId}:intake:${year}:${index}`, clubId, youthLevel, manager))
}

const initialManager = generateYouthManager('onitsha-academy')

export const createAcademyState = (clubId: string, youthLevel: number): AcademyState => ({
  manager: initialManager,
  prospects: Array.from({ length: 8 }, (_, index) => generateProspect(`${clubId}:academy:${index}`, clubId, youthLevel, initialManager)),
  candidates: ['a', 'b', 'c'].map((key) => generateYouthManager(`${clubId}:candidate:${key}`)),
  nextIntakeYear: 2027,
  intakeCount: 0,
})

let state: AcademyState | null = null
const listeners = new Set<() => void>()

export function useAcademy(clubId: string, youthLevel: number) {
  state ??= createAcademyState(clubId, youthLevel)
  const snapshot = useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => state as AcademyState)
  const update = (next: AcademyState) => { state = next; listeners.forEach((listener) => listener()) }
  return [snapshot, update] as const
}
