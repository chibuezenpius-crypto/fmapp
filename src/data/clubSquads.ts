import rawGlobalLeagues from './globalLeaguesAndTeams.json'
import { createRng, generatePlayer } from '../utils/proceduralGenerator'
import type { GlobalLeaguesDatabase, Player, PlayerPosition } from '../types/game'

const leagues = (rawGlobalLeagues as unknown as GlobalLeaguesDatabase).countries

// Starting shirt numbers by squad slot, 25 players per club.
const squadSlots: { position: PlayerPosition; shirt: number; starter: boolean }[] = [
  { position: 'GK', shirt: 1, starter: true }, { position: 'GK', shirt: 13, starter: false }, { position: 'GK', shirt: 23, starter: false },
  { position: 'D (R)', shirt: 2, starter: true }, { position: 'D (L)', shirt: 3, starter: true },
  { position: 'D (C)', shirt: 4, starter: true }, { position: 'D (C)', shirt: 5, starter: true },
  { position: 'D (C)', shirt: 15, starter: false }, { position: 'D (C)', shirt: 24, starter: false },
  { position: 'D (R)', shirt: 22, starter: false }, { position: 'D (L)', shirt: 16, starter: false },
  { position: 'DM', shirt: 6, starter: true }, { position: 'DM', shirt: 14, starter: false },
  { position: 'M (C)', shirt: 8, starter: true }, { position: 'M (C)', shirt: 17, starter: false },
  { position: 'M (C)', shirt: 18, starter: false }, { position: 'M (C)', shirt: 25, starter: false },
  { position: 'M (R)', shirt: 7, starter: true }, { position: 'M (L)', shirt: 11, starter: true },
  { position: 'AM (C)', shirt: 10, starter: true }, { position: 'AM (C)', shirt: 20, starter: false },
  { position: 'ST (C)', shirt: 9, starter: true }, { position: 'ST (C)', shirt: 19, starter: false },
  { position: 'ST (C)', shirt: 21, starter: false }, { position: 'ST (C)', shirt: 26, starter: false },
]

const topFive = new Set(['ENG', 'ESP', 'GER', 'ITA', 'FRA'])
const strongLeagues = new Set(['POR', 'NED', 'BRA', 'ARG', 'BEL', 'SCO', 'TUR'])
const leagueBaseOverall = (countryCode: string) => (topFive.has(countryCode) ? 76 : strongLeagues.has(countryCode) ? 71 : 65)

const clubLookup = new Map<string, { clubId: string; clubName: string; countryCode: string; countryName: string; leagueId: string; leagueName: string; rank: number; teamCount: number }>()
for (const league of leagues) {
  const ranked = [...league.teams].sort((a, b) => a.standing.position - b.standing.position)
  ranked.forEach((team, index) => clubLookup.set(team.id, { clubId: team.id, clubName: team.name, countryCode: league.countryCode, countryName: league.countryName, leagueId: league.id, leagueName: league.name, rank: index, teamCount: ranked.length }))
}

export function findGeneratedClub(clubId: string) {
  return clubLookup.get(clubId)
}

const squadCache = new Map<string, Player[]>()

/** Deterministic 25-man squad for any league club, built on first request and cached. */
export function getClubSquad(clubId: string): Player[] {
  const cached = squadCache.get(clubId)
  if (cached) return cached
  const club = clubLookup.get(clubId)
  if (!club) return []
  const spread = createRng(`${clubId}:strength`)
  const clubOverall = leagueBaseOverall(club.countryCode) + ((club.teamCount - 1) / 2 - club.rank) / club.teamCount * 12
  const squad = squadSlots.map((slot, index) => {
    const targetOVR = Math.round(clubOverall + (slot.starter ? 3 : -4) + (spread() - 0.5) * 8)
    return generatePlayer({ seed: `${clubId}:${index}`, clubId, position: slot.position, shirtNumber: slot.shirt, targetOVR: Math.max(40, Math.min(90, targetOVR)) })
  })
  squadCache.set(clubId, squad)
  return squad
}
