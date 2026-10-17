import { createRng } from '../utils/proceduralGenerator'

export interface SponsorDeal { name: string; valueAnnual: number; category: string; endDate: string }
export interface SponsorSlot { id: string; category: string; previousName: string; previousValue: number; round: number; filled: boolean }
export interface SponsorOffer { id: string; slotId: string; company: string; category: string; valueAnnual: number; years: number; validUntil: string }
export interface SponsorMail { id: string; date: string; subject: string; body: string; slotId: string; read: boolean }
export interface SponsorState { sponsors: SponsorDeal[]; slots: SponsorSlot[]; offers: SponsorOffer[]; mail: SponsorMail[] }

export const OFFER_VALID_DAYS = 30
const COMPANIES = ['Lagos Telecom', 'Niger Delta Energy', 'Zenith Motors', 'Atlas Insurance', 'Sahel Airways', 'Greenfield Foods', 'Orbit Mobile', 'Harbour Capital', 'Kora Beverages', 'Summit Cement', 'Pulse Fintech', 'Savanna Telecoms']

const isoDay = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Deals run to 30 June, the end of a season, so a 2-year deal signed in 2026/27 ends on 30 June 2028. */
export function dealEndDate(date: string, years: number) {
  const year = Number(date.slice(0, 4))
  const seasonEndYear = Number(date.slice(5, 7)) <= 6 ? year : year + 1
  return `${seasonEndYear + years - 1}-06-30`
}

export const initialSponsorState = (sponsors: SponsorDeal[]): SponsorState => ({ sponsors: sponsors.map((sponsor) => ({ ...sponsor })), slots: [], offers: [], mail: [] })

function makeOffers(slot: SponsorSlot, date: string): SponsorOffer[] {
  const random = createRng(`${slot.id}:${slot.round}`)
  const pool = [...COMPANIES]
  return [0, 1, 2].map((index) => {
    const company = pool.splice(Math.floor(random() * pool.length), 1)[0]
    const years = index === 0 ? 1 : index === 1 ? 2 : 4
    // Longer deals trade a lower yearly value for security.
    const factor = (index === 0 ? 1.12 : index === 1 ? 1.02 : 0.9) + (random() - 0.5) * 0.16
    return { id: `${slot.id}:${slot.round}:${index}`, slotId: slot.id, company, category: slot.category, years, valueAnnual: Math.round(slot.previousValue * factor / 10000) * 10000, validUntil: isoDay(date, OFFER_VALID_DAYS) }
  })
}

function withOffers(state: SponsorState, slot: SponsorSlot, date: string, subject: string, intro: string): SponsorState {
  const offers = makeOffers(slot, date)
  const body = `${intro} ${offers.map((offer) => `${offer.company} (£${(offer.valueAnnual / 1_000_000).toFixed(2)}m a year for ${offer.years} season${offer.years === 1 ? '' : 's'})`).join(', ')}. The offers stay open until ${offers[0].validUntil}.`
  return {
    ...state,
    offers: [...state.offers.filter((offer) => offer.slotId !== slot.id), ...offers],
    mail: [{ id: `${slot.id}:${slot.round}`, date, subject, body, slotId: slot.id, read: false }, ...state.mail],
  }
}

/** Expires finished deals, opens offers for the vacated slot and re-opens a slot whose offers all lapsed. */
export function advanceSponsors(state: SponsorState, date: string): SponsorState {
  let next = state
  for (const sponsor of state.sponsors.filter((deal) => deal.endDate <= date)) {
    const slot: SponsorSlot = { id: `${sponsor.name}:${sponsor.endDate}`, category: sponsor.category, previousName: sponsor.name, previousValue: sponsor.valueAnnual, round: 1, filled: false }
    next = { ...next, sponsors: next.sponsors.filter((deal) => deal !== sponsor), slots: [...next.slots, slot] }
    next = withOffers(next, slot, date, `${sponsor.name} deal has ended`, `Your ${sponsor.category.toLowerCase()} deal with ${sponsor.name} has expired and new sponsors have made offers:`)
  }
  const live = next.offers.filter((offer) => offer.validUntil >= date)
  if (live.length !== next.offers.length) next = { ...next, offers: live }
  for (const slot of next.slots.filter((entry) => !entry.filled && !next.offers.some((offer) => offer.slotId === entry.id))) {
    const lastMail = next.mail.find((entry) => entry.slotId === slot.id)
    if (lastMail && isoDay(lastMail.date, OFFER_VALID_DAYS) >= date) continue
    const reopened = { ...slot, round: slot.round + 1 }
    next = { ...next, slots: next.slots.map((entry) => entry === slot ? reopened : entry) }
    next = withOffers(next, reopened, date, `New ${slot.category.toLowerCase()} offers`, 'The earlier offers lapsed, but sponsors are still interested:')
  }
  return next
}

export function acceptOffer(state: SponsorState, offerId: string, date: string): { state: SponsorState; deal: SponsorDeal } | null {
  const offer = state.offers.find((entry) => entry.id === offerId)
  if (!offer || offer.validUntil < date) return null
  const deal: SponsorDeal = { name: offer.company, valueAnnual: offer.valueAnnual, category: offer.category, endDate: dealEndDate(date, offer.years) }
  return {
    deal,
    state: {
      ...state,
      sponsors: [...state.sponsors, deal],
      offers: state.offers.filter((entry) => entry.slotId !== offer.slotId),
      slots: state.slots.map((slot) => slot.id === offer.slotId ? { ...slot, filled: true } : slot),
    },
  }
}

export const declineOffer = (state: SponsorState, offerId: string): SponsorState => ({ ...state, offers: state.offers.filter((offer) => offer.id !== offerId) })

export function isSponsorState(value: unknown): value is SponsorState {
  if (!value || typeof value !== 'object') return false
  const state = value as Record<string, unknown>
  const list = (key: string) => Array.isArray(state[key]) && (state[key] as unknown[]).every((item) => item && typeof item === 'object')
  return list('sponsors') && list('slots') && list('offers') && list('mail')
    && (state.sponsors as SponsorDeal[]).every((deal) => typeof deal.name === 'string' && Number.isFinite(deal.valueAnnual) && typeof deal.category === 'string' && typeof deal.endDate === 'string')
}
