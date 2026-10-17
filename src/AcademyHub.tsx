import { useState } from 'react'
import { club } from './data/mockData'
import type { AcademyProspect, Player, PlayerAttributes, PlayerPosition, YouthManager } from './types/game'
import { ACADEMY_MAX_SIZE, MAX_ACTIVE_MISSIONS, SCOUT_REGIONS, SENIOR_SQUAD_MAX, advanceDays, generateIntake, generateYouthManager, startMission, useAcademy, type PositionGroup, type ScoutMission } from './utils/academy'
import { resolveFlagCode } from './countryFlagUtils'
import { PLACEHOLDER_PORTRAIT } from './portrait'
import { intakeScoutingBonus } from './state/facilities'

type AcademySection = 'Overview' | 'Players' | 'Scouting' | 'Development'
type ScoutTab = 'Overview' | 'Scouts' | 'Countries' | 'Targets'
type PlayerFilter = 'All' | 'Top Prospects' | 'Ready'
type PositionFilter = 'ALL' | PositionGroup
type FocusAttr = keyof Pick<PlayerAttributes, 'finishing' | 'passing' | 'dribbling' | 'tackling' | 'strength' | 'pace' | 'vision' | 'stamina'>

const sections: AcademySection[] = ['Overview', 'Players', 'Scouting', 'Development']
const scoutTabs: ScoutTab[] = ['Overview', 'Scouts', 'Countries', 'Targets']
const playerFilters: PlayerFilter[] = ['All', 'Top Prospects', 'Ready']
const groups: PositionGroup[] = ['GK', 'DEF', 'MID', 'FWD']
const focusOptions: { label: string; attr: FocusAttr }[] = [
  { label: 'Attacking · Finishing', attr: 'finishing' },
  { label: 'Technical · Passing', attr: 'passing' },
  { label: 'Technical · Dribbling', attr: 'dribbling' },
  { label: 'Defending · Tackling', attr: 'tackling' },
  { label: 'Physical · Strength', attr: 'strength' },
  { label: 'Physical · Pace', attr: 'pace' },
  { label: 'Physical · Stamina', attr: 'stamina' },
  { label: 'Mental · Vision', attr: 'vision' },
]
const attrLabels: Record<FocusAttr, string> = { finishing: 'Improve Finishing', passing: 'Improve Passing', dribbling: 'Improve Dribbling', tackling: 'Improve Tackling', strength: 'Add Strength', pace: 'Increase Pace', vision: 'Improve Vision', stamina: 'Build Stamina' }
const FOCUS_KEY = 'fmapp-academy-focus'
const money = (amount: number) => `£${new Intl.NumberFormat('en-GB').format(amount)}`
const compactMoney = (amount: number) => amount >= 1_000_000 ? `£${(amount / 1_000_000).toFixed(1)}m` : `£${Math.round(amount / 1000)}k`
const groupOf = (position: PlayerPosition): PositionGroup => position === 'GK' ? 'GK' : position.startsWith('D') && position !== 'DM' ? 'DEF' : position === 'DM' || position.startsWith('M') ? 'MID' : 'FWD'
const shortPos = (position: PlayerPosition) => ({ 'GK': 'GK', 'D (C)': 'CB', 'D (L)': 'LB', 'D (R)': 'RB', 'DM': 'DM', 'M (C)': 'CM', 'M (L)': 'LM', 'M (R)': 'RM', 'AM (C)': 'AM', 'ST (C)': 'ST' } as Record<PlayerPosition, string>)[position]
const isReady = (prospect: AcademyProspect) => prospect.player.overall >= 60 || prospect.player.age >= 18
const progressOf = (prospect: AcademyProspect) => Math.round(prospect.player.overall / Math.max(1, prospect.player.potential) * 100)
const stars = (value: number) => '★'.repeat(value) + '☆'.repeat(5 - value)

function readFocus(): Record<string, FocusAttr> {
  try { return JSON.parse(window.localStorage.getItem(FOCUS_KEY) ?? '{}') } catch { return {} }
}

function Flag({ code }: { code: string }) {
  return <span aria-hidden="true" className={`fi fi-${resolveFlagCode(code)}`} />
}

function Face({ size = 32 }: { size?: number }) {
  return <img alt="" className="ah-face" src={PLACEHOLDER_PORTRAIT} style={{ width: size, height: size }} />
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
  const [scoutTab, setScoutTab] = useState<ScoutTab>('Overview')
  const [academy, setAcademy] = useAcademy(club.id, club.facilities.youthLevel)
  const { youthLevel } = club.facilities
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>('All')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [regionCode, setRegionCode] = useState('NGA')
  const [missionGroups, setMissionGroups] = useState<PositionGroup[]>(['MID'])
  const [focusPlans, setFocusPlans] = useState<Record<string, FocusAttr>>(readFocus)

  const prospects = academy.prospects
  const focus = prospects.find((item) => item.player.id === focusId) ?? prospects[0] ?? null
  const byPotential = [...prospects].sort((first, second) => second.player.potential - first.player.potential)
  const topIds = new Set(byPotential.slice(0, 6).map((item) => item.player.id))
  const visible = byPotential.filter((item) => (playerFilter === 'All' || (playerFilter === 'Ready' ? isReady(item) : topIds.has(item.player.id)))
    && (positionFilter === 'ALL' || groupOf(item.player.position) === positionFilter)
    && item.player.name.toLowerCase().includes(query.trim().toLowerCase()))
  const readyCount = prospects.filter(isReady).length
  const rosterFull = prospects.length >= ACADEMY_MAX_SIZE
  const missionsFull = academy.missions.length >= MAX_ACTIVE_MISSIONS
  const quality = Math.round(youthLevel * 8 + (academy.manager?.coachingRating ?? 40) * 0.5)
  const qualityLabel = quality >= 75 ? 'Excellent' : quality >= 60 ? 'Good' : quality >= 45 ? 'Average' : 'Poor'

  const countryRows = Object.values(prospects.reduce<Record<string, { country: string; code: string; players: number; potential: number }>>((acc, item) => {
    const row = acc[item.countryCode] ?? { country: item.country, code: item.countryCode, players: 0, potential: 0 }
    row.players += 1
    row.potential += item.player.potential
    acc[item.countryCode] = row
    return acc
  }, {})).sort((first, second) => second.players - first.players)
  const countriesCovered = new Set([...prospects.map((item) => item.countryCode), ...academy.reports.map((item) => item.prospect.countryCode), ...academy.missions.map((item) => item.regionCode)]).size

  const openDevelopment = (prospect: AcademyProspect) => { setFocusId(prospect.player.id); setNotice(''); setSection('Development') }
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

  const planFor = (prospect: AcademyProspect) => {
    const chosen = focusPlans[prospect.player.id] ?? [...focusOptions].sort((first, second) => prospect.player.attributes[first.attr] - prospect.player.attributes[second.attr])[0].attr
    const rest = focusOptions.map((option) => option.attr).filter((attr) => attr !== chosen).sort((first, second) => prospect.player.attributes[first] - prospect.player.attributes[second]).slice(0, 3)
    return { chosen, items: [chosen, ...rest].map((attr, index) => ({ attr, priority: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Low' })) }
  }

  const setFocusFor = (prospect: AcademyProspect, attr: FocusAttr) => {
    const next = { ...focusPlans, [prospect.player.id]: attr }
    setFocusPlans(next)
    window.localStorage.setItem(FOCUS_KEY, JSON.stringify(next))
    setNotice(`${prospect.player.name} will now train ${focusOptions.find((option) => option.attr === attr)?.label}.`)
  }

  return <div className="academy-hub">
    <header className="ah-heading ah-heading-row"><div><h1>Academy Hub</h1><p>Develop today. Build tomorrow.</p></div><div className="ah-quality"><span>Academy Quality</span><strong className={`q-${qualityLabel.toLowerCase()}`}>{qualityLabel}</strong></div></header>

    <nav className="club-profile-tabs ah-tabs" aria-label="Academy sections">
      {sections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'club-profile-tab active' : 'club-profile-tab'} key={item} onClick={() => goTo(item)} type="button">{item}</button>)}
    </nav>

    {notice && <p className="academy-notice" role="status">{notice}</p>}

    {section === 'Overview' && <>
      <div className="ah-stat-cards">
        <article><strong>{prospects.length}<small>/{ACADEMY_MAX_SIZE}</small></strong><span>Academy players</span></article>
        <article><strong>{readyCount}</strong><span>Ready for first team</span></article>
        <article><strong>{academy.promotedCount}</strong><span>Promoted</span></article>
        <article><strong>{academy.releasedCount}</strong><span>Released</span></article>
      </div>

      <section className="ah-panel">
        <div className="ah-panel-head"><h3>Academy Manager</h3><span className="ah-muted">Youth Lvl {youthLevel} · Next intake 1 Jul {academy.nextIntakeYear}</span></div>
        {academy.manager ? <>
          <div className="club-manager-card ah-director-card">
            <img alt={`Portrait of ${academy.manager.name}`} className="club-manager-avatar" src={PLACEHOLDER_PORTRAIT} />
            <div className="club-manager-info"><span className="eyebrow">ACADEMY MANAGER</span><strong>{academy.manager.name}</strong><span><Flag code={academy.manager.nationalityCode} /> {academy.manager.nationality} · Age {academy.manager.age}</span></div>
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
          <summary>{academy.manager ? 'Replace manager' : 'Hire a manager'}</summary>
          {academy.candidates.map((candidate) => <article key={candidate.id}>
            <img alt={`Portrait of ${candidate.name}`} className="ah-candidate-portrait" src={PLACEHOLDER_PORTRAIT} />
            <div><strong>{candidate.name}</strong><small>{candidate.philosophy} · Coaching {candidate.coachingRating} · Scouting {candidate.scoutingNetwork}%</small></div>
            <button className="academy-action" onClick={() => hireManager(candidate)} type="button">{academy.manager ? 'Replace' : 'Hire'}</button>
          </article>)}
          {academy.manager && <button className="academy-action danger" onClick={fireManager} type="button">Dismiss current manager</button>}
        </details>
      </section>

      <section className="ah-panel">
        <div className="ah-panel-head"><h3>Top Prospects</h3><button className="club-text-action" onClick={() => goTo('Players')} type="button">SEE ALL <span>→</span></button></div>
        {byPotential.length === 0 && <p className="academy-empty">No prospects. Run an intake to find new talent.</p>}
        <div className="ah-prospect-strip">
          {byPotential.slice(0, 6).map((item) => <button aria-label={`Open ${item.player.name} development`} className="ah-prospect-card" key={item.player.id} onClick={() => openDevelopment(item)} type="button">
            <Face size={48} /><b className="ah-ovr small">{item.player.overall}</b>
            <strong>{item.player.name}</strong><small>{shortPos(item.player.position)} · {item.player.age}y</small><Flag code={item.countryCode} />
          </button>)}
        </div>
      </section>

      <section className="ah-panel">
        <div className="ah-panel-head"><h3>Annual Youth Intake</h3><span className="ah-muted">{academy.intakeCount} completed</span></div>
        <div className="ah-intake"><div><strong>1 Jul {academy.nextIntakeYear}</strong><small>Roster {prospects.length} / {ACADEMY_MAX_SIZE}</small></div><button className="academy-action" disabled={rosterFull} onClick={runIntake} type="button">Run intake now</button></div>
      </section>
    </>}

    {section === 'Players' && <section className="ah-panel">
      <div className="ah-search"><input aria-label="Search academy players" onChange={(event) => setQuery(event.target.value)} placeholder="Search players..." type="search" value={query} />
        <select aria-label="Filter by position" onChange={(event) => setPositionFilter(event.target.value as PositionFilter)} value={positionFilter}>{(['ALL', ...groups] as const).map((filter) => <option key={filter}>{filter}</option>)}</select></div>
      <div className="ah-pills" aria-label="Player filter">{playerFilters.map((filter) => <button aria-pressed={playerFilter === filter} className={playerFilter === filter ? 'active' : ''} key={filter} onClick={() => setPlayerFilter(filter)} type="button">{filter}</button>)}</div>
      <div className="ah-table ah-squad-table">
        <div className="ah-prow head"><span>PLAYER</span><span>AGE</span><span>POS</span><span>OVR</span><span>POT</span><span>PROGRESS</span><span /></div>
        {visible.length === 0 && <p className="academy-empty ah-pad">No academy players match.</p>}
        {visible.map((item) => <button aria-label={`Open ${item.player.name} development`} className="ah-prow" key={item.player.id} onClick={() => openDevelopment(item)} type="button">
          <span className="ah-name"><Face size={30} /><span><strong>{item.player.name}</strong><small><Flag code={item.countryCode} /> {item.player.personalInfo.personality} · {item.player.personalInfo.characterTrait}</small></span></span>
          <span>{item.player.age}</span><span><i className="ah-pos">{shortPos(item.player.position)}</i></span>
          <span><b className="ah-ovr small">{item.player.overall}</b></span><span><i className="ah-pot">{item.player.potential}</i></span>
          <span className="ah-progress"><span className="ah-bar"><i style={{ width: `${progressOf(item)}%` }} /></span><small>{progressOf(item)}%</small></span><span className="ah-chevron">›</span>
        </button>)}
      </div>
      <p className="ah-muted ah-count">{visible.length} of {prospects.length} players · max {ACADEMY_MAX_SIZE}. Tap a player to develop, promote or release.</p>
    </section>}

    {section === 'Scouting' && <>
      <nav className="ah-subtabs" aria-label="Scouting sections">{scoutTabs.map((tab) => <button aria-pressed={scoutTab === tab} className={scoutTab === tab ? 'active' : ''} key={tab} onClick={() => setScoutTab(tab)} type="button">{tab}</button>)}</nav>

      {scoutTab === 'Overview' && <>
        <div className="ah-stat-cards three">
          <article><strong>{academy.missions.length}<small>/{MAX_ACTIVE_MISSIONS}</small></strong><span>Active scouts</span></article>
          <article><strong>{countriesCovered}</strong><span>Countries covered</span></article>
          <article><strong>{academy.reports.length}</strong><span>Reports waiting</span></article>
        </div>
        <section className="ah-panel">
          <div className="ah-panel-head"><h3>New Scouting Mission</h3><span className="ah-muted">Scouting Lvl {club.facilities.scoutingLevel}</span></div>
          <div className="ah-form light">
            <label>REGION<select aria-label="Scouting region" onChange={(event) => setRegionCode(event.target.value)} value={regionCode}>{SCOUT_REGIONS.map((region) => <option key={region.code} value={region.code}>{region.name} ({region.domestic ? 'Domestic · 7 days' : 'International · 14 days'})</option>)}</select></label>
            <div className="ah-chips" aria-label="Positions to scout">{groups.map((group) => <button aria-pressed={missionGroups.includes(group)} className={missionGroups.includes(group) ? 'active' : ''} key={group} onClick={() => toggleGroup(group)} type="button">{group}</button>)}</div>
            <button className="academy-action" disabled={missionsFull} onClick={beginMission} type="button">{missionsFull ? 'Missions full' : 'Send scout'}</button>
          </div>
        </section>
      </>}

      {scoutTab === 'Scouts' && <section className="ah-panel">
        <div className="ah-panel-head"><h3>Scout Network</h3><span className="ah-muted">{academy.missions.length} / {MAX_ACTIVE_MISSIONS}</span></div>
        {academy.missions.length === 0 && <p className="academy-empty">No scouts on assignment. Send one from the Overview tab.</p>}
        {academy.missions.map((mission) => <MissionRow key={mission.id} mission={mission} />)}
        <button className="academy-action" disabled={academy.missions.length === 0} onClick={passWeek} type="button">Advance 7 days</button>
      </section>}

      {scoutTab === 'Countries' && <section className="ah-panel">
        <div className="ah-panel-head"><h3>Top Scouting Countries</h3><span className="ah-muted">Players · Quality</span></div>
        {countryRows.length === 0 && <p className="academy-empty">No players yet.</p>}
        {countryRows.map((row) => {
          const rating = Math.min(5, Math.max(1, Math.round(row.potential / row.players / 20)))
          return <button className="ah-country-row" key={row.code} onClick={() => onSelectCountry(row.country)} type="button"><Flag code={row.code} /><strong>{row.country}</strong><span>{row.players}</span><em>{stars(rating)}</em></button>
        })}
      </section>}

      {scoutTab === 'Targets' && <section className="ah-panel">
        <div className="ah-panel-head"><h3>Scouting Targets</h3><span className="ah-muted">{academy.reports.length} available</span></div>
        {academy.reports.length === 0 && <p className="academy-empty">Finished missions deliver targets here.</p>}
        {academy.reports.map((report) => <article className="ah-report" key={report.id}>
          <Face size={40} />
          <div>
            <strong>{report.prospect.player.name}</strong>
            <small>{shortPos(report.prospect.player.position)} · {report.prospect.player.age}y · <Flag code={report.prospect.countryCode} /> {report.prospect.country}</small>
            <span className={`ah-tag ${report.recommendation === 'Highly Recommended' ? 'hot' : ''}`}>{report.recommendation}</span>
          </div>
          <dl><div><dt>Potential</dt><dd>{report.prospect.potentialLow}-{report.prospect.potentialHigh}</dd></div><div><dt>Current</dt><dd>{report.prospect.player.overall}</dd></div><div><dt>Report</dt><dd>{report.date}</dd></div></dl>
          <div className="ah-actions"><button className="academy-action" onClick={() => signReport(report.id)} type="button">Sign</button><button className="academy-action danger" onClick={() => dismissReport(report.id)} type="button">Dismiss</button></div>
        </article>)}
      </section>}
    </>}

    {section === 'Development' && (focus ? (() => {
      const plan = planFor(focus)
      const activeFocus = focusOptions.find((option) => option.attr === plan.chosen) ?? focusOptions[0]
      return <>
        <label className="ah-picker">PLAYER<select aria-label="Select academy player" onChange={(event) => setFocusId(event.target.value)} value={focus.player.id}>{prospects.map((item) => <option key={item.player.id} value={item.player.id}>{item.player.name} ({shortPos(item.player.position)})</option>)}</select></label>
        <section className="ah-panel ah-focus">
          <Face size={64} />
          <div><strong>{focus.player.name}</strong><small>{shortPos(focus.player.position)} · {focus.player.age}y · <button className="ah-link" onClick={() => onSelectCountry(focus.country)} type="button"><Flag code={focus.countryCode} /> {focus.country}</button></small>
            <div className="ah-xp"><span>Pace of growth</span><b>{focus.pace}</b></div>
            <div className="ah-xp"><span>Personality · Character</span><b>{focus.player.personalInfo.personality} · {focus.player.personalInfo.characterTrait}</b></div></div>
          <div className="ah-focus-rating"><b className="ah-ovr">{focus.player.overall}</b><small>Potential</small><strong>{focus.potentialLow}-{focus.potentialHigh}</strong></div>
        </section>
        <div className="ah-stat-cards three">
          <article><strong>{focus.player.overall}</strong><span>Current ability</span></article>
          <article><strong>{focus.player.potential}</strong><span>Potential ability</span></article>
          <article><strong>{compactMoney(focus.player.value)}</strong><span>Value</span></article>
        </div>
        <section className="ah-panel">
          <div className="ah-panel-head"><h3>Development Plan</h3><span className="ah-muted">Weakest areas first</span></div>
          {plan.items.map((item) => <div className="ah-plan-row" key={item.attr}><span>{attrLabels[item.attr]}</span><em className={`prio-${item.priority.toLowerCase()}`}>{item.priority}</em><b>{focus.player.attributes[item.attr]}</b></div>)}
          <label className="ah-picker">TRAINING FOCUS<select aria-label="Training focus" onChange={(event) => setFocusFor(focus, event.target.value as FocusAttr)} value={plan.chosen}>{focusOptions.map((option) => <option key={option.attr} value={option.attr}>{option.label}</option>)}</select></label>
          <div className="ah-xp"><span>{activeFocus.label}</span><b>{focus.player.attributes[activeFocus.attr]}</b></div>
        </section>
        <DevelopmentChart age={focus.player.age} overall={focus.player.overall} potential={focus.player.potential} />
        <section className="ah-panel">
          <div className="ah-actions">
            <button className="academy-action" onClick={() => promoteProspect(focus)} type="button">Promote to First Team</button>
            <button className="academy-action danger" onClick={() => releaseProspect(focus)} type="button">Release</button>
          </div>
          <button className="academy-action ah-profile" onClick={() => onSelectPlayer(focus.player)} type="button">Open full profile</button>
        </section>
      </>
    })() : <section className="ah-panel"><p className="academy-empty">No prospects to develop. Scout or run an intake first.</p></section>)}
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
    <div className="ah-panel-head"><h3>Growth Forecast</h3><span className="ah-muted">to age 21</span></div>
    <svg aria-label="Projected overall rating by age" className="ah-chart" role="img" viewBox={`0 0 ${width} ${height + 14}`}>
      <line className="ah-potential-line" x1="12" x2={width - 12} y1={y(potential)} y2={y(potential)} />
      <path className="ah-area" d={`${line} L${x(years)},${height - 10} L${x(0)},${height - 10} Z`} />
      <path className="ah-line" d={line} />
      {points.map((point, index) => <g key={point.age}><circle cx={x(index)} cy={y(point.value)} r="3" /><text textAnchor="middle" x={x(index)} y={height + 8}>{point.age}</text></g>)}
    </svg>
  </section>
}
