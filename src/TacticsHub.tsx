import { useEffect, useState } from 'react'
import type { Player } from './types/game'
import { club } from './data/mockData'

const sections = ['Overview', 'Player Roles', 'Set Pieces', 'Captains & Leadership', 'Tactics Styles', 'Tactics Setup'] as const
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

const tacticalPatterns: Record<string, { points: string; kind: string }[]> = {
  Gegenpress: [
    { points: '25,35 25,22', kind: 'press' }, { points: '50,33 50,18', kind: 'press' }, { points: '75,35 75,22', kind: 'press' },
    { points: '32,58 32,46', kind: 'press' }, { points: '68,58 68,46', kind: 'press' },
  ],
  'Tiki-Taka': [
    { points: '50,24 34,40 52,50 67,38 50,24', kind: 'pass' }, { points: '34,40 24,59 47,65 52,50', kind: 'pass' },
    { points: '52,50 73,58 67,38', kind: 'pass' }, { points: '47,65 50,78 73,58', kind: 'pass' },
  ],
  'Counter-Attack': [
    { points: '30,77 29,55 39,40 50,23', kind: 'counter' }, { points: '70,77 71,56 62,40 50,23', kind: 'counter' },
    { points: '50,64 50,45 50,24', kind: 'counter' },
  ],
  'Direct Passing': [
    { points: '50,77 28,49 22,30', kind: 'direct' }, { points: '50,77 71,47 78,29', kind: 'direct' },
    { points: '50,62 51,39 50,22', kind: 'direct' },
  ],
  'Park the Bus': [
    { points: '25,36 25,48', kind: 'block' }, { points: '38,33 38,48', kind: 'block' }, { points: '50,32 50,48', kind: 'block' },
    { points: '62,33 62,48', kind: 'block' }, { points: '75,36 75,48', kind: 'block' }, { points: '50,62 50,53', kind: 'block' },
  ],
}

interface TacticalStyleGuidance {
  advantages: string[]
  disadvantages: string[]
  score: (player: Player) => number
  excelReason: (player: Player) => string
  struggleReason: (player: Player) => string
}

const styleGuidance: Record<string, TacticalStyleGuidance> = {
  Gegenpress: {
    advantages: ['Wins possession close to goal', 'Creates pressure through coordinated movement'],
    disadvantages: ['High physical load across the squad', 'Space can open behind the defensive line'],
    score: (player) => (player.attributes.stamina + player.attributes.workRate + player.attributes.determination) / 3,
    excelReason: (player) => `Stamina ${player.attributes.stamina} and Work Rate ${player.attributes.workRate} sustain repeated pressing`,
    struggleReason: (player) => `Stamina ${player.attributes.stamina} and Work Rate ${player.attributes.workRate} may fade under a high press`,
  },
  'Tiki-Taka': {
    advantages: ['Keeps the ball and controls tempo', 'Short combinations create passing lanes'],
    disadvantages: ['Needs secure first touch and passing', 'Can struggle against a compact low block'],
    score: (player) => (player.attributes.passing + player.attributes.firstTouch + player.attributes.technique + player.attributes.vision) / 4,
    excelReason: (player) => `Passing ${player.attributes.passing} and Technique ${player.attributes.technique} suit quick combinations`,
    struggleReason: (player) => `First Touch ${player.attributes.firstTouch} and Passing ${player.attributes.passing} may invite turnovers`,
  },
  'Counter-Attack': {
    advantages: ['Turns transitions into fast attacks', 'Uses space behind an advanced defence'],
    disadvantages: ['Can concede possession for long spells', 'Requires pace and timing on the break'],
    score: (player) => (player.attributes.pace + player.attributes.acceleration + player.attributes.offTheBall) / 3,
    excelReason: (player) => `Pace ${player.attributes.pace} and Off the Ball ${player.attributes.offTheBall} threaten space behind`,
    struggleReason: (player) => `Pace ${player.attributes.pace} and Acceleration ${player.attributes.acceleration} limit transition threat`,
  },
  'Direct Passing': {
    advantages: ['Moves the ball forward quickly', 'Makes strong use of aerial targets'],
    disadvantages: ['Can give away possession under pressure', 'Midfield support must arrive quickly'],
    score: (player) => (player.attributes.passing + player.attributes.strength + player.attributes.heading) / 3,
    excelReason: (player) => `Strength ${player.attributes.strength} and Heading ${player.attributes.heading} help win direct balls`,
    struggleReason: (player) => `Strength ${player.attributes.strength} and Heading ${player.attributes.heading} make aerial duels difficult`,
  },
  'Park the Bus': {
    advantages: ['Protects central space with a compact block', 'Makes the box difficult to attack'],
    disadvantages: ['Invites sustained pressure near your area', 'Can leave the attack isolated after regaining possession'],
    score: (player) => (player.attributes.positioning + player.attributes.marking + player.attributes.determination + player.attributes.teamwork) / 4,
    excelReason: (player) => `Positioning ${player.attributes.positioning} and Marking ${player.attributes.marking} hold the defensive shape`,
    struggleReason: (player) => `Positioning ${player.attributes.positioning} and Marking ${player.attributes.marking} can leave gaps in a deep block`,
  },
}

const initialLineup = ['p-01', 'p-02', 'p-04', 'p-05', 'p-03', 'p-06', 'p-08', 'p-10', 'p-07', 'p-09', 'p-11']
const influenceFor = (player: Player) => player.attributes.leadership >= 17 ? 'Very High' : player.attributes.leadership >= 14 ? 'High' : 'Influential'
interface SavedTacticsState {
  formation?: string
  lineup?: string[]
  roles?: Record<number, string>
  mentality?: string
  tacticalDNA?: string
  matchTempo?: string
  aggressionLevel?: string
  pitchWidth?: string
  attackFocus?: string
  defensiveLine?: string
  pressingIntensity?: string
  creativeFreedom?: string
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

function positionFamiliarity(playerPosition: string, slotPosition: string) {
  if (playerPosition === slotPosition) return 100
  const playerGroup = roleGroup(playerPosition)
  const slotGroup = roleGroup(slotPosition)
  if (playerGroup === 'GK' || slotGroup === 'GK') return 10
  if (playerGroup === slotGroup && playerGroup === 'DEF') return 82
  if (playerGroup === slotGroup && playerGroup === 'MID') return 78
  if (playerGroup === slotGroup && playerGroup === 'FWD') return 76
  if (playerGroup === 'DEF' && slotGroup === 'FWD') return 40
  if (playerGroup === 'FWD' && slotGroup === 'DEF') return 35
  if (playerGroup === 'DEF' || slotGroup === 'DEF') return 58
  return 62
}

function familiarityTone(familiarity: number) {
  return familiarity < 50 ? 'poor' : familiarity < 75 ? 'warning' : 'good'
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

function TacticalPitch({ formation, slots, players, selectedSlot, onSelectSlot, preview = false, tacticalDNA = 'Gegenpress' }: { formation: string; slots: TacticSlot[]; players: (Player | null)[]; selectedSlot: number | null; onSelectSlot: (index: number) => void; preview?: boolean; tacticalDNA?: string }) {
  const arrows = tacticalPatterns[tacticalDNA] ?? tacticalPatterns.Gegenpress
  return <div className={`pitch tactics-pitch ${preview ? 'tactics-pitch-preview' : ''}`} aria-label={`${formation} tactical pitch`}><span className="pitch-line halfway" /><span className="pitch-circle" />{slots.map((slot, index) => {
    const player = players[index]
    const familiarity = player ? positionFamiliarity(player.position, slot.position) : 0
    const penalty = 100 - familiarity
    const classes = `pitch-player tactics-player-slot ${player ? '' : 'empty'} ${selectedSlot === index ? 'selected' : ''}`
    if (preview) return <div aria-hidden="true" className={`${classes} tactics-preview-dot`} key={`${formation}-${slot.label}-${index}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}><b>{String(index + 1).padStart(2, '0')}</b><span>{slot.label}</span></div>
    return <button aria-label={player ? `${player.position} at ${slot.label}: ${familiarity}% Familiarity${penalty ? ` (-${penalty}% Penalty)` : ''}` : `Empty ${slot.label} position`} aria-pressed={selectedSlot === index} className={classes} key={`${formation}-${slot.label}-${index}`} onClick={() => player && onSelectSlot(index)} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} type="button">{player ? <><b>{String(player.shirtNumber).padStart(2, '0')}</b><span>{player.name.split(' ')[0]}</span><small>{slot.label}</small><em className={`position-familiarity ${familiarityTone(familiarity)}`}>{familiarity}%<small>FAM{penalty ? ` · -${penalty}%` : ''}</small></em></> : <><b>+</b><span>{slot.label}</span></>}</button>
  })}{preview && <svg aria-hidden="true" className={`tactical-arrow-overlay ${tacticalDNA.toLowerCase().replace(/[^a-z]+/g, '-')}`} preserveAspectRatio="none" viewBox="0 0 100 100"><defs><marker id="tactical-arrowhead" markerHeight="5" markerWidth="5" orient="auto" refX="4" refY="2.5"><path d="M0 0 5 2.5 0 5z" /></marker></defs>{arrows.map((arrow, index) => <polyline className={`movement-line ${arrow.kind}`} key={`${tacticalDNA}-${index}`} markerEnd="url(#tactical-arrowhead)" points={arrow.points} />)}</svg>}</div>
}

export default function TacticsHub() {
  const [savedTactics] = useState(readSavedTactics)
  const [section, setSection] = useState<TacticsSection>('Overview')
  const [formation, setFormation] = useState(() => savedTactics?.formation && formations[savedTactics.formation] ? savedTactics.formation : '4-3-3')
  const [lineup, setLineup] = useState<string[]>(() => savedTactics?.lineup?.filter((id) => club.squad.some((player) => player.id === id)) ?? initialLineup)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [swapMessage, setSwapMessage] = useState('Select a starter, then choose a bench player to swap.')
  const [tacticalDNA, setTacticalDNA] = useState(() => Object.keys(styleGuidance).includes(savedTactics?.tacticalDNA ?? '') ? savedTactics!.tacticalDNA! : 'Gegenpress')
  const [matchTempo, setMatchTempo] = useState(savedTactics?.matchTempo ?? 'Balanced')
  const [aggressionLevel, setAggressionLevel] = useState(savedTactics?.aggressionLevel ?? 'Normal')
  const [pitchWidth, setPitchWidth] = useState(savedTactics?.pitchWidth ?? 'Balanced')
  const [attackFocus, setAttackFocus] = useState(savedTactics?.attackFocus ?? 'Both Wings')
  const [defensiveLine, setDefensiveLine] = useState(savedTactics?.defensiveLine ?? 'Mid Block')
  const [pressingIntensity, setPressingIntensity] = useState(savedTactics?.pressingIntensity ?? 'Standard')
  const [creativeFreedom, setCreativeFreedom] = useState(savedTactics?.creativeFreedom ?? 'Disciplined')
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
  const guidance = styleGuidance[tacticalDNA] ?? styleGuidance.Gegenpress
  const compatibility = lineup.length ? Math.round(startingPlayers.reduce((total, player) => total + (player ? guidance.score(player) * 5 : 0), 0) / lineup.length) : 0
  const formationRatings = Object.keys(formations).map((formationName) => {
    const pickedIds = fitPlayersToSlots(formations[formationName], club.squad)
    const familiarityTotal = formations[formationName].reduce((total, slot, index) => {
      const player = club.squad.find((candidate) => candidate.id === pickedIds[index])
      return total + (player ? positionFamiliarity(player.position, slot.position) : 0)
    }, 0)
    return { name: formationName, rating: Math.round(familiarityTotal / formations[formationName].length) }
  })
  const recommendedFormation = [...formationRatings].sort((first, second) => second.rating - first.rating)[0]
  const recommendedStyle = Object.keys(styleGuidance).map((style) => ({
    style,
    score: club.squad.reduce((sum, player) => sum + styleGuidance[style].score(player), 0) / club.squad.length,
  })).sort((first, second) => second.score - first.score)[0].style
  const suitability = [...club.squad].sort((first, second) => guidance.score(second) - guidance.score(first))
  const excellingPlayers = suitability.slice(0, 3).map((player) => ({ player, reason: guidance.excelReason(player) }))
  const strugglingPlayers = suitability.slice(-2).reverse().map((player) => ({ player, reason: guidance.struggleReason(player) }))

  useEffect(() => {
    try {
      window.localStorage.setItem('fmapp-tactics', JSON.stringify({ formation, lineup, roles, tacticalDNA, matchTempo, aggressionLevel, pitchWidth, attackFocus, defensiveLine, pressingIntensity, creativeFreedom, setPieceTakers, leadership }))
    } catch {
      return
    }
  }, [formation, lineup, roles, tacticalDNA, matchTempo, aggressionLevel, pitchWidth, attackFocus, defensiveLine, pressingIntensity, creativeFreedom, setPieceTakers, leadership])

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

  const selectStartingSlot = (targetSlot: number) => {
    if (selectedSlot === null) {
      setSelectedSlot(targetSlot)
      const player = startingPlayers[targetSlot]
      setSwapMessage(player ? `${player.name} selected. Choose another starter to swap positions.` : 'Select a starter, then choose a bench player to swap.')
      return
    }
    if (selectedSlot === targetSlot) {
      setSelectedSlot(null)
      setSwapMessage('Starter selection cleared.')
      return
    }
    const firstPlayerId = lineup[selectedSlot]
    const secondPlayerId = lineup[targetSlot]
    const nextLineup = [...lineup]
    nextLineup[selectedSlot] = secondPlayerId
    nextLineup[targetSlot] = firstPlayerId
    setLineup(nextLineup)
    setSelectedSlot(null)
    const firstName = club.squad.find((player) => player.id === firstPlayerId)?.name ?? 'Starter'
    const secondName = club.squad.find((player) => player.id === secondPlayerId)?.name ?? 'Starter'
    setSwapMessage(`${firstName} and ${secondName} swapped positions.`)
  }

  const setRole = (slotIndex: number, value: string) => setRoles((current) => ({ ...current, [slotIndex]: value }))
  const setTaker = (key: AssignmentKey, playerId: string) => setSetPieceTakers((current) => ({ ...current, [key]: playerId }))
  const setLeader = (key: LeadershipKey, playerId: string) => setLeadership((current) => ({ ...current, [key]: playerId }))

  return <div className="tactics-hub">
    <div className="page-intro"><span className="eyebrow">FIRST TEAM · MATCH PREPARATION</span><h1>Tactics hub</h1><p>{formation} · {lineup.length} of {slots.length} starters selected</p></div>
    <nav className="tactics-tabs" aria-label="Tactics sections">{sections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'tactics-tab active' : 'tactics-tab'} key={item} onClick={() => setSection(item)} type="button">{item}</button>)}</nav>

    {section === 'Overview' && <div className="tactics-section-content">
      <div className="tactics-toolbar"><div><span className="eyebrow">STARTING XI</span><strong>{formation}</strong></div><div className="tactics-actions"><button className="tactics-action primary" onClick={autoPick} type="button">Auto Pick</button><button className="tactics-action" onClick={clearPitch} type="button">Clear Pitch</button></div></div>
      <TacticalPitch formation={formation} slots={slots} players={startingPlayers} selectedSlot={selectedSlot} onSelectSlot={selectStartingSlot} />
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

    {section === 'Tactics Styles' && <div className="tactics-section-content"><div className="tactics-subhead"><span className="eyebrow">PRESET TACTICAL DNA</span><h2>Tactics styles</h2><p>Choose a preset to see how it fits your squad.</p></div><div className="preset-style-grid">{Object.keys(styleGuidance).map((style) => <button aria-pressed={tacticalDNA === style} className={tacticalDNA === style ? 'preset-style-option active' : 'preset-style-option'} key={style} onClick={() => setTacticalDNA(style)} type="button"><span>{style}</span>{style === recommendedStyle && <b aria-label="Assistant Manager recommended" title="Assistant Manager recommended">★</b>}</button>)}</div><TacticalPitch formation={formation} slots={slots} players={startingPlayers} selectedSlot={null} onSelectSlot={() => undefined} preview tacticalDNA={tacticalDNA} /><AssistantAdvice compatibility={compatibility} recommendedFormation={recommendedFormation} recommendedStyle={recommendedStyle} tacticalDNA={tacticalDNA} advantages={guidance.advantages} disadvantages={guidance.disadvantages} excellingPlayers={excellingPlayers} strugglingPlayers={strugglingPlayers} /></div>}

    {section === 'Tactics Setup' && <div className="tactics-section-content"><div className="tactics-subhead"><span className="eyebrow">MANUAL CONTROLS</span><h2>Tactics setup</h2><p>Fine-tune your match approach without applying a preset.</p></div><section className="formation-library"><span className="eyebrow">FORMATION</span><div className="formation-options">{Object.keys(formations).map((item) => <button aria-pressed={formation === item} className={formation === item ? 'formation-option active' : 'formation-option'} key={item} onClick={() => changeFormation(item)} type="button">{item}</button>)}</div></section><ManualChoice title="Match Tempo" options={['Slow', 'Balanced', 'Fast', 'Extreme']} value={matchTempo} onChange={setMatchTempo} /><ManualChoice title="Aggression Level" options={['Cautious', 'Normal', 'Hard']} value={aggressionLevel} onChange={setAggressionLevel} /><ManualChoice title="Pitch Width" options={['Narrow', 'Balanced', 'Wide']} value={pitchWidth} onChange={setPitchWidth} /><ManualChoice title="Attack Focus" options={['Left Wing', 'Right Wing', 'Both Wings', 'Center']} value={attackFocus} onChange={setAttackFocus} /><ManualChoice title="Defensive Line" options={['Deep Block', 'Mid Block', 'High Line']} value={defensiveLine} onChange={setDefensiveLine} /><ManualChoice title="Pressing Intensity" options={['Low', 'Standard', 'High']} value={pressingIntensity} onChange={setPressingIntensity} /><ManualChoice title="Creative Freedom" options={['Disciplined', 'Expressive']} value={creativeFreedom} onChange={setCreativeFreedom} /></div>}
  </div>
}

function ManualChoice({ title, options, value, onChange }: { title: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <section className="mentality-panel manual-tactics-choice"><span className="eyebrow">{title.toUpperCase()}</span><div className="style-options">{options.map((item) => <button aria-pressed={value === item} className={value === item ? 'style-option active' : 'style-option'} key={item} onClick={() => onChange(item)} type="button">{item}</button>)}</div></section>
}

function AssistantAdvice({ compatibility, recommendedFormation, recommendedStyle, tacticalDNA, advantages, disadvantages, excellingPlayers, strugglingPlayers }: { compatibility: number; recommendedFormation: { name: string; rating: number }; recommendedStyle: string; tacticalDNA: string; advantages: string[]; disadvantages: string[]; excellingPlayers: { player: Player; reason: string }[]; strugglingPlayers: { player: Player; reason: string }[] }) {
  return <section className="assistant-advice-card"><div className="assistant-advice-header"><div><span className="eyebrow">ASSISTANT MANAGER</span><h2>Tactical advice</h2></div><span className="advice-compatibility">{compatibility}% FIT</span></div><p className="advice-recommendation"><strong>{recommendedFormation.name} suits your squad best</strong><span>{recommendedFormation.rating}% compatibility</span></p><div className="advice-style-label">CURRENT STYLE · {tacticalDNA.toUpperCase()}</div><div className="advice-pros-cons"><div><strong>Advantages</strong>{advantages.map((advantage) => <span key={advantage}>{advantage}</span>)}</div><div><strong>Disadvantages</strong>{disadvantages.map((disadvantage) => <span key={disadvantage}>{disadvantage}</span>)}</div></div><div className="advice-suitability"><section><strong>Players who will excel</strong>{excellingPlayers.map(({ player, reason }) => <span className="advice-player" key={player.id}><b>{player.name}</b><i>{reason}</i></span>)}</section><section><strong>Players who might struggle</strong>{strugglingPlayers.map(({ player, reason }) => <span className="advice-player" key={player.id}><b>{player.name}</b><i>{reason}</i></span>)}</section></div><div className="assistant-recommended-style"><span>RECOMMENDED PRESET</span><strong>★ {recommendedStyle}</strong></div></section>
}
