import { useState } from 'react'
import { leagueCompetitions } from './data/mockData'
import rawGlobalLeagues from './data/globalLeaguesAndTeams.json'
import rawInternationalTournaments from './data/internationalTournaments.json'
import type { GlobalLeaguesDatabase, GlobalCountryLeague, InternationalTournament, InternationalTournamentsDatabase, LeagueCategory, LeagueCompetition, LeagueStanding, TournamentGroup } from './types/game'
import Flag from './Flag'
import ClubBadge from './ClubBadge'
import KnockoutBracket from './KnockoutBracket'

const categories: LeagueCategory[] = ['Domestic Leagues', 'Continental Competitions', 'International']
const leagueSections = ['Standings', 'Player Stats', 'Team Stats', 'Rules', 'History'] as const
type LeagueSection = (typeof leagueSections)[number]
type PlayerStatKey = 'goals' | 'assists' | 'cleanSheets'
const globalLeagues = rawGlobalLeagues as unknown as GlobalLeaguesDatabase

function adaptGlobalLeague(countryLeague: GlobalCountryLeague): LeagueCompetition {
  const sample = leagueCompetitions.find((competition) => competition.category === 'Domestic Leagues') ?? leagueCompetitions[0]
  const standings = countryLeague.teams.map((team) => ({ ...team.standing, clubId: team.id, clubName: team.name }))
  return {
    ...sample,
    id: countryLeague.id,
    name: countryLeague.name,
    country: countryLeague.countryName,
    category: 'Domestic Leagues',
    season: countryLeague.season,
    matchday: 12,
    totalMatchdays: 34,
    standings,
    teamStats: countryLeague.teams.map((team, index) => ({ clubId: team.id, clubName: team.name, possession: 58 - (index % 8) * 3, goals: team.standing.goalsFor, cleanSheets: Math.max(1, 8 - Math.floor(index / 3)), cards: 14 + index % 9 })),
  }
}

const internationalTournaments = rawInternationalTournaments as unknown as InternationalTournamentsDatabase

function findTournamentCountry(code: string) {
  return globalLeagues.countries.find((country) => country.countryCode === code)
}

function adaptTournament(tournament: InternationalTournament): LeagueCompetition {
  const sample = leagueCompetitions[0]
  const standings: LeagueStanding[] = tournament.eligibleCountryCodes.map((code, index) => {
    const country = findTournamentCountry(code)
    const played = 3
    const won = index % 3 === 0 ? 2 : 1
    const drawn = index % 3 === 1 ? 1 : 0
    const goalsFor = 4 + index % 5
    const goalsAgainst = 2 + (index + 2) % 4
    return {
      position: index + 1,
      clubId: code,
      clubName: `${country?.countryName ?? code} National Team`,
      played,
      won,
      drawn,
      lost: played - won - drawn,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points: won * 3 + drawn,
      form: ['W', 'D', 'W'] as ('W' | 'D' | 'L')[],
    }
  }).sort((first, second) => second.points - first.points || second.goalDifference - first.goalDifference)

  return {
    ...sample,
    id: tournament.id,
    name: tournament.name,
    country: tournament.region,
    category: tournament.category,
    season: tournament.season,
    matchday: 1,
    totalMatchdays: tournament.eligibleCountryCodes.length,
    standings,
    teamStats: standings.map((team, index) => ({ clubId: team.clubId, clubName: team.clubName, possession: 55 + index % 6 * 3, goals: team.goalsFor, cleanSheets: Math.max(0, 3 - team.goalsAgainst % 4), cards: 3 + index % 7 })),
    rules: tournament.rules,
    history: tournament.history.map((record) => ({ ...record, points: 0 })),
  }
}

function GroupTable({ group, onSelectCountry }: { group: TournamentGroup; onSelectCountry: (country: string) => void }) {
  const rows = group.countryCodes.map((code, index) => {
    const country = findTournamentCountry(code)
    const played = group.countryCodes.length - 1
    const won = Math.max(0, played - Math.ceil(index / 2))
    const drawn = played - won - index % 2
    const lost = played - won - drawn
    return { code, country, played, won, drawn, lost, points: won * 3 + drawn }
  }).sort((first, second) => second.points - first.points)

  return <section className="tournament-group-card"><h3>{group.name}</h3>{rows.map((row, index) => <div className="tournament-country-row" key={row.code}><span>{String(index + 1).padStart(2, '0')}</span><Flag code={row.country?.flagCode ?? row.code} countryName={row.country?.countryName ?? row.code} onSelectCountry={onSelectCountry} /><strong>{row.country?.countryName ?? row.code}</strong><small>{row.played} P · {row.won}-{row.drawn}-{row.lost}</small><b>{row.points}</b></div>)}</section>
}

function TournamentStages({ tournament, stageId, onStageChange, onSelectCountry }: { tournament: InternationalTournament; stageId: string; onStageChange: (stageId: string) => void; onSelectCountry: (country: string) => void }) {
  const stage = tournament.stages.find((item) => item.id === stageId) ?? tournament.stages[0]
  return <section className="tournament-stage-panel"><div className="tournament-stage-tabs" aria-label="Tournament stages">{tournament.stages.map((item) => <button aria-pressed={stage?.id === item.id} className={stage?.id === item.id ? 'tournament-stage-tab active' : 'tournament-stage-tab'} key={item.id} onClick={() => onStageChange(item.id)} type="button">{item.name}</button>)}</div>
    {stage?.format === 'groups' && <><p className="tournament-advancement">{stage.advancement}</p><div className="tournament-groups-grid">{stage.groups?.map((group) => <GroupTable group={group} key={group.name} onSelectCountry={onSelectCountry} />)}</div></>}
    {stage?.format === 'knockout' && <KnockoutBracket tournament={tournament} title={tournament.name} />}
  </section>
}

function LeagueTable({ competition, renderClub }: { competition: LeagueCompetition; renderClub?: (clubId: string) => React.ReactNode }) {
  return <div className="table-wrap league-table-wrap">
    <div className="table-head"><span>CLUB</span><span>P</span><span>W-D-L</span><span>GF</span><span>GA</span><span>GD</span><span>PTS</span></div>
    {competition.standings.map((standing) => <div className={`table-row league-standing ${standing.clubName === 'Northbridge FC' ? 'own-club' : ''}`} key={standing.clubId}>
      <span className="table-club"><i>{String(standing.position).padStart(2, '0')}</i>{renderClub?.(standing.clubId)}{standing.clubName}</span><span>{standing.played}</span><span>{standing.won}-{standing.drawn}-{standing.lost}</span><span>{standing.goalsFor}</span><span>{standing.goalsAgainst}</span><span>{standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}</span><strong>{standing.points}</strong>
    </div>)}
  </div>
}

interface LeagueHubProps {
  selectedCompetitionId: string | null
  onSelectCompetition: (id: string) => void
  onSelectCountry: (country: string) => void
}

export default function LeagueHub({ selectedCompetitionId, onSelectCompetition, onSelectCountry }: LeagueHubProps) {
  const [category, setCategory] = useState<LeagueCategory>('Domestic Leagues')
  const [openRegion, setOpenRegion] = useState('England')
  const [section, setSection] = useState<LeagueSection>('Standings')
  const [playerStat, setPlayerStat] = useState<PlayerStatKey>('goals')
  const [tournamentStageId, setTournamentStageId] = useState('group-stage')
  const [season, setSeason] = useState('2026/27')
  const categoryTournaments = internationalTournaments.tournaments.filter((item) => item.category === category)
  const browseItems = category === 'Domestic Leagues'
    ? [...globalLeagues.countries.map((item) => ({ id: item.id, name: item.name, country: item.countryName, totalMatchdays: 34 })), ...leagueCompetitions.filter((item) => item.category === 'Domestic Leagues' && item.totalMatchdays <= 8).map((item) => ({ id: item.id, name: item.name, country: item.country, totalMatchdays: item.totalMatchdays }))]
    : [...(category === 'International' ? [] : leagueCompetitions.filter((item) => item.category === category).map((item) => ({ id: item.id, name: item.name, country: item.country, totalMatchdays: item.totalMatchdays }))), ...categoryTournaments.map((item) => ({ id: item.id, name: item.name, country: item.region, totalMatchdays: item.stages.length }))]
  const regions = [...new Set(browseItems.map((item) => item.country))]
  const selectedGlobalCountry = globalLeagues.countries.find((item) => item.id === selectedCompetitionId)
  const currentTournament = internationalTournaments.tournaments.find((item) => item.id === selectedCompetitionId)
  const currentCompetition = selectedGlobalCountry ? adaptGlobalLeague(selectedGlobalCountry) : currentTournament ? adaptTournament(currentTournament) : leagueCompetitions.find((item) => item.id === selectedCompetitionId)
  const isDomesticCup = !selectedGlobalCountry && !currentTournament && currentCompetition?.category === 'Domestic Leagues' && currentCompetition.totalMatchdays <= 8
  const players = currentCompetition?.playerStats[playerStat] ?? []

  const chooseCategory = (nextCategory: LeagueCategory) => {
    setCategory(nextCategory)
    const firstCountry = nextCategory === 'Domestic Leagues' ? globalLeagues.countries[0]?.countryName : internationalTournaments.tournaments.find((item) => item.category === nextCategory)?.region ?? leagueCompetitions.find((item) => item.category === nextCategory)?.country
    if (firstCountry) setOpenRegion(firstCountry)
    setSection('Standings')
  }

  return <div className="league-hub">
    {!currentCompetition && <>
      <div className="page-intro"><span className="eyebrow">LEAGUES & COMPETITIONS</span><h1>Global football</h1><p>Explore tables, form, and competition records.</p></div>
      <div className="league-category-tabs" role="tablist" aria-label="Competition categories">{categories.map((item) => <button aria-selected={category === item} className={category === item ? 'league-category active' : 'league-category'} key={item} onClick={() => chooseCategory(item)} role="tab" type="button">{item}</button>)}</div>
      <div className="league-region-list"><span className="eyebrow">{category === 'Domestic Leagues' ? 'COUNTRY' : 'REGION'}</span>
        {regions.map((region) => <section className="region-accordion" key={region}><button aria-expanded={openRegion === region} className={openRegion === region ? 'region-toggle open' : 'region-toggle'} onClick={() => setOpenRegion(openRegion === region ? '' : region)} type="button"><span>{region}</span><i>{browseItems.filter((item) => item.country === region).length}</i><b>{openRegion === region ? '−' : '+'}</b></button>
          {category === 'Domestic Leagues' && <Flag className="region-flag" code={region} countryName={region} onSelectCountry={onSelectCountry} />}
          {openRegion === region && <div className="region-leagues">{browseItems.filter((item) => item.country === region).map((item) => <button className="region-league" key={item.id} onClick={() => { setSection('Standings'); setTournamentStageId('group-stage'); onSelectCompetition(item.id) }} type="button"><span>{item.name}</span><small>{item.totalMatchdays <= 8 ? 'CUP' : 'LEAGUE'}</small></button>)}</div>}
        </section>)}
      </div>
    </>}

    {currentCompetition && <section className="league-detail">
        <div className="league-detail-heading"><div><span className="eyebrow">{currentCompetition.country.toUpperCase()} · {currentCompetition.category.toUpperCase()}</span><h2>{currentCompetition.name}</h2><p>Matchday {currentCompetition.matchday} of {currentCompetition.totalMatchdays}</p></div><label className="league-season-select">SEASON<select aria-label="League season" onChange={(event) => setSeason(event.target.value)} value={season}><option>2026/27</option><option>2025/26</option><option>2024/25</option></select></label></div>
        <nav className="league-view-tabs" aria-label="League information sections">{leagueSections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'league-view-tab active' : 'league-view-tab'} key={item} onClick={() => setSection(item)} type="button">{item}</button>)}</nav>

        {section === 'Standings' && currentTournament ? <TournamentStages tournament={currentTournament} stageId={tournamentStageId} onStageChange={setTournamentStageId} onSelectCountry={onSelectCountry} /> : section === 'Standings' && isDomesticCup && currentCompetition ? <KnockoutBracket title={currentCompetition.name} season={currentCompetition.season} roundNames={['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final']} participants={globalLeagues.countries.find((country) => country.countryName === currentCompetition.country)?.teams.map((team) => ({ code: team.id, name: team.name, badge: team.badge })) ?? []} /> : section === 'Standings' && currentCompetition && <LeagueTable competition={currentCompetition} renderClub={(clubId) => {
          const team = selectedGlobalCountry?.teams.find((item) => item.id === clubId)
          return team ? <ClubBadge badge={team.badge} name={team.name} /> : null
        }} />}

        {section === 'Player Stats' && <section className="league-data-panel"><div className="player-stat-switch">{([['goals', 'Goals'], ['assists', 'Assists'], ['cleanSheets', 'Clean Sheets']] as const).map(([key, label]) => <button aria-pressed={playerStat === key} className={playerStat === key ? 'player-stat-choice active' : 'player-stat-choice'} key={key} onClick={() => setPlayerStat(key)} type="button">{label}</button>)}</div>
          <div className="league-ranking-list">{players.map((player, index) => <article className="league-ranking-row" key={player.playerId}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{player.name}</strong><small>{player.clubName}</small></div><b>{player.value}</b></article>)}</div>
        </section>}

        {section === 'Team Stats' && <section className="league-data-panel"><div className="team-stats-header"><span>TEAM</span><span>POSS</span><span>GOALS</span><span>CS</span><span>CARDS</span></div>{currentCompetition.teamStats.map((team, index) => <article className="team-stat-row" key={team.clubId}><span>{index + 1}. {team.clubName}</span><span>{team.possession}%</span><span>{team.goals}</span><span>{team.cleanSheets}</span><span>{team.cards}</span></article>)}</section>}

        {section === 'Rules' && <section className="league-data-panel league-rules-list">{currentCompetition.rules.map((rule, index) => <article className="league-rule-row" key={rule}><span>{String(index + 1).padStart(2, '0')}</span><p>{rule}</p></article>)}</section>}

        {section === 'History' && <section className="league-data-panel league-history-list">{currentCompetition.history.map((record) => <article className="league-history-row" key={record.season}><span>{record.season}</span><div><strong>{record.champion}</strong><small>Runners-up · {record.runnerUp}</small></div><b>{record.points} pts</b></article>)}</section>}
      </section>}
  </div>
}
