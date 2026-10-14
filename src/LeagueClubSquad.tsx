import { useMemo, useState } from 'react'
import rawGlobalLeagues from './data/globalLeaguesAndTeams.json'
import { findGeneratedClub, getClubSquad } from './data/clubSquads'
import ClubBadge from './ClubBadge'
import type { GlobalLeaguesDatabase, Player } from './types/game'

type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'
type SortMode = 'Number' | 'Rating' | 'Value' | 'Age'

const leagues = (rawGlobalLeagues as unknown as GlobalLeaguesDatabase).countries
const shortMoney = (amount: number) => (amount >= 1000000 ? `£${(amount / 1000000).toFixed(1)}m` : `£${Math.round(amount / 1000)}k`)
const matchesFilter = (player: Player, filter: PositionFilter) => {
  if (filter === 'ALL') return true
  if (filter === 'GK') return player.position === 'GK'
  if (filter === 'DEF') return player.position.startsWith('D') && player.position !== 'DM'
  if (filter === 'MID') return player.position === 'DM' || player.position.startsWith('M')
  return player.position.startsWith('AM') || player.position.startsWith('ST')
}

interface LeagueClubSquadProps {
  clubId: string
  onSelectPlayer: (player: Player) => void
}

export default function LeagueClubSquad({ clubId, onSelectPlayer }: LeagueClubSquadProps) {
  const [filter, setFilter] = useState<PositionFilter>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('Number')
  const info = findGeneratedClub(clubId)
  const team = leagues.flatMap((league) => league.teams).find((item) => item.id === clubId)
  const fullSquad = useMemo(() => getClubSquad(clubId), [clubId])
  const squad = useMemo(() => fullSquad.filter((player) => matchesFilter(player, filter)).sort((first, second) => {
    if (sortMode === 'Rating') return second.overall - first.overall
    if (sortMode === 'Value') return second.value - first.value
    if (sortMode === 'Age') return first.age - second.age
    return first.shirtNumber - second.shirtNumber
  }), [fullSquad, filter, sortMode])
  if (!info || !team) return null

  const average = (pick: (player: Player) => number) => fullSquad.reduce((total, player) => total + pick(player), 0) / fullSquad.length
  const foreign = fullSquad.filter((player) => player.personalInfo.nationalities[0]?.code !== info.countryCode).length

  return <div className="club-profile">
    <div className="club-subpage-heading"><div><span className="eyebrow">{info.countryName.toUpperCase()} · {info.leagueName.toUpperCase()}</span><h2>{info.clubName}</h2></div><ClubBadge badge={team.badge} name={team.name} size="large" /></div>
    <section className="club-balance-card"><span className="eyebrow">SQUAD SUMMARY · {fullSquad.length} PLAYERS</span>
      <div className="balance-columns"><span>Average rating <b>{average((player) => player.overall).toFixed(1)}</b></span><span>Average age <b>{average((player) => player.age).toFixed(1)}</b></span></div>
      <div className="balance-columns"><span>Squad value <b>{shortMoney(fullSquad.reduce((total, player) => total + player.value, 0))}</b></span><span>Foreign players <b>{foreign}</b></span></div></section>
    <div className="club-subpage-heading"><div><span className="eyebrow">{squad.length} PLAYERS SHOWN</span><h2>First team</h2></div><label className="club-sort">SORT BY<select aria-label="Sort squad" onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}><option>Number</option><option>Rating</option><option>Value</option><option>Age</option></select></label></div>
    <div className="position-filters" aria-label="Filter positions">{(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((item) => <button aria-pressed={filter === item} className={filter === item ? 'position-filter active' : 'position-filter'} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}</div>
    <div className="club-roster-list">{squad.map((player) => <button aria-label={`Open ${player.name} profile`} className="club-roster-row" key={player.id} onClick={() => onSelectPlayer(player)} type="button"><span className="roster-number">{String(player.shirtNumber).padStart(2, '0')}</span><span className="roster-player"><strong>{player.name}</strong><small>{player.position} · {player.age} yrs · {player.personalInfo.nationalities[0]?.code}</small></span><span className="roster-stat"><strong>{player.overall}</strong><small>RAT</small></span><span className="roster-stat"><strong>{shortMoney(player.value)}</strong><small>VALUE</small></span></button>)}</div>
  </div>
}
