export const CATEGORIES = ['Formation', 'Attacking Style', 'Defensive Style', 'Transitions', 'Set Pieces', 'Player Roles'] as const
export type Category = (typeof CATEGORIES)[number]
export type TrainingFocus = 'Balanced' | Category
export type CategoryValues = Record<Category, number>

export interface TacticSettings {
  formation: string
  tacticalDNA: string
  defensiveLine: string
  pressingIntensity: string
  matchTempo: string
  /** Role names in formation-slot order. */
  roles: string[]
  /** Set-piece taker ids in a fixed order. */
  setPieceTakers: string[]
}

export interface FamiliarityState {
  /** How well the squad knows every tactical setting it has ever used, keyed by setting. */
  known: Record<string, number>
  /** Weekly overall snapshots, oldest first (at most 5). */
  trend: number[]
  lastDate: string
  nextSnapshot: string
  focus: TrainingFocus
  /** False until the Tactics hub has reported the tactic the squad actually starts with. */
  seeded: boolean
}

/** A setting the squad has never practised, and the level a new save starts at for its opening tactic. */
export const UNSEEN_FAMILIARITY = 40
export const OPENING_FAMILIARITY = 62
const FLOOR = 25
const DAILY_DECAY = 0.15
const BASE_DAILY_RATE = 0.012
const MATCH_RATE = 0.05
const MAX_CATCH_UP_DAYS = 400

const hash = (parts: string[]) => {
  let value = 7
  for (const char of parts.join('|')) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value.toString(36)
}

export function keysFor(settings: TacticSettings): Record<Category, string> {
  return {
    Formation: `formation:${settings.formation}`,
    'Attacking Style': `attack:${settings.tacticalDNA}`,
    'Defensive Style': `defence:${settings.defensiveLine}:${settings.pressingIntensity}`,
    Transitions: `transitions:${settings.tacticalDNA}:${settings.matchTempo}`,
    'Set Pieces': `setpieces:${hash(settings.setPieceTakers)}`,
    'Player Roles': `roles:${settings.formation}:${hash(settings.roles)}`,
  }
}

const dayMs = 86_400_000
export const shiftIso = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * dayMs).toISOString().slice(0, 10)
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / dayMs)

export const valueFor = (state: FamiliarityState, key: string) => state.known[key] ?? UNSEEN_FAMILIARITY

export function categoryValues(state: FamiliarityState, settings: TacticSettings): CategoryValues {
  const keys = keysFor(settings)
  return Object.fromEntries(CATEGORIES.map((category) => [category, Math.round(valueFor(state, keys[category]))])) as CategoryValues
}

export const overallFamiliarity = (values: CategoryValues) => Math.round(CATEGORIES.reduce((total, category) => total + values[category], 0) / CATEGORIES.length)

export function createFamiliarityState(date: string, settings: TacticSettings | null): FamiliarityState {
  const known = settings ? Object.fromEntries(Object.values(keysFor(settings)).map((key) => [key, OPENING_FAMILIARITY])) : {}
  return { known, trend: [OPENING_FAMILIARITY], lastDate: date, nextSnapshot: shiftIso(date, 7), focus: 'Balanced', seeded: settings !== null }
}

const focusMultiplier = (focus: TrainingFocus, category: Category) => focus === 'Balanced' ? 1.2 : focus === category ? 2.6 : 0.8

/**
 * Moves the squad's tactical knowledge forward to `toDate`. Settings in use are practised
 * (faster with a training focus, better facilities and coaching); everything else slowly fades.
 * `matches` is the number of competitive matches played with the current settings in that period.
 */
export function advanceFamiliarity(state: FamiliarityState, toDate: string, settings: TacticSettings, growthBonus: number, matches = 0): FamiliarityState {
  const days = Math.min(MAX_CATCH_UP_DAYS, daysBetween(state.lastDate, toDate))
  if (!state.seeded) return days > 0 ? { ...state, lastDate: toDate, nextSnapshot: shiftIso(toDate, 7) } : state
  const keys = keysFor(settings)
  const active = new Map<string, Category>(CATEGORIES.map((category) => [keys[category], category]))
  const known = { ...state.known }
  for (const key of active.keys()) known[key] ??= UNSEEN_FAMILIARITY
  let trend = state.trend
  let nextSnapshot = state.nextSnapshot
  const snapshot = () => overallFamiliarity(categoryValues({ ...state, known }, settings))

  for (let day = 1; day <= days; day++) {
    const date = shiftIso(state.lastDate, day)
    for (const key of Object.keys(known)) {
      const category = active.get(key)
      known[key] = category
        ? known[key] + (100 - known[key]) * Math.min(0.2, BASE_DAILY_RATE * growthBonus * focusMultiplier(state.focus, category))
        : Math.max(FLOOR, known[key] - DAILY_DECAY)
    }
    if (date >= nextSnapshot) {
      trend = [...trend, snapshot()].slice(-5)
      nextSnapshot = shiftIso(nextSnapshot, 7)
    }
  }
  if (matches > 0) for (const key of active.keys()) known[key] += (100 - known[key]) * (1 - (1 - MATCH_RATE) ** matches)
  if (days <= 0 && matches <= 0) return state
  return { ...state, known, trend, lastDate: days > 0 ? toDate : state.lastDate, nextSnapshot }
}

/** What the six categories would read after `days` of training at the current focus. */
export const projectFamiliarity = (state: FamiliarityState, settings: TacticSettings, growthBonus: number, days: number): CategoryValues =>
  categoryValues(advanceFamiliarity(state, shiftIso(state.lastDate, days), settings, growthBonus), settings)

export function positionFamiliarity(playerPosition: string, slotPosition: string) {
  if (playerPosition === slotPosition) return 100
  const group = (position: string) => position === 'GK' ? 'GK' : position === 'DM' ? 'MID' : position.startsWith('D') ? 'DEF' : position.startsWith('ST') || position.startsWith('AM') ? 'FWD' : 'MID'
  const playerGroup = group(playerPosition)
  const slotGroup = group(slotPosition)
  if (playerGroup === 'GK' || slotGroup === 'GK') return 10
  if (playerGroup === slotGroup && playerGroup === 'DEF') return 82
  if (playerGroup === slotGroup && playerGroup === 'MID') return 78
  if (playerGroup === slotGroup && playerGroup === 'FWD') return 76
  if (playerGroup === 'DEF' && slotGroup === 'FWD') return 40
  if (playerGroup === 'FWD' && slotGroup === 'DEF') return 35
  if (playerGroup === 'DEF' || slotGroup === 'DEF') return 58
  return 62
}

/** A player is only as comfortable as his position fit and the squad's grasp of the system and his role allow. */
export const playerFamiliarity = (positionFit: number, values: CategoryValues) =>
  Math.round(positionFit * 0.5 + (values['Player Roles'] * 0.6 + values.Formation * 0.4) * 0.5)

export interface ImprovementTip { text: string; impact: 'High' | 'Medium' }

export function improvementTips(values: CategoryValues, averagePositionFit: number, focus: TrainingFocus): ImprovementTip[] {
  const [weakest] = [...CATEGORIES].sort((first, second) => values[first] - values[second])
  const tips: ImprovementTip[] = []
  if (values[weakest] < 85 && focus !== weakest) tips.push({ text: `Set the training focus to ${weakest} (${values[weakest]}%)`, impact: 'High' })
  tips.push({ text: 'Play competitive matches with this tactic', impact: overallFamiliarity(values) < 85 ? 'High' : 'Medium' })
  tips.push({ text: 'Avoid changing formation, style or roles often', impact: 'Medium' })
  if (averagePositionFit < 85) tips.push({ text: 'Pick players in their natural positions', impact: 'Medium' })
  return tips.slice(0, 4)
}

export const familiarityLabel = (value: number) => value >= 85 ? 'Excellent' : value >= 70 ? 'Good' : value >= 50 ? 'Fair' : 'Poor'

export const isFamiliarityState = (value: unknown): value is FamiliarityState => {
  if (!value || typeof value !== 'object') return false
  const state = value as Record<string, unknown>
  return !!state.known && typeof state.known === 'object' && Object.values(state.known as Record<string, unknown>).every((entry) => typeof entry === 'number' && Number.isFinite(entry))
    && Array.isArray(state.trend) && state.trend.every((entry) => typeof entry === 'number')
    && typeof state.lastDate === 'string' && typeof state.nextSnapshot === 'string' && typeof state.seeded === 'boolean'
    && (state.focus === 'Balanced' || (CATEGORIES as readonly unknown[]).includes(state.focus))
}
