import { useEffect, useState } from 'react'
import { club, getTransferMarketPlayers, playerClubName } from './data/mockData'
import { useGame } from './state/gameStore'
import { getAskingPrice } from './state/transfers'
import type { Player } from './types/game'
import Flag from './Flag'

const money = (amount: number) => amount > 0 ? `£${(amount / 1000000).toFixed(1)}m` : 'No clause'
function positionGroup(player: Player) {
  if (player.position === 'GK') return 'GK'
  if (player.position.startsWith('D')) return 'DEF'
  if (player.position === 'DM' || player.position.startsWith('M')) return 'MID'
  return 'FWD'
}

export default function TransferMarket({ onSelectPlayer, onSelectCountry }: { onSelectPlayer: (player: Player) => void; onSelectCountry: (country: string) => void }) {
  const [shortlisted, setShortlisted] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem('fmapp-transfer-shortlist')
      const parsed: unknown = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
    } catch {
      return []
    }
  })
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('ALL')
  const [affordableOnly, setAffordableOnly] = useState(false)
  const [sort, setSort] = useState<'ovr' | 'value' | 'age'>('ovr')
  useGame()
  const transferMarketPlayers = getTransferMarketPlayers().filter((player) => player.contract.clubId !== club.id)
  const sorters = { ovr: (a: Player, b: Player) => b.overall - a.overall, value: (a: Player, b: Player) => b.value - a.value, age: (a: Player, b: Player) => a.age - b.age }
  const players = transferMarketPlayers
    .filter((player) => player.name.toLowerCase().includes(query.toLowerCase()) && (position === 'ALL' || positionGroup(player) === position)
      && (!affordableOnly || (player.contract.clubId ? getAskingPrice(player) : 0) <= club.finances.transferBudget))
    .sort(sorters[sort])

  useEffect(() => {
    window.localStorage.setItem('fmapp-transfer-shortlist', JSON.stringify(shortlisted))
  }, [shortlisted])

  const toggleShortlist = (playerId: string) => {
    setShortlisted((current) => current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId])
  }

  return <div className="transfer-market">
    <div className="page-intro"><span className="eyebrow">SCOUTING & RECRUITMENT</span><h1>Transfer market</h1><p>{transferMarketPlayers.length} players available · {shortlisted.length} shortlisted</p></div>
    <div className="transfer-market-tools"><label className="market-search"><span aria-hidden="true">⌕</span><input aria-label="Search transfer market" onChange={(event) => setQuery(event.target.value)} placeholder="Search players" value={query} /></label><select aria-label="Filter transfer market position" onChange={(event) => setPosition(event.target.value)} value={position}><option value="ALL">All positions</option><option value="GK">Goalkeepers</option><option value="DEF">Defenders</option><option value="MID">Midfielders</option><option value="FWD">Forwards</option></select><select aria-label="Sort transfer market" onChange={(event) => setSort(event.target.value as typeof sort)} value={sort}><option value="ovr">Sort: Rating</option><option value="value">Sort: Value</option><option value="age">Sort: Youngest</option></select><label className="market-affordable"><input checked={affordableOnly} onChange={(event) => setAffordableOnly(event.target.checked)} type="checkbox" /> Affordable</label></div>
    <div className="market-list-head"><span>PLAYER</span><span>AGE</span><span>POS</span><span>NAT</span><span>OVR</span><span>VALUE</span><span>CLAUSE</span><span aria-label="Shortlist">☆</span></div>
    <div className="market-player-list">{players.map((player) => {
      const nationality = player.personalInfo.nationalities[0]
      const isShortlisted = shortlisted.includes(player.id)
      return <article className="market-player-row" key={player.id}>
        <img alt={`Portrait of ${player.name}`} className="market-avatar" data-info="avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" />
        <div className="market-player-identity"><button className="market-player-name" data-info="player-name" onClick={() => onSelectPlayer(player)} type="button">{player.name}</button><span data-info="club-name">{playerClubName(player.contract.clubId)}</span></div>
        <span className="market-age" data-info="age">{player.age}</span>
        <span className="market-position" data-info="position">{player.position.replace(/[() ]/g, '')}</span>
        <span className="market-position market-nationality" data-info="nationality"><Flag code={nationality.code} countryName={nationality.country} onSelectCountry={onSelectCountry} /></span>
        <strong className="market-rating" data-info="overall">{player.overall}</strong>
        <span className="market-value" data-info="market-value">{money(player.value)}</span>
        <span className="market-clause" data-info="release-clause">{money(player.contract.releaseClause ?? 0)}</span>
        <button data-info="shortlist" aria-label={`${isShortlisted ? 'Remove' : 'Add'} ${player.name} ${isShortlisted ? 'from' : 'to'} shortlist`} aria-pressed={isShortlisted} className={isShortlisted ? 'shortlist-star active' : 'shortlist-star'} onClick={() => toggleShortlist(player.id)} type="button">{isShortlisted ? '★' : '☆'}</button>
      </article>
    })}{players.length === 0 && <p className="market-empty">No players match that search.</p>}</div>
  </div>
}
