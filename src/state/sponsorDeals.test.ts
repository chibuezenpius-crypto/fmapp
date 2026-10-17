import { describe, expect, it } from 'vitest'
import { acceptOffer, advanceSponsors, declineOffer, initialSponsorState } from './sponsorDeals'

const deals = [
  { name: 'Alpha', valueAnnual: 1_000_000, category: 'Front of shirt', endDate: '2027-06-30' },
  { name: 'Beta', valueAnnual: 500_000, category: 'Official partner', endDate: '2029-06-30' },
]

describe('sponsor deals', () => {
  it('keeps running deals untouched before they end', () => {
    const state = initialSponsorState(deals)
    expect(advanceSponsors(state, '2027-01-01')).toBe(state)
  })

  it('expires a deal, opens three offers and sends one mail', () => {
    const state = advanceSponsors(initialSponsorState(deals), '2027-06-30')
    expect(state.sponsors.map((deal) => deal.name)).toEqual(['Beta'])
    expect(state.offers).toHaveLength(3)
    expect(state.mail).toHaveLength(1)
    expect(advanceSponsors(state, '2027-07-01').mail).toHaveLength(1)
  })

  it('signs an accepted offer to the end of a season and clears the other offers', () => {
    const state = advanceSponsors(initialSponsorState(deals), '2027-07-02')
    const offer = state.offers.find((entry) => entry.years === 2)!
    const result = acceptOffer(state, offer.id, '2027-07-05')!
    expect(result.deal.endDate).toBe('2029-06-30')
    expect(result.state.offers).toHaveLength(0)
    expect(result.state.sponsors).toHaveLength(2)
    expect(acceptOffer(state, offer.id, '2027-09-01')).toBeNull()
  })

  it('opens fresh offers once the old ones lapse', () => {
    const state = advanceSponsors(initialSponsorState(deals), '2027-06-30')
    const later = advanceSponsors(state, '2027-08-15')
    expect(later.offers).toHaveLength(3)
    expect(later.mail).toHaveLength(2)
  })

  it('does not re-send offers straight after all were declined', () => {
    let state = advanceSponsors(initialSponsorState(deals), '2027-06-30')
    for (const offer of state.offers) state = declineOffer(state, offer.id)
    expect(advanceSponsors(state, '2027-07-05').offers).toHaveLength(0)
  })
})
