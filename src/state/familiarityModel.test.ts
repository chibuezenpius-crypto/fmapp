import { describe, expect, it } from 'vitest'
import { advanceFamiliarity, categoryValues, createFamiliarityState, overallFamiliarity, projectFamiliarity, type TacticSettings } from './familiarityModel'
import { allFacilitiesMaxed, conditionOf, injuryDurationScale } from './facilities'

const settings: TacticSettings = { formation: '4-3-3', tacticalDNA: 'Gegenpress', defensiveLine: 'Mid Block', pressingIntensity: 'Standard', matchTempo: 'Balanced', roles: ['A', 'B'], setPieceTakers: ['x=1'] }
const other: TacticSettings = { ...settings, formation: '4-4-2' }

describe('tactical familiarity', () => {
  it('starts at the opening level and grows with time', () => {
    const start = createFamiliarityState('2026-07-01', settings)
    const later = advanceFamiliarity(start, '2026-07-29', settings, 1.4)
    expect(overallFamiliarity(categoryValues(later, settings))).toBeGreaterThan(overallFamiliarity(categoryValues(start, settings)))
  })

  it('learns faster with better facilities and a matching focus', () => {
    const start = createFamiliarityState('2026-07-01', settings)
    const slow = advanceFamiliarity(start, '2026-07-15', settings, 1)
    const fast = advanceFamiliarity(start, '2026-07-15', settings, 1.6)
    const focused = advanceFamiliarity({ ...start, focus: 'Formation' }, '2026-07-15', settings, 1)
    expect(categoryValues(fast, settings).Formation).toBeGreaterThan(categoryValues(slow, settings).Formation)
    expect(categoryValues(focused, settings).Formation).toBeGreaterThan(categoryValues(slow, settings).Formation)
  })

  it('forgets abandoned settings and starts new ones low', () => {
    const start = createFamiliarityState('2026-07-01', settings)
    const changed = advanceFamiliarity(start, '2026-07-02', other, 1.4)
    expect(categoryValues(changed, other).Formation).toBeLessThan(categoryValues(start, settings).Formation)
    const away = advanceFamiliarity(changed, '2026-08-30', other, 1.4)
    expect(away.known['formation:4-3-3']).toBeLessThan(start.known['formation:4-3-3'])
  })

  it('does nothing before a tactic has been saved and never rewinds', () => {
    const unseeded = createFamiliarityState('2026-07-01', null)
    expect(advanceFamiliarity(unseeded, '2026-07-10', settings, 1.4).known).toEqual({})
    const start = createFamiliarityState('2026-07-10', settings)
    expect(advanceFamiliarity(start, '2026-07-01', settings, 1.4)).toBe(start)
  })

  it('records weekly trend snapshots, capped at five', () => {
    const later = advanceFamiliarity(createFamiliarityState('2026-07-01', settings), '2026-10-01', settings, 1.4)
    expect(later.trend).toHaveLength(5)
  })

  it('projects without changing the state', () => {
    const start = createFamiliarityState('2026-07-01', settings)
    const projected = projectFamiliarity(start, settings, 1.4, 28)
    expect(projected.Formation).toBeGreaterThan(categoryValues(start, settings).Formation)
    expect(start.lastDate).toBe('2026-07-01')
  })
})

describe('facility effects', () => {
  it('maps levels to conditions', () => {
    expect([1, 2, 3, 4, 5].map(conditionOf)).toEqual(['Poor', 'Average', 'Good', 'Excellent', 'Excellent'])
  })

  it('scales injuries with the medical centre and clamps the result', () => {
    expect(injuryDurationScale(3)).toBe(1)
    expect(injuryDurationScale(5)).toBeLessThan(1)
    expect(injuryDurationScale(1)).toBeGreaterThan(1)
    expect(injuryDurationScale(99)).toBe(0.8)
  })

  it('detects when every facility is maxed', () => {
    const facilities = { trainingLevel: 5, youthLevel: 5, stadiumLevel: 5, medicalLevel: 5, analysisLevel: 5, scoutingLevel: 5, maxLevel: 5 }
    expect(allFacilitiesMaxed(facilities)).toBe(true)
    expect(allFacilitiesMaxed({ ...facilities, scoutingLevel: 4 })).toBe(false)
  })
})
