import { type ReactNode } from 'react'
import { Bell, ChevronRight, Mail, Trophy, X } from 'lucide-react'
import { club, getClubBadge, league } from '../data/mockData'
import { advanceToNextMatch, type GameView } from '../state/gameStore'
import { useSponsors } from '../state/sponsors'
import { managerProgress } from '../state/dashboard'
import { PLACEHOLDER_PORTRAIT } from '../portrait'
import ClubBadge from '../ClubBadge'
import Flag from '../Flag'
import { buildAlerts, buildInbox, type HeaderMessage } from './inboxMessages'
import type { NavActions } from './navTypes'

export type PanelKind = 'inbox' | 'notifications'

interface AppHeaderProps {
  game: GameView
  /** Back arrow on detail screens, manager card otherwise. */
  leading: ReactNode
  /** Show the club banner and metric bar; detail screens keep only the slim sticky bar. */
  expanded: boolean
  nav: NavActions
  onOpenClub: () => void
  onAdvanceDay: () => void
  message: string
  onClearMessage: () => void
  panel: PanelKind | null
  onPanelChange: (panel: PanelKind | null) => void
}

const ordinal = (value: number) => {
  const mod = value % 100
  if (mod >= 11 && mod <= 13) return 'th'
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th'
}
const shortDate = (value: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`))

export default function AppHeader({ game, leading, expanded, nav, onOpenClub, onAdvanceDay, message, onClearMessage, panel, onPanelChange }: AppHeaderProps) {
  const alerts = buildAlerts(game, nav)
  const sponsors = useSponsors()
  const messages = buildInbox(game, nav, sponsors.mail)
  const toggle = (kind: PanelKind) => onPanelChange(panel === kind ? null : kind)
  const go = (action: () => void) => () => { onPanelChange(null); action() }
  const icons = <div className="flex shrink-0 items-center gap-1.5">
    <HeaderIconButton active={panel === 'inbox'} badge={sponsors.mail.filter((item) => !item.read).length} label="Inbox" onClick={() => toggle('inbox')}><Mail size={16} /></HeaderIconButton>
    <HeaderIconButton active={panel === 'notifications'} badge={alerts.length} label="Notifications" onClick={() => toggle('notifications')}><Bell size={16} /></HeaderIconButton>
    <HeaderIconButton active={false} label="Advance day" onClick={onAdvanceDay}><ChevronRight size={18} /></HeaderIconButton>
  </div>

  return <>
    <header className="sticky top-0 z-20 flex flex-col gap-2 bg-[#0b1630] px-3.5 pt-2.5 pb-2 text-white shadow-[0_6px_18px_-10px_#000a]">
      <div className="flex items-center gap-2.5">
        {expanded ? <ManagerCard game={game} /> : <>{leading}<span className="flex-1" /></>}
        {icons}
      </div>
      {message && <p className="flex items-center justify-between gap-2 rounded-lg bg-[#5b1f1a] px-2 py-1.5 text-[10px] leading-snug text-[#ffd4cf]" role="alert">{message}<button aria-label="Dismiss message" className="cursor-pointer border-0 bg-transparent px-1 text-sm text-inherit" onClick={onClearMessage} type="button">×</button></p>}
      {panel && <HeaderPanel kind={panel} onClose={() => onPanelChange(null)}>
        {panel === 'inbox' && <MessageList empty="No messages yet." items={messages} onPick={(item) => go(item.go)()} />}
        {panel === 'notifications' && <>
          <MessageList empty="You're all caught up." items={alerts} onPick={(item) => go(item.go)()} />
          <button className="mt-2 w-full cursor-pointer rounded-lg border-0 bg-white/10 px-3 py-2 text-left text-[12px] font-bold text-white hover:bg-white/20" onClick={() => { onPanelChange(null); advanceToNextMatch() }} type="button">Skip to next match day</button>
        </>}
      </HeaderPanel>}
    </header>
    {expanded && <section aria-label="Club overview" className="@container bg-[#0b1630] px-3.5 pb-3.5 text-white">
      <div className="flex flex-col gap-2.5">
        <ClubBanner game={game} onOpenClub={onOpenClub} nav={nav} />
      </div>
    </section>}
  </>
}

function HeaderIconButton({ children, label, onClick, active, badge = 0 }: { children: ReactNode; label: string; onClick: () => void; active: boolean; badge?: number }) {
  return <button aria-expanded={label === 'Advance day' ? undefined : active} aria-label={label} className={`relative grid size-8 cursor-pointer place-items-center rounded-full border border-white/10 text-white ${active ? 'bg-[#2a6df4]' : 'bg-white/10 hover:bg-white/20'}`} onClick={onClick} type="button">
    {children}
    {badge > 0 && <span className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] leading-4 font-bold">{badge}</span>}
  </button>
}

function HeaderPanel({ kind, onClose, children }: { kind: PanelKind; onClose: () => void; children: ReactNode }) {
  const title = kind === 'inbox' ? 'Inbox' : 'Notifications'
  return <div className="absolute inset-x-3 top-full z-30 mt-1 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#10244f] p-3 shadow-2xl">
    <div className="mb-2 flex items-center justify-between"><strong className="text-[13px]">{title}</strong><button aria-label="Close panel" className="cursor-pointer border-0 bg-transparent text-white" onClick={onClose} type="button"><X size={16} /></button></div>
    {children}
  </div>
}

function MessageList({ items, empty, onPick }: { items: HeaderMessage[]; empty: string; onPick: (item: HeaderMessage) => void }) {
  if (!items.length) return <p className="text-[12px] text-[#a7b3d0]">{empty}</p>
  return <ul className="m-0 flex list-none flex-col gap-1.5 p-0">{items.map((item) => <li key={item.id}>
    <button className="flex w-full cursor-pointer items-start gap-2 rounded-xl border-0 bg-white/5 px-3 py-2 text-left text-white hover:bg-white/10" onClick={() => onPick(item)} type="button">
      {item.sender && <img alt="" className="size-8 shrink-0 rounded-full object-cover" src={PLACEHOLDER_PORTRAIT} />}
      <span className="min-w-0"><strong className="block text-[12px]">{item.title}</strong>{item.sender && <span className="block text-[9px] font-bold tracking-wider text-[#8fb4ff]">{item.sender.toUpperCase()} · {item.from}</span>}<span className="text-[11px] text-[#a7b3d0]">{item.detail}</span></span>
    </button>
  </li>)}</ul>
}

function ManagerCard({ game }: { game: GameView }) {
  const { level, xp, xpMax } = managerProgress(game)
  return <div className="flex min-w-0 flex-1 items-center gap-2">
    <div className="relative shrink-0">
      <img alt={`Portrait of ${club.manager.name}`} className="size-11 rounded-full border-2 border-[#5b9bff] object-cover" src={PLACEHOLDER_PORTRAIT} />
      <span aria-label="Online" className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-[#0b1630] bg-emerald-400" role="img" />
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-1 leading-tight">
      <span className="flex items-center gap-1.5">
        <strong className="truncate text-[14px]">{club.manager.name}</strong>
        <Flag code="NG" countryName="Nigeria" onSelectCountry={() => undefined} />
      </span>
      <span className="flex items-center gap-1.5 text-[10px] text-[#a7b3d0]">
        <span aria-label={`Level ${level}`} className="rounded-md bg-[#1557db] px-1.5 py-px text-[9px] font-bold text-white">LVL {level}</span>
        <span className="truncate">{xp.toLocaleString('en-GB')} / {xpMax.toLocaleString('en-GB')} XP</span>
      </span>
      <div aria-label={`${xp} of ${xpMax} XP`} aria-valuemax={xpMax} aria-valuemin={0} aria-valuenow={xp} className="h-1 w-full max-w-[140px] overflow-hidden rounded-full bg-white/10" role="progressbar"><span className="block h-full rounded-full bg-[#2a8bff]" style={{ width: `${Math.min(100, xp / xpMax * 100)}%` }} /></div>
    </div>
  </div>
}

function ClubBanner({ game, nav, onOpenClub }: { game: GameView; nav: NavActions; onOpenClub: () => void }) {
  const own = game.ownStanding
  const next = game.nextFixture
  const stats = [
    { label: 'Position', value: own ? `${own.position}${ordinal(own.position)}` : '-' },
    { label: 'Points', value: String(own?.points ?? 0) },
    { label: 'VFA Rank', value: `${club.prestige}/100` },
    { label: 'Next Match', value: next ? shortDate(next.date) : 'None' },
  ]
  return <div className="rounded-2xl border border-[#2864c8] bg-[linear-gradient(135deg,#16316f,#0b1630)] p-3">
    <div className="flex items-center gap-3">
      <button aria-label={`Open ${club.name} profile`} className="crest-fill grid size-16 shrink-0 cursor-pointer place-items-center border-0 bg-transparent p-0" onClick={onOpenClub} type="button"><ClubBadge badge={getClubBadge(club.id)} name={club.name} /></button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <strong className="truncate font-['Barlow_Condensed'] text-[22px] leading-none text-white">{club.name}</strong>
          <Flag code="NG" countryName="Nigeria" onSelectCountry={nav.onSelectCountry} />
        </div>
        <button className="flex cursor-pointer items-center gap-1.5 self-start border-0 bg-transparent p-0 text-white" onClick={() => nav.onNavigate('League')} type="button">
          <span aria-hidden="true" className="grid size-4 place-items-center rounded-full bg-white/10 text-[#8fb4ff]"><Trophy size={9} /></span>
          <span className="truncate text-[11px] font-medium text-[#a7b3d0]">{league.name}</span>
        </button>
      </div>
      <button aria-label="Open club profile" className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[#a7b3d0]" onClick={onOpenClub} type="button"><ChevronRight size={18} /></button>
    </div>
    <div className="mt-3 grid grid-cols-4 divide-x divide-white/10 border-t border-white/10 pt-2.5">
      {stats.map((item) => <span className="flex flex-col items-center leading-tight" key={item.label}>
        <strong className="text-[14px] text-white">{item.value}</strong>
        <span className="text-[9px] text-[#a7b3d0]">{item.label}</span>
      </span>)}
    </div>
  </div>
}
