import type { ReactNode } from 'react'
import type { GameView } from '../state/gameStore'
import ConfidenceCard from './dashboard/ConfidenceCard'
import FormationPreview from './dashboard/FormationPreview'
import NewsFeed from './dashboard/NewsFeed'
import NextMatchHub from './dashboard/NextMatchHub'
import ScoutingPanel from './dashboard/ScoutingPanel'
import SquadHealthList from './dashboard/SquadHealthList'
import type { NavActions } from './navTypes'

interface DashboardProps {
  game: GameView
  nav: NavActions
  /** Extra widgets (Academy, Scouting, Board Meetings...) appended to each column without touching this layout. */
  mainExtras?: ReactNode
  sideExtras?: ReactNode
  /** The league table preview supplied by the shell. */
  leagueSlot: ReactNode
}

/** One column on phones; main + side columns once the container is wide enough (container query, so it follows the screen-size switcher). */
export default function Dashboard({ game, nav, mainExtras, sideExtras, leagueSlot }: DashboardProps) {
  return <div className="@container">
    <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] @2xl:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <NextMatchHub game={game} nav={nav} />
        <FormationPreview date={game.date} nav={nav} />
        <ConfidenceCard game={game} nav={nav} />
        {leagueSlot}
        {mainExtras}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <NewsFeed game={game} nav={nav} />
        <SquadHealthList date={game.date} nav={nav} />
        <ScoutingPanel date={game.date} nav={nav} />
        {sideExtras}
      </div>
    </div>
  </div>
}
