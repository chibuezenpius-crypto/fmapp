import { club, getClubBadge } from '../../data/mockData'
import ClubBadge from '../../ClubBadge'
import type { GameView } from '../../state/gameStore'
import DashboardCard from '../DashboardCard'
import type { NavActions } from '../navTypes'

const shortDate = (value: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))

export default function UpcomingFixtures({ game, nav }: { game: GameView; nav: NavActions }) {
  const fixtures = game.upcoming.slice(0, 3)
  return <DashboardCard actionLabel="View All ›" kicker="SCHEDULE" onAction={() => nav.onNavigate('Matches')} title="Upcoming fixtures">
    {fixtures.length === 0 && <p className="text-[12px] text-[#6f84ad]">No fixtures scheduled. Advance the day to move into the next season.</p>}
    <div className="grid grid-cols-3 gap-2">{fixtures.map((fixture) => {
      const home = fixture.homeClubId === club.id
      return <button aria-label={`Open ${fixture.homeClubName} versus ${fixture.awayClubName}`} className="flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-2xl border border-[#d5e1fa] bg-[#f3f6fc] p-2 text-left text-[#0b1f4d] hover:bg-[#e8eefc]" key={fixture.id} onClick={() => nav.onSelectMatch(fixture.id)} type="button">
        <strong className="text-[10px]">{shortDate(fixture.date)}</strong>
        <span className="truncate text-[8px] font-bold text-[#6f84ad]">{fixture.competition}</span>
        <span className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <span className="crest-fill size-8 justify-self-center"><ClubBadge badge={getClubBadge(fixture.homeClubId)} name={fixture.homeClubName} /></span>
          <span className="text-[8px] font-bold text-[#6f84ad]">VS</span>
          <span className="crest-fill size-8 justify-self-center"><ClubBadge badge={getClubBadge(fixture.awayClubId)} name={fixture.awayClubName} /></span>
        </span>
        <span className="grid grid-cols-2 gap-1 text-center text-[8px] font-bold"><span className="truncate">{fixture.homeClubName}</span><span className="truncate">{fixture.awayClubName}</span></span>
        <span className="truncate text-[8px] text-[#6f84ad]">{fixture.venue}</span>
        <span className={`self-start rounded-md px-2 py-0.5 text-[9px] font-extrabold text-white ${home ? 'bg-emerald-600' : 'bg-[#0b4aa2]'}`}>{home ? 'Home' : 'Away'}</span>
      </button>
    })}</div>
  </DashboardCard>
}
