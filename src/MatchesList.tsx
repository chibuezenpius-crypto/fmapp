import { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { club, league } from './data/mockData'
import type { MatchInfo } from './types/game'

type MatchFilter = 'All' | 'Live' | 'Upcoming' | 'Finished' | 'Favourites'

const FILTERS: MatchFilter[] = ['All', 'Live', 'Upcoming', 'Finished', 'Favourites']
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

function parse(date: string) {
  return new Date(`${date}T12:00:00`)
}

export default function MatchesList({ matches, onSelectMatch }: { matches: MatchInfo[]; onSelectMatch: (id: string) => void }) {
  const [filter, setFilter] = useState<MatchFilter>('All')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [favourites, setFavourites] = useState<string[]>([])

  const dates = useMemo(() => [...new Set(matches.map((match) => match.date))].sort(), [matches])

  const toggleFavourite = (id: string) => setFavourites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  const visible = matches
    .filter((match) => !selectedDate || match.date === selectedDate)
    .filter((match) => filter === 'All' || (filter === 'Live' && match.status === 'Live') || (filter === 'Upcoming' && match.status === 'Upcoming') || (filter === 'Finished' && match.status === 'Completed') || (filter === 'Favourites' && favourites.includes(match.id)))
    .sort((a, b) => `${a.date}${a.kickOff}`.localeCompare(`${b.date}${b.kickOff}`))

  const groups = visible.reduce<Record<string, MatchInfo[]>>((result, match) => {
    ;(result[match.competition] ??= []).push(match)
    return result
  }, {})

  return <>
    <div className="page-intro"><span className="eyebrow">FIXTURES & RESULTS</span><h1>Match centre</h1><p>{league.name} · {league.season}</p></div>
    <div className="ls-date-strip" role="group" aria-label="Match date">
      <button aria-pressed={selectedDate === null} onClick={() => setSelectedDate(null)} type="button"><span>ALL</span><strong>Dates</strong></button>
      {dates.map((date) => <button aria-pressed={selectedDate === date} key={date} onClick={() => setSelectedDate(date)} type="button"><span>{weekday.format(parse(date)).toUpperCase()}</span><strong>{dayMonth.format(parse(date))}</strong></button>)}
    </div>
    <div className="ls-filter-row" role="group" aria-label="Match filter">
      {FILTERS.map((item) => <button aria-pressed={filter === item} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}
    </div>
    {visible.length === 0 && <p className="ls-empty">{filter === 'Live' ? 'No live matches right now. Matches go live when you advance the day.' : 'No matches to show.'}</p>}
    {Object.entries(groups).map(([competition, list]) => <section className="ls-group" key={competition}>
      <header className="ls-group-header"><i className="fixture-club-crest">{competition.slice(0, 1)}</i><strong>{competition}</strong><span>{list.length}</span></header>
      {list.map((match) => {
        const done = match.status === 'Completed'
        const live = match.status === 'Live'
        const favourite = favourites.includes(match.id)
        const homeOwn = match.homeClubId === club.id
        const awayOwn = match.awayClubId === club.id
        return <div className={`ls-row ${match.status.toLowerCase()}`} key={match.id}>
          <button aria-label={`Open ${match.homeClubName} versus ${match.awayClubName} match details`} className="ls-row-main" onClick={() => onSelectMatch(match.id)} type="button">
            <span className={`ls-team ${homeOwn ? 'own' : ''}`}><i className={`fixture-club-crest ${homeOwn ? '' : 'away'}`}>{match.homeClubName.slice(0, 1)}</i><b>{match.homeClubName}</b></span>
            <span className="ls-row-center">
              <span className="ls-row-time"><strong>{live ? `LIVE ${match.liveMinute ?? 0}'` : done ? 'FT' : match.kickOff}</strong><small>{dayMonth.format(parse(match.date))}</small></span>
              <span className="ls-row-score"><strong>{match.score?.home ?? '-'}</strong><em>-</em><strong>{match.score?.away ?? '-'}</strong></span>
            </span>
            <span className={`ls-team ${awayOwn ? 'own' : ''}`}><i className={`fixture-club-crest ${awayOwn ? '' : 'away'}`}>{match.awayClubName.slice(0, 1)}</i><b>{match.awayClubName}</b></span>
          </button>
          <button aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={favourite} className="ls-row-star" onClick={() => toggleFavourite(match.id)} type="button"><Star aria-hidden="true" fill={favourite ? 'currentColor' : 'none'} size={15} /></button>
        </div>
      })}
    </section>)}
  </>
}
