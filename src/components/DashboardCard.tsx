import type { ReactNode } from 'react'

interface DashboardCardProps {
  title: string
  kicker?: string
  actionLabel?: string
  onAction?: () => void
  children: ReactNode
  className?: string
  tone?: 'light' | 'dark'
}

/** Shared card shell. Future widgets (Academy, Scouting, Board Meetings) plug in by rendering one of these. */
export default function DashboardCard({ title, kicker, actionLabel, onAction, children, className = '', tone = 'light' }: DashboardCardProps) {
  const dark = tone === 'dark'
  return (
    <section aria-label={title} className={`min-w-0 overflow-hidden rounded-3xl p-4 shadow-[0_8px_24px_-16px_#0b1f4d66] ${dark ? 'bg-linear-to-br from-[#10244f] to-[#0b1630] text-white' : 'bg-white text-[#0b1f4d]'} ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          {kicker && <span className={`text-[9px] font-bold tracking-[.12em] ${dark ? 'text-[#8fb4ff]' : 'text-[#6f84ad]'}`}>{kicker}</span>}
          <h2 className="truncate font-['Barlow_Condensed'] text-[21px] leading-tight font-bold">{title}</h2>
        </div>
        {actionLabel && onAction && <button className={`shrink-0 cursor-pointer rounded-full border-0 px-3 py-1 text-[10px] font-bold ${dark ? 'bg-white/10 text-[#8fb4ff] hover:bg-white/20' : 'bg-[#e8eefc] text-[#0b4aa2] hover:bg-[#d5e1fa]'}`} onClick={onAction} type="button"><span className="text-[10px]">{actionLabel}</span></button>}
      </div>
      {children}
    </section>
  )
}
