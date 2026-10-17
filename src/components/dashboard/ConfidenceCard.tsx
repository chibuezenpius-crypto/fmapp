import { Building2, Landmark, Users } from 'lucide-react'
import { computeConfidence } from '../../state/confidence'
import type { GameView } from '../../state/gameStore'
import DashboardCard from '../DashboardCard'
import type { NavActions } from '../navTypes'
import type { ClubConfidenceItem } from '../../types/game'

const mood = (percentage: number) => percentage >= 75 ? { label: 'Happy', dot: 'bg-emerald-500', text: 'text-emerald-600' } : percentage >= 45 ? { label: 'Satisfied', dot: 'bg-amber-400', text: 'text-amber-600' } : { label: 'Unhappy', dot: 'bg-red-500', text: 'text-red-600' }

export default function ConfidenceCard({ game, nav }: { game: GameView; nav: NavActions }) {
  const data = computeConfidence(game)
  const items: { label: string; item: ClubConfidenceItem; target: 'board' | 'fan' | 'manager'; icon: typeof Users }[] = [
    { label: 'Board', item: data.board, target: 'board', icon: Landmark },
    { label: 'Players', item: data.player, target: 'manager', icon: Users },
    { label: 'Fans', item: data.fan, target: 'fan', icon: Building2 },
  ]
  return <DashboardCard actionLabel="Overall ›" kicker="CLUB STANDING" onAction={() => nav.onOpenConfidence('board')} title="Confidence">
    <div className="grid grid-cols-3 divide-x divide-[#e1e8f7]">{items.map(({ label, item, target, icon: Icon }) => {
      const tone = mood(item.percentage)
      return <button aria-label={`Open ${label} confidence`} className="flex min-w-0 cursor-pointer flex-col gap-1.5 border-0 bg-transparent px-2 text-left first:pl-0 last:pr-0" key={target + label} onClick={() => nav.onOpenConfidence(target)} type="button">
        <span className="flex items-center gap-1 text-[10px] font-bold text-[#0b1f4d]"><Icon aria-hidden="true" className="shrink-0 text-[#0b4aa2]" size={14} /><span className="truncate">{label}</span></span>
        <strong className="text-[15px] text-[#0b4aa2]">{item.percentage}%</strong>
        <span aria-label={`${label} confidence: ${item.percentage}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={item.percentage} className="h-1.5 overflow-hidden rounded-full bg-[#d5ddee]" role="progressbar"><span className={`block h-full rounded-full ${tone.dot}`} style={{ width: `${item.percentage}%` }} /></span>
        <span className={`flex items-center gap-1 text-[10px] font-bold ${tone.text}`}><i className={`size-2 rounded-full ${tone.dot}`} />{tone.label}</span>
      </button>
    })}</div>
  </DashboardCard>
}
