import rawGlobalLeagues from '../data/globalLeaguesAndTeams.json'
import type { GlobalLeaguesDatabase, ProceduralClubBadge } from '../types/game'
import { createRng } from '../utils/proceduralGenerator'

const countries = (rawGlobalLeagues as unknown as GlobalLeaguesDatabase).countries
const topLeagueCodes = new Set(['ENG', 'ESP', 'GER', 'ITA', 'FRA'])
const midLeagueCodes = new Set(['POR', 'NED', 'BRA', 'ARG', 'BEL', 'SCO', 'TUR'])
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Prestige of any club: league strength plus where the club sits in its table. */
export function clubPrestige(countryCode: string, teamCount: number, position: number) {
  const league = topLeagueCodes.has(countryCode) ? 10 : midLeagueCodes.has(countryCode) ? 4 : 0
  return Math.round(clamp(40 + league + (teamCount - position) * 1.8, 18, 92))
}

export interface JobOffer {
  clubId: string
  clubName: string
  country: string
  leagueName: string
  badge: ProceduralClubBadge
  position: number
  prestige: number
  years: number
  note: string
}

/** The most prestigious club a manager of this level can realistically attract. */
export const maxPrestigeForLevel = (level: number) => clamp(30 + level * 4, 30, 92)

const noteFor = (prestige: number, ceiling: number) =>
  prestige >= ceiling - 6 ? 'A big step up that trusts your reputation.' : prestige >= ceiling - 20 ? 'A solid project that fits your experience.' : 'A rebuilding job with little pressure.'

/** Between three and five offers, all from clubs matching the manager's experience. The same seed gives the same offers. */
export function generateJobOffers(level: number, seed: string, excludeClubId?: string): JobOffer[] {
  const ceiling = maxPrestigeForLevel(level)
  const floor = ceiling - 35
  const random = createRng(`job-offers:${seed}`)
  const pool = countries.flatMap((country) => country.teams.map((team) => ({ country, team, prestige: clubPrestige(country.countryCode, country.teams.length, team.standing.position) })))
    .filter((entry) => entry.team.id !== excludeClubId)
  let eligible = pool.filter((entry) => entry.prestige >= floor && entry.prestige <= ceiling)
  if (eligible.length < 3) eligible = [...pool].sort((first, second) => Math.abs(first.prestige - ceiling) - Math.abs(second.prestige - ceiling)).slice(0, 8)
  const count = 3 + Math.floor(random() * 3)
  const shuffled = eligible.map((entry) => ({ entry, key: random() })).sort((first, second) => first.key - second.key).map((item) => item.entry)
  return shuffled.slice(0, count).sort((first, second) => second.prestige - first.prestige).map(({ country, team, prestige }) => ({
    clubId: team.id,
    clubName: team.name,
    country: country.countryName,
    leagueName: country.name,
    badge: team.badge,
    position: team.standing.position,
    prestige,
    years: 1 + Math.floor(random() * 3),
    note: noteFor(prestige, ceiling),
  }))
}
