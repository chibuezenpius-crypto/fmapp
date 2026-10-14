import { club, leagueCompetitions, transferMarketPlayers } from './data/mockData'
import Flag from './Flag'
import { resolveFlagCode } from './countryFlagUtils'

const countrySummaries: Record<string, { rank: number; association: string; record: string; rankingChange: string }> = {
  england: { rank: 4, association: 'The FA', record: 'W 3 · D 1 · L 1', rankingChange: '+1 this month' },
  nigeria: { rank: 36, association: 'Nigerian Football Federation', record: 'W 4 · D 0 · L 1', rankingChange: '+3 this month' },
  spain: { rank: 2, association: 'Royal Spanish Football Federation', record: 'W 4 · D 1 · L 0', rankingChange: '+1 this month' },
  angola: { rank: 82, association: 'Angolan Football Federation', record: 'W 2 · D 2 · L 1', rankingChange: 'No change' },
  ghana: { rank: 77, association: 'Ghana Football Association', record: 'W 3 · D 1 · L 1', rankingChange: '+2 this month' },
  portugal: { rank: 6, association: 'Portuguese Football Federation', record: 'W 4 · D 1 · L 0', rankingChange: '+1 this month' },
  scotland: { rank: 48, association: 'Scottish Football Association', record: 'W 2 · D 1 · L 2', rankingChange: 'No change' },
  ireland: { rank: 60, association: 'Football Association of Ireland', record: 'W 2 · D 2 · L 1', rankingChange: '+2 this month' },
  wales: { rank: 32, association: 'Football Association of Wales', record: 'W 3 · D 1 · L 1', rankingChange: '+1 this month' },
}

export default function CountryOverview({ country, onSelectCountry }: { country: string; onSelectCountry: (country: string) => void }) {
  const normalizedCountry = country.toLowerCase()
  const summary = countrySummaries[normalizedCountry] ?? { rank: 0, association: `${country} Football Association`, record: 'W 2 · D 1 · L 2', rankingChange: 'No change' }
  const primaryLeague = leagueCompetitions.find((competition) => competition.category === 'Domestic Leagues' && competition.country.toLowerCase() === normalizedCountry && competition.totalMatchdays > 8)
  const players = transferMarketPlayers.filter((player) => player.personalInfo.nationalities.some((nationality) => nationality.country.toLowerCase() === normalizedCountry)).sort((first, second) => second.overall - first.overall).slice(0, 5)
  const flagCode = resolveFlagCode(country)

  return <div className="country-overview">
    <header className="country-overview-hero"><Flag code={flagCode} countryName={country} onSelectCountry={onSelectCountry} /><div><span className="eyebrow">COUNTRY OVERVIEW</span><h1>{country}</h1><span>{summary.association}</span></div></header>
    <section className="country-national-summary"><div className="country-ranking"><span className="eyebrow">WORLD RANKING</span><strong>{summary.rank || '—'}</strong><span>{summary.rankingChange}</span></div><div className="country-record"><span className="eyebrow">NATIONAL TEAM · LAST FIVE</span><strong>{summary.record}</strong><span>Senior men's team</span></div></section>
    {primaryLeague ? <section className="country-league-card"><div className="country-card-heading"><div><span className="eyebrow">DOMESTIC LEAGUE</span><h2>{primaryLeague.name}</h2><span>{primaryLeague.season} · Matchday {primaryLeague.matchday}</span></div><Flag code={flagCode} countryName={country} onSelectCountry={onSelectCountry} /></div><div className="country-standings">{primaryLeague.standings.map((standing) => <article className={standing.clubName === club.name ? 'country-standing own' : 'country-standing'} key={standing.clubId}><span>{String(standing.position).padStart(2, '0')}</span><strong>{standing.clubName}</strong><span>{standing.played} P</span><b>{standing.points}</b></article>)}</div></section> : <section className="country-league-card"><div className="country-card-heading"><div><span className="eyebrow">DOMESTIC LEAGUE</span><h2>Competition data unavailable</h2><span>No domestic league table is loaded for this country.</span></div></div></section>}
    <section className="country-top-players"><div className="country-card-heading"><div><span className="eyebrow">NATIONAL TEAM POOL</span><h2>Top players</h2></div><span>{players.length} PLAYERS</span></div>{players.length ? players.map((player, index) => <article className="country-player-row" key={player.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{player.name}</strong><small>{player.contract.clubId === club.id ? club.name : player.contract.clubId === 'redmere' ? 'Redmere City' : 'Oldcastle Rovers'} · {player.position}</small></div><b>{player.overall}</b></article>) : <p className="country-empty">No players from {country} are in the current mock pool.</p>}</section>
  </div>
}
