import { useState } from 'react'
import { club, getFixturesByLeague, league, leagueCompetitions, leagueStandings, totalMatchdays } from './data/mockData'
import { applySimulatedResults } from './simulation/season'
import type { SeasonRecord } from './state/gameStore'
import { describeRules, getCompetitionRules } from './data/competitionRules'
import rawGlobalLeagues from './data/globalLeaguesAndTeams.json'
import rawInternationalTournaments from './data/internationalTournaments.json'
import LeagueClubSquad from './LeagueClubSquad'
import type { MatchInfo, Player, GlobalLeaguesDatabase, GlobalCountryLeague, InternationalTournament, InternationalTournamentsDatabase, LeagueCategory, LeagueCompetition, LeagueStanding, TournamentGroup } from './types/game'
import Flag from './Flag'
import ClubBadge from './ClubBadge'
import KnockoutBracket from './KnockoutBracket'
import { findWorldCountry, worldCountries } from './worldCountries'

const categories: LeagueCategory[] = ['Domestic Leagues', 'Continental Competitions', 'International']
const leagueSections = ['Standings', 'Player Stats', 'Team Stats', 'Fixtures', 'Rules', 'History'] as const
type LeagueSection = (typeof leagueSections)[number]
type PlayerStatKey = 'goals' | 'assists' | 'cleanSheets' | 'cards' | 'rating'
const globalLeagues = rawGlobalLeagues as unknown as GlobalLeaguesDatabase

function adaptGlobalLeague(countryLeague: GlobalCountryLeague): LeagueCompetition {
  const sample = leagueCompetitions.find((competition) => competition.category === 'Domestic Leagues') ?? leagueCompetitions[0]
  const standings = leagueStandings(countryLeague)
  return {
    ...sample,
    id: countryLeague.id,
    name: countryLeague.name,
    country: countryLeague.countryName,
    category: 'Domestic Leagues',
    season: countryLeague.season,
    matchday: 0,
    totalMatchdays: totalMatchdays(countryLeague),
    standings,
    playerStats: { goals: [], assists: [], cleanSheets: [], cards: [], rating: [] },
    history: [],
    teamStats: countryLeague.teams.map((team) => ({ clubId: team.id, clubName: team.name, possession: 0, goals: 0, cleanSheets: 0, cards: 0 })),
    rules: describeRules(getCompetitionRules(countryLeague.id)),
  }
}

const internationalTournaments = rawInternationalTournaments as unknown as InternationalTournamentsDatabase

function findTournamentCountry(code: string) {
  const country = findWorldCountry(code)
  return country && { countryName: country.name, flagCode: country.flagCode }
}

function tournamentFieldCodes(tournament: InternationalTournament) {
  const grouped = tournament.stages.flatMap((stage) => stage.groups?.flatMap((group) => group.countryCodes) ?? [])
  return grouped.length ? grouped : tournament.eligibleCountryCodes
}

function nationCompetitions(code: string) {
  return internationalTournaments.tournaments.filter((tournament) => (tournament.qualifiedCountryCodes ?? tournament.eligibleCountryCodes).includes(code)).map((tournament) => tournament.name)
}

function adaptTournament(tournament: InternationalTournament): LeagueCompetition {
  const sample = leagueCompetitions[0]
  const fieldCodes = tournamentFieldCodes(tournament)
  const standings: LeagueStanding[] = fieldCodes.map((code, index) => {
    const country = findTournamentCountry(code)
    return {
      position: index + 1,
      clubId: code,
      clubName: `${country?.countryName ?? code} National Team`,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    }
  }).sort((first, second) => first.clubName.localeCompare(second.clubName)).map((standing, index) => ({ ...standing, position: index + 1 }))

  return {
    ...sample,
    id: tournament.id,
    name: tournament.name,
    country: tournament.region,
    category: tournament.category,
    season: tournament.season,
    matchday: 1,
    totalMatchdays: fieldCodes.length,
    standings,
    teamStats: standings.map((team) => ({ clubId: team.clubId, clubName: team.clubName, possession: 0, goals: 0, cleanSheets: 0, cards: 0 })),
    playerStats: { goals: [], assists: [], cleanSheets: [], cards: [], rating: [] },
    rules: describeRules(getCompetitionRules(tournament.id), tournament.rules),
    history: [],
  }
}

function GroupTable({ group, onSelectCountry }: { group: TournamentGroup; onSelectCountry: (country: string) => void }) {
  const rows = group.countryCodes.map((code) => {
    const country = findTournamentCountry(code)
    return { code, country, played: 0, won: 0, drawn: 0, lost: 0, points: 0 }
  }).sort((first, second) => (first.country?.countryName ?? first.code).localeCompare(second.country?.countryName ?? second.code))

  return <section className="tournament-group-card"><h3>{group.name}</h3>{rows.map((row, index) => <div className="tournament-country-row" key={row.code}><span>{String(index + 1).padStart(2, '0')}</span><Flag code={row.country?.flagCode ?? row.code} countryName={row.country?.countryName ?? row.code} onSelectCountry={onSelectCountry} /><strong>{row.country?.countryName ?? row.code}</strong><small>{row.played} P · {row.won}-{row.drawn}-{row.lost}</small><b>{row.points}</b></div>)}</section>
}

function TournamentStages({ tournament, stageId, onStageChange, onSelectCountry }: { tournament: InternationalTournament; stageId: string; onStageChange: (stageId: string) => void; onSelectCountry: (country: string) => void }) {
  const stage = tournament.stages.find((item) => item.id === stageId) ?? tournament.stages[0]
  return <section className="tournament-stage-panel"><div className="tournament-stage-tabs" aria-label="Tournament stages">{tournament.stages.map((item) => <button aria-pressed={stage?.id === item.id} className={stage?.id === item.id ? 'tournament-stage-tab active' : 'tournament-stage-tab'} key={item.id} onClick={() => onStageChange(item.id)} type="button">{item.name}</button>)}</div>
    {stage?.format === 'groups' && <><p className="tournament-advancement">{stage.advancement}</p><div className="tournament-groups-grid">{stage.groups?.map((group) => <GroupTable group={group} key={group.name} onSelectCountry={onSelectCountry} />)}</div></>}
    {stage?.format === 'knockout' && <KnockoutBracket tournament={tournament} title={tournament.name} />}
  </section>
}

function LeagueTable({ competition, renderClub, onSelectClub }: { competition: LeagueCompetition; renderClub?: (clubId: string) => React.ReactNode; onSelectClub?: (clubId: string) => void }) {
  return <div className="table-wrap league-table-wrap">
    <div className="table-head"><span>CLUB</span><span>P</span><span>W-D-L</span><span>GF</span><span>GA</span><span>GD</span><span>PTS</span></div>
    {competition.standings.map((standing) => <div className={`table-row league-standing ${standing.clubId === club.id ? 'own-club' : ''}`} key={standing.clubId}>
      <span className="table-club"><i>{String(standing.position).padStart(2, '0')}</i>{renderClub?.(standing.clubId)}{onSelectClub ? <button aria-label={`Open ${standing.clubName} squad`} className="entity-link" onClick={() => onSelectClub(standing.clubId)} type="button">{standing.clubName}</button> : standing.clubName}</span><span>{standing.played}</span><span>{standing.won}-{standing.drawn}-{standing.lost}</span><span>{standing.goalsFor}</span><span>{standing.goalsAgainst}</span><span>{standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}</span><strong>{standing.points}</strong>
    </div>)}
  </div>
}

interface LeagueHubProps {
  matches: MatchInfo[]
  standings: LeagueStanding[]
  playerStats: LeagueCompetition['playerStats']
  teamStats: LeagueCompetition['teamStats']
  selectedCompetitionId: string | null
  onSelectCompetition: (id: string) => void
  onSelectCountry: (country: string) => void
  selectedClubId: string | null
  onSelectClub: (clubId: string) => void
  onSelectPlayer: (player: Player) => void
  onSelectMatch: (id: string) => void
  seasonLabel: string
  history: SeasonRecord[]
}

export default function LeagueHub({ seasonLabel, history, matches, standings, playerStats, teamStats, selectedCompetitionId, onSelectCompetition, onSelectCountry, selectedClubId, onSelectClub, onSelectPlayer, onSelectMatch }: LeagueHubProps) {
  const [category, setCategory] = useState<LeagueCategory>('Domestic Leagues')
  const [openRegion, setOpenRegion] = useState('Nigeria')
  const [section, setSection] = useState<LeagueSection>('Standings')
  const [playerStat, setPlayerStat] = useState<PlayerStatKey>('goals')
  const [tournamentStageId, setTournamentStageId] = useState('group-stage')
  const categoryTournaments = internationalTournaments.tournaments.filter((item) => item.category === category)
  const [openConfederation, setOpenConfederation] = useState('')
  const browseItems = category === 'Domestic Leagues'
    ? [...globalLeagues.countries.map((item) => ({ id: item.id, name: item.name, country: item.countryName, totalMatchdays: 34 })), ...leagueCompetitions.filter((item) => item.category === 'Domestic Leagues' && item.totalMatchdays <= 8).map((item) => ({ id: item.id, name: item.name, country: item.country, totalMatchdays: item.totalMatchdays }))]
    : [...(category === 'International' ? [] : leagueCompetitions.filter((item) => item.category === category).map((item) => ({ id: item.id, name: item.name, country: item.country, totalMatchdays: item.totalMatchdays }))), ...categoryTournaments.map((item) => ({ id: item.id, name: item.name, country: item.region, totalMatchdays: item.stages.length }))]
  const regions = [...new Set(browseItems.map((item) => item.country))]
  const selectedGlobalCountry = globalLeagues.countries.find((item) => item.id === selectedCompetitionId)
  const currentTournament = internationalTournaments.tournaments.find((item) => item.id === selectedCompetitionId)
  const baseCompetition = selectedGlobalCountry ? adaptGlobalLeague(selectedGlobalCountry) : currentTournament ? adaptTournament(currentTournament) : leagueCompetitions.find((item) => item.id === selectedCompetitionId)
  const leagueMatches = baseCompetition ? getFixturesByLeague(baseCompetition.id, matches) : []
  const ownTable = baseCompetition?.id === league.id
  const competitionHistory = baseCompetition ? history.slice().reverse().flatMap((record) => {
    const summary = record.summaries[baseCompetition.id]
    return summary ? [{ season: record.label, ...summary }] : []
  }) : []
  const tableStandings = ownTable ? standings : selectedGlobalCountry && baseCompetition
    ? applySimulatedResults(baseCompetition.standings, leagueMatches.filter((match) => match.status === 'Completed'), getCompetitionRules(baseCompetition.id))
    : baseCompetition?.standings ?? []
  const completedRounds = new Set(leagueMatches.filter((match) => match.status === 'Completed').map((match) => match.matchday)).size
  const currentCompetition = baseCompetition ? {
    ...baseCompetition,
    season: seasonLabel,
    history: competitionHistory,
    ...(selectedGlobalCountry ? {
      standings: tableStandings,
      ...(ownTable ? { playerStats, teamStats } : {}),
      matchday: Math.max(0, ...tableStandings.map((standing) => standing.played)),
    } : currentTournament ? {} : { matchday: completedRounds }),
  } : baseCompetition
  const isDomesticCup = !selectedGlobalCountry && !currentTournament && currentCompetition?.category === 'Domestic Leagues' && currentCompetition.totalMatchdays <= 8
  const players = currentCompetition?.playerStats[playerStat] ?? []

  const chooseCategory = (nextCategory: LeagueCategory) => {
    setCategory(nextCategory)
    const firstCountry = nextCategory === 'Domestic Leagues' ? globalLeagues.countries[0]?.countryName : internationalTournaments.tournaments.find((item) => item.category === nextCategory)?.region ?? leagueCompetitions.find((item) => item.category === nextCategory)?.country
    if (firstCountry) setOpenRegion(firstCountry)
    setSection('Standings')
  }

  if (selectedClubId) return <LeagueClubSquad clubId={selectedClubId} onSelectPlayer={onSelectPlayer} />

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
      {category === 'International' && <div className="league-region-list"><span className="eyebrow">NATIONAL TEAMS · {worldCountries.countryCount}</span>
        {worldCountries.confederations.map((confederation) => {
          const nations = worldCountries.countries.filter((nation) => nation.confederation === confederation)
          return <section className="region-accordion" key={confederation}><button aria-expanded={openConfederation === confederation} className={openConfederation === confederation ? 'region-toggle open' : 'region-toggle'} onClick={() => setOpenConfederation(openConfederation === confederation ? '' : confederation)} type="button"><span>{confederation}</span><i>{nations.length}</i><b>{openConfederation === confederation ? '−' : '+'}</b></button>
            {openConfederation === confederation && <div className="region-leagues">{nations.map((nation) => <div className="region-league nation-row" key={nation.code}><Flag code={nation.flagCode} countryName={nation.name} onSelectCountry={onSelectCountry} /><span>{nation.name}</span><small>{nationCompetitions(nation.code).join(' · ')}</small></div>)}</div>}
          </section>
        })}
      </div>}
    </>}

    {currentCompetition && <section className="league-detail">
        <div className="league-detail-heading"><div><span className="eyebrow">{currentCompetition.country.toUpperCase()} · {currentCompetition.category.toUpperCase()}</span><h2>{currentCompetition.name}</h2><p>Matchday {currentCompetition.matchday} of {currentCompetition.totalMatchdays}</p></div><label className="league-season-select">SEASON<select aria-label="League season" disabled value={seasonLabel}><option>{seasonLabel}</option></select></label></div>
        <nav className="league-view-tabs" aria-label="League information sections">{leagueSections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'league-view-tab active' : 'league-view-tab'} key={item} onClick={() => setSection(item)} type="button">{item}</button>)}</nav>

        {section === 'Standings' && currentTournament ? <TournamentStages tournament={currentTournament} stageId={tournamentStageId} onStageChange={setTournamentStageId} onSelectCountry={onSelectCountry} /> : section === 'Standings' && isDomesticCup && currentCompetition ? <KnockoutBracket title={currentCompetition.name} season={currentCompetition.season} roundNames={['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final']} participants={globalLeagues.countries.find((country) => country.countryName === currentCompetition.country)?.teams.map((team) => ({ code: team.id, name: team.name, badge: team.badge })) ?? []} /> : section === 'Standings' && currentCompetition && <LeagueTable competition={currentCompetition} onSelectClub={selectedGlobalCountry ? onSelectClub : undefined} renderClub={(clubId) => {
          const team = selectedGlobalCountry?.teams.find((item) => item.id === clubId)
          return team ? <ClubBadge badge={team.badge} name={team.name} /> : null
        }} />}

        {section === 'Player Stats' && <section className="league-data-panel"><div className="player-stat-switch">{([['goals', 'Goals'], ['assists', 'Assists'], ['cleanSheets', 'Clean Sheets'], ['cards', 'Cards'], ['rating', 'Rating']] as const).map(([key, label]) => <button aria-pressed={playerStat === key} className={playerStat === key ? 'player-stat-choice active' : 'player-stat-choice'} key={key} onClick={() => setPlayerStat(key)} type="button">{label}</button>)}</div>
          <div className="league-ranking-list">{players.map((player, index) => <article className="league-ranking-row" key={player.playerId}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{player.name}</strong><small>{player.clubName}</small></div><b>{playerStat === 'rating' ? player.value.toFixed(2) : player.value}<small className="stat-apps"> {playerStat === 'cards' ? `${(player as { yellow?: number }).yellow ?? 0}Y ${(player as { red?: number }).red ?? 0}R · ` : ''}apps {player.apps}</small></b></article>)}</div>
        </section>}

        {section === 'Team Stats' && <section className="league-data-panel"><div className="team-stats-header"><span>TEAM</span><span>POSS</span><span>GOALS</span><span>CS</span><span>CARDS</span></div>{currentCompetition.teamStats.map((team, index) => <article className="team-stat-row" key={team.clubId}><span>{index + 1}. {team.clubName}</span><span>{team.possession}%</span><span>{team.goals}</span><span>{team.cleanSheets}</span><span>{team.cards}</span></article>)}</section>}

        {section === 'Fixtures' && <LeagueFixturesSection matches={matches} leagueId={currentCompetition.id} onSelectMatch={onSelectMatch} />}

        {section === 'Rules' && <section className="league-data-panel league-rules-list">{currentCompetition.rules.map((rule, index) => <article className="league-rule-row" key={rule}><span>{String(index + 1).padStart(2, '0')}</span><p>{rule}</p></article>)}</section>}

        {section === 'History' && <section className="league-data-panel league-history-list">{currentCompetition.history.map((record) => <article className="league-history-row" key={record.season}><span>{record.season}</span><div><strong>{record.champion}</strong><small>Runners-up · {record.runnerUp}</small></div><b>{record.points} pts</b></article>)}</section>}
      </section>}
  </div>
}

function LeagueFixturesSection({ matches, leagueId, onSelectMatch }: { matches: MatchInfo[]; leagueId: string; onSelectMatch: (id: string) => void }) {
  const sorted = getFixturesByLeague(leagueId, matches).sort((a, b) => `${a.date}${a.kickOff}`.localeCompare(`${b.date}${b.kickOff}`))
  const groups: { label: string; list: typeof sorted }[] = []
  const completed = sorted.filter((m) => m.status === 'Completed')
  const live = sorted.filter((m) => m.status === 'Live')
  const upcoming = sorted.filter((m) => m.status === 'Upcoming')
  if (completed.length) groups.push({ label: 'Results', list: completed })
  if (live.length) groups.push({ label: 'Live', list: live })
  if (upcoming.length) groups.push({ label: 'Upcoming', list: upcoming })
  const fmt = { day: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }), wday: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }) }
  return (
    <section className="league-data-panel league-fixtures-panel">
      {groups.map(({ label, list }) => (
        <div className="league-fixtures-group" key={label}>
          <header className="club-fixtures-group-header">
            <i className="fixture-club-crest">{label.slice(0, 1)}</i>
            <strong>{label}</strong>
            <span>{list.length}</span>
          </header>
          {list.map((match) => {
            const done = match.status === 'Completed'
            const isLive = match.status === 'Live'
            const homeOwn = match.homeClubId === club.id
            const awayOwn = match.awayClubId === club.id
            const dateObj = new Date(`${match.date}T12:00:00`)
            return (
              <div className={`club-fixture-row ${match.status.toLowerCase()}`} key={match.id}>
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
                      <strong>{isLive ? 'LIVE' : done ? 'FT' : match.kickOff}</strong>
                      <small>{fmt.wday.format(dateObj).toUpperCase()} {fmt.day.format(dateObj)}</small>
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
        </div>
      ))}
      {!groups.length && <p className="league-empty-note">No fixtures recorded for this competition.</p>}
    </section>
  )
}
