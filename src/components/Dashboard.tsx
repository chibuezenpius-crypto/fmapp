import type { GameView } from '../state/gameStore'
import BoardMessage from './dashboard/BoardMessage'
import ConfidenceCard from './dashboard/ConfidenceCard'
import LatestNews from './dashboard/LatestNews'
import QuickActions from './dashboard/QuickActions'
import UpcomingFixtures from './dashboard/UpcomingFixtures'
import type { NavActions } from './navTypes'

interface DashboardProps {
  game: GameView
  nav: NavActions
}

export default function Dashboard({ game, nav }: DashboardProps) {
  return <div className="flex min-w-0 flex-col gap-4">
    <ConfidenceCard game={game} nav={nav} />
    <BoardMessage game={game} nav={nav} />
    <UpcomingFixtures game={game} nav={nav} />
    <QuickActions nav={nav} />
    <LatestNews game={game} nav={nav} />
  </div>
}
