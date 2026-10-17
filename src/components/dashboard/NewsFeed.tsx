import { useMemo, useState } from 'react'
import { buildNews, NEWS_REGIONS, type NewsRegion } from '../../state/dashboard'
import type { GameView } from '../../state/gameStore'
import DashboardCard from '../DashboardCard'
import type { NavActions } from '../navTypes'

export default function NewsFeed({ game, nav }: { game: GameView; nav: NavActions }) {
  const [region, setRegion] = useState<NewsRegion>('Europe')
  const news = useMemo(() => buildNews(game), [game])
  const visible = news.filter((item) => item.region === region)
  return <DashboardCard actionLabel="Leagues" kicker="AROUND THE WORLD" onAction={() => nav.onNavigate('League')} title="Football news">
    <div className="mb-2 flex gap-1 overflow-x-auto" role="tablist">
      {NEWS_REGIONS.map((name) => <button aria-selected={region === name} className={`shrink-0 cursor-pointer rounded-full border-0 px-2.5 py-1 text-[10px] font-bold ${region === name ? 'bg-[#0b4aa2] text-white' : 'bg-[#e8eefc] text-[#0b4aa2]'}`} key={name} onClick={() => setRegion(name)} role="tab" type="button">{name}</button>)}
    </div>
    {visible.length === 0
      ? <p className="text-[12px] text-[#6f84ad]">No {region} results yet. They appear as matches are played.</p>
      : <ul className="m-0 flex list-none flex-col gap-1 p-0">{visible.map((item) => <li key={item.id}>
        <button className="flex w-full cursor-pointer flex-col rounded-xl border-0 bg-[#f3f6fc] px-3 py-2 text-left hover:bg-[#e8eefc]" onClick={() => nav.onSelectMatch(item.id)} type="button">
          <strong className="text-[12px] text-[#0b1f4d]">{item.headline}</strong>
          <span className="text-[10px] text-[#6f84ad]">{item.detail}</span>
        </button>
      </li>)}</ul>}
  </DashboardCard>
}
