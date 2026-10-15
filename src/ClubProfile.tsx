import { useState } from 'react'
import { club, getClubBadge, matchFixtures } from './data/mockData'
import ClubBadge from './ClubBadge'
import type { AcademyProspect, MatchInfo, Player, YouthManager } from './types/game'
import { ACADEMY_MAX_SIZE, SENIOR_SQUAD_MAX, generateIntake, generateYouthManager, useAcademy } from './utils/academy'
import { resolveFlagCode } from './countryFlagUtils'

export type ClubSection = 'Overview' | 'Squad' | 'Tactics' | 'Staff' | 'Sponsorship' | 'Fixtures' | 'Facilities' | 'Academy'

type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'
type SortMode = 'Value' | 'Rating' | 'Age'

const sections: ClubSection[] = ['Overview', 'Squad', 'Tactics', 'Staff', 'Sponsorship', 'Fixtures', 'Facilities', 'Academy']
const FACILITY_COSTS = { training: 2500000, youth: 1800000, stadium: 3200000 }
const money = (amount: number) => `£${new Intl.NumberFormat('en-GB').format(amount)}`
const shortMoney = (amount: number) => `£${(amount / 1000000).toFixed(1)}m`
const displayDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

interface ClubProfileProps {
  section: ClubSection
  selectedClubName: string | null
  onSectionChange: (section: ClubSection) => void
  onSelectClub: (name: string) => void
  onSelectPlayer: (player: Player) => void
  onSelectPersonnel: (idOrName: string) => void
  onSelectMatch: (id: string) => void
}

function Flag({ code }: { code: string }) {
  return <span aria-hidden="true" className={`fi fi-${resolveFlagCode(code)}`} />
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

export default function ClubProfile({ section, selectedClubName, onSectionChange, onSelectClub, onSelectPlayer, onSelectPersonnel, onSelectMatch }: ClubProfileProps) {
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('Value')
  const [, refresh] = useState(0)
  const { trainingLevel, youthLevel, stadiumLevel } = club.facilities
  const balance = club.finances.balance
  const [academy, setAcademy] = useAcademy(club.id, youthLevel)
  const [academyNotice, setAcademyNotice] = useState('')
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

  const upgradeFacility = (facility: 'training' | 'youth' | 'stadium') => {
    const levelKey = facility === 'training' ? 'trainingLevel' : facility === 'youth' ? 'youthLevel' : 'stadiumLevel'
    const cost = FACILITY_COSTS[facility]
    if (club.facilities[levelKey] >= club.facilities.maxLevel || club.finances.balance < cost) return
    club.facilities[levelKey] += 1
    club.finances.balance -= cost
    refresh((count) => count + 1)
  }

  const promoteProspect = (prospect: AcademyProspect) => {
    if (club.squad.length >= SENIOR_SQUAD_MAX) { setAcademyNotice('Senior squad is full (' + SENIOR_SQUAD_MAX + ').'); return }
    const shirtNumber = Math.max(...club.squad.map((player) => player.shirtNumber)) + 1
    club.squad.push({ ...prospect.player, shirtNumber })
    setAcademy({ ...academy, prospects: academy.prospects.filter((item) => item.player.id !== prospect.player.id) })
    setAcademyNotice(prospect.player.name + ' promoted to the senior squad.')
  }

  const releaseProspect = (prospect: AcademyProspect) => {
    setAcademy({ ...academy, prospects: academy.prospects.filter((item) => item.player.id !== prospect.player.id) })
    setAcademyNotice(prospect.player.name + ' released.')
  }

  const fireManager = () => {
    setAcademy({ ...academy, manager: null })
    setAcademyNotice('Youth manager dismissed. Intakes will be weaker until you hire a replacement.')
  }

  const hireManager = (candidate: YouthManager) => {
    const replacement = generateYouthManager(club.id + ':candidate:' + academy.candidates.length + ':' + candidate.id)
    setAcademy({ ...academy, manager: candidate, candidates: academy.candidates.filter((item) => item.id !== candidate.id).concat(academy.manager ? [academy.manager] : [replacement]) })
    setAcademyNotice(candidate.name + ' appointed as Academy Director.')
  }

  const runIntake = () => {
    const intake = generateIntake(club.id, academy.nextIntakeYear, youthLevel, academy.manager)
    const roster = [...academy.prospects, ...intake].sort((first, second) => second.player.potential - first.player.potential).slice(0, ACADEMY_MAX_SIZE)
    setAcademy({ ...academy, prospects: roster, nextIntakeYear: academy.nextIntakeYear + 1, intakeCount: academy.intakeCount + 1 })
    setAcademyNotice(intake.length + ' new prospects joined from the ' + academy.nextIntakeYear + ' intake.')
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
        <section className="club-manager-card"><div className="club-manager-avatar">{club.manager.name.split(' ').map((part) => part[0]).join('')}</div><div className="club-manager-info"><span className="eyebrow">FIRST TEAM MANAGER</span><strong>{club.manager.name}</strong><span>{club.manager.nationality} · Age {club.manager.age}</span></div><div className="manager-reputation"><StarRating rating={club.manager.reputation} /><small>REPUTATION</small></div></section>
        <section className="club-stadium-card"><div><span className="eyebrow">HOME GROUND</span><h2>{club.stadium.name}</h2><span>Founded {club.founded} · {club.nickname}</span></div><div className="stadium-capacity"><strong>{new Intl.NumberFormat('en-GB').format(club.stadium.capacity)}</strong><span>CAPACITY</span></div><div className="stadium-attendance"><span>AVG ATTENDANCE</span><strong>{new Intl.NumberFormat('en-GB').format(club.stadium.attendance)}</strong><div><i style={{ width: `${club.stadium.attendance / club.stadium.capacity * 100}%` }} /></div></div></section>
        <div className="club-overview-metrics"><article><span>TRANSFER BUDGET</span><strong>{shortMoney(club.finances.transferBudget)}</strong><small>Available now</small></article><article><span>WAGE BUDGET</span><strong>{money(club.finances.wageBudget)}<small> / wk</small></strong><small>{money(club.finances.wageBudget - club.finances.weeklyWages)} remaining</small></article><article><span>TEAM PRESTIGE</span><strong>{club.prestige}<small> / 100</small></strong><small>National reputation</small></article></div>
        <section className="club-kits-panel"><div className="club-panel-heading"><div><span className="eyebrow">2026/27 MATCH KITS</span><h2>Club colours</h2></div></div><div className="club-kits-row"><div className="kit-preview home"><i /><i /><i /><strong>HOME</strong></div><div className="kit-preview away"><i /><i /><i /><strong>AWAY</strong></div><div className="club-kit-copy"><strong>{club.name} identity</strong><span>{club.colors.primary} and {club.colors.secondary}</span><span>{club.stadium.name} · {club.stadium.capacity.toLocaleString()} seats</span></div></div></section>
        <section className="club-overview-squad"><div className="club-panel-heading"><div><span className="eyebrow">FIRST TEAM</span><h2>Squad snapshot</h2></div><button className="club-text-action" onClick={() => onSectionChange('Squad')} type="button">VIEW SQUAD <span>→</span></button></div><div className="squad-snapshot-row">{club.squad.slice(6, 11).map((player) => <button aria-label={`Open ${player.name} profile`} className="snapshot-player" key={player.id} onClick={() => onSelectPlayer(player)} type="button"><span>{String(player.shirtNumber).padStart(2, '0')}</span><strong>{player.name.split(' ')[0]}</strong><small>{player.position}</small></button>)}</div></section>
        <div className="club-subpage-heading"><div><span className="eyebrow">{club.name.toUpperCase()} THROUGH THE YEARS</span><h2>Club history</h2></div></div>
        <section className="club-history-block"><div className="club-panel-heading"><div><span className="eyebrow">HONOURS</span><h2>Silverware</h2></div></div><div className="club-honours-list">{club.history.achievements.map((achievement) => <article className="club-honour-row" key={`${achievement.season}-${achievement.title}`}><span className="honour-season">{achievement.season}</span><div><strong>{achievement.title}</strong><span>{achievement.detail}</span></div><span className="honour-star">★</span></article>)}</div></section>
        <section className="club-history-block"><div className="club-panel-heading"><div><span className="eyebrow">RECORD BOOK</span><h2>Legends & records</h2></div></div><div className="club-record-grid">{club.history.records.map((record) => <article className="club-record-card" key={record.title}><span>{record.title}</span><strong>{record.record}</strong><small>{record.holder}</small></article>)}</div></section>
        <section className="club-history-block"><div className="club-panel-heading"><div><span className="eyebrow">LEAGUE FINISHES</span><h2>Recent seasons</h2></div></div><div className="past-seasons">{club.history.pastSeasonPositions.map((season) => <article className="past-season-row" key={season.season}><span>{season.season}</span><div><i style={{ width: `${(season.teamCount - season.position + 1) / season.teamCount * 100}%` }} /></div><strong>{season.position}<small> / {season.teamCount}</small></strong></article>)}</div></section>
      </>}

      {section === 'Squad' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">{squad.length} PLAYERS SHOWN</span><h2>First team</h2></div><label className="club-sort">SORT BY<select aria-label="Sort squad" onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}><option>Value</option><option>Rating</option><option>Age</option></select></label></div>
        <div className="position-filters" aria-label="Filter positions">{(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((filter) => <button aria-pressed={positionFilter === filter} className={positionFilter === filter ? 'position-filter active' : 'position-filter'} key={filter} onClick={() => setPositionFilter(filter)} type="button">{filter}</button>)}</div>
        <div className="club-roster-list">{squad.map((player) => <button aria-label={`Open ${player.name} profile`} className="club-roster-row" key={player.id} onClick={() => onSelectPlayer(player)} type="button"><span className="roster-number">{String(player.shirtNumber).padStart(2, '0')}</span><span className="roster-player"><strong>{player.name}</strong><small>{player.position} · {player.age} yrs</small></span><span className="roster-stat"><strong>{player.overall}</strong><small>RAT</small></span><span className="roster-stat"><strong>{shortMoney(player.value)}</strong><small>VALUE</small></span></button>)}</div>
      </>}

      {section === 'Tactics' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">FIRST XI · MATCH SHAPE</span><h2>{club.formation} formation</h2></div><span className="club-tactic-tag">ATTACKING</span></div>
        <div className="club-tactic-pitch" aria-label={`${club.name} 4-3-3 formation`}><div className="club-pitch-boundary" /><div className="club-pitch-halfway" /><div className="club-pitch-circle" /><div className="club-pitch-box top" /><div className="club-pitch-box bottom" />
          {formation.map(({ player, role, x, y }) => <PlayerButton key={player.id} player={player} onSelectPlayer={onSelectPlayer} role={role} x={x} y={y} />)}
        </div><p className="club-pitch-caption">Select a player to open their profile.</p>
      </>}

      {section === 'Staff' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">COACHING & BACKROOM</span><h2>Club staff</h2></div><span className="club-tactic-tag">{club.staff.length} PROFILES</span></div>
        <div className="club-staff-list">{club.staff.map((staff) => <button className="club-staff-row" key={staff.id} onClick={() => onSelectPersonnel(staff.profileId)} type="button"><span className="club-staff-avatar">{staff.name.split(' ').map((part) => part[0]).join('')}</span><span className="club-staff-person"><strong>{staff.name}</strong><small>{staff.role}</small></span><span className="club-staff-nationality">{staff.nationality}</span><span className="club-staff-chevron">→</span></button>)}</div>
      </>}

      {section === 'Sponsorship' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">2026/27 SEASON</span><h2>Sponsorship</h2></div><span className="club-tactic-tag">{shortMoney(club.finances.sponsorshipIncomeAnnual)} / YR</span></div>
        {(() => {
          const mainSponsor = [...club.sponsors].sort((first, second) => second.valueAnnual - first.valueAnnual)[0]
          const shirtSponsor = club.sponsors.find((sponsor) => sponsor.category === 'Front of shirt')
          const stadiumRights = Math.round(club.stadium.capacity * 85 / 10000) * 10000
          return <>
            <section className="club-sponsors-panel"><div className="club-panel-heading"><div><span className="eyebrow">PARTNERS</span><h2>Main & shirt sponsors</h2></div></div>
              {mainSponsor && <article className="club-sponsor-row"><div><span className="eyebrow">{mainSponsor === shirtSponsor ? 'MAIN & SHIRT SPONSOR' : 'MAIN SPONSOR'}</span><strong>{mainSponsor.name}</strong><span>{mainSponsor.category} · ends {displayDate(mainSponsor.endDate)}</span></div><strong>{shortMoney(mainSponsor.valueAnnual)}<small> / yr</small></strong></article>}
              {shirtSponsor && shirtSponsor !== mainSponsor && <article className="club-sponsor-row"><div><span className="eyebrow">SHIRT SPONSOR</span><strong>{shirtSponsor.name}</strong><span>Front of shirt · ends {displayDate(shirtSponsor.endDate)}</span></div><strong>{shortMoney(shirtSponsor.valueAnnual)}<small> / yr</small></strong></article>}
              {club.sponsors.filter((sponsor) => sponsor !== mainSponsor && sponsor !== shirtSponsor).map((sponsor) => <article className="club-sponsor-row" key={sponsor.name}><div><span className="eyebrow">{sponsor.category.toUpperCase()}</span><strong>{sponsor.name}</strong><span>ends {displayDate(sponsor.endDate)}</span></div><strong>{shortMoney(sponsor.valueAnnual)}<small> / yr</small></strong></article>)}
            </section>
            <section className="club-sponsors-panel"><div className="club-panel-heading"><div><span className="eyebrow">NAMING RIGHTS</span><h2>Stadium rights</h2></div></div><article className="club-sponsor-row"><div><span className="eyebrow">{club.stadium.name.toUpperCase()}</span><strong>Naming rights unsold</strong><span>Estimated offer for {club.stadium.capacity.toLocaleString()} seats</span></div><strong>{shortMoney(stadiumRights)}<small> / yr</small></strong></article></section>
          </>
        })()}
        <section className="club-finance-panel"><div className="club-panel-heading"><div><span className="eyebrow">REVENUE & SPEND</span><h2>Income streams</h2></div></div><div className="finance-line"><span>Sponsorship income <small>per season</small></span><strong>{shortMoney(club.finances.sponsorshipIncomeAnnual)}</strong></div><div className="finance-line"><span>Ticket sales <small>per home match</small></span><strong>{money(club.finances.ticketSalesPerHomeMatch)}</strong></div><div className="finance-line"><span>Weekly wages <small>of {money(club.finances.wageBudget)} budget</small></span><strong>{money(club.finances.weeklyWages)}</strong></div><div className="finance-line"><span>Monthly operations</span><strong>{money(club.finances.operationsPerMonth)}</strong></div></section>
      </>}

      {section === 'Fixtures' && <ClubFixturesSection fixtures={matchFixtures} onSelectMatch={onSelectMatch} />}

      {section === 'Facilities' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">INVEST IN THE FUTURE</span><h2>Facilities</h2></div></div>
        <section className="club-balance-card"><span className="eyebrow">UPGRADE BUDGET</span><strong>{shortMoney(balance)}</strong><div className="balance-columns"><span>Transfer fund <b>{shortMoney(club.finances.transferBudget)}</b></span><span>Monthly operations <b>{money(club.finances.operationsPerMonth)}</b></span></div></section>
        <section className="club-facilities-panel"><div className="club-panel-heading"><div><span className="eyebrow">INFRASTRUCTURE</span><h2>Club facilities</h2></div></div>
          <FacilityUpgrade name="Training ground" level={trainingLevel} maxLevel={club.facilities.maxLevel} cost={FACILITY_COSTS.training} canAfford={balance >= FACILITY_COSTS.training} onUpgrade={() => upgradeFacility('training')} />
          <FacilityUpgrade name="Youth setup" level={youthLevel} maxLevel={club.facilities.maxLevel} cost={FACILITY_COSTS.youth} canAfford={balance >= FACILITY_COSTS.youth} onUpgrade={() => upgradeFacility('youth')} />
          <FacilityUpgrade name="Stadium" level={stadiumLevel} maxLevel={club.facilities.maxLevel} cost={FACILITY_COSTS.stadium} canAfford={balance >= FACILITY_COSTS.stadium} onUpgrade={() => upgradeFacility('stadium')} />
        </section>
      </>}

      {section === 'Academy' && <>
        <div className="club-subpage-heading"><div><span className="eyebrow">YOUTH ACADEMY & INTAKE</span><h2>Academy</h2></div><span className="club-tactic-tag">LEVEL {youthLevel}</span></div>
        {academyNotice && <p className="academy-notice" role="status">{academyNotice}</p>}
        <section className="academy-manager-card"><div className="club-panel-heading"><div><span className="eyebrow">ACADEMY DIRECTOR</span><h2>Youth manager</h2></div></div>
          {academy.manager ? <>
            <div className="academy-manager-head"><span className="club-manager-avatar">{academy.manager.name.split(' ').map((part) => part[0]).join('')}</span><div><strong>{academy.manager.name}</strong><span><Flag code={academy.manager.nationalityCode} /> {academy.manager.nationality} · Age {academy.manager.age}</span></div></div>
            <dl className="academy-manager-stats"><div><dt>Philosophy</dt><dd>{academy.manager.philosophy}</dd></div><div><dt>Coaching</dt><dd>{academy.manager.coachingRating}<small> / 100</small></dd></div><div><dt>Scouting network</dt><dd>{academy.manager.scoutingNetwork}%</dd></div><div><dt>Wage</dt><dd>{money(academy.manager.weeklyWage)}<small> / wk</small></dd></div></dl>
            <button className="academy-action danger" onClick={fireManager} type="button">Dismiss manager</button>
          </> : <p className="academy-empty">Vacant. Intake quality and scouting reach are reduced.</p>}
          <div className="academy-candidates"><span className="eyebrow">{academy.manager ? 'REPLACE WITH' : 'CANDIDATES'}</span>{academy.candidates.map((candidate) => <article className="academy-candidate" key={candidate.id}><div><strong>{candidate.name}</strong><small><Flag code={candidate.nationalityCode} /> {candidate.nationality} · {candidate.philosophy}</small><small>Coaching {candidate.coachingRating} · Scouting {candidate.scoutingNetwork}% · {money(candidate.weeklyWage)}/wk</small></div><button className="academy-action" onClick={() => hireManager(candidate)} type="button">{academy.manager ? 'Replace' : 'Hire'}</button></article>)}</div>
        </section>
        <section className="academy-intake-card"><div><span className="eyebrow">ANNUAL YOUTH INTAKE</span><strong>1 Jul {academy.nextIntakeYear}</strong><small>{academy.intakeCount} intake{academy.intakeCount === 1 ? '' : 's'} completed · quality driven by Youth level {youthLevel} and your scouting network</small></div><button className="academy-action" onClick={runIntake} type="button">Run intake now</button></section>
        <section className="academy-roster"><div className="club-panel-heading"><div><span className="eyebrow">AGED 15–18</span><h2>Prospects</h2></div><span>{academy.prospects.length} / {ACADEMY_MAX_SIZE}</span></div>
          {academy.prospects.length === 0 && <p className="academy-empty">No prospects. Run an intake to find new talent.</p>}
          {academy.prospects.map((prospect) => <article className="academy-prospect" key={prospect.player.id}>
            <button aria-label={`Open ${prospect.player.name} profile`} className="academy-prospect-main" onClick={() => onSelectPlayer(prospect.player)} type="button"><span className="academy-pot"><strong>{prospect.potentialLow} - {prospect.potentialHigh}</strong><small>POT</small></span><span className="roster-player"><strong>{prospect.player.name}</strong><small>{prospect.player.position} · {prospect.player.age} yrs · OVR {prospect.player.overall}</small><small><Flag code={prospect.countryCode} /> {prospect.country} · {prospect.pace} development</small></span></button>
            <div className="academy-prospect-actions"><button className="academy-action" onClick={() => promoteProspect(prospect)} type="button">Promote to Senior Squad</button><button className="academy-action danger" onClick={() => releaseProspect(prospect)} type="button">Release</button></div>
          </article>)}
        </section>
      </>}
    </div>
  </div>
}

function FacilityUpgrade({ name, level, maxLevel, cost, canAfford, onUpgrade }: { name: string; level: number; maxLevel: number; cost: number; canAfford: boolean; onUpgrade: () => void }) {
  return <article className="facility-row"><div className="facility-level-mark">{level}</div><div className="facility-info"><strong>{name}</strong><span>Level {level} of {maxLevel}</span><div className="facility-levels">{Array.from({ length: maxLevel }, (_, index) => <i className={index < level ? 'filled' : ''} key={index} />)}</div></div><button aria-label={`Upgrade ${name} for ${shortMoney(cost)}`} className="facility-upgrade" disabled={level >= maxLevel || !canAfford} onClick={onUpgrade} type="button">{level >= maxLevel ? 'MAX' : `+ ${shortMoney(cost)}`}</button></article>
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
