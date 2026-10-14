import { useState, type ReactNode } from 'react'
import { club, league, nextMatch } from './data/mockData'
import PlayerProfile, { type ProfileSection } from './PlayerProfile'
import type { Player } from './types/game'
import './App.css'

const tabs = [
  { id: 'Home', label: 'Home', icon: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6' },
  { id: 'Squad', label: 'Squad', icon: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6' },
  { id: 'Tactics', label: 'Tactics', icon: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11ZM9 12l2 2 4-4' },
  { id: 'Transfers', label: 'Transfers', icon: 'M7 7h14l-4-4M17 17H3l4 4M21 7l-4 4M3 17l4-4' },
  { id: 'League', label: 'League', icon: 'M4 19V5m0 14h17M8 15v-4m5 4V7m5 8v-6' },
  { id: 'Matches', label: 'Matches', icon: 'M7 3v4m10-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM8 13h3v3H8z' },
] as const

type TabId = (typeof tabs)[number]['id']
const money = (amount: number) => `£${(amount / 1000000).toFixed(1)}m`

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('Home')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [profileSection, setProfileSection] = useState<ProfileSection>('Overview')
  const [selectedClubName, setSelectedClubName] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const position = league.standings.find((standing) => standing.clubId === club.id)
  const selectPlayer = (player: Player) => {
    setSelectedPlayer(player)
    setProfileSection('Overview')
  }

  return (
    <div className="app-backdrop">
      <div className="app-shell">
        <header className="topbar">
          <ClubReference name="N" selectedClubName={selectedClubName} onSelect={setSelectedClubName} className="club-mark" ariaLabel={`${club.name} crest`} />
          <div className="identity">
            <span className="eyebrow">MANAGER CAREER · 2026/27</span>
            <strong>{club.manager.name}</strong>
            <ClubReference name={club.name} selectedClubName={selectedClubName} onSelect={setSelectedClubName} className="club-name" />
          </div>
          <div className="header-date"><span>IN-GAME DATE</span><strong>14 OCT</strong><span>WEDNESDAY</span></div>
          <div className="budget-strip"><span>TRANSFER BUDGET</span><strong>{money(club.finances.transferBudget)}</strong></div>
        </header>

        <main className="main-content" key={selectedPlayer ? 'profile' : activeTab}>
          {selectedPlayer ? <PlayerProfile player={selectedPlayer} section={profileSection} selectedClubName={selectedClubName} backLabel={`Back to ${activeTab === 'Squad' ? 'squad' : activeTab.toLowerCase()}`}
            onBack={() => setSelectedPlayer(null)} onSectionChange={setProfileSection} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} /> : <>
            {activeTab === 'Home' && <HomeView position={position?.position ?? 0} selectedClubName={selectedClubName} selectedMatchId={selectedMatchId} onSelectMatch={setSelectedMatchId} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} />}
            {activeTab === 'Squad' && <SquadView selectedClubName={selectedClubName} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} />}
            {activeTab === 'Tactics' && <TacticsView selectedClubName={selectedClubName} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} />}
            {activeTab === 'Transfers' && <TransfersView selectedClubName={selectedClubName} onSelectClub={setSelectedClubName} />}
            {activeTab === 'League' && <LeagueView selectedClubName={selectedClubName} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} />}
            {activeTab === 'Matches' && <MatchesView selectedClubName={selectedClubName} selectedMatchId={selectedMatchId} onSelectMatch={setSelectedMatchId} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} />}
          </>}
        </main>

        <nav className="bottom-nav" aria-label="Main navigation">
          {tabs.map((tab) => (
            <button aria-current={activeTab === tab.id ? 'page' : undefined} aria-label={tab.label}
              className={activeTab === tab.id ? 'nav-item active' : 'nav-item'} key={tab.id}
              onClick={() => { setSelectedPlayer(null); setActiveTab(tab.id) }} type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={tab.icon} /></svg>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function ClubReference({ name, selectedClubName, onSelect, className = '', ariaLabel, children }: { name: string; selectedClubName: string | null; onSelect: (name: string) => void; className?: string; ariaLabel?: string; children?: ReactNode }) {
  return <button aria-label={ariaLabel} aria-pressed={selectedClubName === name} className={`entity-link ${className} ${selectedClubName === name ? 'selected' : ''}`} onClick={() => onSelect(name)} type="button">{children ?? name}</button>
}

function PlayerReference({ player, onSelectPlayer, className = '' }: { player: Player; onSelectPlayer: (player: Player) => void; className?: string }) {
  return <button className={`entity-link ${className}`} onClick={() => onSelectPlayer(player)} type="button">{player.name}</button>
}

function SectionHeading({ kicker, title, detail }: { kicker: string; title: string; detail?: string }) {
  return <div className="section-heading"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2></div>{detail && <span className="section-detail">{detail}</span>}</div>
}

function HomeView({ position, selectedClubName, selectedMatchId, onSelectMatch, onSelectClub, onSelectPlayer }: { position: number; selectedClubName: string | null; selectedMatchId: string | null; onSelectMatch: (id: string) => void; onSelectClub: (name: string) => void; onSelectPlayer: (player: Player) => void }) {
  return <>
    <div className="welcome-row"><div><span className="eyebrow">WEDNESDAY, 14 OCTOBER</span><h1>Match week, <em>boss.</em></h1></div><span className="round-tag">MD 12</span></div>
    <section className={`fixture-panel ${selectedMatchId === nextMatch.id ? 'selected-match' : ''}`} aria-label="Next fixture">
      <div className="fixture-topline"><span>NEXT FIXTURE</span><span>{nextMatch.competition.toUpperCase()} · MD {nextMatch.matchday}</span></div>
      <div className="fixture-teams">
        <ClubReference name="Northbridge FC" selectedClubName={selectedClubName} onSelect={onSelectClub} className="fixture-club team-link"><span className="large-crest home-crest">N</span><strong>NORTHBRIDGE</strong></ClubReference>
        <button aria-label={`Select Northbridge versus Westhaven fixture`} aria-pressed={selectedMatchId === nextMatch.id} className="fixture-versus fixture-select" onClick={() => onSelectMatch(nextMatch.id)} type="button"><span>VS</span><b>17</b><small>OCT · 15:00</small></button>
        <ClubReference name="Westhaven Athletic" selectedClubName={selectedClubName} onSelect={onSelectClub} className="fixture-club away team-link"><span className="large-crest away-crest">W</span><strong>WESTHAVEN</strong></ClubReference>
      </div>
      <div className="fixture-bottom"><span>{nextMatch.venue}</span><span>{nextMatch.weather}</span><span>IN 3 DAYS</span></div>
    </section>
    <section className="metric-row" aria-label="Club overview">
      <div className="metric"><span>LEAGUE POSITION</span><strong><i>{String(position).padStart(2, '0')}</i><small> / 20</small></strong><span className="metric-note">2 pts off top</span></div>
      <div className="metric"><span>TRANSFER BUDGET</span><strong>{money(club.finances.transferBudget)}</strong><span className="metric-note">Wage room £54.5k/wk</span></div>
      <div className="metric"><span>LAST 5</span><div className="form-dots">{league.standings[1].form.map((result, index) => <b className={`form-${result.toLowerCase()}`} key={`${result}-${index}`}>{result}</b>)}</div><span className="metric-note">4 wins · 1 draw</span></div>
    </section>
    <section className="content-section"><SectionHeading kicker="THE RUN-IN" title="League table" detail="TOP 5  →" /><LeagueTable compact selectedClubName={selectedClubName} onSelectClub={onSelectClub} onSelectPlayer={onSelectPlayer} /></section>
    <section className="content-section squad-teaser"><SectionHeading kicker="FIRST TEAM" title="Squad status" detail="11 PLAYERS" />
      <div className="squad-status"><span className="status-indicator" /><div><strong>Everyone ready</strong><span>Full squad available for Saturday</span></div><strong className="fitness-score">96% <small>AVG</small></strong></div>
    </section>
  </>
}

function SquadView({ selectedClubName, onSelectClub, onSelectPlayer }: { selectedClubName: string | null; onSelectClub: (name: string) => void; onSelectPlayer: (player: Player) => void }) {
  return <>
    <div className="page-intro"><span className="eyebrow">FIRST TEAM · {club.squad.length} PLAYERS</span><h1>The squad</h1><p>Average age 24.9 · {club.formation} · <ClubReference name="Northbridge FC" selectedClubName={selectedClubName} onSelect={onSelectClub} /></p></div>
    <div className="list-header"><span>PLAYER</span><span>FIT</span><span>OVR</span><span>VALUE</span></div>
    <div className="player-list">{club.squad.map((player) => <button aria-label={`Open ${player.name} profile`} className="player-row player-row-button" key={player.id} onClick={() => onSelectPlayer(player)} type="button">
      <span className="shirt-number">{String(player.shirtNumber).padStart(2, '0')}</span>
      <div className="player-identity"><strong>{player.name}</strong><span>{player.position} <i>·</i> {player.age} yrs</span></div>
      <span className="player-fit"><i style={{ width: `${player.fitness}%` }} /></span>
      <strong className="player-rating">{player.overall}</strong><span className="player-value">{money(player.value)}</span>
    </button>)}</div>
  </>
}

function TacticsView({ selectedClubName, onSelectClub, onSelectPlayer }: { selectedClubName: string | null; onSelectClub: (name: string) => void; onSelectPlayer: (player: Player) => void }) {
  const formation = [
    { player: club.squad[0], role: 'GK', lane: 'keeper', x: '50%' },
    { player: club.squad[1], role: 'D(R)', lane: 'back', x: '15%' },
    { player: club.squad[3], role: 'D(C)', lane: 'back', x: '38%' },
    { player: club.squad[4], role: 'D(C)', lane: 'back', x: '62%' },
    { player: club.squad[2], role: 'D(L)', lane: 'back', x: '85%' },
    { player: club.squad[5], role: 'DM', lane: 'midfield', x: '38%' },
    { player: club.squad[7], role: 'M(C)', lane: 'midfield', x: '62%' },
    { player: club.squad[6], role: 'AM(R)', lane: 'attack', x: '18%' },
    { player: club.squad[9], role: 'AM(C)', lane: 'attack', x: '50%' },
    { player: club.squad[10], role: 'AM(L)', lane: 'attack', x: '82%' },
    { player: club.squad[8], role: 'ST', lane: 'striker', x: '50%' },
  ]
  return <>
    <div className="page-intro"><span className="eyebrow">MATCH PREPARATION</span><h1>Team tactics</h1><p>Shape your side for <ClubReference name="Westhaven Athletic" selectedClubName={selectedClubName} onSelect={onSelectClub} />.</p></div>
    <div className="tactic-controls"><span>FORMATION</span><strong>{club.formation}</strong><span>MENTALITY</span><strong className="accent-text">Positive</strong></div>
    <div className="pitch" aria-label={`Formation ${club.formation}`}>
      <span className="pitch-line halfway" /><span className="pitch-circle" />
      {formation.map(({ player, role, lane, x }) => <button aria-label={`Open ${player.name} profile`} className={`pitch-player ${lane}`} key={player.id} onClick={() => onSelectPlayer(player)} style={{ left: x }} type="button"><b>{String(player.shirtNumber).padStart(2, '0')}</b><span className="pitch-player-name">{player.name}</span><small>{role}</small></button>)}
    </div>
    <div className="tactic-summary"><span>IN POSSESSION</span><strong>Short passing · Play out of defence</strong><span>OUT OF POSSESSION</span><strong>High press · Mid block</strong></div>
  </>
}

function TransfersView({ selectedClubName, onSelectClub }: { selectedClubName: string | null; onSelectClub: (name: string) => void }) {
  return <>
    <div className="page-intro"><span className="eyebrow">SCOUTING & RECRUITMENT</span><h1>Transfer centre</h1><p>Build the next <ClubReference name="Northbridge FC" selectedClubName={selectedClubName} onSelect={onSelectClub} /> side.</p></div>
    <div className="transfer-budget"><span>AVAILABLE TO SPEND</span><strong>{money(club.finances.transferBudget)}</strong><small>Wage budget remaining <b>£54.5k / week</b></small></div>
    <section className="content-section"><SectionHeading kicker="SQUAD PLANNING" title="Priority positions" />
      <div className="priority-row"><span className="priority-grade">A</span><div><strong>Centre-back</strong><span>Depth needed · 2 players scouted</span></div><span className="priority-arrow">↗</span></div>
      <div className="priority-row"><span className="priority-grade grade-b">B</span><div><strong>Striker</strong><span>Long-term option · 4 players scouted</span></div><span className="priority-arrow">↗</span></div>
    </section>
  </>
}

function LeagueView({ selectedClubName, onSelectClub, onSelectPlayer }: { selectedClubName: string | null; onSelectClub: (name: string) => void; onSelectPlayer: (player: Player) => void }) {
  return <>
    <div className="page-intro"><span className="eyebrow">{league.country.toUpperCase()} · {league.season}</span><h1>{league.name}</h1><p>Matchday {league.matchday} of {league.totalMatchdays}</p></div>
    <LeagueTable selectedClubName={selectedClubName} onSelectClub={onSelectClub} onSelectPlayer={onSelectPlayer} /><div className="league-footnote"><span className="legend-dot" /> Promotion places <span className="muted-dot" /> Relegation zone</div>
  </>
}

function LeagueTable({ compact = false, selectedClubName, onSelectClub }: { compact?: boolean; selectedClubName: string | null; onSelectClub: (name: string) => void; onSelectPlayer: (player: Player) => void }) {
  return <div className="table-wrap">
    <div className="table-head"><span>CLUB</span><span>P</span><span>GD</span><span>PTS</span>{!compact && <span>FORM</span>}</div>
    {league.standings.map((standing) => <div className={`table-row ${standing.clubId === club.id ? 'own-club' : ''}`} key={standing.clubId}>
      <span className="table-club"><i>{String(standing.position).padStart(2, '0')}</i><ClubReference name={standing.clubName} selectedClubName={selectedClubName} onSelect={onSelectClub} /></span>
      <span>{standing.played}</span><span>{standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}</span><strong>{standing.points}</strong>
      {!compact && <span className="table-form">{standing.form.map((result, index) => <i className={`form-${result.toLowerCase()}`} key={`${standing.clubId}-${index}`} />)}</span>}
    </div>)}
  </div>
}

function MatchesView({ selectedClubName, selectedMatchId, onSelectMatch, onSelectClub, onSelectPlayer }: { selectedClubName: string | null; selectedMatchId: string | null; onSelectMatch: (id: string) => void; onSelectClub: (name: string) => void; onSelectPlayer: (player: Player) => void }) {
  const homeKeyPlayer = club.squad.find((player) => player.name === nextMatch.keyPlayers.home)
  return <>
    <div className="page-intro"><span className="eyebrow">FIXTURES & RESULTS</span><h1>Match centre</h1><p>North Country Premier · 2026/27</p></div>
    <div className="match-date"><span>UP NEXT · SATURDAY 17 OCTOBER</span><b>15:00</b></div>
    <section className={`match-card ${selectedMatchId === nextMatch.id ? 'selected-match' : ''}`}><span className="eyebrow">{nextMatch.competition.toUpperCase()} · MATCHDAY {nextMatch.matchday}</span>
      <div className="match-card-teams"><ClubReference name={nextMatch.homeClubName} selectedClubName={selectedClubName} onSelect={onSelectClub} className="match-team"><i>N</i>{nextMatch.homeClubName}</ClubReference><button aria-label="Select this fixture" aria-pressed={selectedMatchId === nextMatch.id} className="match-versus-select" onClick={() => onSelectMatch(nextMatch.id)} type="button">VS</button><ClubReference name={nextMatch.awayClubName} selectedClubName={selectedClubName} onSelect={onSelectClub} className="match-team"><i className="opponent-mark">W</i>{nextMatch.awayClubName}</ClubReference></div>
      <div className="match-card-details"><span>{nextMatch.venue}</span><span>{nextMatch.weather}</span></div>
    </section>
    <div className="match-details-grid"><div><span>REFEREE</span><strong>{nextMatch.referee}</strong></div><div><span>YOUR SHAPE</span><strong>{nextMatch.formation.home}</strong></div><div><span>KEY PLAYER</span><strong>{homeKeyPlayer ? <PlayerReference player={homeKeyPlayer} onSelectPlayer={onSelectPlayer} /> : nextMatch.keyPlayers.home}</strong></div><div><span>OPPOSITION SHAPE</span><strong>{nextMatch.formation.away}</strong></div></div>
  </>
}

export default App
