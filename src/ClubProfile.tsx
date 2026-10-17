import { useState } from 'react'
import { club, getClubBadge } from './data/mockData'
import ClubBadge from './ClubBadge'
import { getDate } from './state/gameStore'
import ClubFacilities from './ClubFacilities'
import { promoteReserve, splitSquad } from './state/matchSquad'
import { PLACEHOLDER_PORTRAIT } from './portrait'
import { ClubFinances, ClubSponsorship } from './ClubFinances'
import { BoardOverview } from './ClubRelations'
import { getInternationalDutyPlayers } from './simulation/calendarScheduler'
import type { MatchInfo, Player } from './types/game'

export type ClubSection = 'Overview' | 'Squad' | 'Tactics' | 'Staff' | 'Finances' | 'Sponsorship' | 'Board' | 'Fixtures' | 'Facilities'

type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'
type SortMode = 'Value' | 'Rating' | 'Age'
type KitPattern = 'Solid' | 'Vertical stripes' | 'Hoops' | 'Sash' | 'Pinstripes'
type KitPart = { primary: string; secondary: string; pattern: KitPattern }
type KitDesign = { home: KitPart; away: KitPart }

const kitPatterns: KitPattern[] = ['Solid', 'Vertical stripes', 'Hoops', 'Sash', 'Pinstripes']
const kitStorageKey = `fmapp-kits-${club.id}-v1`

const sections: ClubSection[] = ['Overview', 'Squad', 'Tactics', 'Staff', 'Finances', 'Sponsorship', 'Board', 'Fixtures', 'Facilities']
const money = (amount: number) => `£${new Intl.NumberFormat('en-GB').format(amount)}`
const shortMoney = (amount: number) => `£${(amount / 1000000).toFixed(1)}m`
const defaultKitDesign = (): KitDesign => ({
  home: { primary: club.colors.primary, secondary: club.colors.secondary, pattern: 'Vertical stripes' },
  away: { primary: '#bf6d53', secondary: '#ffffff', pattern: 'Solid' },
})

function isKitPart(value: unknown): value is KitPart {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const part = value as Record<string, unknown>
  return typeof part.primary === 'string' && /^#[\da-f]{6}$/i.test(part.primary)
    && typeof part.secondary === 'string' && /^#[\da-f]{6}$/i.test(part.secondary)
    && typeof part.pattern === 'string' && kitPatterns.includes(part.pattern as KitPattern)
}

function readKitDesign(): { design: KitDesign; notice: string } {
  try {
    const saved = window.localStorage.getItem(kitStorageKey)
    if (!saved) return { design: defaultKitDesign(), notice: '' }
    const parsed: unknown = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid format')
    const value = parsed as Record<string, unknown>
    if (!isKitPart(value.home) || !isKitPart(value.away)) throw new Error('invalid kit details')
    return { design: { home: value.home, away: value.away }, notice: '' }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown storage error'
    return { design: defaultKitDesign(), notice: `Saved kit designs could not be loaded (${detail}). Default kits are shown.` }
  }
}

function kitBackground({ primary, secondary, pattern }: KitPart): string {
  if (pattern === 'Vertical stripes') return `repeating-linear-gradient(90deg, ${primary} 0 8px, ${secondary} 8px 15px)`
  if (pattern === 'Hoops') return `repeating-linear-gradient(0deg, ${primary} 0 7px, ${secondary} 7px 13px)`
  if (pattern === 'Sash') return `linear-gradient(145deg, ${primary} 0 36%, ${secondary} 36% 58%, ${primary} 58% 100%)`
  if (pattern === 'Pinstripes') return `repeating-linear-gradient(90deg, ${primary} 0 5px, ${secondary} 5px 7px, ${primary} 7px 11px)`
  return primary
}

interface ClubProfileProps {
  section: ClubSection
  selectedClubName: string | null
  matches: MatchInfo[]
  onSectionChange: (section: ClubSection) => void
  onSelectClub: (name: string) => void
  onSelectPlayer: (player: Player) => void
  onSelectPersonnel: (idOrName: string) => void
  onSelectMatch: (id: string) => void
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

export default function ClubProfile({ section, selectedClubName, matches, onSectionChange, onSelectClub, onSelectPlayer, onSelectPersonnel, onSelectMatch }: ClubProfileProps) {
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('Value')
  const [kitEditor, setKitEditor] = useState(readKitDesign)
  const [squadView, setSquadView] = useState<'First team' | 'Reserves'>('First team')
  const [squadNotice, setSquadNotice] = useState('')
  const onDuty = new Set(getInternationalDutyPlayers(club.squad, getDate()).map((player) => player.id))
  const split = splitSquad(club.squad)
  const firstTeam = [...split.starters, ...split.bench]
  const benchIds = new Set(split.bench.map((player) => player.id))
  const startingIds = new Set(split.starters.map((player) => player.id))
  const squad = (squadView === 'First team' ? firstTeam : split.reserves).filter((player) => {
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

  const updateKit = <K extends keyof KitPart>(kit: keyof KitDesign, key: K, value: KitPart[K]) => {
    const design: KitDesign = kit === 'home'
      ? { ...kitEditor.design, home: { ...kitEditor.design.home, [key]: value } }
      : { ...kitEditor.design, away: { ...kitEditor.design.away, [key]: value } }
    let notice = `${kit === 'home' ? 'Home' : 'Away'} kit saved.`
    try {
      window.localStorage.setItem(kitStorageKey, JSON.stringify(design))
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown storage error'
      notice = `Kit updated for this session, but could not be saved (${detail}).`
    }
    setKitEditor({ design, notice })
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
    <header className="club-profile-hero">
      <div className="club-profile-crest"><ClubBadge badge={getClubBadge(club.id)} name={club.name} size="large" /></div>
      <div className="club-profile-title"><span className="eyebrow">EST. {club.founded} · {club.nickname.toUpperCase()}</span><h1>{club.name}</h1><div><ClubReference name={club.name} selectedClubName={selectedClubName} onSelectClub={onSelectClub} /><span> · {club.stadium.name}</span></div></div>
      <div className="club-prestige"><strong>{club.prestige}</strong><span>PRESTIGE</span></div>
    </header>

    <nav className="club-profile-tabs" aria-label="Club profile sections">
      {sections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'club-profile-tab active' : 'club-profile-tab'} key={item} onClick={() => onSectionChange(item)} type="button">{item}</button>)}
    </nav>

    <div className="club-profile-content" key={section}>
      {section === 'Overview' && <>
        <section className="club-manager-card"><img alt={`Portrait of ${club.manager.name}`} className="club-manager-avatar" src={PLACEHOLDER_PORTRAIT} /><div className="club-manager-info"><span className="eyebrow">FIRST TEAM MANAGER</span><strong>{club.manager.name}</strong><span>{club.manager.nationality} · Age {club.manager.age}</span></div><div className="manager-reputation"><StarRating rating={club.manager.reputation} /><small>REPUTATION</small></div></section>
        <section className="club-stadium-card"><div><span className="eyebrow">HOME GROUND</span><h2>{club.stadium.name}</h2><span>Founded {club.founded} · {club.nickname}</span></div><div className="stadium-capacity"><strong>{new Intl.NumberFormat('en-GB').format(club.stadium.capacity)}</strong><span>CAPACITY</span></div><div className="stadium-attendance"><span>AVG ATTENDANCE</span><strong>{new Intl.NumberFormat('en-GB').format(club.stadium.attendance)}</strong><div><i style={{ width: `${club.stadium.attendance / club.stadium.capacity * 100}%` }} /></div></div></section>
        <div className="club-overview-metrics"><article><span>TRANSFER BUDGET</span><strong>{shortMoney(club.finances.transferBudget)}</strong><small>Available now</small></article><article><span>WAGE BUDGET</span><strong>{money(club.finances.wageBudget)}<small> / wk</small></strong><small>{money(club.finances.wageBudget - club.finances.weeklyWages)} remaining</small></article><article><span>TEAM PRESTIGE</span><strong>{club.prestige}<small> / 100</small></strong><small>National reputation</small></article></div>
        <section className="club-kits-panel">
          <div className="club-panel-heading"><div><span className="eyebrow">2026/27 MATCH KITS</span><h2>Customize your kits</h2></div></div>
          <p className="kit-customize-intro">Choose each kit's colors and pattern. Your designs are saved on this device.</p>
          {(['home', 'away'] as const).map((kit) => {
            const part = kitEditor.design[kit]
            return <div className="club-kit-editor" key={kit}>
              <div className="kit-preview" aria-label={`${kit} kit preview`} style={{ background: kitBackground(part) }}><strong>{kit.toUpperCase()}</strong></div>
              <div className="kit-editor-fields">
                <strong className="kit-editor-title">{kit === 'home' ? 'Home kit' : 'Away kit'}</strong>
                <label className="kit-color-field">Main color<span><input aria-label={`${kit} kit main color`} onChange={(event) => updateKit(kit, 'primary', event.target.value)} type="color" value={part.primary} /><code>{part.primary.toUpperCase()}</code></span></label>
                <label className="kit-color-field">Stripe color<span><input aria-label={`${kit} kit stripe color`} onChange={(event) => updateKit(kit, 'secondary', event.target.value)} type="color" value={part.secondary} /><code>{part.secondary.toUpperCase()}</code></span></label>
                <label className="kit-pattern-field">Pattern<select aria-label={`${kit} kit pattern`} onChange={(event) => {
                  const pattern = kitPatterns.find((option) => option === event.target.value)
                  if (pattern) updateKit(kit, 'pattern', pattern)
                }} value={part.pattern}>{kitPatterns.map((pattern) => <option key={pattern}>{pattern}</option>)}</select></label>
              </div>
            </div>
          })}
          {kitEditor.notice && <p className="kit-save-notice" role="status">{kitEditor.notice}</p>}
        </section>
        <section className="club-overview-squad"><div className="club-panel-heading"><div><span className="eyebrow">FIRST TEAM</span><h2>Squad snapshot</h2></div><button className="club-text-action" onClick={() => onSectionChange('Squad')} type="button">VIEW SQUAD <span>→</span></button></div><div className="squad-snapshot-row">{club.squad.slice(6, 11).map((player) => <button aria-label={`Open ${player.name} profile`} className="snapshot-player" key={player.id} onClick={() => onSelectPlayer(player)} type="button"><span>{String(player.shirtNumber).padStart(2, '0')}</span><strong>{player.name.split(' ')[0]}</strong><small>{player.position}</small></button>)}</div></section>
        <div className="club-subpage-heading"><div><span className="eyebrow">{club.name.toUpperCase()} THROUGH THE YEARS</span><h2>Club history</h2></div></div>
        <section className="club-history-block"><div className="club-panel-heading"><div><span className="eyebrow">HONOURS</span><h2>Silverware</h2></div></div><div className="club-honours-list">{club.history.achievements.map((achievement) => <article className="club-honour-row" key={`${achievement.season}-${achievement.title}`}><span className="honour-season">{achievement.season}</span><div><strong>{achievement.title}</strong><span>{achievement.detail}</span></div><span className="honour-star">★</span></article>)}</div></section>
        <section className="club-history-block"><div className="club-panel-heading"><div><span className="eyebrow">RECORD BOOK</span><h2>Legends & records</h2></div></div><div className="club-record-grid">{club.history.records.map((record) => <article className="club-record-card" key={record.title}><span>{record.title}</span><strong>{record.record}</strong><small>{record.holder}</small></article>)}</div></section>
        <section className="club-history-block"><div className="club-panel-heading"><div><span className="eyebrow">LEAGUE FINISHES</span><h2>Recent seasons</h2></div></div><div className="past-seasons">{club.history.pastSeasonPositions.map((season) => <article className="past-season-row" key={season.season}><span>{season.season}</span><div><i style={{ width: `${(season.teamCount - season.position + 1) / season.teamCount * 100}%` }} /></div><strong>{season.position}<small> / {season.teamCount}</small></strong></article>)}</div></section>
      </>}

      {section === 'Squad' && <>
        <div className="squad-view-tabs" role="tablist" aria-label="Squad groups">{(['First team', 'Reserves'] as const).map((view) => <button aria-selected={squadView === view} className={squadView === view ? 'squad-view-tab active' : 'squad-view-tab'} key={view} onClick={() => { setSquadView(view); setSquadNotice('') }} role="tab" type="button">{view}<small>{view === 'First team' ? firstTeam.length : split.reserves.length}</small></button>)}</div>
        <div className="club-subpage-heading"><div><span className="eyebrow">{squad.length} PLAYERS SHOWN</span><h2>{squadView === 'First team' ? 'First team' : 'Reserves'}</h2></div><label className="club-sort">SORT BY<select aria-label="Sort squad" onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}><option>Value</option><option>Rating</option><option>Age</option></select></label></div>
        {squadView === 'Reserves' && <p className="swap-guidance">Reserves are outside the matchday squad. Add one to the bench to replace the weakest substitute.</p>}
        {squadNotice && <p className="club-action-notice" role="status">{squadNotice}</p>}
        <div className="position-filters" aria-label="Filter positions">{(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((filter) => <button aria-pressed={positionFilter === filter} className={positionFilter === filter ? 'position-filter active' : 'position-filter'} key={filter} onClick={() => setPositionFilter(filter)} type="button">{filter}</button>)}</div>
        <div className="club-roster-list">{squad.map((player) => <div className="club-roster-item" key={player.id}><button aria-label={`Open ${player.name} profile`} className="club-roster-row" onClick={() => onSelectPlayer(player)} type="button"><span className="roster-number">{String(player.shirtNumber).padStart(2, '0')}</span><span className="roster-player"><strong>{player.name}</strong><small>{player.position} · {player.age} yrs{squadView === 'First team' ? (startingIds.has(player.id) ? ' · STARTER' : benchIds.has(player.id) ? ' · SUB' : '') : ''}{onDuty.has(player.id) ? ' · ✈ ON INTERNATIONAL DUTY' : ''}</small></span><span className="roster-stat"><strong>{player.overall}</strong><small>RAT</small></span><span className="roster-stat"><strong>{shortMoney(player.value)}</strong><small>VALUE</small></span></button>{squadView === 'Reserves' && <button aria-label={`Add ${player.name} to the bench`} className="tactics-action" onClick={() => { const dropped = promoteReserve(club.squad, player.id); setSquadNotice(dropped ? `${player.name} joins the bench; ${dropped} moves to the reserves.` : 'Could not update the bench.') }} type="button">Add to bench</button>}</div>)}{squad.length === 0 && <p className="empty-note">No players match this filter.</p>}</div>
      </>}

      {section === 'Tactics' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">FIRST XI · MATCH SHAPE</span><h2>{club.formation} formation</h2></div><span className="club-tactic-tag">ATTACKING</span></div>
        <div className="club-tactic-pitch" aria-label={`${club.name} 4-3-3 formation`}><div className="club-pitch-boundary" /><div className="club-pitch-halfway" /><div className="club-pitch-circle" /><div className="club-pitch-box top" /><div className="club-pitch-box bottom" />
          {formation.map(({ player, role, x, y }) => <PlayerButton key={player.id} player={player} onSelectPlayer={onSelectPlayer} role={role} x={x} y={y} />)}
        </div><p className="club-pitch-caption">Select a player to open their profile.</p>
      </>}

      {section === 'Staff' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">COACHING & BACKROOM</span><h2>Club staff</h2></div><span className="club-tactic-tag">{club.staff.length} PROFILES</span></div>
        <div className="club-staff-list">{club.staff.map((staff) => <button className="club-staff-row" key={staff.id} onClick={() => onSelectPersonnel(staff.profileId)} type="button"><img alt={`Portrait of ${staff.name}`} className="club-staff-avatar" src={PLACEHOLDER_PORTRAIT} /><span className="club-staff-person"><strong>{staff.name}</strong><small>{staff.role}</small></span><span className="club-staff-nationality">{staff.nationality}</span><span className="club-staff-chevron">→</span></button>)}</div>
      </>}

      {section === 'Sponsorship' && <ClubSponsorship />}

      {section === 'Finances' && <ClubFinances />}

      {section === 'Board' && <BoardOverview embedded />}

      {section === 'Fixtures' && <ClubFixturesSection fixtures={matches.filter((match) => match.homeClubId === club.id || match.awayClubId === club.id)} onSelectMatch={onSelectMatch} />}

      {section === 'Facilities' && <ClubFacilities />}
    </div>
  </div>
}

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
function parseDate(date: string) { return new Date(`${date}T12:00:00`) }

function ClubFixturesSection({ fixtures, onSelectMatch }: { fixtures: MatchInfo[]; onSelectMatch: (id: string) => void }) {
  const sorted = [...fixtures].sort((a, b) => `${a.date}${a.kickOff}`.localeCompare(`${b.date}${b.kickOff}`))
  const groups: { label: string; list: MatchInfo[] }[] = []
  const completed = sorted.filter((m) => m.status === 'Completed')
  const live = sorted.filter((m) => m.status === 'Live')
  const upcoming = sorted.filter((m) => m.status === 'Upcoming')
  if (completed.length) groups.push({ label: 'Results', list: completed })
  if (live.length) groups.push({ label: 'Live', list: live })
  if (upcoming.length) groups.push({ label: 'Upcoming', list: upcoming })

  return (
    <>
      <div className="club-subpage-heading">
        <div><span className="eyebrow">SCHEDULE · {fixtures.length} MATCHES</span><h2>Fixtures &amp; results</h2></div>
      </div>
      {groups.map(({ label, list }) => (
        <section className="club-fixtures-group" key={label}>
          <header className="club-fixtures-group-header">
            <i className="fixture-club-crest">{label.slice(0, 1)}</i>
            <strong>{label}</strong>
            <span>{list.length}</span>
          </header>
          {list.map((match) => {
            const done = match.status === 'Completed'
            const live = match.status === 'Live'
            const homeOwn = match.homeClubId === club.id
            const awayOwn = match.awayClubId === club.id
            return (
              <div className={`club-fixture-row ${match.status.toLowerCase()}`} key={match.id}>
                <span className="club-fixture-competition">{match.competition}</span>
                <button
                  aria-label={`Open ${match.homeClubName} vs ${match.awayClubName} match details`}
                  className="club-fixture-row-main"
                  onClick={() => onSelectMatch(match.id)}
                  type="button"
                >
                  <span className={`club-fixture-team ${homeOwn ? 'own' : ''}`}>
                    <i className={`fixture-club-crest ${homeOwn ? '' : 'away'}`}>{match.homeClubName.slice(0, 1)}</i>
                    <b>{match.homeClubName}</b>
                  </span>
                  <span className="club-fixture-center">
                    <span className="club-fixture-time">
                      <strong>{live ? 'LIVE' : done ? 'FT' : match.kickOff}</strong>
                      <small>{weekday.format(parseDate(match.date)).toUpperCase()} {dayMonth.format(parseDate(match.date))}</small>
                    </span>
                    <span className="club-fixture-score">
                      <strong>{match.score?.home ?? '-'}</strong>
                      <em>-</em>
                      <strong>{match.score?.away ?? '-'}</strong>
                    </span>
                  </span>
                  <span className={`club-fixture-team away-side ${awayOwn ? 'own' : ''}`}>
                    <b>{match.awayClubName}</b>
                    <i className={`fixture-club-crest ${awayOwn ? '' : 'away'}`}>{match.awayClubName.slice(0, 1)}</i>
                  </span>
                </button>
              </div>
            )
          })}
        </section>
      ))}
    </>
  )
}
