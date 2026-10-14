import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { club } from './data/mockData'
import type { Player } from './types/game'

export type ClubSection = 'Overview' | 'Squad' | 'Tactics' | 'History' | 'Finances & Facilities'

type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'
type SortMode = 'Value' | 'Rating' | 'Age'

const sections: ClubSection[] = ['Overview', 'Squad', 'Tactics', 'History', 'Finances & Facilities']
const money = (amount: number) => `£${new Intl.NumberFormat('en-GB').format(amount)}`
const shortMoney = (amount: number) => `£${(amount / 1000000).toFixed(1)}m`
const displayDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

interface ClubProfileProps {
  section: ClubSection
  selectedClubName: string | null
  backLabel: string
  onBack: () => void
  onSectionChange: (section: ClubSection) => void
  onSelectClub: (name: string) => void
  onSelectPlayer: (player: Player) => void
}

function StarRating({ rating }: { rating: number }) {
  return <span className="star-rating" aria-label={`${rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <i className={index < rating ? 'filled' : ''} key={index}>★</i>)}</span>
}

function ClubReference({ name, selectedClubName, onSelectClub }: { name: string; selectedClubName: string | null; onSelectClub: (name: string) => void }) {
  return <button aria-pressed={selectedClubName === name} className={`entity-link ${selectedClubName === name ? 'selected' : ''}`} onClick={() => onSelectClub(name)} type="button">{name}</button>
}

function PlayerButton({ player, onSelectPlayer, role, x, y }: { player: Player; onSelectPlayer: (player: Player) => void; role?: string; x?: string; y?: string }) {
  return <button aria-label={`Open ${player.name} profile`} className="club-pitch-player" onClick={() => onSelectPlayer(player)} style={{ left: x, top: y }} type="button"><span>{String(player.shirtNumber).padStart(2, '0')}</span><strong>{player.name}</strong>{role && <small>{role}</small>}</button>
}

export default function ClubProfile({ section, selectedClubName, backLabel, onBack, onSectionChange, onSelectClub, onSelectPlayer }: ClubProfileProps) {
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('Value')
  const [trainingLevel, setTrainingLevel] = useState(club.facilities.trainingLevel)
  const [youthLevel, setYouthLevel] = useState(club.facilities.youthLevel)
  const [balance, setBalance] = useState(club.finances.balance)
  const squad = [...club.squad].filter((player) => {
    if (positionFilter === 'ALL') return true
    if (positionFilter === 'GK') return player.position === 'GK'
    if (positionFilter === 'DEF') return player.position.startsWith('D')
    if (positionFilter === 'MID') return player.position.startsWith('M') || player.position === 'DM'
    return player.position.startsWith('AM') || player.position.startsWith('ST')
  }).sort((first, second) => {
    if (sortMode === 'Value') return second.value - first.value
    if (sortMode === 'Rating') return second.overall - first.overall
    return first.age - second.age
  })

  const upgradeFacility = (facility: 'training' | 'youth') => {
    const isTraining = facility === 'training'
    const level = isTraining ? trainingLevel : youthLevel
    const cost = isTraining ? 2500000 : 1800000
    if (level >= club.facilities.maxLevel || balance < cost) return
    if (isTraining) setTrainingLevel(level + 1)
    else setYouthLevel(level + 1)
    setBalance(balance - cost)
  }

  const formation = [
    { player: club.squad[8], role: 'ST', x: '50%', y: '14%' },
    { player: club.squad[6], role: 'RW', x: '19%', y: '31%' },
    { player: club.squad[9], role: 'LW', x: '81%', y: '31%' },
    { player: club.squad[7], role: 'CM', x: '35%', y: '48%' },
    { player: club.squad[5], role: 'DM', x: '50%', y: '57%' },
    { player: club.squad[10], role: 'CM', x: '65%', y: '48%' },
    { player: club.squad[2], role: 'LB', x: '15%', y: '71%' },
    { player: club.squad[3], role: 'CB', x: '39%', y: '73%' },
    { player: club.squad[4], role: 'CB', x: '61%', y: '73%' },
    { player: club.squad[1], role: 'RB', x: '85%', y: '71%' },
    { player: club.squad[0], role: 'GK', x: '50%', y: '89%' },
  ]

  return <div className="club-profile">
    <button className="profile-back" onClick={onBack} type="button"><ArrowLeft aria-hidden="true" size={17} strokeWidth={2} /><span>{backLabel}</span></button>
    <header className="club-profile-hero">
      <div className="club-profile-crest">N</div>
      <div className="club-profile-title"><span className="eyebrow">EST. {club.founded} · {club.nickname.toUpperCase()}</span><h1>{club.name}</h1><div><ClubReference name={club.name} selectedClubName={selectedClubName} onSelectClub={onSelectClub} /><span> · {club.stadium.name}</span></div></div>
      <div className="club-prestige"><strong>{club.prestige}</strong><span>PRESTIGE</span></div>
    </header>

    <nav className="club-profile-tabs" aria-label="Club profile sections">
      {sections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'club-profile-tab active' : 'club-profile-tab'} key={item} onClick={() => onSectionChange(item)} type="button">{item}</button>)}
    </nav>

    <div className="club-profile-content" key={section}>
      {section === 'Overview' && <>
        <section className="club-manager-card"><div className="club-manager-avatar">{club.manager.name.split(' ').map((part) => part[0]).join('')}</div><div className="club-manager-info"><span className="eyebrow">FIRST TEAM MANAGER</span><strong>{club.manager.name}</strong><span>{club.manager.nationality} · Age {club.manager.age}</span></div><div className="manager-reputation"><StarRating rating={club.manager.reputation} /><small>REPUTATION</small></div></section>
        <section className="club-stadium-card"><div><span className="eyebrow">HOME GROUND</span><h2>{club.stadium.name}</h2><span>Founded {club.founded} · {club.nickname}</span></div><div className="stadium-capacity"><strong>{new Intl.NumberFormat('en-GB').format(club.stadium.capacity)}</strong><span>CAPACITY</span></div><div className="stadium-attendance"><span>AVG ATTENDANCE</span><strong>{new Intl.NumberFormat('en-GB').format(club.stadium.attendance)}</strong><div><i style={{ width: `${club.stadium.attendance / club.stadium.capacity * 100}%` }} /></div></div></section>
        <div className="club-overview-metrics"><article><span>TRANSFER BUDGET</span><strong>{shortMoney(club.finances.transferBudget)}</strong><small>Available now</small></article><article><span>WAGE BUDGET</span><strong>{money(club.finances.wageBudget)}<small> / wk</small></strong><small>{money(club.finances.wageBudget - club.finances.weeklyWages)} remaining</small></article><article><span>TEAM PRESTIGE</span><strong>{club.prestige}<small> / 100</small></strong><small>National reputation</small></article></div>
        <section className="club-overview-squad"><div className="club-panel-heading"><div><span className="eyebrow">FIRST TEAM</span><h2>Squad snapshot</h2></div><button className="club-text-action" onClick={() => onSectionChange('Squad')} type="button">VIEW SQUAD <span>→</span></button></div><div className="squad-snapshot-row">{club.squad.slice(6, 11).map((player) => <button aria-label={`Open ${player.name} profile`} className="snapshot-player" key={player.id} onClick={() => onSelectPlayer(player)} type="button"><span>{String(player.shirtNumber).padStart(2, '0')}</span><strong>{player.name.split(' ')[0]}</strong><small>{player.position}</small></button>)}</div></section>
      </>}

      {section === 'Squad' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">{squad.length} PLAYERS SHOWN</span><h2>First team</h2></div><label className="club-sort">SORT BY<select aria-label="Sort squad" onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}><option>Value</option><option>Rating</option><option>Age</option></select></label></div>
        <div className="position-filters" aria-label="Filter positions">{(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((filter) => <button aria-pressed={positionFilter === filter} className={positionFilter === filter ? 'position-filter active' : 'position-filter'} key={filter} onClick={() => setPositionFilter(filter)} type="button">{filter}</button>)}</div>
        <div className="club-roster-list">{squad.map((player) => <button aria-label={`Open ${player.name} profile`} className="club-roster-row" key={player.id} onClick={() => onSelectPlayer(player)} type="button"><span className="roster-number">{String(player.shirtNumber).padStart(2, '0')}</span><span className="roster-player"><strong>{player.name}</strong><small>{player.position} · {player.age} yrs</small></span><span className="roster-stat"><strong>{player.overall}</strong><small>RAT</small></span><span className="roster-stat"><strong>{shortMoney(player.value)}</strong><small>VALUE</small></span></button>)}</div>
      </>}

      {section === 'Tactics' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">FIRST XI · MATCH SHAPE</span><h2>4-3-3 formation</h2></div><span className="club-tactic-tag">ATTACKING</span></div>
        <div className="club-tactic-pitch" aria-label="Northbridge FC 4-3-3 formation"><div className="club-pitch-boundary" /><div className="club-pitch-halfway" /><div className="club-pitch-circle" /><div className="club-pitch-box top" /><div className="club-pitch-box bottom" />
          {formation.map(({ player, role, x, y }) => <PlayerButton key={player.id} player={player} onSelectPlayer={onSelectPlayer} role={role} x={x} y={y} />)}
        </div><p className="club-pitch-caption">Select a player to open their profile.</p>
      </>}

      {section === 'History' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">NORTHBRIDGE THROUGH THE YEARS</span><h2>Club history</h2></div></div>
        <section className="club-history-block"><div className="club-panel-heading"><div><span className="eyebrow">HONOURS</span><h2>Silverware</h2></div></div><div className="club-honours-list">{club.history.achievements.map((achievement) => <article className="club-honour-row" key={`${achievement.season}-${achievement.title}`}><span className="honour-season">{achievement.season}</span><div><strong>{achievement.title}</strong><span>{achievement.detail}</span></div><span className="honour-star">★</span></article>)}</div></section>
        <section className="club-history-block"><div className="club-panel-heading"><div><span className="eyebrow">RECORD BOOK</span><h2>Legends & records</h2></div></div><div className="club-record-grid">{club.history.records.map((record) => <article className="club-record-card" key={record.title}><span>{record.title}</span><strong>{record.record}</strong><small>{record.holder}</small></article>)}</div></section>
        <section className="club-history-block"><div className="club-panel-heading"><div><span className="eyebrow">LEAGUE FINISHES</span><h2>Recent seasons</h2></div></div><div className="past-seasons">{club.history.pastSeasonPositions.map((season) => <article className="past-season-row" key={season.season}><span>{season.season}</span><div><i style={{ width: `${(season.teamCount - season.position + 1) / season.teamCount * 100}%` }} /></div><strong>{season.position}<small> / {season.teamCount}</small></strong></article>)}</div></section>
      </>}

      {section === 'Finances & Facilities' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">2026/27 SEASON</span><h2>Finances & facilities</h2></div></div>
        <section className="club-balance-card"><span className="eyebrow">CLUB BALANCE</span><strong>{shortMoney(balance)}</strong><div className="balance-columns"><span>Transfer fund <b>{shortMoney(club.finances.transferBudget)}</b></span><span>Monthly operations <b>{money(club.finances.operationsPerMonth)}</b></span></div></section>
        <section className="club-finance-panel"><div className="club-panel-heading"><div><span className="eyebrow">REVENUE & SPEND</span><h2>Income streams</h2></div></div><div className="finance-line"><span>Sponsorship income <small>per season</small></span><strong>{shortMoney(club.finances.sponsorshipIncomeAnnual)}</strong></div><div className="finance-line"><span>Ticket sales <small>per home match</small></span><strong>{money(club.finances.ticketSalesPerHomeMatch)}</strong></div><div className="finance-line"><span>Weekly wages <small>of {money(club.finances.wageBudget)} budget</small></span><strong>{money(club.finances.weeklyWages)}</strong></div><div className="finance-line"><span>Monthly operations</span><strong>{money(club.finances.operationsPerMonth)}</strong></div></section>
        <section className="club-sponsors-panel"><div className="club-panel-heading"><div><span className="eyebrow">PARTNERS</span><h2>Sponsorships</h2></div><span>{club.sponsors.length} ACTIVE</span></div>{club.sponsors.map((sponsor) => <article className="club-sponsor-row" key={sponsor.name}><div><strong>{sponsor.name}</strong><span>{sponsor.category} · ends {displayDate(sponsor.endDate)}</span></div><strong>{shortMoney(sponsor.valueAnnual)}<small> / yr</small></strong></article>)}</section>
        <section className="club-facilities-panel"><div className="club-panel-heading"><div><span className="eyebrow">INVEST IN THE FUTURE</span><h2>Facilities</h2></div></div><FacilityUpgrade name="Training facilities" level={trainingLevel} maxLevel={club.facilities.maxLevel} cost={2500000} onUpgrade={() => upgradeFacility('training')} /><FacilityUpgrade name="Youth academy" level={youthLevel} maxLevel={club.facilities.maxLevel} cost={1800000} onUpgrade={() => upgradeFacility('youth')} /></section>
      </>}
    </div>
  </div>
}

function FacilityUpgrade({ name, level, maxLevel, cost, onUpgrade }: { name: string; level: number; maxLevel: number; cost: number; onUpgrade: () => void }) {
  return <article className="facility-row"><div className="facility-level-mark">{level}</div><div className="facility-info"><strong>{name}</strong><span>Level {level} of {maxLevel}</span><div className="facility-levels">{Array.from({ length: maxLevel }, (_, index) => <i className={index < level ? 'filled' : ''} key={index} />)}</div></div><button aria-label={`Upgrade ${name} for ${shortMoney(cost)}`} className="facility-upgrade" disabled={level >= maxLevel} onClick={onUpgrade} type="button">{level >= maxLevel ? 'MAX' : `+ ${shortMoney(cost)}`}</button></article>
}
