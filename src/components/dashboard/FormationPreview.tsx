import { expectedLineup } from '../../state/dashboard'
import DashboardCard from '../DashboardCard'
import type { NavActions } from '../navTypes'

export default function FormationPreview({ date, nav }: { date: string; nav: NavActions }) {
  const lineup = expectedLineup(date)
  return <DashboardCard actionLabel="Edit tactics" kicker="EXPECTED XI" onAction={() => nav.onNavigate('Tactics')} title={`Formation ${lineup.formation}`}>
    <div aria-label={`${lineup.formation} formation preview`} className="relative mx-auto aspect-[4/4.6] w-full max-w-md overflow-hidden rounded-2xl bg-linear-to-b from-[#1f7a4a] to-[#15603a]">
      <span className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
      <span className="absolute top-1/2 left-1/2 size-20 -translate-1/2 rounded-full border border-white/30" />
      <span className="absolute inset-x-[22%] top-0 h-[14%] border border-t-0 border-white/30" />
      <span className="absolute inset-x-[22%] bottom-0 h-[14%] border border-b-0 border-white/30" />
      {lineup.slots.map((slot, index) => slot.player
        ? <button aria-label={`Open ${slot.player.name} profile`} className="absolute flex w-16 -translate-1/2 cursor-pointer flex-col items-center gap-0.5 border-0 bg-transparent p-0" key={`${slot.label}-${index}`} onClick={() => nav.onSelectPlayer(slot.player!)} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} type="button">
          <span className="grid size-7 place-items-center rounded-full border-2 border-white bg-[#0b1630] text-[10px] font-bold text-white">{slot.player.overall}</span>
          <span className="max-w-full truncate rounded bg-black/45 px-1 text-[9px] font-semibold text-white">{slot.player.name.split(' ').slice(-1)[0]}</span>
        </button>
        : <span className="absolute grid size-7 -translate-1/2 place-items-center rounded-full border border-dashed border-white/60 text-[9px] text-white/70" key={`${slot.label}-${index}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>{slot.label}</span>)}
    </div>
  </DashboardCard>
}
