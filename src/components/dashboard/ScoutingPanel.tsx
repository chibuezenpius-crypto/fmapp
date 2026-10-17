import { useMemo } from 'react'
import { buildRumours, formatMoney } from '../../state/dashboard'
import DashboardCard from '../DashboardCard'
import type { NavActions } from '../navTypes'

export default function ScoutingPanel({ date, nav }: { date: string; nav: NavActions }) {
  const rumours = useMemo(() => buildRumours(date), [date])
  return <DashboardCard actionLabel="Market" kicker="SCOUTING" onAction={() => nav.onNavigate('Transfers')} title="Transfer rumours">
    {rumours.length === 0
      ? <p className="text-[12px] text-[#6f84ad]">No notable targets right now.</p>
      : <ul className="m-0 flex list-none flex-col gap-1 p-0">{rumours.map(({ player, clubName, price, affordable }) => <li key={player.id}>
        <button aria-label={`Open ${player.name} profile`} className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border-0 bg-[#f3f6fc] px-2.5 py-1.5 text-left hover:bg-[#e8eefc]" onClick={() => nav.onSelectPlayer(player)} type="button">
          <span className="grid size-8 place-items-center rounded-full bg-[#0b4aa2] text-[11px] font-bold text-white">{player.overall}</span>
          <span className="flex min-w-0 flex-col"><strong className="truncate text-[12px] text-[#0b1f4d]">{player.name}</strong><span className="truncate text-[10px] text-[#6f84ad]">{clubName} · {player.position.replace(/ \(.\)/, '')} · {player.age}</span></span>
          <span className="flex flex-col items-end"><strong className="text-[11px] text-[#0b1f4d]">{formatMoney(price)}</strong><span className={`text-[9px] font-bold ${affordable ? 'text-emerald-600' : 'text-red-500'}`}>{affordable ? 'Affordable' : 'Over budget'}</span></span>
        </button>
      </li>)}</ul>}
  </DashboardCard>
}
