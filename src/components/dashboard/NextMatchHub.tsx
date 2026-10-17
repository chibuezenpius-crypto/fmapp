import { club, getClubBadge } from '../../data/mockData'
import { countdownLabel, daysUntil, expectedLineup } from '../../state/dashboard'
import type { GameView } from '../../state/gameStore'
import ClubBadge from '../../ClubBadge'
import DashboardCard from '../DashboardCard'
import type { NavActions } from '../navTypes'

const formDot = { W: 'bg-emerald-500', D: 'bg-amber-400', L: 'bg-red-500' } as const
const crest = '[&_.club-badge]:size-full'

export default function NextMatchHub({ game, nav }: { game: GameView; nav: NavActions }) {
  const match = game.nextFixture
  const own = game.ownStanding
  if (!match) {
    return <DashboardCard kicker="NEXT MATCH" title="No fixtures left" tone="dark">
      <p className="text-[12px] text-[#a7b3d0]">There are no scheduled matches. Advance the day to move into the next season.</p>
    </DashboardCard>
  }
  const lineup = expectedLineup(game.date)
  const days = daysUntil(game.date, match.date)
  const fixtureDate = new Date(`${match.date}T12:00:00`)
  const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(fixtureDate)
  const later = game.upcoming.filter((fixture) => fixture.id !== match.id).slice(0, 2)
  const pointsBehind = Math.max(0, (game.standings[0]?.points ?? 0) - (own?.points ?? 0))
  return <DashboardCard actionLabel="Match centre" kicker={`${match.competition.toUpperCase()} · MD ${match.matchday}`} onAction={() => nav.onSelectMatch(match.id)} title="Next match" tone="dark">
    <button aria-label={`Open ${match.homeClubName} versus ${match.awayClubName}`} className="grid w-full cursor-pointer grid-cols-[1fr_auto_1fr] items-center gap-2 border-0 bg-transparent p-0 text-white" onClick={() => nav.onSelectMatch(match.id)} type="button">
      <span className="flex min-w-0 flex-col items-center gap-1"><span className={`size-14 ${crest}`}><ClubBadge badge={getClubBadge(match.homeClubId)} name={match.homeClubName} /></span><strong className="w-full truncate text-center text-[12px]">{match.homeClubName}</strong></span>
      <span className="flex flex-col items-center gap-0.5">
        <span className="rounded-full bg-[#f5c451] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0f172a]">{countdownLabel(days)}</span>
        <strong className="font-['Barlow_Condensed'] text-3xl leading-none">{match.score ? `${match.score.home}–${match.score.away}` : match.kickOff}</strong>
        <small className="text-[10px] text-[#a7b3d0]">{dateLabel}</small>
      </span>
      <span className="flex min-w-0 flex-col items-center gap-1"><span className={`size-14 ${crest}`}><ClubBadge badge={getClubBadge(match.awayClubId)} name={match.awayClubName} /></span><strong className="w-full truncate text-center text-[12px]">{match.awayClubName}</strong></span>
    </button>
    <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px] text-[#c7d2ee]">
      <span className="truncate rounded-lg bg-white/5 px-1.5 py-1.5">{match.venue}</span>
      <span className="truncate rounded-lg bg-white/5 px-1.5 py-1.5">{match.weather}</span>
      <button className="cursor-pointer rounded-lg border-0 bg-white/5 px-1.5 py-1.5 text-[10px] text-[#8fb4ff] hover:bg-white/10" onClick={() => nav.onNavigate('Tactics')} type="button">XI {lineup.formation} · {lineup.averageOverall} OVR</button>
    </div>
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px]">
      <button className="cursor-pointer border-0 bg-transparent p-0 text-left text-white" onClick={() => nav.onNavigate('League')} type="button"><strong>{own ? `${own.position}${ordinal(own.position)}` : '—'}</strong> <span className="text-[#a7b3d0]">{pointsBehind === 0 ? 'top of the table' : `${pointsBehind} pts off top`}</span></button>
      <span className="flex items-center gap-1" aria-label="Last five results">{(own?.form ?? []).map((result, index) => <b className={`grid size-5 place-items-center rounded-full text-[9px] text-[#0f172a] ${formDot[result]}`} key={`${result}-${index}`}>{result}</b>)}{!own?.form.length && <span className="text-[#a7b3d0]">No results yet</span>}</span>
    </div>
    {later.length > 0 && <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0">{later.map((fixture) => {
      const home = fixture.homeClubId === club.id
      return <li key={fixture.id}><button className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-0 bg-white/5 px-2.5 py-1.5 text-left text-[11px] text-white hover:bg-white/10" onClick={() => nav.onSelectMatch(fixture.id)} type="button">
        <span className="w-9 text-[10px] text-[#8fb4ff]">{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${fixture.date}T12:00:00`))}</span>
        <span className="flex-1 truncate">{home ? 'vs' : '@'} {home ? fixture.awayClubName : fixture.homeClubName}</span>
        <span className="truncate text-[10px] text-[#a7b3d0]">{fixture.competition}</span>
      </button></li>
    })}</ul>}
  </DashboardCard>
}

function ordinal(value: number) {
  const mod = value % 100
  if (mod >= 11 && mod <= 13) return 'th'
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th'
}
