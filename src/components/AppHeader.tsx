import { useState, type ReactNode } from 'react'
import { Bell, Coins, Crown, Landmark, Mail, Settings, Star, Trophy, Wallet, X } from 'lucide-react'
import { club, getClubBadge, getSquadHealth } from '../data/mockData'
import { advanceToNextMatch, describeDate, type GameView } from '../state/gameStore'
import { computeConfidence } from '../state/confidence'
import { markSponsorMailRead, useSponsors } from '../state/sponsors'
import type { SponsorMail } from '../state/sponsorDeals'
import { financialHealth, formatMoney, managerProgress, reputationLabel, teamOverall } from '../state/dashboard'
import ClubBadge from '../ClubBadge'
import Flag from '../Flag'
import type { NavActions } from './navTypes'

type PanelKind = 'inbox' | 'notifications' | 'settings'

interface HeaderMessage { id: string; title: string; detail: string; go: () => void }

interface AppHeaderProps {
  game: GameView
  /** Back arrow on detail screens, club crest otherwise. */
  leading: ReactNode
  /** Show the profile cards and metric bar; detail screens keep only the slim sticky bar. */
  expanded: boolean
  nav: NavActions
  onOpenClub: () => void
  onAdvanceDay: () => void
  message: string
  onClearMessage: () => void
}

const toneClasses = { good: 'text-emerald-300', ok: 'text-sky-300', warn: 'text-amber-300', bad: 'text-red-300' } as const

export default function AppHeader({ game, leading, expanded, nav, onOpenClub, onAdvanceDay, message, onClearMessage }: AppHeaderProps) {
  const [panel, setPanel] = useState<PanelKind | null>(null)
  const date = describeDate(game.date)
  const health = getSquadHealth(game.date)
  const alerts = buildAlerts(game, nav)
  const sponsors = useSponsors()
  const messages = buildInbox(game, nav, sponsors.mail)
  const toggle = (kind: PanelKind) => setPanel((current) => (current === kind ? null : kind))
  const go = (action: () => void) => () => { setPanel(null); action() }
  const icons = <div className="flex shrink-0 items-center gap-1.5">
    <HeaderIconButton active={panel === 'inbox'} badge={sponsors.mail.filter((item) => !item.read).length} label="Inbox" onClick={() => toggle('inbox')}><Mail size={16} /></HeaderIconButton>
    <HeaderIconButton active={panel === 'notifications'} badge={alerts.length} label="Notifications" onClick={() => toggle('notifications')}><Bell size={16} /></HeaderIconButton>
    <HeaderIconButton active={panel === 'settings'} label="Settings" onClick={() => toggle('settings')}><Settings size={16} /></HeaderIconButton>
  </div>

  return <>
    <header className="sticky top-0 z-20 flex flex-col gap-2 bg-[#0b1630] px-3.5 pt-2.5 pb-2 text-white shadow-[0_6px_18px_-10px_#000a]">
      <div className="flex items-center gap-2.5">
        {!expanded && leading}
        <button className="ml-auto shrink-0 cursor-pointer rounded-lg border-0 bg-[#f5c451] px-2.5 py-1.5 text-[10px] font-extrabold text-[#0f172a] focus-visible:outline-2 focus-visible:outline-white" onClick={onAdvanceDay} type="button">Advance Day ▸</button>
        {!expanded && icons}
      </div>
      {message && <p className="flex items-center justify-between gap-2 rounded-lg bg-[#5b1f1a] px-2 py-1.5 text-[10px] leading-snug text-[#ffd4cf]" role="alert">{message}<button aria-label="Dismiss message" className="cursor-pointer border-0 bg-transparent px-1 text-sm text-inherit" onClick={onClearMessage} type="button">×</button></p>}
      {panel && <HeaderPanel kind={panel} onClose={() => setPanel(null)}>
        {panel === 'inbox' && <MessageList empty="No messages yet." items={messages} onPick={(item) => go(item.go)()} />}
        {panel === 'notifications' && <MessageList empty="You're all caught up." items={alerts} onPick={(item) => go(item.go)()} />}
        {panel === 'settings' && <div className="flex flex-col gap-2 text-[12px] text-[#c7d2ee]">
          <p>Season {game.seasonLabel} · {date.long}</p>
          <p>Squad fitness {health.averageFitness}% · {club.squad.length} players</p>
          <button className="cursor-pointer rounded-lg border-0 bg-white/10 px-3 py-2 text-left text-[12px] font-bold text-white hover:bg-white/20" onClick={() => { setPanel(null); advanceToNextMatch() }} type="button">Skip to next match day</button>
        </div>}
      </HeaderPanel>}
    </header>
    {expanded && <section aria-label="Club overview" className="@container bg-[#0b1630] px-3.5 pb-3.5 text-white">
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-2 rounded-2xl border border-[#2864c8] bg-[#10244f] p-2.5 shadow-[inset_0_1px_0_#ffffff0a]">
          <ManagerCard game={game} />
          <div className="flex min-w-0 flex-col items-end gap-1.5">
            {icons}
            <ClubCard nav={nav} onOpenClub={onOpenClub} />
          </div>
        </div>
        <MetricBar nav={nav} />
      </div>
    </section>}
  </>
}

function HeaderIconButton({ children, label, onClick, active, badge = 0 }: { children: ReactNode; label: string; onClick: () => void; active: boolean; badge?: number }) {
  return <button aria-expanded={active} aria-label={label} className={`relative grid size-8 cursor-pointer place-items-center rounded-full border border-white/10 text-white ${active ? 'bg-[#2a6df4]' : 'bg-white/10 hover:bg-white/20'}`} onClick={onClick} type="button">
    {children}
    {badge > 0 && <span className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] leading-4 font-bold">{badge}</span>}
  </button>
}

function HeaderPanel({ kind, onClose, children }: { kind: PanelKind; onClose: () => void; children: ReactNode }) {
  const title = kind === 'inbox' ? 'Inbox' : kind === 'notifications' ? 'Notifications' : 'Settings'
  return <div className="absolute inset-x-3 top-full z-30 mt-1 rounded-2xl border border-white/10 bg-[#10244f] p-3 shadow-2xl">
    <div className="mb-2 flex items-center justify-between"><strong className="text-[13px]">{title}</strong><button aria-label="Close panel" className="cursor-pointer border-0 bg-transparent text-white" onClick={onClose} type="button"><X size={16} /></button></div>
    {children}
  </div>
}

function MessageList({ items, empty, onPick }: { items: HeaderMessage[]; empty: string; onPick: (item: HeaderMessage) => void }) {
  if (!items.length) return <p className="text-[12px] text-[#a7b3d0]">{empty}</p>
  return <ul className="m-0 flex list-none flex-col gap-1.5 p-0">{items.map((item) => <li key={item.id}>
    <button className="w-full cursor-pointer rounded-xl border-0 bg-white/5 px-3 py-2 text-left text-white hover:bg-white/10" onClick={() => onPick(item)} type="button"><strong className="block text-[12px]">{item.title}</strong><span className="text-[11px] text-[#a7b3d0]">{item.detail}</span></button>
  </li>)}</ul>
}

function ManagerCard({ game }: { game: GameView }) {
  const { level, xp, xpMax } = managerProgress(game)
  const initials = club.manager.name.split(' ').map((part) => part[0]).join('').slice(0, 2)
  return <div className="flex min-w-0 items-center gap-2">
    <div className="relative shrink-0">
      <span className="grid size-11 place-items-center rounded-full border-2 border-[#5b9bff] bg-[#1b2f63] font-['Barlow_Condensed'] text-base font-bold">{initials}</span>
      <span aria-label="Online" className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-[#10244f] bg-emerald-400" role="img" />
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <strong className="flex min-w-0 items-center gap-1 text-[14px] leading-tight"><span className="truncate">{club.manager.name}</span> <Crown aria-hidden="true" className="shrink-0 text-[#f5c451]" size={13} /></strong>
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 rounded-full bg-[#f5c451] px-1.5 text-[9px] font-extrabold whitespace-nowrap text-[#0f172a]">Lv {level}</span>
        <div aria-label={`${xp} of ${xpMax} XP`} aria-valuemax={xpMax} aria-valuemin={0} aria-valuenow={xp} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar"><div className="h-full rounded-full bg-linear-to-r from-[#5b9bff] to-[#2dd4bf]" style={{ width: `${(xp / xpMax) * 100}%` }} /></div>
      </div>
      <span className="text-[9px] whitespace-nowrap text-[#8fb4ff]">{xp.toLocaleString('en-GB')} / {xpMax.toLocaleString('en-GB')} XP</span>
    </div>
  </div>
}

function ClubCard({ nav, onOpenClub }: { nav: NavActions; onOpenClub: () => void }) {
  return <div className="flex w-full min-w-0 items-center gap-2 rounded-xl bg-black/15 px-2 py-1.5">
    <button aria-label={`Open ${club.name} profile`} className="grid size-9 shrink-0 cursor-pointer place-items-center border-0 bg-transparent p-0 [&_.club-badge]:size-full" onClick={onOpenClub} type="button"><ClubBadge badge={getClubBadge(club.id)} name={club.name} /></button>
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
      <button className="cursor-pointer self-start truncate border-0 bg-transparent p-0 text-left text-[13px] font-bold text-white" onClick={onOpenClub} type="button">{club.name}</button>
      <span className="flex items-center gap-1.5 truncate text-[9px] text-[#a7b3d0]"><Flag code="NG" countryName="Nigeria" onSelectCountry={nav.onSelectCountry} /> Nigeria</span>
      <span className="truncate text-[9px] text-[#a7b3d0]">{club.stadium.name}</span>
    </div>
    <div className="shrink-0 rounded-lg bg-[#1557db] px-2 py-1 text-center shadow-[0_0_0_1px_#5b9bff]"><strong className="block font-['Barlow_Condensed'] text-lg leading-none text-white">{teamOverall(club.squad)}</strong><span className="text-[7px] font-bold tracking-widest text-[#c7dcff]">OVR</span></div>
  </div>
}

function MetricBar({ nav }: { nav: NavActions }) {
  const health = financialHealth()
  const wageBudget = club.finances.wageBudget
  const items = [
    { key: 'transfer', icon: <Wallet size={14} />, label: 'Transfer budget', value: formatMoney(club.finances.transferBudget), go: () => nav.onNavigate('Transfers') },
    { key: 'wage', icon: <Coins size={14} />, label: 'Wage budget', value: `${formatMoney(wageBudget)} / wk`, go: () => nav.onOpenClubSection('Finances') },
    { key: 'rank', icon: <Trophy size={14} />, label: 'VFA ranking', value: `${club.prestige}/100`, go: () => nav.onNavigate('League') },
    { key: 'rep', icon: <Star size={14} />, label: 'Club reputation', value: reputationLabel(club.prestige),     go: () => nav.onOpenClubSection('Overview') },
  ]
      return <div className="grid grid-cols-5 divide-x divide-white/10 rounded-2xl border border-[#2864c8] bg-[#10244f] py-1.5">
    {items.map((item) => <button className="flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 bg-transparent px-1 text-center text-white hover:bg-white/5" key={item.key} onClick={item.go} type="button">
      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#5b9bff]/15 text-[#8fb4ff]">{item.icon}</span>
      <span className="flex min-w-0 flex-col leading-tight"><strong className="truncate text-[11px]">{item.value}</strong><span className="truncate text-[8px] text-[#a7b3d0]">{item.label}</span></span>
    </button>)}
    <button className="flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 bg-transparent px-1 text-center text-white hover:bg-white/5" onClick={() => nav.onOpenClubSection('Finances')} type="button">
      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#5b9bff]/15 text-[#8fb4ff]"><Landmark size={13} /></span>
      <span className="flex min-w-0 flex-col leading-tight"><strong className={`truncate text-[10px] ${toneClasses[health.tone]}`}>{health.label}</strong><span className="truncate text-[8px] text-[#a7b3d0]">Financial health</span></span>
    </button>
  </div>
}

function buildAlerts(game: GameView, nav: NavActions): HeaderMessage[] {
  const health = getSquadHealth(game.date)
  const items: HeaderMessage[] = []
  if (health.activeInjuries > 0) items.push({ id: 'injuries', title: `${health.activeInjuries} injured`, detail: health.injuriesNote, go: () => nav.onOpenClubSection('Squad') })
  if (financialHealth().tone === 'bad') items.push({ id: 'wages', title: 'Wage bill over the limit', detail: 'Reduce wages or release players.', go: () => nav.onOpenClubSection('Finances') })
  const next = game.nextFixture
  if (next && next.date === game.date) items.push({ id: 'matchday', title: 'Matchday', detail: `${next.homeClubName} vs ${next.awayClubName}`, go: () => nav.onSelectMatch(next.id) })
  return items
}

function buildInbox(game: GameView, nav: NavActions, mail: SponsorMail[]): HeaderMessage[] {
  const confidence = computeConfidence(game)
  const sponsorMail = mail.map((item) => ({ id: item.id, title: `${item.read ? '' : '● '}${item.subject}`, detail: item.body, go: () => { markSponsorMailRead(item.id); nav.onOpenClubSection('Sponsorship') } }))
  return [
    ...sponsorMail,
    { id: 'board', title: `Board · ${confidence.board.status}`, detail: confidence.board.note, go: () => nav.onOpenConfidence('board') },
    { id: 'fans', title: `Fans · ${confidence.fan.status}`, detail: confidence.fan.note, go: () => nav.onOpenConfidence('fan') },
    { id: 'manager', title: `Manager · ${confidence.manager.status}`, detail: confidence.manager.note, go: () => nav.onOpenConfidence('manager') },
  ]
}
