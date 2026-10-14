import { useState, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { club, clubConfidence, getClubBadge, homeMetrics, league, managerProfiles, matchFixtures, nextMatch, refereeProfiles, squadHealthMetrics, upcomingFixtures } from './data/mockData'
import ClubBadge from './ClubBadge'
import PlayerProfile, { type ProfileSection } from './PlayerProfile'
import ClubProfile, { type ClubSection } from './ClubProfile'
import MatchCenter from './MatchCenter'
import LeagueHub from './LeagueHub'
import TransferMarket from './TransferMarket'
import PersonnelProfile from './PersonnelProfile'
import CountryOverview from './CountryOverview'
import TacticsHub from './TacticsHub'
import MatchesList from './MatchesList'
import type { ClubConfidenceData, MatchInfo, PersonnelProfile as PersonnelProfileData, Player, SquadHealthMetrics } from './types/game'
import './App.css'

const SCREEN_SIZES = [
  { label: 'Mobile', width: 480 },
  { label: 'Tablet', width: 768 },
  { label: 'Desktop', width: 1100 },
  { label: 'Full', width: 0 },
]


const tabs = [
  { id: 'Home', label: 'Home', icon: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6' },
  { id: 'Squad', label: 'Squad', icon: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6' },
  { id: 'Club', label: 'Club', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 12h.01M15 12h.01' },
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
  const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelProfileData | null>(null)
  const [profileSection, setProfileSection] = useState<ProfileSection>('Overview')
  const [selectedClubName, setSelectedClubName] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [selectedLeagueClubId, setSelectedLeagueClubId] = useState<string | null>(null)
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null)
  const [countryReturnLabel, setCountryReturnLabel] = useState('previous view')
  const [screenSize, setScreenSize] = useState(SCREEN_SIZES[0])
  const [clubSection, setClubSection] = useState<ClubSection>('Overview')
  const [, setClubVersion] = useState(0)
  const [clubReturnTab, setClubReturnTab] = useState<TabId>('Home')
  const position = league.standings.find((standing) => standing.clubId === club.id)
  const selectedMatch = matchFixtures.find((match) => match.id === selectedMatchId)
  const detailOpen = selectedCountryName !== null || selectedPlayer !== null || selectedPersonnel !== null || selectedLeagueId !== null || selectedLeagueClubId !== null || activeTab === 'Club' || selectedMatch !== undefined
  const backLabel = selectedCountryName ? `Back to ${countryReturnLabel}` : selectedPlayer || selectedPersonnel ? (activeTab === 'Club' ? 'Back to club' : `Back to ${activeTab.toLowerCase()}`)
    : selectedLeagueClubId ? 'Back to league table'
    : selectedLeagueId ? 'Back to leagues'
    : activeTab === 'Club' ? `Back to ${clubReturnTab.toLowerCase()}` : `Back to ${activeTab.toLowerCase()}`
  const selectPlayer = (player: Player) => {
    setSelectedPlayer(player)
    setSelectedPersonnel(null)
    setProfileSection('Overview')
  }
  const selectPersonnel = (idOrName: string) => {
    const manager = managerProfiles.find((profile) => profile.id === idOrName || profile.name === idOrName)
    const referee = refereeProfiles.find((profile) => profile.id === idOrName || profile.name === idOrName)
    setSelectedPersonnel(manager ? { type: 'Manager', profile: manager } : referee ? { type: 'Referee', profile: referee } : null)
    setSelectedPlayer(null)
  }
  const openCountryOverview = (country: string) => {
    if (!selectedCountryName) {
      const source = selectedPlayer ? 'player profile' : selectedPersonnel ? 'personnel profile' : selectedLeagueId ? 'league details' : selectedMatch ? 'match center' : activeTab === 'Club' ? 'club' : activeTab === 'League' ? 'leagues' : activeTab.toLowerCase()
      setCountryReturnLabel(source)
    }
    setSelectedCountryName(country)
  }
  const openClubProfile = () => {
    if (activeTab !== 'Club') setClubReturnTab(activeTab)
    setSelectedPlayer(null)
    setSelectedPersonnel(null)
    setActiveTab('Club')
    setClubSection('Overview')
  }
  const goBack = () => {
    if (selectedCountryName) {
      setSelectedCountryName(null)
      return
    }
    if (selectedPersonnel) {
      setSelectedPersonnel(null)
      return
    }
    if (selectedPlayer) {
      setSelectedPlayer(null)
      return
    }
    if (selectedLeagueClubId) {
      setSelectedLeagueClubId(null)
      return
    }
    if (selectedLeagueId) {
      setSelectedLeagueId(null)
      return
    }
    if (activeTab === 'Club') {
      setActiveTab(clubReturnTab)
      return
    }
    setSelectedMatchId(null)
  }

  return (
    <div className="app-backdrop">
      <div className="screen-size-switcher" role="group" aria-label="Screen size">
        {SCREEN_SIZES.map((size) => <button aria-pressed={screenSize.label === size.label} key={size.label} onClick={() => setScreenSize(size)} type="button">{size.label}<small>{size.width ? `${size.width}px` : 'Full'}</small></button>)}
      </div>
      <div className="app-shell" style={screenSize.width ? { width: `min(100%, ${screenSize.width}px)` } : { width: '100%' }}>
        <header className="topbar">
          {detailOpen ? <button aria-label={backLabel} className="header-back-button" onClick={goBack} type="button"><ArrowLeft aria-hidden="true" size={19} strokeWidth={2.2} /></button>
            : <ClubReference name={club.name} selectedClubName={selectedClubName} onSelect={setSelectedClubName} onOpen={openClubProfile} className="club-mark" ariaLabel={`${club.name} crest`}><ClubBadge badge={getClubBadge(club.id)} name={club.name} /></ClubReference>}
          <div className="identity">
            <span className="eyebrow">MANAGER CAREER · 2026/27</span>
            <strong>{club.manager.name}</strong>
            <ClubReference name={club.name} selectedClubName={selectedClubName} onSelect={setSelectedClubName} onOpen={openClubProfile} className="club-name" />
          </div>
          <div className="header-date"><span>IN-GAME DATE</span><strong>14 OCT</strong><span>WEDNESDAY</span></div>
          <div className="budget-strip"><span>TRANSFER BUDGET</span><strong>{money(club.finances.transferBudget)}</strong></div>
        </header>

        <main className="main-content" key={selectedCountryName ? `country-${selectedCountryName}` : selectedPlayer ? 'profile' : selectedMatch ? `match-${selectedMatch.id}` : activeTab}>
          {selectedCountryName ? <CountryOverview country={selectedCountryName} onSelectCountry={openCountryOverview} />
            : selectedPlayer ? <PlayerProfile player={selectedPlayer} section={profileSection} selectedClubName={selectedClubName}
            onSectionChange={setProfileSection} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} onSelectCountry={openCountryOverview} onClubChange={() => setClubVersion((version) => version + 1)} />
            : selectedPersonnel ? <PersonnelProfile personnel={selectedPersonnel} onSelectCountry={openCountryOverview} />
            : activeTab === 'Club' ? <ClubProfile section={clubSection} selectedClubName={selectedClubName}
              onSectionChange={setClubSection} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} onSelectPersonnel={selectPersonnel} />
              : selectedMatch ? <MatchCenter match={selectedMatch} selectedClubName={selectedClubName}
                onSelectClub={setSelectedClubName} onOpenClub={openClubProfile} onSelectPlayer={selectPlayer} onSelectPersonnel={selectPersonnel} /> : <>
            {activeTab === 'Home' && <HomeView position={position?.position ?? 0} selectedClubName={selectedClubName} selectedMatchId={selectedMatchId} onSelectMatch={setSelectedMatchId} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} />}
            {activeTab === 'Squad' && <SquadView selectedClubName={selectedClubName} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} />}
            {activeTab === 'Tactics' && <TacticsHub />}
            {activeTab === 'Transfers' && <TransferMarket onSelectPlayer={selectPlayer} onSelectCountry={openCountryOverview} />}
            {activeTab === 'League' && <LeagueHub selectedCompetitionId={selectedLeagueId} onSelectCompetition={setSelectedLeagueId} onSelectCountry={openCountryOverview} selectedClubId={selectedLeagueClubId} onSelectClub={setSelectedLeagueClubId} onSelectPlayer={selectPlayer} />}
            {activeTab === 'Matches' && <MatchesList matches={matchFixtures} onSelectMatch={setSelectedMatchId} />}
          </>}
        </main>

        <nav className="bottom-nav" aria-label="Main navigation">
          {tabs.map((tab) => (
            <button aria-current={activeTab === tab.id ? 'page' : undefined} aria-label={tab.label}
              className={activeTab === tab.id ? 'nav-item active' : 'nav-item'} key={tab.id}
              onClick={() => { if (tab.id === 'Club' && activeTab !== 'Club') setClubReturnTab(activeTab); if (tab.id !== 'Club') setSelectedMatchId(null); if (tab.id !== 'League') { setSelectedLeagueId(null); setSelectedLeagueClubId(null) }; setSelectedCountryName(null); setSelectedPlayer(null); setSelectedPersonnel(null); setActiveTab(tab.id) }} type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={tab.icon} /></svg>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function ClubReference({ name, selectedClubName, onSelect, onOpen, className = '', ariaLabel, children }: { name: string; selectedClubName: string | null; onSelect: (name: string) => void; onOpen?: () => void; className?: string; ariaLabel?: string; children?: ReactNode }) {
  return <button aria-label={ariaLabel} aria-pressed={selectedClubName === name} className={`entity-link ${className} ${selectedClubName === name ? 'selected' : ''}`} onClick={() => onOpen ? onOpen() : onSelect(name)} type="button">{children ?? name}</button>
}

function SectionHeading({ kicker, title, detail }: { kicker: string; title: string; detail?: string }) {
  return <div className="section-heading"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2></div>{detail && <span className="section-detail">{detail}</span>}</div>
}

function HomeView({ position, selectedClubName, selectedMatchId, onSelectMatch, onSelectClub, onSelectPlayer }: { position: number; selectedClubName: string | null; selectedMatchId: string | null; onSelectMatch: (id: string) => void; onSelectClub: (name: string) => void; onSelectPlayer: (player: Player) => void }) {
  return <>
    <div className="welcome-row"><div><span className="eyebrow">WEDNESDAY, 14 OCTOBER</span><h1>Match week, <em>boss.</em></h1></div><span className="round-tag">MD {nextMatch.matchday}</span></div>
    <section className={`fixture-panel ${selectedMatchId === nextMatch.id ? 'selected-match' : ''}`} aria-label="Next fixture">
      <div className="fixture-topline"><span>NEXT FIXTURE</span><span>{nextMatch.competition.toUpperCase()} · MD {nextMatch.matchday}</span></div>
      <div className="fixture-teams">
        <ClubReference name={nextMatch.homeClubName} selectedClubName={selectedClubName} onSelect={onSelectClub} className="fixture-club team-link"><span className="large-crest home-crest"><ClubBadge badge={getClubBadge(nextMatch.homeClubId)} name={nextMatch.homeClubName} /></span><strong>{nextMatch.homeClubName.toUpperCase()}</strong></ClubReference>
        <button aria-label={`Select ${nextMatch.homeClubName} versus ${nextMatch.awayClubName} fixture`} aria-pressed={selectedMatchId === nextMatch.id} className="fixture-versus fixture-select" onClick={() => onSelectMatch(nextMatch.id)} type="button"><span>VS</span><b>17</b><small>OCT · 15:00</small></button>
        <ClubReference name={nextMatch.awayClubName} selectedClubName={selectedClubName} onSelect={onSelectClub} className="fixture-club away team-link"><span className="large-crest away-crest"><ClubBadge badge={getClubBadge(nextMatch.awayClubId)} name={nextMatch.awayClubName} /></span><strong>{nextMatch.awayClubName.toUpperCase()}</strong></ClubReference>
      </div>
      <div className="fixture-bottom"><span>{nextMatch.venue}</span><span>{nextMatch.weather}</span><span>IN 3 DAYS</span></div>
    </section>
    <section className="metric-row" aria-label="Club overview">
      <div className="metric"><span>LEAGUE POSITION</span><strong><i>{String(position).padStart(2, '0')}</i><small> / {homeMetrics.teamCount}</small></strong><span className="metric-note">{homeMetrics.pointsBehindLeader === 0 ? 'Top of the table' : `${homeMetrics.pointsBehindLeader} pts off top`}</span></div>
      <div className="metric"><span>TRANSFER BUDGET</span><strong>{money(club.finances.transferBudget)}</strong><span className="metric-note">Wage room £{(homeMetrics.wageRoom / 1000).toFixed(1)}k/wk</span></div>
      <div className="metric"><span>LAST 5</span><div className="form-dots">{homeMetrics.form.map((result, index) => <b className={`form-${result.toLowerCase()}`} key={`${result}-${index}`}>{result}</b>)}</div><span className="metric-note">{homeMetrics.formSummary}</span></div>
    </section>
    <TeamStatusCard metrics={squadHealthMetrics} totalPlayers={club.squad.length} />
    <ClubConfidenceCard data={clubConfidence} />
    <UpcomingFixturesPreview fixtures={upcomingFixtures} onSelectMatch={onSelectMatch} selectedMatchId={selectedMatchId} />
    <section className="content-section" aria-label="League table preview"><SectionHeading kicker="THE RUN-IN" title="League table" detail="NEAR YOU" /><LeagueTable compact onSelectClub={onSelectClub} onSelectPlayer={onSelectPlayer} selectedClubName={selectedClubName} /></section>
  </>
}

function TeamStatusCard({ metrics, totalPlayers }: { metrics: SquadHealthMetrics; totalPlayers: number }) {
  return (
    <section className="content-section" aria-label="Squad health and team status">
      <SectionHeading kicker="FIRST TEAM" title="Team status" detail={`${totalPlayers} PLAYERS`} />
      <div className="team-status-card">
        <div className="team-metrics-grid">
          <div className="team-metric-box">
            <span className="team-metric-label">ACTIVE INJURIES</span>
            <div className="team-metric-val-row">
              <strong className="team-metric-val zero">{metrics.activeInjuries}</strong>
              <span className="metric-status-tag clean">None</span>
            </div>
            <span className="team-metric-hint">{metrics.injuriesNote}</span>
          </div>

          <div className="team-metric-box">
            <span className="team-metric-label">SUSPENSIONS</span>
            <div className="team-metric-val-row">
              <strong className="team-metric-val zero">{metrics.suspensions}</strong>
              <span className="metric-status-tag clean">Eligible</span>
            </div>
            <span className="team-metric-hint">{metrics.suspensionsNote}</span>
          </div>

          <div className="team-metric-box">
            <span className="team-metric-label">SQUAD MORALE</span>
            <div className="team-metric-val-row">
              <strong className="team-metric-val">{metrics.moralePercentage}%</strong>
              <span className="metric-status-tag morale">{metrics.squadMorale}</span>
            </div>
            <span className="team-metric-hint">High camp harmony</span>
          </div>

          <div className="team-metric-box">
            <span className="team-metric-label">TEAM CHEMISTRY</span>
            <div className="team-metric-val-row">
              <strong className="team-metric-val">{metrics.teamChemistry}%</strong>
              <span className="metric-status-tag chemistry">Strong</span>
            </div>
            <span className="team-metric-hint">{metrics.chemistryNote}</span>
          </div>
        </div>

        <div className="team-status-footer">
          <span className="status-indicator" />
          <div className="team-status-footer-info">
            <strong>Everyone ready</strong>
            <span>Full squad available for Saturday</span>
          </div>
          <strong className="fitness-score">{metrics.averageFitness}% <small>AVG</small></strong>
        </div>
      </div>
    </section>
  )
}

function ClubConfidenceCard({ data }: { data: ClubConfidenceData }) {
  const items = [
    { key: 'board', label: 'Board Confidence', item: data.board },
    { key: 'fan', label: 'Fan Confidence', item: data.fan },
    { key: 'player', label: 'Player Confidence', item: data.player },
  ] as const

  return (
    <section className="content-section" aria-label="Club confidence ratings">
      <SectionHeading kicker="CLUB STANDING" title="Club confidence" detail="OCTOBER 2026" />
      <div className="confidence-card">
        {items.map(({ key, label, item }) => (
          <div className="confidence-item" key={key}>
            <div className="confidence-label-row">
              <span className="confidence-title">{label}</span>
              <div className="confidence-badge-group">
                <span className={`confidence-badge ${item.status.toLowerCase().replace(' ', '-')}`}>
                  {item.status}
                </span>
                <strong className="confidence-pct">{item.percentage}%</strong>
              </div>
            </div>
            <div className="confidence-track" role="progressbar" aria-valuenow={item.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${item.percentage}%`}>
              <div
                className={`confidence-fill ${item.percentage >= 85 ? 'high' : 'medium'}`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <span className="confidence-note">{item.note}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function UpcomingFixturesPreview({
  fixtures,
  selectedMatchId,
  onSelectMatch,
}: {
  fixtures: MatchInfo[]
  selectedMatchId: string | null
  onSelectMatch: (id: string) => void
}) {
  return (
    <section className="content-section" aria-label="Upcoming fixtures preview">
      <SectionHeading kicker="SCHEDULE" title="Upcoming fixtures" detail="NEXT 3 MATCHES" />
      <div className="upcoming-fixtures-card">
        {fixtures.slice(0, 3).map((match) => {
          const isHome = match.homeClubId === club.id
          const opponentName = isHome ? match.awayClubName : match.homeClubName
          const opponentId = isHome ? match.awayClubId : match.homeClubId
          const dateObj = new Date(`${match.date}T12:00:00`)
          const dayNum = dateObj.getDate()
          const monthStr = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(dateObj).toUpperCase()
          const isSelected = selectedMatchId === match.id

          return (
            <button
              key={match.id}
              type="button"
              className={`upcoming-fixture-row ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectMatch(match.id)}
              aria-label={`View match details: ${club.name} vs ${opponentName} on ${dayNum} ${monthStr}`}
              aria-pressed={isSelected}
            >
              <div className="upcoming-date-box">
                <strong>{String(dayNum).padStart(2, '0')}</strong>
                <small>{monthStr}</small>
              </div>

              <div className="upcoming-crest-slot">
                <span className="mini-crest"><ClubBadge badge={getClubBadge(opponentId)} name={opponentName} /></span>
              </div>

              <div className="upcoming-match-info">
                <div className="upcoming-meta-row">
                  <span className={`venue-tag ${isHome ? 'home' : 'away'}`}>{isHome ? 'HOME' : 'AWAY'}</span>
                  <span className="upcoming-comp-text">{match.competition} · MD {match.matchday}</span>
                </div>
                <strong className="upcoming-opponent-title">{opponentName}</strong>
              </div>

              <div className="upcoming-right-slot">
                <span className="upcoming-time-text">{match.kickOff}</span>
                <span className="upcoming-venue-text">{match.venue}</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function SquadView({ selectedClubName, onSelectClub, onSelectPlayer }: { selectedClubName: string | null; onSelectClub: (name: string) => void; onSelectPlayer: (player: Player) => void }) {
  return <>
    <div className="page-intro"><span className="eyebrow">FIRST TEAM · {club.squad.length} PLAYERS</span><h1>The squad</h1><p>Average age {(club.squad.reduce((sum, player) => sum + player.age, 0) / club.squad.length).toFixed(1)} · {club.formation} · <ClubReference name={club.name} selectedClubName={selectedClubName} onSelect={onSelectClub} /></p></div>
    <div className="list-header"><span>PLAYER</span><span>FIT</span><span>OVR</span><span>VALUE</span></div>
    <div className="player-list">{club.squad.map((player) => <button aria-label={`Open ${player.name} profile`} className="player-row player-row-button" key={player.id} onClick={() => onSelectPlayer(player)} type="button">
      <span className="shirt-number">{String(player.shirtNumber).padStart(2, '0')}</span>
      <div className="player-identity"><strong>{player.name}</strong><span>{player.position} <i>·</i> {player.age} yrs</span></div>
      <span className="player-fit"><i style={{ width: `${player.fitness}%` }} /></span>
      <strong className="player-rating">{player.overall}</strong><span className="player-value">{money(player.value)}</span>
    </button>)}</div>
  </>
}

const nearbyStandings = league.standings.slice(Math.max(0, Math.min(homeMetrics.position - 3, league.standings.length - 5)), Math.max(0, Math.min(homeMetrics.position - 3, league.standings.length - 5)) + 5)

function LeagueTable({ compact = false, selectedClubName, onSelectClub }: { compact?: boolean; selectedClubName: string | null; onSelectClub: (name: string) => void; onSelectPlayer: (player: Player) => void }) {
  return <div className="table-wrap">
    <div className="table-head"><span>CLUB</span><span>P</span><span>GD</span><span>PTS</span>{!compact && <span>FORM</span>}</div>
    {(compact ? nearbyStandings : league.standings).map((standing) => <div className={`table-row ${standing.clubId === club.id ? 'own-club' : ''}`} key={standing.clubId}>
      <span className="table-club"><i>{String(standing.position).padStart(2, '0')}</i><ClubReference name={standing.clubName} selectedClubName={selectedClubName} onSelect={onSelectClub} /></span>
      <span>{standing.played}</span><span>{standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}</span><strong>{standing.points}</strong>
      {!compact && <span className="table-form">{standing.form.map((result, index) => <i className={`form-${result.toLowerCase()}`} key={`${standing.clubId}-${index}`} />)}</span>}
    </div>)}
  </div>
}

export default App
