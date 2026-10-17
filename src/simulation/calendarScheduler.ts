import type { Player } from '../types/game'

/**
 * CalendarScheduler: the single source of truth for when matches can be played.
 * Pure and deterministic. A season is 52 Monday-to-Sunday weeks.
 */
export const CALENDAR_START = '2026-07-27'
export const SEASON_WEEKS = 52

export type SlotKind = 'league' | 'continental' | 'club-world-cup'
export type CalendarWeekKind = 'Club Matches' | 'International Window' | 'Summer Window' | 'Off Season'

export interface InternationalWindow {
  id: string
  name: string
  start: string
  end: string
}

export interface CalendarWeek {
  index: number
  start: string
  end: string
  kind: CalendarWeekKind
  label: string
}

const DAY_MS = 86_400_000
const toTime = (value: string) => Date.parse(`${value}T12:00:00Z`)
export const shiftDate = (value: string, days: number) => new Date(toTime(value) + days * DAY_MS).toISOString().slice(0, 10)
const daysBetween = (from: string, to: string) => Math.round((toTime(to) - toTime(from)) / DAY_MS)

export const SEASON_DAYS = SEASON_WEEKS * 7

/** Week indexes (0-51) of every season that are FIFA international windows: October, November and March. */
const WINDOW_WEEKS = [10, 15, 34] as const
const WINDOW_NAMES = ['October International Window', 'November International Window', 'March International Window']

export const seasonStart = (season: number) => shiftDate(CALENDAR_START, season * SEASON_DAYS)
export const weekStart = (index: number, season = 0) => shiftDate(seasonStart(season), index * 7)

/** Season (0-based) that `date` falls in; dates before the calendar belong to season 0. */
export const seasonOfDate = (date: string) => Math.max(0, Math.floor(daysBetween(CALENDAR_START, date) / SEASON_DAYS))

/** Week index (0-51) within its season, or -1 before the calendar starts. */
export function getCalendarWeek(date: string): number {
  const days = daysBetween(CALENDAR_START, date)
  return days < 0 ? -1 : Math.floor((days % SEASON_DAYS) / 7)
}

export function internationalWindows(season: number): InternationalWindow[] {
  return WINDOW_WEEKS.map((week, index) => ({ id: `s${season}-intl-${index}`, name: WINDOW_NAMES[index], start: weekStart(week, season), end: shiftDate(weekStart(week, season), 6) }))
}

export function getInternationalWindow(date: string): InternationalWindow | undefined {
  const week = getCalendarWeek(date)
  const index = WINDOW_WEEKS.findIndex((value) => value === week)
  return index === -1 ? undefined : internationalWindows(seasonOfDate(date))[index]
}

export const isInternationalWindow = (date: string) => getInternationalWindow(date) !== undefined

/** Week index the Club World Cup begins in; the summer window runs for three weeks from here. */
const SUMMER_WINDOW_WEEK = 45

/** Weeks in which club football (league and continental) may be played, in order. */
export const clubWeeks: readonly number[] = Array.from({ length: SUMMER_WINDOW_WEEK }, (_, index) => index).filter((index) => !(WINDOW_WEEKS as readonly number[]).includes(index))

export function buildSeasonCalendar(season = 0): CalendarWeek[] {
  return Array.from({ length: SEASON_WEEKS }, (_, index) => {
    const start = weekStart(index, season)
    const window = getInternationalWindow(start)
    const kind: CalendarWeekKind = window ? 'International Window' : index < SUMMER_WINDOW_WEEK ? 'Club Matches' : index < SUMMER_WINDOW_WEEK + 3 ? 'Summer Window' : 'Off Season'
    return { index, start, end: shiftDate(start, 6), kind, label: window?.name ?? kind }
  })
}

const dayOffsets = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 } as const
export type Weekday = keyof typeof dayOffsets

const dateInWeek = (week: number, day: Weekday, season: number) => shiftDate(weekStart(week, season), dayOffsets[day])

/** Domestic league matchday dates: Saturdays, with a Sunday alternative for staggered fixtures. */
export function leagueMatchDate(matchday: number, sunday = false, season = 0): string {
  const week = clubWeeks[matchday - 1]
  if (week === undefined) throw new Error(`The calendar has no room for league matchday ${matchday}.`)
  return dateInWeek(week, sunday ? 'Sunday' : 'Saturday', season)
}

/** Positions in `clubWeeks` that continental rounds occupy; the final round always uses the last. */
const CONTINENTAL_ROUND_POSITIONS = [4, 12, 22, 31, 38]
/** Domestic cup rounds sit in different weeks from continental rounds so no club plays twice in one week. */
const CUP_ROUND_POSITIONS = [8, 18, 28]

function midweekDate(positions: readonly number[], round: number, totalRounds: number, day: Weekday, season: number, label: string) {
  const chosen = positions.slice(-totalRounds)
  const week = chosen.length === totalRounds ? clubWeeks[chosen[round - 1]] : undefined
  if (week === undefined) throw new Error(`${label} round ${round} of ${totalRounds} cannot be scheduled.`)
  return dateInWeek(week, day, season)
}

/** Continental midweek date for `round` (1-based) of a competition that has `totalRounds` rounds. */
export const continentalMatchDate = (round: number, totalRounds: number, day: 'Tuesday' | 'Wednesday', season = 0) =>
  midweekDate(CONTINENTAL_ROUND_POSITIONS, round, totalRounds, day, season, 'Continental')

export const domesticCupMatchDate = (round: number, totalRounds: number, season = 0) =>
  midweekDate(CUP_ROUND_POSITIONS, round, totalRounds, 'Wednesday', season, 'Cup')

/** The Club World Cup is played in the summer window: quarter-finals, semi-finals, then the final. */
export function clubWorldCupMatchDate(round: number, totalRounds: number, season = 0): string {
  const week = SUMMER_WINDOW_WEEK + (3 - totalRounds) + round - 1
  return dateInWeek(week, round === totalRounds ? 'Saturday' : 'Wednesday', season)
}

const allowedDays: Record<SlotKind, readonly number[]> = {
  league: [6, 0],
  continental: [2, 3],
  'club-world-cup': [3, 6],
}

export interface ScheduledSlot {
  id: string
  date: string
  kind: SlotKind
}

/** Returns a description of every slot that breaks the calendar rules; empty means the schedule is valid. */
export function validateSchedule(slots: readonly ScheduledSlot[]): string[] {
  const problems: string[] = []
  for (const slot of slots) {
    const window = getInternationalWindow(slot.date)
    if (window) problems.push(`${slot.id} (${slot.date}) falls inside the ${window.name}.`)
    if (getCalendarWeek(slot.date) === -1) problems.push(`${slot.id} (${slot.date}) is before the calendar starts.`)
    if (!allowedDays[slot.kind].includes(new Date(`${slot.date}T12:00:00Z`).getUTCDay())) problems.push(`${slot.id} (${slot.date}) is on the wrong weekday for a ${slot.kind} match.`)
  }
  return problems
}
const callUpScore = (player: Player) => player.overall * 0.7 + player.attributes.stamina * 0.3
const MIN_CALL_UP_SCORE = 60

/** Players called up by their national teams: the squad's strongest high-stamina players, only inside an international window. */
export function getInternationalDutyPlayers(squad: readonly Player[], date: string): Player[] {
  if (!isInternationalWindow(date)) return []
  const limit = Math.min(6, Math.ceil(squad.length * 0.2))
  return [...squad]
    .filter((player) => callUpScore(player) >= MIN_CALL_UP_SCORE)
    .sort((a, b) => callUpScore(b) - callUpScore(a) || a.id.localeCompare(b.id))
    .slice(0, limit)
}

export const isOnInternationalDuty = (player: Player, squad: readonly Player[], date: string) =>
  getInternationalDutyPlayers(squad, date).some((member) => member.id === player.id)
