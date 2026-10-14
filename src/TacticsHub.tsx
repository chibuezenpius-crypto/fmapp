import { useEffect, useState } from 'react'
import type { Player } from './types/game'
import { club } from './data/mockData'

const sections = ['Overview', 'Player Roles', 'Set Pieces', 'Captains & Leadership', 'Formations & Style'] as const
type TacticsSection = (typeof sections)[number]
type TacticSlot = { label: string; position: string; x: number; y: number; role: string }
type AssignmentKey = 'leftCorner' | 'rightCorner' | 'shortFreeKick' | 'longFreeKick' | 'penaltyOne' | 'penaltyTwo' | 'penaltyThree'
type LeadershipKey = 'captain' | 'viceOne' | 'viceTwo' | 'viceThree'

const formations: Record<string, TacticSlot[]> = {
  '4-3-3': [
    { label: 'GK', position: 'GK', x: 50, y: 90, role: 'Sweeper Keeper' },
    { label: 'RB', position: 'D (R)', x: 85, y: 75, role: 'Wing Back' },
    { label: 'RCB', position: 'D (C)', x: 62, y: 77, role: 'Ball Playing Defender' },
    { label: 'LCB', position: 'D (C)', x: 38, y: 77, role: 'Ball Playing Defender' },
    { label: 'LB', position: 'D (L)', x: 15, y: 75, role: 'Wing Back' },
    { label: 'DM', position: 'DM', x: 50, y: 61, role: 'Deep Lying Playmaker' },
    { label: 'RCM', position: 'M (C)', x: 65, y: 50, role: 'Box-to-Box Midfielder' },
    { label: 'LCM', position: 'M (C)', x: 35, y: 50, role: 'Advanced Playmaker' },
    { label: 'RW', position: 'M (R)', x: 83, y: 34, role: 'Winger' },
    { label: 'ST', position: 'ST (C)', x: 50, y: 27, role: 'Advanced Forward' },
    { label: 'LW', position: 'M (L)', x: 17, y: 34, role: 'Inside Forward' },
  ],
  '4-2-3-1': [
    { label: 'GK', position: 'GK', x: 50, y: 90, role: 'Sweeper Keeper' },
    { label: 'RB', position: 'D (R)', x: 85, y: 75, role: 'Wing Back' },
    { label: 'RCB', position: 'D (C)', x: 62, y: 77, role: 'Ball Playing Defender' },
    { label: 'LCB', position: 'D (C)', x: 38, y: 77, role: 'Central Defender' },
    { label: 'LB', position: 'D (L)', x: 15, y: 75, role: 'Wing Back' },
    { label: 'DMR', position: 'DM', x: 62, y: 60, role: 'Ball Winning Midfielder' },
    { label: 'DML', position: 'DM', x: 38, y: 60, role: 'Deep Lying Playmaker' },
    { label: 'AMR', position: 'M (R)', x: 82, y: 39, role: 'Winger' },
    { label: 'AMC', position: 'AM (C)', x: 50, y: 45, role: 'Attacking Midfielder' },
    { label: 'AML', position: 'M (L)', x: 18, y: 39, role: 'Inside Forward' },
    { label: 'ST', position: 'ST (C)', x: 50, y: 24, role: 'Advanced Forward' },
  ],
  '3-5-2': [
    { label: 'GK', position: 'GK', x: 50, y: 90, role: 'Sweeper Keeper' },
    { label: 'RCB', position: 'D (C)', x: 75, y: 75, role: 'Wide Centre Back' },
    { label: 'CB', position: 'D (C)', x: 50, y: 78, role: 'Ball Playing Defender' },
    { label: 'LCB', position: 'D (C)', x: 25, y: 75, role: 'Wide Centre Back' },
    { label: 'RWB', position: 'M (R)', x: 88, y: 52, role: 'Wing Back' },
    { label: 'RCM', position: 'M (C)', x: 67, y: 54, role: 'Box-to-Box Midfielder' },
    { label: 'DM', position: 'DM', x: 50, y: 61, role: 'Deep Lying Playmaker' },
    { label: 'LCM', position: 'M (C)', x: 33, y: 54, role: 'Advanced Playmaker' },
    { label: 'LWB', position: 'M (L)', x: 12, y: 52, role: 'Wing Back' },
    { label: 'RST', position: 'ST (C)', x: 62, y: 29, role: 'Pressing Forward' },
    { label: 'LST', position: 'ST (C)', x: 38, y: 29, role: 'Advanced Forward' },
  ],
  '4-4-2': [
    { label: 'GK', position: 'GK', x: 50, y: 90, role: 'Goalkeeper' },
    { label: 'RB', position: 'D (R)', x: 85, y: 75, role: 'Full Back' },
    { label: 'RCB', position: 'D (C)', x: 62, y: 77, role: 'Central Defender' },
    { label: 'LCB', position: 'D (C)', x: 38, y: 77, role: 'Central Defender' },
    { label: 'LB', position: 'D (L)', x: 15, y: 75, role: 'Full Back' },
    { label: 'RM', position: 'M (R)', x: 84, y: 50, role: 'Winger' },
    { label: 'RCM', position: 'M (C)', x: 61, y: 55, role: 'Box-to-Box Midfielder' },
    { label: 'LCM', position: 'M (C)', x: 39, y: 55, role: 'Deep Lying Playmaker' },
    { label: 'LM', position: 'M (L)', x: 16, y: 50, role: 'Winger' },
    { label: 'RST', position: 'ST (C)', x: 62, y: 29, role: 'Target Forward' },
    { label: 'LST', position: 'ST (C)', x: 38, y: 29, role: 'Advanced Forward' },
  ],
}

const roleOptions: Record<string, string[]> = {
  GK: ['Sweeper Keeper', 'Goalkeeper', 'Defend'],
  DEF: ['Ball Playing Defender', 'Central Defender', 'Wide Centre Back', 'Wing Back', 'Full Back'],
  MID: ['Deep Lying Playmaker', 'Box-to-Box Midfielder', 'Advanced Playmaker', 'Ball Winning Midfielder', 'Winger', 'Inside Forward', 'Wing Back'],
  FWD: ['Advanced Forward', 'Pressing Forward', 'Target Forward', 'Poacher'],
}

const assignmentLabels: { key: AssignmentKey; label: string }[] = [
  { key: 'leftCorner', label: 'Corner Kicks · Left' },
  { key: 'rightCorner', label: 'Corner Kicks · Right' },
  { key: 'shortFreeKick', label: 'Free Kicks · Short' },
  { key: 'longFreeKick', label: 'Free Kicks · Long' },
  { key: 'penaltyOne', label: 'Penalties · 1st choice' },
  { key: 'penaltyTwo', label: 'Penalties · 2nd choice' },
  { key: 'penaltyThree', label: 'Penalties · 3rd choice' },
]

const leadershipLabels: { key: LeadershipKey; label: string }[] = [
  { key: 'captain', label: 'Captain · 1st choice' },
  { key: 'viceOne', label: 'Vice-Captain · 2nd choice' },
  { key: 'viceTwo', label: 'Vice-Captain · 3rd choice' },
  { key: 'viceThree', label: 'Vice-Captain · 4th choice' },
]

const initialLineup = ['p-01', 'p-02', 'p-04', 'p-05', 'p-03', 'p-06', 'p-08', 'p-10', 'p-07', 'p-09', 'p-11']
const influenceFor = (player: Player) => player.attributes.leadership >= 17 ? 'Very High' : player.attributes.leadership >= 14 ? 'High' : 'Influential'
interface SavedTacticsState {
  formation?: string
  lineup?: string[]
  roles?: Record<number, string>
  mentality?: string
  tacticalDNA?: string
  setPieceTakers?: Partial<Record<AssignmentKey, string>>
  leadership?: Partial<Record<LeadershipKey, string>>
}

function readSavedTactics(): SavedTacticsState | null {
  try {
    const saved = window.localStorage.getItem('fmapp-tactics')
    if (!saved) return null
    const parsed: unknown = JSON.parse(saved)
    return parsed && typeof parsed === 'object' ? parsed as SavedTacticsState : null
  } catch {
    return null
  }
}

function roleGroup(position: string) {
  if (position === 'GK') return 'GK'
  if (position === 'DM') return 'MID'
  if (position.startsWith('D')) return 'DEF'
  if (position.startsWith('ST') || position.startsWith('AM')) return 'FWD'
  return 'MID'
}

function positionFit(playerPosition: string, slotPosition: string) {
  if (playerPosition === slotPosition) return 3
  if (slotPosition.startsWith('D') && playerPosition.startsWith('D')) return 2
  if (slotPosition === 'DM' && playerPosition === 'M (C)') return 1
  if (slotPosition === 'M (C)' && ['DM', 'AM (C)'].includes(playerPosition)) return 1
  if (slotPosition.startsWith('M') && playerPosition.startsWith('D')) return 1
  if (slotPosition === 'ST (C)' && playerPosition === 'AM (C)') return 1
  return 0
}

function fitPlayersToSlots(slots: TacticSlot[], availablePlayers: Player[], preferredIds: Set<string> = new Set()) {
  const remaining = [...availablePlayers]
  return slots.map((slot) => {
    const ranked = [...remaining].sort((first, second) => {
      const firstScore = positionFit(first.position, slot.position) * 100 + first.overall + first.fitness * 0.05 + (preferredIds.has(first.id) ? 5 : 0)
      const secondScore = positionFit(second.position, slot.position) * 100 + second.overall + second.fitness * 0.05 + (preferredIds.has(second.id) ? 5 : 0)
      return secondScore - firstScore
    })
    const selected = ranked[0]
    if (!selected) return null
    remaining.splice(remaining.findIndex((player) => player.id === selected.id), 1)
    return selected
  }).filter((player): player is Player => player !== null).map((player) => player.id)
}

function PlayerSelect({ label, players, value, onChange }: { label: string; players: Player[]; value: string; onChange: (id: string) => void }) {
  return <label className="tactics-assignment"><span>{label}</span><select aria-label={label} onChange={(event) => onChange(event.target.value)} value={value}><option value="">Unassigned</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
}

function TacticalPitch({ formation, slots, players, selectedSlot, onSelectSlot, preview = false }: { formation: string; slots: TacticSlot[]; players: (Player | null)[]; selectedSlot: number | null; onSelectSlot: (index: number) => void; preview?: boolean }) {
  return <div className={`pitch tactics-pitch ${preview ? 'tactics-pitch-preview' : ''}`} aria-label={`${formation} tactical pitch`}><span className="pitch-line halfway" /><span className="pitch-circle" />{slots.map((slot, index) => {
    const player = players[index]
    const classes = `pitch-player tactics-player-slot ${player ? '' : 'empty'} ${selectedSlot === index ? 'selected' : ''}`
    return <button aria-label={player ? `${player.name}, ${slot.label}, ${slot.role}` : `Empty ${slot.label} position`} aria-pressed={selectedSlot === index} className={classes} key={`${formation}-${slot.label}-${index}`} onClick={() => player && onSelectSlot(index)} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} type="button">{player ? <><b>{String(player.shirtNumber).padStart(2, '0')}</b><span>{player.name.split(' ')[0]}</span><small>{slot.label}</small></> : <><b>+</b><span>{slot.label}</span></>}</button>
  })}</div>
}

export default function TacticsHub() {
  const [savedTactics] = useState(readSavedTactics)
  const [section, setSection] = useState<TacticsSection>('Overview')
  const [formation, setFormation] = useState(() => savedTactics?.formation && formations[savedTactics.formation] ? savedTactics.formation : '4-3-3')
  const [lineup, setLineup] = useState<string[]>(() => savedTactics?.lineup?.filter((id) => club.squad.some((player) => player.id === id)) ?? initialLineup)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [swapMessage, setSwapMessage] = useState('Select a starter, then choose a bench player to swap.')
  const [mentality, setMentality] = useState(() => ['Attacking', 'Balanced', 'Defensive'].includes(savedTactics?.mentality ?? '') ? savedTactics!.mentality! : 'Balanced')
  const [tacticalDNA, setTacticalDNA] = useState(() => ['Gegenpress', 'Tiki-Taka', 'Counter-Attack', 'Direct Passing'].includes(savedTactics?.tacticalDNA ?? '') ? savedTactics!.tacticalDNA! : 'Gegenpress')
  const [roles, setRoles] = useState<Record<number, string>>(() => ({ ...Object.fromEntries(formations[savedTactics?.formation && formations[savedTactics.formation] ? savedTactics.formation : '4-3-3'].map((slot, index) => [index, slot.role])), ...savedTactics?.roles }))
  const [setPieceTakers, setSetPieceTakers] = useState<Record<AssignmentKey, string>>({
    ...{
    leftCorner: 'p-10', rightCorner: 'p-08', shortFreeKick: 'p-10', longFreeKick: 'p-08', penaltyOne: 'p-09', penaltyTwo: 'p-10', penaltyThree: 'p-08',
    },
    ...savedTactics?.setPieceTakers,
  })
  const [leadership, setLeadership] = useState<Record<LeadershipKey, string>>({ captain: 'p-04', viceOne: 'p-08', viceTwo: 'p-06', viceThree: 'p-01', ...savedTactics?.leadership })
  const slots = formations[formation]
  const startingPlayers = lineup.map((id) => club.squad.find((player) => player.id === id) ?? null)
  const reserves = club.squad.filter((player) => !lineup.includes(player.id))

  useEffect(() => {
    try {
      window.localStorage.setItem('fmapp-tactics', JSON.stringify({ formation, lineup, roles, mentality, tacticalDNA, setPieceTakers, leadership }))
    } catch {
      return
    }
  }, [formation, lineup, roles, mentality, tacticalDNA, setPieceTakers, leadership])

  const autoPick = () => {
    setLineup(fitPlayersToSlots(slots, club.squad))
    setSelectedSlot(null)
    setSwapMessage('Best available XI selected by rating and fitness.')
  }

  const clearPitch = () => {
    setLineup([])
    setSelectedSlot(null)
    setSwapMessage('Pitch cleared. Auto Pick or add players from the reserves list.')
  }

  const changeFormation = (nextFormation: string) => {
    const preferredIds = new Set(lineup)
    const nextSlots = formations[nextFormation]
    setFormation(nextFormation)
    setLineup((current) => current.length === 0 ? [] : fitPlayersToSlots(nextSlots, club.squad, preferredIds))
    setRoles(Object.fromEntries(nextSlots.map((slot, index) => [index, slot.role])))
    setSelectedSlot(null)
  }

  const swapReserve = (reserve: Player) => {
    if (selectedSlot === null) {
      setSwapMessage('Choose a starting player on the pitch first.')
      return
    }
    const nextLineup = [...lineup]
    const outgoingPlayer = club.squad.find((player) => player.id === nextLineup[selectedSlot])
    nextLineup[selectedSlot] = reserve.id
    setLineup(nextLineup)
    setSelectedSlot(null)
    setSwapMessage(`${reserve.name} replaces ${outgoingPlayer?.name ?? 'the selected player'}.`)
  }

  const setRole = (slotIndex: number, value: string) => setRoles((current) => ({ ...current, [slotIndex]: value }))
  const setTaker = (key: AssignmentKey, playerId: string) => setSetPieceTakers((current) => ({ ...current, [key]: playerId }))
  const setLeader = (key: LeadershipKey, playerId: string) => setLeadership((current) => ({ ...current, [key]: playerId }))

  return <div className="tactics-hub">
    <div className="page-intro"><span className="eyebrow">FIRST TEAM · MATCH PREPARATION</span><h1>Tactics hub</h1><p>{formation} · {lineup.length} of {slots.length} starters selected</p></div>
    <nav className="tactics-tabs" aria-label="Tactics sections">{sections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'tactics-tab active' : 'tactics-tab'} key={item} onClick={() => setSection(item)} type="button">{item}</button>)}</nav>

    {section === 'Overview' && <div className="tactics-section-content">
      <div className="tactics-toolbar"><div><span className="eyebrow">STARTING XI</span><strong>{formation}</strong></div><div className="tactics-actions"><button className="tactics-action primary" onClick={autoPick} type="button">Auto Pick</button><button className="tactics-action" onClick={clearPitch} type="button">Clear Pitch</button></div></div>
      <TacticalPitch formation={formation} slots={slots} players={startingPlayers} selectedSlot={selectedSlot} onSelectSlot={(index) => setSelectedSlot(selectedSlot === index ? null : index)} />
      <div className="bench-panel"><div className="bench-heading"><div><span className="eyebrow">SQUAD ROTATION</span><h2>Bench & Reserves</h2></div><span>{reserves.length} AVAILABLE</span></div><p className="swap-guidance">{swapMessage}</p><div className="tactics-reserves">{reserves.map((player) => <button aria-label={`Swap in ${player.name}`} aria-pressed={false} className="reserve-player-card" key={player.id} onClick={() => swapReserve(player)} type="button"><span>{String(player.shirtNumber).padStart(2, '0')}</span><div><strong>{player.name}</strong><small>{player.position} · FIT {player.fitness}%</small></div><b>{player.overall}</b></button>)}</div></div>
    </div>}

    {section === 'Player Roles' && <div className="tactics-section-content"><div className="tactics-subhead"><span className="eyebrow">TACTICAL RESPONSIBILITIES</span><h2>Player roles</h2><p>Assign a role to each slot in your {formation}.</p></div><div className="role-assignment-list">{slots.map((slot, index) => {
      const player = startingPlayers[index]
      const options = roleOptions[roleGroup(slot.position)]
      const value = roles[index] ?? slot.role
      const roleList = options.includes(value) ? options : [value, ...options]
      return <label className="role-assignment-row" key={`${formation}-role-${index}`}><span className="role-position">{slot.label}</span><span className="role-player-name">{player?.name ?? 'Position unfilled'}</span><select aria-label={`${slot.label} role`} onChange={(event) => setRole(index, event.target.value)} value={value}>{roleList.map((role) => <option key={role}>{role}</option>)}</select></label>
    })}</div></div>}

    {section === 'Set Pieces' && <div className="tactics-section-content"><div className="tactics-subhead"><span className="eyebrow">DEAD BALL RESPONSIBILITIES</span><h2>Set pieces</h2><p>Choose the first-choice taker for each situation.</p></div><section className="tactics-assignments-panel">{assignmentLabels.map(({ key, label }) => <PlayerSelect key={key} label={label} players={club.squad} value={setPieceTakers[key]} onChange={(value) => setTaker(key, value)} />)}</section></div>}

    {section === 'Captains & Leadership' && <div className="tactics-section-content"><div className="tactics-subhead"><span className="eyebrow">DRESSING ROOM</span><h2>Leadership group</h2><p>Set the matchday captain and three deputies.</p></div><section className="tactics-assignments-panel">{leadershipLabels.map(({ key, label }) => <PlayerSelect key={key} label={label} players={club.squad} value={leadership[key]} onChange={(value) => setLeader(key, value)} />)}</section><section className="leadership-influence-panel"><div className="bench-heading"><div><span className="eyebrow">SQUAD LEADERS</span><h2>Leadership influence</h2></div></div>{club.squad.filter((player) => player.attributes.leadership >= 14).sort((first, second) => second.attributes.leadership - first.attributes.leadership).map((player) => <article className="leadership-player-row" key={player.id}><div><strong>{player.name}</strong><small>Leadership {player.attributes.leadership} · {player.shirtNumber === 4 ? 'Organizes the back line' : player.shirtNumber === 8 ? 'Sets training standards' : 'Supports squad morale'}</small></div><span className={`influence-badge ${influenceFor(player).toLowerCase().replace(' ', '-')}`}>{influenceFor(player)}</span></article>)}</section></div>}

    {section === 'Formations & Style' && <div className="tactics-section-content"><div className="tactics-subhead"><span className="eyebrow">TEAM IDENTITY</span><h2>Formations & style</h2><p>Change the formation and tactical approach.</p></div><section className="formation-library"><span className="eyebrow">FORMATION LIBRARY</span><div className="formation-options">{Object.keys(formations).map((item) => <button aria-pressed={formation === item} className={formation === item ? 'formation-option active' : 'formation-option'} key={item} onClick={() => changeFormation(item)} type="button">{item}</button>)}</div></section><section className="mentality-panel"><span className="eyebrow">TACTICAL MENTALITY</span><div className="mentality-options">{['Attacking', 'Balanced', 'Defensive'].map((item) => <button aria-pressed={mentality === item} className={mentality === item ? 'mentality-option active' : 'mentality-option'} key={item} onClick={() => setMentality(item)} type="button">{item}</button>)}</div></section><section className="mentality-panel"><span className="eyebrow">TACTICAL DNA</span><div className="style-options">{['Gegenpress', 'Tiki-Taka', 'Counter-Attack', 'Direct Passing'].map((item) => <button aria-pressed={tacticalDNA === item} className={tacticalDNA === item ? 'style-option active' : 'style-option'} key={item} onClick={() => setTacticalDNA(item)} type="button">{item}</button>)}</div></section><TacticalPitch formation={formation} slots={slots} players={startingPlayers} selectedSlot={selectedSlot} onSelectSlot={(index) => setSelectedSlot(selectedSlot === index ? null : index)} preview /></div>}
  </div>
}
