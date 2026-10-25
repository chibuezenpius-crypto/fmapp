import { lazy, Suspense, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { club, managerProfiles, refereeProfiles } from './data/mockData'
import { addDays, advanceDay, clearMessage, useGame, useWithLive } from './state/gameStore'
import './state/transfers'
import type { ProfileSection } from './PlayerProfile'
import type { ClubSection } from './ClubProfile'
import AppHeader, { type PanelKind } from './components/AppHeader'
import Dashboard from './components/Dashboard'
import type { NavActions, NavTab } from './components/navTypes'
import type { PersonnelProfile as PersonnelProfileData, Player } from './types/game'
import './App.css'

// Screens load on first visit so the opening page stays light.
const BoardOverview = lazy(() => import('./ClubRelations').then((module) => ({ default: module.BoardOverview })))
const FanOverview = lazy(() => import('./ClubRelations').then((module) => ({ default: module.FanOverview })))
const PlayerProfile = lazy(() => import('./PlayerProfile'))
const ClubProfile = lazy(() => import('./ClubProfile'))
const MatchCenter = lazy(() => import('./MatchCenter'))
const LeagueHub = lazy(() => import('./LeagueHub'))
const TransferMarket = lazy(() => import('./TransferMarket'))
const PersonnelProfile = lazy(() => import('./PersonnelProfile'))
const CountryOverview = lazy(() => import('./CountryOverview'))
const TacticsHub = lazy(() => import('./TacticsHub'))
const AcademyHub = lazy(() => import('./AcademyHub'))
const MatchesList = lazy(() => import('./MatchesList'))

const SCREEN_SIZES = [
  { label: 'Mobile', width: 480 },
  { label: 'Tablet', width: 768 },
  { label: 'Desktop', width: 1100 },
  { label: 'Full', width: 0 },
]


const tabs = [
  { id: 'Home', label: 'Home', icon: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6' },
  { id: 'Club', label: 'Club', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 12h.01M15 12h.01' },
  { id: 'Tactics', label: 'Tactics', icon: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11ZM9 12l2 2 4-4' },
  { id: 'Transfers', label: 'Transfers', icon: 'M7 7h14l-4-4M17 17H3l4 4M21 7l-4 4M3 17l4-4' },
  { id: 'League', label: 'League', icon: 'M4 19V5m0 14h17M8 15v-4m5 4V7m5 8v-6' },
  { id: 'Matches', label: 'Matches', icon: 'M7 3v4m10-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1ZM8 13h3v3H8z' },
] as const

type TabId = NavTab
type RelationsView = 'Board' | 'Fans'

function App() {
  const game = useGame()
  const [activeTab, setActiveTab] = useState<TabId>('Home')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelProfileData | null>(null)
  const [relationsView, setRelationsView] = useState<RelationsView | null>(null)
  const [profileSection, setProfileSection] = useState<ProfileSection>('Overview')
  const [selectedClubName, setSelectedClubName] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [selectedLeagueClubId, setSelectedLeagueClubId] = useState<string | null>(null)
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null)
  const [countryReturnLabel, setCountryReturnLabel] = useState('previous view')
  const [screenSize, setScreenSize] = useState(SCREEN_SIZES[0])
  const [clubSection, setClubSection] = useState<ClubSection>('Overview')
  const [clubReturnTab, setClubReturnTab] = useState<TabId>('Home')
  const [headerPanel, setHeaderPanel] = useState<PanelKind | null>(null)
  const [tacticsView, setTacticsView] = useState<'hub' | 'training'>('hub')
  const displayedMatches = useWithLive(game.matches)
  // The Matches tab lists the user's own matches plus everything around today, not every match of every league.
  const matchesTabMatches = displayedMatches.filter((match) => match.homeClubId === club.id || match.awayClubId === club.id || (match.date >= addDays(game.date, -2) && match.date <= addDays(game.date, 3)))
  const standings = game.standings
  const selectedMatch = displayedMatches.find((match) => match.id === selectedMatchId)
  const detailOpen = activeTab === 'Academy' || selectedCountryName !== null || selectedPlayer !== null || selectedPersonnel !== null || relationsView !== null || selectedLeagueId !== null || selectedLeagueClubId !== null || activeTab === 'Club' || selectedMatch !== undefined
  const backLabel = selectedCountryName ? `Back to ${countryReturnLabel}` : selectedPlayer || selectedPersonnel ? (activeTab === 'Club' ? 'Back to club' : `Back to ${activeTab.toLowerCase()}`)
    : relationsView ? `Back to ${activeTab.toLowerCase()}`
    : selectedLeagueClubId ? 'Back to league table'
    : selectedLeagueId ? 'Back to leagues'
    : selectedMatch ? (activeTab === 'Club' ? 'Back to club' : `Back to ${activeTab.toLowerCase()}`)
    : activeTab === 'Club' ? `Back to ${clubReturnTab.toLowerCase()}` : activeTab === 'Academy' ? 'Back to home' : `Back to ${activeTab.toLowerCase()}`
  const selectPlayer = (player: Player) => {
    setSelectedPlayer(player)
    setSelectedPersonnel(null)
    setRelationsView(null)
    setProfileSection('Overview')
  }
  const selectPersonnel = (idOrName: string) => {
    const manager = managerProfiles.find((profile) => profile.id === idOrName || profile.name === idOrName)
    const referee = refereeProfiles.find((profile) => profile.id === idOrName || profile.name === idOrName)
    setSelectedPersonnel(manager ? { type: 'Manager', profile: manager } : referee ? { type: 'Referee', profile: referee } : null)
    setSelectedPlayer(null)
    setRelationsView(null)
  }
  const openConfidenceView = (view: 'board' | 'fan' | 'manager') => {
    setSelectedPlayer(null)
    setSelectedPersonnel(null)
    if (view === 'board') setRelationsView('Board')
    else if (view === 'fan') setRelationsView('Fans')
    else {
      setRelationsView(null)
      const manager = managerProfiles.find((profile) => profile.id === 'emeka-nwosu')
      if (manager) setSelectedPersonnel({ type: 'Manager', profile: manager })
    }
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
    setRelationsView(null)
    setActiveTab('Club')
    setClubSection('Overview')
  }
  const openClubSection = (section: ClubSection) => {
    openClubProfile()
    setClubSection(section)
  }
  const selectTab = (tab: TabId) => {
    if (tab === 'Club' && activeTab !== 'Club') setClubReturnTab(activeTab)
    if (tab !== 'Club') setSelectedMatchId(null)
    if (tab !== 'League') { setSelectedLeagueId(null); setSelectedLeagueClubId(null) }
    setSelectedCountryName(null)
    setSelectedPlayer(null)
    setSelectedPersonnel(null)
    setRelationsView(null)
    setHeaderPanel(null)
    setTacticsView('hub')
    setActiveTab(tab)
  }
  const nav: NavActions = {
    onNavigate: selectTab,
    onOpenClubSection: openClubSection,
    onOpenConfidence: openConfidenceView,
    onOpenInbox: () => setHeaderPanel('inbox'),
    onOpenTraining: () => { selectTab('Tactics'); setTacticsView('training') },
    onSelectMatch: setSelectedMatchId,
    onSelectPlayer: selectPlayer,
    onSelectCountry: openCountryOverview,
  }
  const goBack = () => {
    if (selectedCountryName) {
      setSelectedCountryName(null)
      return
    }
    if (relationsView) {
      setRelationsView(null)
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
    if (selectedMatch) {
      setSelectedMatchId(null)
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
    if (activeTab === 'Academy') {
      setActiveTab('Home')
      return
    }
    setSelectedMatchId(null)
  }

  return (
    <div className="app-backdrop">
      {import.meta.env.DEV && <div className="screen-size-switcher" role="group" aria-label="Screen size">
        {SCREEN_SIZES.map((size) => <button aria-pressed={screenSize.label === size.label} key={size.label} onClick={() => setScreenSize(size)} type="button">{size.label}<small>{size.width ? `${size.width}px` : 'Full'}</small></button>)}
      </div>}
      <div className="mobile-container max-w-[430px] mx-auto min-h-[100dvh] overflow-hidden flex flex-col w-full">
        <div className="app-shell" style={import.meta.env.DEV && screenSize.width ? { width: '100%' } : { width: '100%' }}>
        <AppHeader expanded={!detailOpen} game={game} message={selectedMatch ? '' : game.message} nav={nav} onAdvanceDay={advanceDay} onClearMessage={clearMessage} onOpenClub={openClubProfile}
          panel={headerPanel} onPanelChange={setHeaderPanel}
          leading={<button aria-label={backLabel} className="header-back-button" onClick={goBack} type="button"><ArrowLeft aria-hidden="true" size={19} strokeWidth={2.2} /></button>} />

        <main className="main-content" key={selectedCountryName ? `country-${selectedCountryName}` : selectedPlayer ? 'profile' : selectedMatch ? `match-${selectedMatch.id}` : activeTab}>
          <Suspense fallback={<p className="empty-note" role="status">Loading…</p>}>
          {selectedCountryName ? <CountryOverview country={selectedCountryName} onSelectCountry={openCountryOverview} />
            : selectedPlayer ? <PlayerProfile player={selectedPlayer} section={profileSection} selectedClubName={selectedClubName}
            onSectionChange={setProfileSection} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} onSelectCountry={openCountryOverview} />
            : selectedPersonnel ? <PersonnelProfile personnel={selectedPersonnel} onSelectCountry={openCountryOverview} />
            : relationsView === 'Board' ? <BoardOverview />
            : relationsView === 'Fans' ? <FanOverview />
            : selectedMatch ? <MatchCenter match={selectedMatch} selectedClubName={selectedClubName}
                onSelectClub={setSelectedClubName} onOpenClub={openClubProfile} onSelectPlayer={selectPlayer} onSelectPersonnel={selectPersonnel}
                simulationError={game.message} />
              : activeTab === 'Club' ? <ClubProfile section={clubSection} selectedClubName={selectedClubName} matches={displayedMatches}
              onSectionChange={setClubSection} onSelectClub={setSelectedClubName} onSelectPlayer={selectPlayer} onSelectPersonnel={selectPersonnel} onSelectMatch={setSelectedMatchId} /> : <>
            {activeTab === 'Home' && <Dashboard game={game} nav={nav} />}
            {activeTab === 'Academy' && <AcademyHub onSelectPlayer={selectPlayer} onSelectCountry={openCountryOverview} />}
            {activeTab === 'Tactics' && <TacticsHub initialView={tacticsView} />}
            {activeTab === 'Transfers' && <TransferMarket onSelectPlayer={selectPlayer} onSelectCountry={openCountryOverview} />}
            {activeTab === 'League' && <LeagueHub seasonLabel={game.seasonLabel} history={game.history} matches={displayedMatches} standings={standings} selectedCompetitionId={selectedLeagueId} onSelectCompetition={setSelectedLeagueId} onSelectCountry={openCountryOverview} selectedClubId={selectedLeagueClubId} onSelectClub={setSelectedLeagueClubId} onSelectPlayer={selectPlayer} onSelectMatch={setSelectedMatchId} playerStats={game.playerStats} teamStats={game.teamStats} />}
            {activeTab === 'Matches' && <MatchesList matches={matchesTabMatches} onSelectMatch={setSelectedMatchId} />}
          </>}
          </Suspense>
        </main>

        <nav className="bottom-nav" aria-label="Main navigation">
          {tabs.map((tab) => (
            <button aria-current={activeTab === tab.id ? 'page' : undefined} aria-label={tab.label}
              className={activeTab === tab.id ? 'nav-item active' : 'nav-item'} key={tab.id}
              onClick={() => selectTab(tab.id)} type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={tab.icon} /></svg>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
    </div>
  )
}

export default App
