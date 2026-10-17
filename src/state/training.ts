import { useSyncExternalStore } from 'react'
import { club, managerProfiles } from '../data/mockData'
import { trainingGrowthBonus } from './facilities'
import { advanceFamiliarity, createFamiliarityState, isFamiliarityState, type FamiliarityState, type TacticSettings, type TrainingFocus } from './familiarityModel'

export const TRAINING_KEY = 'fmapp-tactical-familiarity-v1'
const TACTICS_KEY = 'fmapp-tactics'

let currentDate = ''
let state: FamiliarityState | null = null
const listeners = new Set<() => void>()

/** Maps the object the Tactics hub saves (or is about to save) onto the settings familiarity is tracked against. */
export function settingsFromRaw(parsed: unknown): TacticSettings | null {
  if (!parsed || typeof parsed !== 'object') return null
  const saved = parsed as Record<string, unknown>
  if (typeof saved.formation !== 'string') return null
  const text = (value: unknown, fallback: string) => typeof value === 'string' ? value : fallback
  const roles = saved.roles && typeof saved.roles === 'object' ? Object.entries(saved.roles as Record<string, unknown>).sort(([a], [b]) => Number(a) - Number(b)).map(([, role]) => String(role)) : []
  const takers = saved.setPieceTakers && typeof saved.setPieceTakers === 'object' ? Object.entries(saved.setPieceTakers as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, id]) => `${key}=${String(id)}`) : []
  return {
    formation: saved.formation,
    tacticalDNA: text(saved.tacticalDNA, 'Gegenpress'),
    defensiveLine: text(saved.defensiveLine, 'Mid Block'),
    pressingIntensity: text(saved.pressingIntensity, 'Standard'),
    matchTempo: text(saved.matchTempo, 'Balanced'),
    roles,
    setPieceTakers: takers,
  }
}

export function readSavedSettings(): TacticSettings | null {
  try {
    return settingsFromRaw(JSON.parse(window.localStorage.getItem(TACTICS_KEY) ?? 'null'))
  } catch {
    return null
  }
}

function load(date: string): FamiliarityState {
  try {
    const saved = window.localStorage.getItem(TRAINING_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (isFamiliarityState(parsed)) return parsed
    }
  } catch {
    // A corrupt save falls back to a fresh start below.
  }
  return createFamiliarityState(date, null)
}

function apply(next: FamiliarityState) {
  state = next
  try {
    window.localStorage.setItem(TRAINING_KEY, JSON.stringify(next))
  } catch {
    // Familiarity still works for this session when storage is full.
  }
  listeners.forEach((listener) => listener())
}

/** Combined effect of the training ground, data analysis and the coaching staff on how fast tactics are learned. */
export function growthBonus() {
  const coaches = club.staff.filter((member) => /coach|assistant/i.test(member.role))
  const knowledge = coaches.map((member) => managerProfiles.find((profile) => profile.id === member.profileId)?.attributes.tacticalKnowledge ?? 10)
  const average = knowledge.length ? knowledge.reduce((total, value) => total + value, 0) / knowledge.length : 10
  return trainingGrowthBonus(club.facilities) * (1 + average / 20 * 0.2)
}

export const coachingQuality = () => Math.round(growthBonus() / trainingGrowthBonus(club.facilities) * 100 - 100)

/** Called whenever the game date moves, with the number of the user's matches played in that step. */
export function syncTraining(date: string, userMatches = 0) {
  currentDate = date
  state ??= load(date)
  const next = advanceFamiliarity(state, date, readSavedSettings() ?? { formation: '', tacticalDNA: '', defensiveLine: '', pressingIntensity: '', matchTempo: '', roles: [], setPieceTakers: [] }, growthBonus(), userMatches)
  if (next !== state) apply(next)
}

/** The hub reports the tactic in use; the first report seeds the squad's opening familiarity. */
export function adoptSettings(settings: TacticSettings) {
  const current = state ?? load(currentDate)
  if (current.seeded) return
  apply({ ...createFamiliarityState(currentDate || current.lastDate, settings), focus: current.focus })
}

export function setTrainingFocus(focus: TrainingFocus) {
  state ??= load(currentDate)
  apply({ ...state, focus })
}

export function useTraining(): FamiliarityState {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, () => {
    state ??= load(currentDate)
    return state
  })
}
