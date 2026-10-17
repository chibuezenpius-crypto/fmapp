import { useMemo } from 'react'
import { Newspaper } from 'lucide-react'
import { club } from '../../data/mockData'
import { computeConfidence } from '../../state/confidence'
import { buildNews } from '../../state/dashboard'
import type { GameView } from '../../state/gameStore'
import DashboardCard from '../DashboardCard'
import type { NavActions } from '../navTypes'

const ordinal = (value: number) => {
  const mod = value % 100
  if (mod >= 11 && mod <= 13) return 'th'
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th'
}

export default function LatestNews({ game, nav }: { game: GameView; nav: NavActions }) {
  const news = useMemo(() => buildNews(game, 1).slice(0, 3), [game])
  const own = game.ownStanding
  const headline = own?.played ? `${club.name} sit ${own.position}${ordinal(own.position)} after ${own.played} games` : `${club.name} prepare for the new season`
  return <DashboardCard actionLabel="Leagues" kicker="LATEST NEWS" onAction={() => nav.onNavigate('League')} title="News">
    <button className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border-0 bg-linear-to-br from-[#10244f] to-[#0b4aa2] p-3 text-left text-white" onClick={() => nav.onNavigate('League')} type="button">
      <Newspaper aria-hidden="true" className="mt-0.5 shrink-0 text-[#8fb4ff]" size={18} />
      <span className="flex flex-col gap-0.5"><strong className="font-['Barlow_Condensed'] text-[18px] leading-tight">{headline}</strong><span className="text-[11px] text-[#c7d2ee]">{computeConfidence(game).board.note}.</span></span>
    </button>
    {news.length > 0 && <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">{news.map((item) => <li key={item.id}>
      <button className="flex w-full cursor-pointer flex-col rounded-xl border-0 bg-[#f3f6fc] px-3 py-2 text-left hover:bg-[#e8eefc]" onClick={() => nav.onSelectMatch(item.id)} type="button">
        <strong className="text-[12px] text-[#0b1f4d]">{item.headline}</strong>
        <span className="text-[10px] text-[#6f84ad]">{item.detail}</span>
      </button>
    </li>)}</ul>}
  </DashboardCard>
}
