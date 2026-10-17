import { Briefcase, ChevronRight, ClipboardList, Dumbbell, GraduationCap, HeartPulse, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { NavActions } from '../navTypes'

export default function QuickActions({ nav }: { nav: NavActions }) {
  const items: { label: string; hint: string; icon: ReactNode; tone: string; go: () => void }[] = [
    { label: 'Squad', hint: 'View & manage your team', icon: <Users size={18} />, tone: 'bg-[#dbe7ff] text-[#0b4aa2]', go: () => nav.onOpenClubSection('Squad') },
    { label: 'Tactics', hint: 'Set up your formation', icon: <ClipboardList size={18} />, tone: 'bg-emerald-100 text-emerald-700', go: () => nav.onNavigate('Tactics') },
    { label: 'Academy', hint: 'Develop the future', icon: <GraduationCap size={18} />, tone: 'bg-pink-100 text-pink-700', go: () => nav.onNavigate('Academy') },
    { label: 'Staffs', hint: 'Coaches & backroom team', icon: <Briefcase size={18} />, tone: 'bg-amber-100 text-amber-700', go: () => nav.onOpenClubSection('Staff') },
    { label: 'Medical Center', hint: 'Injuries & recovery', icon: <HeartPulse size={18} />, tone: 'bg-red-100 text-red-600', go: () => nav.onOpenClubSection('Facilities') },
    { label: 'Training', hint: 'Plan your sessions', icon: <Dumbbell size={18} />, tone: 'bg-cyan-100 text-cyan-700', go: nav.onOpenTraining },
  ]
  return <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2.5">{items.map((item) => <button className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl border-0 bg-white p-3 text-left text-[#0b1f4d] shadow-[0_8px_24px_-16px_#0b1f4d66] hover:bg-[#f3f6fc]" key={item.label} onClick={item.go} type="button">
    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${item.tone}`}>{item.icon}</span>
    <span className="flex min-w-0 flex-1 flex-col leading-tight"><strong className="truncate text-[12px]">{item.label}</strong><span className="truncate text-[9px] text-[#6f84ad]">{item.hint}</span></span>
    <ChevronRight aria-hidden="true" className="shrink-0 text-[#6f84ad]" size={14} />
  </button>)}</nav>
}
