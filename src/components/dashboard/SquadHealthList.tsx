import { club, getSquadHealth } from '../../data/mockData'
import DashboardCard from '../DashboardCard'
import type { NavActions } from '../navTypes'

export default function SquadHealthList({ date, nav }: { date: string; nav: NavActions }) {
  const health = getSquadHealth(date)
  const isInjured = (injuryUntil: string | undefined) => injuryUntil !== undefined && injuryUntil > date
  const rows = [...club.squad].sort((a, b) => Number(isInjured(b.injuryUntil)) - Number(isInjured(a.injuryUntil)) || a.fitness - b.fitness).slice(0, 5)
  return <DashboardCard actionLabel="Squad" kicker="FIRST TEAM" onAction={() => nav.onOpenClubSection('Squad')} title="Squad fitness">
    <div className="mb-3 grid grid-cols-3 gap-1.5 text-center">
      <Stat label="Avg fitness" value={`${health.averageFitness}%`} />
      <Stat label="Injured" value={String(health.activeInjuries)} warn={health.activeInjuries > 0} />
      <Stat label="Morale" value={`${health.moralePercentage}%`} />
    </div>
    <ul className="m-0 flex list-none flex-col gap-1 p-0">{rows.map((player) => {
      const injured = isInjured(player.injuryUntil)
      return <li key={player.id}><button aria-label={`Open ${player.name} profile`} className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border-0 bg-[#f3f6fc] px-2.5 py-1.5 text-left hover:bg-[#e8eefc]" onClick={() => nav.onSelectPlayer(player)} type="button">
        <span className="w-9 rounded bg-[#0b4aa2] py-0.5 text-center text-[9px] font-bold text-white">{player.position.replace(/ \(.\)/, '')}</span>
        <span className="flex min-w-0 flex-col gap-1"><strong className="truncate text-[12px] text-[#0b1f4d]">{player.name}</strong>
          <span className="h-1 overflow-hidden rounded-full bg-[#d5ddee]"><span className={`block h-full rounded-full ${player.fitness >= 85 ? 'bg-emerald-500' : player.fitness >= 65 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${player.fitness}%` }} /></span></span>
        <span className={`text-[10px] font-bold ${injured ? 'text-red-600' : 'text-[#6f84ad]'}`}>{injured ? 'Injured' : `${player.fitness}%`}</span>
      </button></li>
    })}</ul>
  </DashboardCard>
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return <div className="rounded-xl bg-[#f3f6fc] py-1.5"><strong className={`block text-[15px] ${warn ? 'text-red-600' : 'text-[#0b1f4d]'}`}>{value}</strong><span className="text-[9px] text-[#6f84ad]">{label}</span></div>
}
