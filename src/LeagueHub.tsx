import { useState } from 'react'
import { leagueCompetitions } from './data/mockData'
import type { LeagueCategory, LeagueCompetition } from './types/game'
import Flag from './Flag'

const categories: LeagueCategory[] = ['Domestic Leagues', 'Continental Competitions', 'International']
const leagueSections = ['Standings', 'Player Stats', 'Team Stats', 'Rules', 'History'] as const
type LeagueSection = (typeof leagueSections)[number]
type PlayerStatKey = 'goals' | 'assists' | 'cleanSheets'

function LeagueTable({ competition }: { competition: LeagueCompetition }) {
  return <div className="table-wrap league-table-wrap">
    <div className="table-head"><span>CLUB</span><span>P</span><span>W-D-L</span><span>GF</span><span>GA</span><span>GD</span><span>PTS</span></div>
    {competition.standings.map((standing) => <div className={`table-row league-standing ${standing.clubName === 'Northbridge FC' ? 'own-club' : ''}`} key={standing.clubId}>
      <span className="table-club"><i>{String(standing.position).padStart(2, '0')}</i>{standing.clubName}</span><span>{standing.played}</span><span>{standing.won}-{standing.drawn}-{standing.lost}</span><span>{standing.goalsFor}</span><span>{standing.goalsAgainst}</span><span>{standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}</span><strong>{standing.points}</strong>
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
  const [season, setSeason] = useState('2026/27')
  const filteredCompetitions = leagueCompetitions.filter((item) => item.category === category)
  const regions = [...new Set(filteredCompetitions.map((item) => item.country))]
  const currentCompetition = leagueCompetitions.find((item) => item.id === selectedCompetitionId)
  const players = currentCompetition?.playerStats[playerStat] ?? []

  const chooseCategory = (nextCategory: LeagueCategory) => {
    setCategory(nextCategory)
    const firstCompetition = leagueCompetitions.find((item) => item.category === nextCategory)
    if (firstCompetition) setOpenRegion(firstCompetition.country)
    setSection('Standings')
  }

  return <div className="league-hub">
    {!currentCompetition && <>
      <div className="page-intro"><span className="eyebrow">LEAGUES & COMPETITIONS</span><h1>Global football</h1><p>Explore tables, form, and competition records.</p></div>
      <div className="league-category-tabs" role="tablist" aria-label="Competition categories">{categories.map((item) => <button aria-selected={category === item} className={category === item ? 'league-category active' : 'league-category'} key={item} onClick={() => chooseCategory(item)} role="tab" type="button">{item}</button>)}</div>
      <div className="league-region-list"><span className="eyebrow">{category === 'Domestic Leagues' ? 'COUNTRY' : 'REGION'}</span>
        {regions.map((region) => <section className="region-accordion" key={region}><button aria-expanded={openRegion === region} className={openRegion === region ? 'region-toggle open' : 'region-toggle'} onClick={() => setOpenRegion(openRegion === region ? '' : region)} type="button"><span>{region}</span><i>{filteredCompetitions.filter((item) => item.country === region).length}</i><b>{openRegion === region ? '−' : '+'}</b></button>
          {category === 'Domestic Leagues' && <Flag className="region-flag" code={region} countryName={region} onSelectCountry={onSelectCountry} />}
          {openRegion === region && <div className="region-leagues">{filteredCompetitions.filter((item) => item.country === region).map((item) => <button className="region-league" key={item.id} onClick={() => { setSection('Standings'); onSelectCompetition(item.id) }} type="button"><span>{item.name}</span><small>{item.totalMatchdays <= 8 ? 'CUP' : 'LEAGUE'}</small></button>)}</div>}
        </section>)}
      </div>
    </>}

    {currentCompetition && <section className="league-detail">
        <div className="league-detail-heading"><div><span className="eyebrow">{currentCompetition.country.toUpperCase()} · {currentCompetition.category.toUpperCase()}</span><h2>{currentCompetition.name}</h2><p>Matchday {currentCompetition.matchday} of {currentCompetition.totalMatchdays}</p></div><label className="league-season-select">SEASON<select aria-label="League season" onChange={(event) => setSeason(event.target.value)} value={season}><option>2026/27</option><option>2025/26</option><option>2024/25</option></select></label></div>
        <nav className="league-view-tabs" aria-label="League information sections">{leagueSections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'league-view-tab active' : 'league-view-tab'} key={item} onClick={() => setSection(item)} type="button">{item}</button>)}</nav>

        {section === 'Standings' && <LeagueTable competition={currentCompetition} />}

        {section === 'Player Stats' && <section className="league-data-panel"><div className="player-stat-switch">{([['goals', 'Goals'], ['assists', 'Assists'], ['cleanSheets', 'Clean Sheets']] as const).map(([key, label]) => <button aria-pressed={playerStat === key} className={playerStat === key ? 'player-stat-choice active' : 'player-stat-choice'} key={key} onClick={() => setPlayerStat(key)} type="button">{label}</button>)}</div>
          <div className="league-ranking-list">{players.map((player, index) => <article className="league-ranking-row" key={player.playerId}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{player.name}</strong><small>{player.clubName}</small></div><b>{player.value}</b></article>)}</div>
        </section>}

        {section === 'Team Stats' && <section className="league-data-panel"><div className="team-stats-header"><span>TEAM</span><span>POSS</span><span>GOALS</span><span>CS</span><span>CARDS</span></div>{currentCompetition.teamStats.map((team, index) => <article className="team-stat-row" key={team.clubId}><span>{index + 1}. {team.clubName}</span><span>{team.possession}%</span><span>{team.goals}</span><span>{team.cleanSheets}</span><span>{team.cards}</span></article>)}</section>}

        {section === 'Rules' && <section className="league-data-panel league-rules-list">{currentCompetition.rules.map((rule, index) => <article className="league-rule-row" key={rule}><span>{String(index + 1).padStart(2, '0')}</span><p>{rule}</p></article>)}</section>}

        {section === 'History' && <section className="league-data-panel league-history-list">{currentCompetition.history.map((record) => <article className="league-history-row" key={record.season}><span>{record.season}</span><div><strong>{record.champion}</strong><small>Runners-up · {record.runnerUp}</small></div><b>{record.points} pts</b></article>)}</section>}
      </section>}
  </div>
}
