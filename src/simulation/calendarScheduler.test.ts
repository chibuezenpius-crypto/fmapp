import { describe, expect, it } from 'vitest'
import {
  internationalWindows,
  leagueMatchDate,
  validateSchedule,
} from './calendarScheduler'

describe('calendar schedule validation', () => {
  it('accepts separate clubs playing on a valid league date', () => {
    const date = leagueMatchDate(1)
    expect(validateSchedule([
      { id: 'first', date, kind: 'league', clubIds: ['club-a', 'club-b'] },
      { id: 'second', date, kind: 'league', clubIds: ['club-c', 'club-d'] },
    ])).toEqual([])
  })

  it('rejects club double-booking and international-window matches', () => {
    const date = leagueMatchDate(1)
    const internationalDate = internationalWindows(0)[0].start
    const problems = validateSchedule([
      { id: 'first', date, kind: 'league', clubIds: ['club-a', 'club-b'] },
      { id: 'second', date, kind: 'league', clubIds: ['club-a', 'club-c'] },
      { id: 'international', date: internationalDate, kind: 'league', clubIds: ['club-d', 'club-e'] },
    ])

    expect(problems.some((problem) => problem.includes('club-a is double-booked'))).toBe(true)
    expect(problems.some((problem) => problem.includes('falls inside the October International Window'))).toBe(true)
  })
})
