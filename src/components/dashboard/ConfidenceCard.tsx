import { computeConfidence } from '../../state/confidence'
import type { GameView } from '../../state/gameStore'
import DashboardCard from '../DashboardCard'
import type { NavActions } from '../navTypes'

export default function ConfidenceCard({ game, nav }: { game: GameView; nav: NavActions }) {
  const data = computeConfidence(game)
  const items = [
    { label: 'Board', item: data.board, target: 'board' },
    { label: 'Fan', item: data.fan, target: 'fan' },
    { label: 'Manager', item: data.manager, target: 'manager' },
  ] as const
  return <DashboardCard kicker="CLUB STANDING" title="Club confidence">
    <div className="flex flex-col gap-1.5">{items.map(({ label, item, target }) => (
      <button aria-label={`Open ${label} overview`} className="flex cursor-pointer flex-col gap-1.5 rounded-xl border-0 bg-[#f3f6fc] px-3 py-2 text-left hover:bg-[#e8eefc]" key={target} onClick={() => nav.onOpenConfidence(target)} type="button">
        <span className="flex items-center justify-between gap-2"><strong className="text-[12px] text-[#0b1f4d]">{label} confidence</strong><span className="flex items-center gap-2 text-[11px] text-[#0b4aa2]"><span className="rounded-full bg-[#dfe8fb] px-2 py-0.5 text-[10px] font-bold">{item.status}</span><strong>{item.percentage}%</strong></span></span>
        <span aria-label={`${label} confidence: ${item.percentage}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={item.percentage} className="h-1.5 overflow-hidden rounded-full bg-[#d5ddee]" role="progressbar"><span className={`block h-full rounded-full ${item.percentage >= 75 ? 'bg-emerald-500' : item.percentage >= 45 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${item.percentage}%` }} /></span>
        <span className="text-[10px] text-[#6f84ad]">{item.note}</span>
      </button>
    ))}</div>
  </DashboardCard>
}
