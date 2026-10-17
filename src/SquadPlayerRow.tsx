import { Star } from 'lucide-react'
import type { Player, PlayerPosition } from './types/game'
import { PLACEHOLDER_PORTRAIT } from './portrait'

type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT'

const groupOf = (position: PlayerPosition): PositionGroup =>
  position === 'GK' ? 'GK' : position.startsWith('D') && position !== 'DM' ? 'DEF' : position === 'DM' || position.startsWith('M') ? 'MID' : 'ATT'

const badgeStyles: Record<PositionGroup, string> = {
  GK: 'bg-purple-100 text-purple-700',
  DEF: 'bg-blue-100 text-blue-700',
  MID: 'bg-emerald-100 text-emerald-700',
  ATT: 'bg-amber-100 text-amber-700',
}

/** Roles a player can cover besides his natural one. The squad data stores one position, so cover is inferred from it. */
const coverPositions: Record<PlayerPosition, string[]> = {
  GK: [],
  'D (C)': ['DM'],
  'D (L)': ['D (R)', 'M (L)'],
  'D (R)': ['D (L)', 'M (R)'],
  DM: ['D (C)', 'M (C)'],
  'M (C)': ['DM', 'AM (C)'],
  'M (L)': ['AM (C)', 'ST (C)'],
  'M (R)': ['AM (C)', 'ST (C)'],
  'AM (C)': ['M (C)', 'ST (C)'],
  'ST (C)': ['AM (C)'],
}

const shortPosition = (position: string) => (position === 'ST (C)' ? 'ST' : position.replace(/[() ]/g, ''))

function FitnessRing({ value }: { value: number }) {
  const radius = 9
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  const tone = clamped >= 85 ? '#16a34a' : clamped >= 70 ? '#d97706' : '#dc2626'
  return <span aria-label={`Fitness ${clamped}%`} className="relative inline-flex size-6 shrink-0 items-center justify-center" role="img">
    <svg aria-hidden="true" className="size-6 -rotate-90" viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="none" r={radius} stroke="#e2e8f6" strokeWidth="3" />
      <circle cx="12" cy="12" fill="none" r={radius} stroke={tone} strokeDasharray={`${circumference * clamped / 100} ${circumference}`} strokeLinecap="round" strokeWidth="3" />
    </svg>
  </span>
}

function MedicalCross() {
  return <span aria-label="Injured" className="inline-flex size-4 shrink-0 items-center justify-center rounded bg-red-500" role="img">
    <svg aria-hidden="true" className="size-3" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="3" viewBox="0 0 12 12"><path d="M6 2v8M2 6h8" /></svg>
  </span>
}

export function PositionBadge({ position }: { position: PlayerPosition }) {
  return <span className={`inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${badgeStyles[groupOf(position)]}`}>{shortPosition(position)}</span>
}

export type SquadViewMode = 'Fitness' | 'Contract' | 'Morale' | 'Wages'

const moraleTone: Record<Player['morale'], string> = {
  'Very Good': 'bg-emerald-100 text-emerald-700',
  Good: 'bg-green-100 text-green-700',
  Okay: 'bg-amber-100 text-amber-700',
  Poor: 'bg-red-100 text-red-700',
}

const contractLabel = (endDate: string) => new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(new Date(`${endDate}T12:00:00`))
const wageLabel = (wage: number) => `£${new Intl.NumberFormat('en-GB').format(wage)}`

function Metric({ player, view }: { player: Player; view: SquadViewMode }) {
  if (view === 'Fitness') return <FitnessRing value={player.fitness} />
  if (view === 'Morale') return <span className={`rounded-lg px-2 py-1 text-[11px] font-extrabold ${moraleTone[player.morale]}`}>{player.morale}</span>
  if (view === 'Contract') return <span className="flex flex-col items-end"><strong className="text-xs font-bold leading-none text-slate-800">{contractLabel(player.contract.endDate)}</strong><small className="mt-0.5 text-[9px] font-bold text-slate-500">EXPIRES</small></span>
  return <span className="flex flex-col items-end"><strong className="text-xs font-bold leading-none text-slate-800">{wageLabel(player.contract.weeklyWage)}</strong><small className="mt-0.5 text-[9px] font-bold text-slate-500">PER WEEK</small></span>
}

export interface SquadPlayerRowProps {
  player: Player
  isStar: boolean
  isInjured: boolean
  view: SquadViewMode
  extraNote?: string
  onSelect: (player: Player) => void
}

export default function SquadPlayerRow({ player, isStar, isInjured, view, extraNote, onSelect }: SquadPlayerRowProps) {
  const secondary = coverPositions[player.position].join(', ')
  const details = [secondary, `${player.age} yrs`, extraNote].filter(Boolean).join(' • ')
  return <button aria-label={`Open ${player.name} profile`} className={`flex min-h-16 w-full items-center gap-2.5 border-x-0 border-b-0 border-t border-solid border-t-[#e2e8f6] px-3 py-2 first:border-t-0 text-left transition-colors ${isInjured ? 'bg-red-50 shadow-[inset_3px_0_0_#f87171] hover:bg-red-100' : 'bg-transparent hover:bg-blue-50'}`} onClick={() => onSelect(player)} type="button">
    <span className={`inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${badgeStyles[groupOf(player.position)]}`}>{shortPosition(player.position)}</span>
    <img alt="" className="size-9 shrink-0 rounded-full border border-[#cfd9f0] bg-[#d2defa] object-cover" src={PLACEHOLDER_PORTRAIT} />
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <strong className="truncate text-sm font-bold text-[#1b2847]">{player.name}</strong>
        {isStar && <Star aria-label="Key player" className="size-3.5 shrink-0 fill-amber-400 text-amber-500" role="img" />}
        {isInjured && <MedicalCross />}
      </span>
      <small className="truncate text-[11px] text-[#6376a4]">{details}</small>
    </span>
    <span className="flex min-w-14 shrink-0 justify-end"><Metric player={player} view={view} /></span>
  </button>
}
