import { useState } from 'react'
import { club } from './data/mockData'
import type { AcademyProspect, Player, PlayerPosition, YouthManager } from './types/game'
import { ACADEMY_MAX_SIZE, MAX_ACTIVE_MISSIONS, SCOUT_REGIONS, SENIOR_SQUAD_MAX, advanceDays, generateIntake, generateYouthManager, startMission, useAcademy, type PositionGroup, type ScoutMission } from './utils/academy'
import { resolveFlagCode } from './countryFlagUtils'
import { PLACEHOLDER_PORTRAIT } from './portrait'
import { intakeScoutingBonus } from './state/facilities'

type AcademySection = 'Overview' | 'Scouting' | 'Players' | 'Progress'
type PositionFilter = 'ALL' | PositionGroup
type SortMode = 'Potential' | 'Overall' | 'Age'

const sections: AcademySection[] = ['Overview', 'Scouting', 'Players', 'Progress']
const subtitles: Record<AcademySection, string> = {
  Overview: 'Find · Develop · Promote · Build Your Future',
  Scouting: 'Scout. Discover. Sign.',
  Players: 'Manage. Track. Develop.',
  Progress: 'Track Growth. Improve Performance.',
}
const groups: PositionGroup[] = ['GK', 'DEF', 'MID', 'FWD']
const money = (amount: number) => `£${new Intl.NumberFormat('en-GB').format(amount)}`
const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2)
const groupOf = (position: PlayerPosition): PositionGroup => position === 'GK' ? 'GK' : position.startsWith('D') && position !== 'DM' ? 'DEF' : position === 'DM' || position.startsWith('M') ? 'MID' : 'FWD'
const shortPos = (position: PlayerPosition) => ({ 'GK': 'GK', 'D (C)': 'CB', 'D (L)': 'LB', 'D (R)': 'RB', 'DM': 'DM', 'M (C)': 'CM', 'M (L)': 'LM', 'M (R)': 'RM', 'AM (C)': 'AM', 'ST (C)': 'ST' } as Record<PlayerPosition, string>)[position]
const statusOf = (prospect: AcademyProspect) => prospect.player.overall >= 60 || prospect.player.age >= 18 ? { label: 'Ready', tone: 'ready' } : { label: 'In Training', tone: 'training' }

function Flag({ code }: { code: string }) {
  return <span aria-hidden="true" className={`fi fi-${resolveFlagCode(code)}`} />
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return <span aria-hidden="true" className="ah-avatar" style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials(name)}</span>
}

function MissionRow({ mission }: { mission: ScoutMission }) {
  return <article className="ah-mission-row">
    <span className="ah-mission-flag"><Flag code={mission.regionCode} /></span>
    <div>
      <div className="ah-mission-top"><strong>{mission.region} ({mission.domestic ? 'Domestic' : 'International'})</strong><small>{mission.daysLeft} days left</small></div>
      <small>Positions: {mission.groups.join(', ')} · Found {mission.found}</small>
      <div className="ah-bar"><i style={{ width: `${mission.found / mission.target * 100}%` }} /></div>
    </div>
    <b className="ah-mission-count">{mission.found}/{mission.target}</b>
  </article>
}

interface AcademyHubProps {
  onSelectPlayer: (player: Player) => void
  onSelectCountry: (country: string) => void
}

export default function AcademyHub({ onSelectPlayer, onSelectCountry }: AcademyHubProps) {
  const [section, setSection] = useState<AcademySection>('Overview')
  const [academy, setAcademy] = useAcademy(club.id, club.facilities.youthLevel)
  const { youthLevel } = club.facilities
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('Potential')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [regionCode, setRegionCode] = useState('NGA')
  const [missionGroups, setMissionGroups] = useState<PositionGroup[]>(['MID'])

  const prospects = academy.prospects
  const focus = prospects.find((item) => item.player.id === focusId) ?? prospects[0] ?? null
  const topProspects = [...prospects].sort((first, second) => second.player.potential - first.player.potential).slice(0, 6)
  const visible = prospects.filter((item) => (positionFilter === 'ALL' || groupOf(item.player.position) === positionFilter) && item.player.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((first, second) => sortMode === 'Age' ? first.player.age - second.player.age : sortMode === 'Overall' ? second.player.overall - first.player.overall : second.player.potential - first.player.potential)
  const readyCount = prospects.filter((item) => statusOf(item).tone === 'ready').length
  const rosterFull = prospects.length >= ACADEMY_MAX_SIZE
  const missionsFull = academy.missions.length >= MAX_ACTIVE_MISSIONS

  const openProgress = (prospect: AcademyProspect) => { setFocusId(prospect.player.id); setSection('Progress') }
  const goTo = (next: AcademySection) => { setNotice(''); setSection(next) }

  const promoteProspect = (prospect: AcademyProspect) => {
    if (club.squad.length >= SENIOR_SQUAD_MAX) { setNotice(`Senior squad is full (${SENIOR_SQUAD_MAX}).`); return }
    const shirtNumber = Math.max(...club.squad.map((player) => player.shirtNumber)) + 1
    club.squad.push({ ...prospect.player, shirtNumber })
    setAcademy({ ...academy, prospects: prospects.filter((item) => item.player.id !== prospect.player.id), promotedCount: academy.promotedCount + 1 })
    setNotice(`${prospect.player.name} promoted to the senior squad.`)
  }

  const releaseProspect = (prospect: AcademyProspect) => {
    setAcademy({ ...academy, prospects: prospects.filter((item) => item.player.id !== prospect.player.id), releasedCount: academy.releasedCount + 1 })
    setNotice(`${prospect.player.name} released.`)
  }

  const fireManager = () => {
    setAcademy({ ...academy, manager: null })
    setNotice('Youth manager dismissed. Intakes will be weaker until you hire a replacement.')
  }

  const hireManager = (candidate: YouthManager) => {
    const replacement = generateYouthManager(`${club.id}:candidate:${academy.candidates.length}:${candidate.id}`)
    setAcademy({ ...academy, manager: candidate, candidates: academy.candidates.filter((item) => item.id !== candidate.id).concat(academy.manager ? [academy.manager] : [replacement]) })
    setNotice(`${candidate.name} appointed as Academy Director.`)
  }

  const runIntake = () => {
    const intake = generateIntake(club.id, academy.nextIntakeYear, youthLevel, academy.manager, intakeScoutingBonus(club.facilities.scoutingLevel))
    const roster = [...prospects, ...intake].sort((first, second) => second.player.potential - first.player.potential).slice(0, ACADEMY_MAX_SIZE)
    setAcademy({ ...academy, prospects: roster, nextIntakeYear: academy.nextIntakeYear + 1, intakeCount: academy.intakeCount + 1 })
    setNotice(`${intake.length} new prospects joined from the ${academy.nextIntakeYear} intake.`)
  }

  const beginMission = () => {
    if (missionsFull) { setNotice(`You can run ${MAX_ACTIVE_MISSIONS} missions at a time.`); return }
    if (missionGroups.length === 0) { setNotice('Pick at least one position to scout.'); return }
    setAcademy(startMission(academy, regionCode, missionGroups))
    setNotice(`Scouts sent to ${SCOUT_REGIONS.find((item) => item.code === regionCode)?.name}.`)
  }

  const passWeek = () => {
    const before = academy.reports.length
    const next = advanceDays(academy, club.id, youthLevel, 7)
    setAcademy(next)
    const added = next.reports.length - before
    setNotice(added > 0 ? `A mission finished: ${added} new scouting report${added === 1 ? '' : 's'}.` : 'A week passed. Scouts are still working.')
  }

  const signReport = (reportId: string) => {
    const report = academy.reports.find((item) => item.id === reportId)
    if (!report) return
    if (rosterFull) { setNotice(`Academy is full (${ACADEMY_MAX_SIZE}). Release a player first.`); return }
    setAcademy({ ...academy, prospects: [...prospects, report.prospect], reports: academy.reports.filter((item) => item.id !== reportId) })
    setNotice(`${report.prospect.player.name} signed to the academy.`)
  }

  const dismissReport = (reportId: string) => setAcademy({ ...academy, reports: academy.reports.filter((item) => item.id !== reportId) })

  const toggleGroup = (group: PositionGroup) => setMissionGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group])

  return <div className="academy-hub">
    <header className="ah-heading"><h1>Academy Hub</h1><p>{subtitles[section]}</p></header>

    <nav className="club-profile-tabs ah-tabs" aria-label="Academy sections">
      {sections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'club-profile-tab active' : 'club-profile-tab'} key={item} onClick={() => goTo(item)} type="button">{item}</button>)}
    </nav>

    {notice && <p className="academy-notice" role="status">{notice}</p>}

    {section === 'Overview' && <>
      <section className="ah-hero">
        <div><h2>Academy Overview</h2><p>Nurture talent. Build champions.</p></div>
        <div className="ah-stats">
          <article><strong>{prospects.length}</strong><span>Total Players</span></article>
          <article><strong>{readyCount}</strong><span>Ready to Promote</span></article>
          <article><strong>{academy.promotedCount}</strong><span>Promoted</span></article>
          <article><strong>{academy.releasedCount}</strong><span>Released</span></article>
        </div>
      </section>

      <section className="ah-panel">
        <h3>Quick Actions</h3>
        <div className="ah-quick">
          <button onClick={() => goTo('Scouting')} type="button"><i>⌕</i><span>Scout Players</span></button>
          <button disabled={rosterFull} onClick={runIntake} type="button"><i>＋</i><span>Run Intake</span></button>
          <button onClick={() => goTo('Players')} type="button"><i>☰</i><span>Manage Players</span></button>
          <button onClick={() => goTo('Progress')} type="button"><i>▮</i><span>View Progress</span></button>
        </div>
      </section>

      <section className="ah-panel">
        <div className="ah-panel-head"><h3>Top Prospects</h3><button className="club-text-action" onClick={() => goTo('Players')} type="button">SEE ALL <span>→</span></button></div>
        {topProspects.length === 0 && <p className="academy-empty">No prospects. Run an intake to find new talent.</p>}
        <div className="ah-prospect-strip">
          {topProspects.map((item) => <button aria-label={`Open ${item.player.name} progress`} className="ah-prospect-card" key={item.player.id} onClick={() => openProgress(item)} type="button">
            <Avatar name={item.player.name} size={52} /><b className="ah-ovr small">{item.player.overall}</b>
            <strong>{item.player.name}</strong><small>{shortPos(item.player.position)} · {item.player.age}y</small><Flag code={item.countryCode} />
          </button>)}
        </div>
      </section>

      {academy.missions.length > 0 && <section className="ah-panel">
        <div className="ah-panel-head"><h3>Active Scout Missions</h3><button className="club-text-action" onClick={() => goTo('Scouting')} type="button">SEE ALL <span>→</span></button></div>
        {academy.missions.slice(0, 2).map((mission) => <MissionRow key={mission.id} mission={mission} />)}
      </section>}

      <section className="ah-panel">
        <div className="ah-panel-head"><h3>Academy Director</h3><span className="ah-muted">Youth Lvl {youthLevel} · Next intake 1 Jul {academy.nextIntakeYear}</span></div>
        {academy.manager ? <>
          <div className="club-manager-card ah-director-card">
            <img alt={`Portrait of ${academy.manager.name}`} className="club-manager-avatar" src={PLACEHOLDER_PORTRAIT} />
            <div className="club-manager-info"><span className="eyebrow">ACADEMY DIRECTOR</span><strong>{academy.manager.name}</strong><span><Flag code={academy.manager.nationalityCode} /> {academy.manager.nationality} · Age {academy.manager.age}</span></div>
            <div className="manager-reputation"><strong className="ah-director-rating">{academy.manager.coachingRating}</strong><small>COACHING</small></div>
          </div>
          <p className="ah-director-philosophy">Philosophy · {academy.manager.philosophy}</p>
          <dl className="ah-metrics">
            <div><dt>Coaching</dt><dd>{academy.manager.coachingRating}</dd></div>
            <div><dt>Scouting network</dt><dd>{academy.manager.scoutingNetwork}%</dd></div>
            <div><dt>Wage</dt><dd>{money(academy.manager.weeklyWage)}/wk</dd></div>
          </dl>
        </> : <p className="academy-empty">Vacant. Intake quality and scouting reach are reduced.</p>}
        <details className="ah-candidates">
          <summary>{academy.manager ? 'Replace director' : 'Hire a director'}</summary>
          {academy.candidates.map((candidate) => <article key={candidate.id}>
            <img alt={`Portrait of ${candidate.name}`} className="ah-candidate-portrait" src={PLACEHOLDER_PORTRAIT} />
            <div><strong>{candidate.name}</strong><small>{candidate.philosophy} · Coaching {candidate.coachingRating} · Scouting {candidate.scoutingNetwork}%</small></div>
            <button className="academy-action" onClick={() => hireManager(candidate)} type="button">{academy.manager ? 'Replace' : 'Hire'}</button>
          </article>)}
          {academy.manager && <button className="academy-action danger" onClick={fireManager} type="button">Dismiss current director</button>}
        </details>
      </section>
    </>}

    {section === 'Scouting' && <>
      <section className="ah-hero scout">
        <div><h2>Scout New Talent</h2><p>Send scouts to find the best young players in your region and beyond.</p></div>
        <div className="ah-form">
          <label>REGION<select aria-label="Scouting region" onChange={(event) => setRegionCode(event.target.value)} value={regionCode}>{SCOUT_REGIONS.map((region) => <option key={region.code} value={region.code}>{region.name} ({region.domestic ? 'Domestic · 7 days' : 'International · 14 days'})</option>)}</select></label>
          <div className="ah-chips" aria-label="Positions to scout">{groups.map((group) => <button aria-pressed={missionGroups.includes(group)} className={missionGroups.includes(group) ? 'active' : ''} key={group} onClick={() => toggleGroup(group)} type="button">{group}</button>)}</div>
          <button className="ah-cta" disabled={missionsFull} onClick={beginMission} type="button">◎ {missionsFull ? 'Missions full' : 'New Scouting Mission'}</button>
        </div>
      </section>

      <section className="ah-panel">
        <div className="ah-panel-head"><h3>Active Scout Missions</h3><span className="ah-muted">{academy.missions.length} / {MAX_ACTIVE_MISSIONS}</span></div>
        {academy.missions.length === 0 && <p className="academy-empty">No active missions. Pick a region and positions above.</p>}
        {academy.missions.map((mission) => <MissionRow key={mission.id} mission={mission} />)}
        <button className="academy-action" disabled={academy.missions.length === 0} onClick={passWeek} type="button">Advance 7 days</button>
      </section>

      <section className="ah-panel">
        <div className="ah-panel-head"><h3>Scouting Reports</h3><span className="ah-muted">{academy.reports.length} available</span></div>
        {academy.reports.length === 0 && <p className="academy-empty">Finished missions deliver reports here.</p>}
        {academy.reports.map((report) => <article className="ah-report" key={report.id}>
          <Avatar name={report.prospect.player.name} size={44} />
          <div>
            <strong>{report.prospect.player.name}</strong>
            <small>{shortPos(report.prospect.player.position)} · {report.prospect.player.age}y · <Flag code={report.prospect.countryCode} /> {report.prospect.country}</small>
            <span className={`ah-tag ${report.recommendation === 'Highly Recommended' ? 'hot' : ''}`}>{report.recommendation}</span>
          </div>
          <dl><div><dt>Potential</dt><dd>{report.prospect.potentialLow}-{report.prospect.potentialHigh}</dd></div><div><dt>Current</dt><dd>{report.prospect.player.overall}</dd></div><div><dt>Report</dt><dd>{report.date}</dd></div></dl>
          <div className="ah-actions"><button className="academy-action" onClick={() => signReport(report.id)} type="button">Sign</button><button className="academy-action danger" onClick={() => dismissReport(report.id)} type="button">Dismiss</button></div>
        </article>)}
      </section>

      <section className="ah-panel">
        <div className="ah-panel-head"><h3>Annual Youth Intake</h3><span className="ah-muted">{academy.intakeCount} completed</span></div>
        <div className="ah-intake"><div><strong>1 Jul {academy.nextIntakeYear}</strong><small>Roster {prospects.length} / {ACADEMY_MAX_SIZE}</small></div><button className="academy-action" disabled={rosterFull} onClick={runIntake} type="button">Run intake now</button></div>
      </section>
    </>}

    {section === 'Players' && <>
      <div className="ah-search"><input aria-label="Search academy players" onChange={(event) => setQuery(event.target.value)} placeholder="Search players..." type="search" value={query} />
        <select aria-label="Sort academy players" onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}><option>Potential</option><option>Overall</option><option>Age</option></select></div>
      <div className="position-filters" aria-label="Filter positions">{(['ALL', ...groups] as const).map((filter) => <button aria-pressed={positionFilter === filter} className={positionFilter === filter ? 'position-filter active' : 'position-filter'} key={filter} onClick={() => setPositionFilter(filter)} type="button">{filter}</button>)}</div>
      <section className="ah-table">
        <div className="ah-row head"><span>PLAYER</span><span>AGE</span><span>POS</span><span>OVR</span><span>POT</span><span /></div>
        {visible.length === 0 && <p className="academy-empty ah-pad">No academy players match.</p>}
        {visible.map((item) => <button aria-label={`Open ${item.player.name} progress`} className="ah-row" key={item.player.id} onClick={() => openProgress(item)} type="button">
          <span className="ah-name"><Avatar name={item.player.name} size={34} /><span><strong>{item.player.name}</strong><small><Flag code={item.countryCode} /> {statusOf(item).label}</small></span></span>
          <span>{item.player.age}</span><span><i className="ah-pos">{shortPos(item.player.position)}</i></span>
          <span><b className="ah-ovr small">{item.player.overall}</b></span><span><i className="ah-pot">{item.player.potential}</i></span><span className="ah-chevron">›</span>
        </button>)}
      </section>
      <p className="ah-muted ah-count">{visible.length} of {prospects.length} players · max {ACADEMY_MAX_SIZE}</p>
    </>}

    {section === 'Progress' && (focus ? <>
      <label className="ah-picker">PLAYER<select aria-label="Select academy player" onChange={(event) => setFocusId(event.target.value)} value={focus.player.id}>{prospects.map((item) => <option key={item.player.id} value={item.player.id}>{item.player.name} ({shortPos(item.player.position)})</option>)}</select></label>
      <section className="ah-panel ah-focus">
        <Avatar name={focus.player.name} size={64} />
        <div><strong>{focus.player.name}</strong><small>{shortPos(focus.player.position)} · {focus.player.age}y · <button className="ah-link" onClick={() => onSelectCountry(focus.country)} type="button"><Flag code={focus.countryCode} /> {focus.country}</button></small>
          <div className="ah-xp"><span>Development</span><b>{focus.pace}</b></div></div>
        <div className="ah-focus-rating"><b className="ah-ovr">{focus.player.overall}</b><small>Potential</small><strong>{focus.potentialLow}-{focus.potentialHigh}</strong></div>
      </section>
      <div className="ah-attrs">
        {([['Pace', focus.player.attributes.pace], ['Shooting', focus.player.attributes.finishing], ['Passing', focus.player.attributes.passing], ['Dribbling', focus.player.attributes.dribbling], ['Defending', focus.player.attributes.tackling], ['Physical', focus.player.attributes.strength]] as const).map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </div>
      <DevelopmentChart age={focus.player.age} overall={focus.player.overall} potential={focus.player.potential} />
      <section className="ah-panel">
        <div className="ah-actions">
          <button className="academy-action" onClick={() => promoteProspect(focus)} type="button">Promote to Senior Squad</button>
          <button className="academy-action danger" onClick={() => releaseProspect(focus)} type="button">Release</button>
        </div>
        <button className="academy-action ah-profile" onClick={() => onSelectPlayer(focus.player)} type="button">Open full profile</button>
      </section>
    </> : <section className="ah-panel"><p className="academy-empty">No prospects to track. Scout or run an intake first.</p></section>)}
  </div>
}

function DevelopmentChart({ age, overall, potential }: { age: number; overall: number; potential: number }) {
  const years = Math.max(1, 21 - age)
  const points = Array.from({ length: years + 1 }, (_, index) => ({ age: age + index, value: Math.round(overall + (potential - overall) * (1 - (1 - index / years) ** 2)) }))
  const width = 300
  const height = 110
  const low = Math.max(0, Math.floor((overall - 5) / 10) * 10)
  const high = Math.min(100, Math.ceil((potential + 2) / 10) * 10)
  const x = (index: number) => 12 + index / years * (width - 24)
  const y = (value: number) => height - 10 - (value - low) / Math.max(1, high - low) * (height - 24)
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ')
  return <section className="ah-panel">
    <div className="ah-panel-head"><h3>Projected Development</h3><span className="ah-muted">to age 21</span></div>
    <svg aria-label="Projected overall rating by age" className="ah-chart" role="img" viewBox={`0 0 ${width} ${height + 14}`}>
      <line className="ah-potential-line" x1="12" x2={width - 12} y1={y(potential)} y2={y(potential)} />
      <path className="ah-area" d={`${line} L${x(years)},${height - 10} L${x(0)},${height - 10} Z`} />
      <path className="ah-line" d={line} />
      {points.map((point, index) => <g key={point.age}><circle cx={x(index)} cy={y(point.value)} r="3" /><text textAnchor="middle" x={x(index)} y={height + 8}>{point.age}</text></g>)}
    </svg>
  </section>
}
