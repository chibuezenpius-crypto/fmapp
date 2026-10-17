import { describe, expect, it } from 'vitest'
import { generatePlayer } from '../utils/proceduralGenerator'
import { generateJobOffers, maxPrestigeForLevel } from './career'
import { cashFlowForDays } from './cashFlow'
import { catchUpPlayers, progressPlayer, seasonDelta } from './progression'

describe('player progression', () => {
  it('ages a player a year and keeps ratings in range', () => {
    const player = generatePlayer({ seed: 'prog-1', ageRange: [24, 26] })
    const { age, overall } = player
    progressPlayer(player, 1, true)
    expect(player.age).toBe(age + 1)
    expect(Math.abs(player.overall - overall)).toBeLessThanOrEqual(4)
    expect(player.overall).toBeLessThanOrEqual(99)
  })

  it('never lets a young player grow past potential and makes veterans decline', () => {
    expect(seasonDelta(18, 0.99, 2)).toBeLessThanOrEqual(2)
    expect(seasonDelta(35, 0.1, 10)).toBeLessThan(0)
  })

  it('applies each season once, however often it is asked', () => {
    const player = generatePlayer({ seed: 'prog-2', ageRange: [22, 24] })
    const age = player.age
    catchUpPlayers([player], 3, true)
    catchUpPlayers([player], 3, true)
    expect(player.age).toBe(age + 3)
  })

  it('is deterministic so a reloaded save matches the live game', () => {
    const first = generatePlayer({ seed: 'prog-3' })
    const second = generatePlayer({ seed: 'prog-3' })
    catchUpPlayers([first], 2, true)
    catchUpPlayers([second], 2, true)
    expect(second.overall).toBe(first.overall)
    expect(second.value).toBe(first.value)
  })

  it('extends expired contracts for other clubs but not for the manager’s own club', () => {
    const other = generatePlayer({ seed: 'prog-4', clubId: 'nga-01' })
    const own = generatePlayer({ seed: 'prog-4', clubId: 'nga-01' })
    other.contract.endDate = '2026-06-30'
    own.contract.endDate = '2026-06-30'
    catchUpPlayers([other], 1, true)
    catchUpPlayers([own], 1, false)
    expect(other.contract.endDate > '2027-08-01').toBe(true)
    expect(own.contract.endDate).toBe('2026-06-30')
  })
})

describe('club cash flow', () => {
  const base = { prestige: 58, sponsorshipIncomeAnnual: 2_600_000, weeklyWages: 100_000, operationsPerMonth: 640_000 }
  it('scales with the number of days', () => {
    expect(Math.abs(cashFlowForDays(base, 14) - 2 * cashFlowForDays(base, 7))).toBeLessThanOrEqual(1)
  })
  it('loses money when wages are far above income', () => {
    expect(cashFlowForDays({ ...base, weeklyWages: 600_000 }, 30)).toBeLessThan(0)
  })
})

describe('job offers', () => {
  it('are repeatable for the same week and differ between weeks', () => {
    const first = generateJobOffers(12, 'a')
    expect(generateJobOffers(12, 'a')).toEqual(first)
    expect(generateJobOffers(12, 'b').map((offer) => offer.clubId)).not.toEqual(first.map((offer) => offer.clubId))
  })
  it('give three to five clubs that match the manager’s experience', () => {
    const offers = generateJobOffers(12, 'level')
    expect(offers.length).toBeGreaterThanOrEqual(3)
    expect(offers.length).toBeLessThanOrEqual(5)
    for (const offer of offers) expect(offer.prestige).toBeLessThanOrEqual(maxPrestigeForLevel(12))
  })
  it('offer bigger clubs to more experienced managers and skip the previous club', () => {
    const rookie = generateJobOffers(3, 'x')
    const veteran = generateJobOffers(20, 'x')
    expect(Math.max(...veteran.map((offer) => offer.prestige))).toBeGreaterThan(Math.max(...rookie.map((offer) => offer.prestige)))
    const previous = veteran[0].clubId
    expect(generateJobOffers(20, 'x', previous).some((offer) => offer.clubId === previous)).toBe(false)
  })
})
