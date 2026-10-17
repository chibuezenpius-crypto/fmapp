import { useSyncExternalStore } from 'react'
import { club } from '../data/mockData'
import { acceptOffer, advanceSponsors, declineOffer, initialSponsorState, isSponsorState, type SponsorState } from './sponsorDeals'

export const SPONSORS_KEY = 'fmapp-sponsors-v1'

const sum = (sponsors: { valueAnnual: number }[]) => sponsors.reduce((total, sponsor) => total + sponsor.valueAnnual, 0)

function load(): SponsorState {
  const fresh = initialSponsorState(club.sponsors)
  try {
    const saved = window.localStorage.getItem(SPONSORS_KEY)
    if (!saved) return fresh
    const parsed: unknown = JSON.parse(saved)
    return isSponsorState(parsed) ? parsed : fresh
  } catch {
    return fresh
  }
}

let state = load()
const listeners = new Set<() => void>()

function apply(next: SponsorState) {
  state = next
  club.sponsors = next.sponsors
  club.finances.sponsorshipIncomeAnnual = sum(next.sponsors)
  try {
    window.localStorage.setItem(SPONSORS_KEY, JSON.stringify(next))
  } catch {
    // The deal still applies for this session even if it cannot be saved.
  }
  listeners.forEach((listener) => listener())
}

apply(state)

export const getSponsorState = () => state
export const unreadSponsorMail = () => state.mail.filter((mail) => !mail.read).length

/** Called whenever the game date moves; only changes state when a deal ended or offers lapsed. */
export function syncSponsors(date: string) {
  const next = advanceSponsors(state, date)
  if (next !== state) apply(next)
}

export function acceptSponsorOffer(offerId: string, date: string): string {
  const result = acceptOffer(state, offerId, date)
  if (!result) return 'This offer is no longer available.'
  apply(result.state)
  return `${result.deal.name} signed as your ${result.deal.category.toLowerCase()} partner.`
}

export const declineSponsorOffer = (offerId: string) => apply(declineOffer(state, offerId))

export const markSponsorMailRead = (mailId: string) => {
  if (state.mail.some((mail) => mail.id === mailId && !mail.read)) apply({ ...state, mail: state.mail.map((mail) => mail.id === mailId ? { ...mail, read: true } : mail) })
}

export const useSponsors = (): SponsorState => useSyncExternalStore((listener) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}, () => state)
