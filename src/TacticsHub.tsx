import { useEffect, useState } from 'react'
import { Activity, ChevronRight, Gauge, Users } from 'lucide-react'
import type { Player } from './types/game'
import { club } from './data/mockData'
import { fitPlayersToSlots } from './utils/lineup'
import { formations, type TacticSlot } from './utils/formations'
import { PLACEHOLDER_PORTRAIT } from './portrait'
import { useGame } from './state/gameStore'
import { BENCH_SIZE, normalizeBench } from './state/matchSquad'
import { categoryValues, overallFamiliarity, positionFamiliarity } from './state/familiarityModel'
import { adoptSettings, settingsFromRaw, useTraining } from './state/training'
import { FamiliarityView, TrainingView } from './TacticsFamiliarity'

const sections = ['Overview', 'Formation', 'Style', 'Tactic', 'Player Roles', 'Set Pieces', 'Captains & Leadership'] as const
type TacticsSection = (typeof sections)[number]
type AssignmentKey = 'leftCorner' | 'rightCorner' | 'shortFreeKick' | 'longFreeKick' | 'penaltyOne' | 'penaltyTwo' | 'penaltyThree'
type LeadershipKey = 'captain' | 'viceOne' | 'viceTwo' | 'viceThree'

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

const initialLineup = fitPlayersToSlots(formations['4-3-3'], club.squad)
const influenceFor = (player: Player) => player.attributes.leadership >= 85 ? 'Very High' : player.attributes.leadership >= 70 ? 'High' : 'Influential'
const rankedBy = (score: (player: Player) => number) => [...club.squad].sort((first, second) => score(second) - score(first))
const [bestPasser, secondPasser] = rankedBy((player) => player.attributes.vision + player.attributes.technique + player.attributes.passing)
const [bestFinisher] = rankedBy((player) => player.attributes.finishing + player.attributes.determination)
const [bestLeader, secondLeader, thirdLeader, fourthLeader] = rankedBy((player) => player.attributes.leadership)
const defaultSetPieceTakers: Record<AssignmentKey, string> = {
  leftCorner: bestPasser.id, rightCorner: secondPasser.id, shortFreeKick: bestPasser.id, longFreeKick: secondPasser.id, penaltyOne: bestFinisher.id, penaltyTwo: bestPasser.id, penaltyThree: secondPasser.id,
}
const defaultLeadership: Record<LeadershipKey, string> = { captain: bestLeader.id, viceOne: secondLeader.id, viceTwo: thirdLeader.id, viceThree: fourthLeader.id }
const onlySquadIds = <Key extends string>(saved?: Partial<Record<Key, string>>) => Object.fromEntries(Object.entries(saved ?? {}).filter(([, id]) => club.squad.some((player) => player.id === id))) as Partial<Record<Key, string>>
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
  passingStyle?: string
  bench?: string[]
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

function familiarityTone(familiarity: number) {
  return familiarity < 50 ? 'poor' : familiarity < 75 ? 'warning' : 'good'
}

const formationMeta: Record<string, { attack: number; defence: number; possession: number; width: string; difficulty: string }> = {
  '4-3-3': { attack: 4, defence: 3, possession: 4, width: 'Wide', difficulty: 'Medium' },
  '4-2-3-1': { attack: 3, defence: 4, possession: 4, width: 'Balanced', difficulty: 'Medium' },
  '3-5-2': { attack: 4, defence: 3, possession: 4, width: 'Wide', difficulty: 'Hard' },
  '4-4-2': { attack: 3, defence: 3, possession: 3, width: 'Balanced', difficulty: 'Easy' },
}
const styleFormations: Record<string, string[]> = {
  Gegenpress: ['4-3-3', '4-2-3-1'], 'Tiki-Taka': ['4-3-3', '3-5-2'], 'Counter-Attack': ['4-2-3-1', '4-4-2'], 'Direct Passing': ['4-4-2', '3-5-2'], 'Park the Bus': ['4-4-2', '4-2-3-1'],
}
const stars = (count: number) => '★'.repeat(count) + '☆'.repeat(5 - count)
const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function MiniFormation({ slots }: { slots: TacticSlot[] }) {
  return <svg aria-hidden="true" className="mini-formation" viewBox="0 0 100 100"><rect x="1" y="1" width="98" height="98" rx="4" />{slots.map((slot, index) => <circle cx={slot.x} cy={slot.y} key={index} r="5" />)}</svg>
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

export default function TacticsHub({ initialView = 'hub' }: { initialView?: 'hub' | 'training' }) {
  const [savedTactics] = useState(readSavedTactics)
  const [section, setSection] = useState<TacticsSection>('Overview')
  const [formation, setFormation] = useState(() => savedTactics?.formation && formations[savedTactics.formation] ? savedTactics.formation : '4-3-3')
  const [lineup, setLineup] = useState<string[]>(() => (savedTactics?.lineup?.filter((id) => club.squad.some((player) => player.id === id)).length === 11 ? savedTactics.lineup : null) ?? initialLineup)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [swapMessage, setSwapMessage] = useState('Select a starter, then choose a bench player to swap.')
  const [tacticalDNA, setTacticalDNA] = useState(() => Object.keys(styleGuidance).includes(savedTactics?.tacticalDNA ?? '') ? savedTactics!.tacticalDNA! : 'Gegenpress')
  const [matchTempo, setMatchTempo] = useState(['Slow', 'Balanced', 'Fast'].includes(savedTactics?.matchTempo ?? '') ? savedTactics!.matchTempo! : 'Balanced')
  const [aggressionLevel, setAggressionLevel] = useState(savedTactics?.aggressionLevel ?? 'Normal')
  const [pitchWidth, setPitchWidth] = useState(savedTactics?.pitchWidth ?? 'Balanced')
  const [attackFocus, setAttackFocus] = useState(savedTactics?.attackFocus ?? 'Both Wings')
  const [defensiveLine, setDefensiveLine] = useState(savedTactics?.defensiveLine ?? 'Mid Block')
  const [pressingIntensity, setPressingIntensity] = useState(savedTactics?.pressingIntensity ?? 'Standard')
  const [creativeFreedom, setCreativeFreedom] = useState(savedTactics?.creativeFreedom ?? 'Disciplined')
  const [roles, setRoles] = useState<Record<number, string>>(() => ({ ...Object.fromEntries(formations[savedTactics?.formation && formations[savedTactics.formation] ? savedTactics.formation : '4-3-3'].map((slot, index) => [index, slot.role])), ...savedTactics?.roles }))
  const [setPieceTakers, setSetPieceTakers] = useState<Record<AssignmentKey, string>>({
    ...defaultSetPieceTakers,
    ...onlySquadIds(savedTactics?.setPieceTakers),
  })
  const [saveMessage, setSaveMessage] = useState('')
  const [previewStyle, setPreviewStyle] = useState(tacticalDNA)
  const [passingStyle, setPassingStyle] = useState(['Short', 'Mixed', 'Direct'].includes(savedTactics?.passingStyle ?? '') ? savedTactics!.passingStyle! : 'Mixed')
  const [benchPref, setBenchPref] = useState<string[] | undefined>(savedTactics?.bench)
  const [leadership, setLeadership] = useState<Record<LeadershipKey, string>>({ ...defaultLeadership, ...onlySquadIds(savedTactics?.leadership) })
  const slots = formations[formation]
  const startingPlayers = lineup.map((id) => club.squad.find((player) => player.id === id) ?? null)
  const benchIds = normalizeBench(benchPref, lineup, club.squad)
  const guidance = styleGuidance[previewStyle] ?? styleGuidance.Gegenpress
  const compatibility = lineup.length ? Math.round(startingPlayers.reduce((total, player) => total + (player ? guidance.score(player) : 0), 0) / lineup.length) : 0
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

  const training = useTraining()
  const { nextFixture } = useGame()
  const settings = settingsFromRaw({ formation, roles, tacticalDNA, matchTempo, defensiveLine, pressingIntensity, setPieceTakers })!
  const familiarity = overallFamiliarity(categoryValues(training, settings))
  const filledStarters = startingPlayers.filter((player): player is Player => player !== null)
  const slotFits = startingPlayers.map((player, index) => player ? positionFamiliarity(player.position, slots[index].position) : 0)
  const average = (values: number[]) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0
  const chemistry = Math.round(average(filledStarters.map((player) => player.attributes.teamwork)) * 0.5 + average(slotFits.filter(Boolean)) * 0.3 + familiarity * 0.2)
  const condition = Math.round(average(filledStarters.map((player) => player.fitness)))
  const benchPlayers = benchIds.map((id) => club.squad.find((player) => player.id === id)).filter((player): player is Player => player !== undefined)
  const assistant = club.staff.find((member) => member.role === 'Assistant Manager')
  const [view, setView] = useState<'hub' | 'familiarity' | 'training'>(initialView)
  const savedJson = JSON.stringify({ formation, lineup, bench: benchIds, roles, tacticalDNA, matchTempo, passingStyle, aggressionLevel, pitchWidth, attackFocus, defensiveLine, pressingIntensity, creativeFreedom, setPieceTakers, leadership })

  useEffect(() => { adoptSettings(settings) }, [settings])

  useEffect(() => {
    try {
      window.localStorage.setItem('fmapp-tactics', savedJson)
    } catch {
      return
    }
  }, [savedJson])

  const saveTactic = () => {
    try {
      window.localStorage.setItem('fmapp-tactics', savedJson)
      setSaveMessage('Tactic saved. It will be used for your next match.')
    } catch {
      setSaveMessage('Could not save the tactic on this device.')
    }
  }

  const autoPick = () => {
    setLineup(fitPlayersToSlots(slots, club.squad))
    setSelectedSlot(null)
    setSwapMessage('Best available XI selected by rating and fitness.')
  }

  const clearPitch = () => {
    setLineup([])
    setSelectedSlot(null)
    setSwapMessage('Pitch cleared. Use Auto Pick to select the best XI.')
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
    setBenchPref(outgoingPlayer ? benchIds.map((id) => id === reserve.id ? outgoingPlayer.id : id) : benchIds.filter((id) => id !== reserve.id))
    setSelectedSlot(null)
    setSwapMessage(`${reserve.name} replaces ${outgoingPlayer?.name ?? 'the selected player'}; ${outgoingPlayer?.name ?? 'he'} takes a place on the bench.`)
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

  const starters = startingPlayers.map((player, index) => ({ player, slotPosition: slots[index].position, slotLabel: slots[index].label }))
  if (view === 'familiarity') return <FamiliarityView settings={settings} starters={starters} onBack={() => setView('hub')} onOpen={setView} />
  if (view === 'training') return <TrainingView settings={settings} onBack={() => setView('familiarity')} />

  return <div className="tactics-hub">
    <div className="page-intro"><span className="eyebrow">FIRST TEAM · MATCH PREPARATION</span><h1>Tactics hub</h1><p>{formation} · {lineup.length} of {slots.length} starters selected</p></div>
    <nav className="tactics-tabs" aria-label="Tactics sections">{sections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'tactics-tab active' : 'tactics-tab'} key={item} onClick={() => setSection(item)} type="button">{item}</button>)}</nav>

    {section === 'Overview' && <div className="tactics-section-content">
      <div className="tactics-toolbar"><div><span className="eyebrow">MATCH SQUAD</span><strong>{formation}</strong></div><div className="tactics-actions"><button aria-label={`Tactical familiarity ${familiarity}%`} className="tactics-action fam-pill" onClick={() => setView('familiarity')} type="button">Familiarity {familiarity}% <ChevronRight size={11} /></button><button className="tactics-action primary" onClick={autoPick} type="button">Auto Pick</button><button className="tactics-action" onClick={clearPitch} type="button">Clear Pitch</button></div></div>
      <TacticalPitch formation={formation} slots={slots} players={startingPlayers} selectedSlot={selectedSlot} onSelectSlot={selectStartingSlot} />
      <div className="squad-stat-cards">
        <article><Gauge size={13} /><span>Next match</span><strong>{nextFixture ? (nextFixture.homeClubId === club.id ? nextFixture.awayClubName : nextFixture.homeClubName) : 'None scheduled'}</strong><small>{nextFixture ? `${shortDate(nextFixture.date)} · ${nextFixture.kickOff}` : ''}</small></article>
        <article><Users size={13} /><span>Chemistry</span><strong>{chemistry}%</strong><small>Teamwork, fit, familiarity</small></article>
        <article><Activity size={13} /><span>Condition</span><strong>{condition}%</strong><small>Average starter fitness</small></article>
      </div>
      <div className="bench-panel"><div className="bench-heading"><div><span className="eyebrow">MATCHDAY SQUAD</span><h2>Substitutes</h2></div><span>{benchPlayers.length} / {BENCH_SIZE}</span></div><p className="swap-guidance">{swapMessage} Reserves are managed in Club → Squad.</p>
        <table className="fin-table bench-table"><thead><tr><th>Pos</th><th>Player</th><th>Con</th><th>Form</th><th>Morale</th><th>OVR</th></tr></thead><tbody>{benchPlayers.map((player) => <tr aria-label={`Swap in ${player.name}`} key={player.id} onClick={() => swapReserve(player)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') swapReserve(player) }}><td>{player.position.split(' ')[0]}</td><td><img alt="" src={PLACEHOLDER_PORTRAIT} />{player.name}</td><td>{player.fitness}%</td><td>{player.form.toFixed(1)}</td><td>{player.morale}</td><td><b>{player.overall}</b></td></tr>)}</tbody></table>
      </div>
    </div>}

    {section === 'Player Roles' && <div className="tactics-section-content"><div className="tactics-subhead"><span className="eyebrow">TACTICAL RESPONSIBILITIES</span><h2>Player roles</h2><p>Assign a role to each slot in your {formation}.</p></div><div className="role-assignment-list">{slots.map((slot, index) => {
      const player = startingPlayers[index]
      const options = roleOptions[roleGroup(slot.position)]
      const value = roles[index] ?? slot.role
      const roleList = options.includes(value) ? options : [value, ...options]
      return <label className="role-assignment-row" key={`${formation}-role-${index}`}><span className="role-position">{slot.label}</span><span className="role-player-name">{player?.name ?? 'Position unfilled'}</span><select aria-label={`${slot.label} role`} onChange={(event) => setRole(index, event.target.value)} value={value}>{roleList.map((role) => <option key={role}>{role}</option>)}</select></label>
    })}</div></div>}

    {section === 'Set Pieces' && <div className="tactics-section-content"><div className="tactics-subhead"><span className="eyebrow">DEAD BALL RESPONSIBILITIES</span><h2>Set pieces</h2><p>Choose the first-choice taker for each situation.</p></div><section className="tactics-assignments-panel">{assignmentLabels.map(({ key, label }) => <PlayerSelect key={key} label={label} players={club.squad} value={setPieceTakers[key]} onChange={(value) => setTaker(key, value)} />)}</section></div>}

    {section === 'Captains & Leadership' && <div className="tactics-section-content"><div className="tactics-subhead"><span className="eyebrow">DRESSING ROOM</span><h2>Leadership group</h2><p>Set the matchday captain and three deputies.</p></div><section className="tactics-assignments-panel">{leadershipLabels.map(({ key, label }) => <PlayerSelect key={key} label={label} players={club.squad} value={leadership[key]} onChange={(value) => setLeader(key, value)} />)}</section><section className="leadership-influence-panel"><div className="bench-heading"><div><span className="eyebrow">SQUAD LEADERS</span><h2>Leadership influence</h2></div></div>{club.squad.filter((player) => player.attributes.leadership >= 70).sort((first, second) => second.attributes.leadership - first.attributes.leadership).map((player) => <article className="leadership-player-row" key={player.id}><div><strong>{player.name}</strong><small>Leadership {player.attributes.leadership} · {player.shirtNumber === 4 ? 'Organizes the back line' : player.shirtNumber === 8 ? 'Sets training standards' : 'Supports squad morale'}</small></div><span className={`influence-badge ${influenceFor(player).toLowerCase().replace(' ', '-')}`}>{influenceFor(player)}</span></article>)}</section></div>}

    {section === 'Formation' && <div className="tactics-section-content">
      <section className="assistant-reco"><img alt="" src={PLACEHOLDER_PORTRAIT} /><div><span className="eyebrow">ASSISTANT MANAGER · {assistant?.name ?? 'Assistant'}</span><strong>Recommends {recommendedFormation.name}</strong><p>It fits your squad best ({recommendedFormation.rating}% position fit){recommendedFormation.name === formation ? ' and is already your active formation.' : `, compared with ${formationRatings.find((rating) => rating.name === formation)?.rating ?? 0}% for ${formation}.`} {tacticalDNA} usually works in {styleFormations[tacticalDNA].join(' or ')}.</p></div></section>
      <div className="formation-list">{Object.keys(formations).map((item) => {
        const meta = formationMeta[item]
        const fit = formationRatings.find((rating) => rating.name === item)?.rating ?? 0
        const known = Math.round(training.known[`formation:${item}`] ?? 40)
        return <article className={formation === item ? 'formation-row active' : 'formation-row'} key={item}><MiniFormation slots={formations[item]} /><div><strong>{item}{item === recommendedFormation.name && <em>★ Recommended</em>}</strong><small>Attack {stars(meta.attack)} · Defence {stars(meta.defence)}</small><small>Possession {stars(meta.possession)} · {meta.width} · {meta.difficulty}</small><small>Squad fit <b>{fit}%</b> · Familiarity <b>{known}%</b></small></div><button aria-pressed={formation === item} className={formation === item ? 'tactics-action' : 'tactics-action primary'} disabled={formation === item} onClick={() => changeFormation(item)} type="button">{formation === item ? 'Active' : 'Use'}</button></article>
      })}</div>
      <TacticalPitch formation={formation} slots={slots} players={startingPlayers} selectedSlot={null} onSelectSlot={() => undefined} preview tacticalDNA={tacticalDNA} />
    </div>}

    {section === 'Style' && <div className="tactics-section-content">
      <section className="assistant-reco"><img alt="" src={PLACEHOLDER_PORTRAIT} /><div><span className="eyebrow">ASSISTANT MANAGER · {assistant?.name ?? 'Assistant'}</span><strong>Recommends {recommendedStyle}</strong><p>Your players' attributes suit it best. Tap a style to hear the pros and cons.</p></div></section>
      <div className="preset-style-grid">{Object.keys(styleGuidance).map((style) => <button aria-pressed={previewStyle === style} className={previewStyle === style ? 'preset-style-option active' : 'preset-style-option'} key={style} onClick={() => setPreviewStyle(style)} type="button"><span>{style}</span>{style === recommendedStyle && <b aria-label="Assistant Manager recommended" title="Assistant Manager recommended">★</b>}{style === tacticalDNA && <i>ACTIVE</i>}</button>)}</div>
      <TacticalPitch formation={formation} slots={slots} players={startingPlayers} selectedSlot={null} onSelectSlot={() => undefined} preview tacticalDNA={previewStyle} />
      <AssistantAdvice style={previewStyle} compatibility={compatibility} advantages={guidance.advantages} disadvantages={guidance.disadvantages} excellingPlayers={excellingPlayers} strugglingPlayers={strugglingPlayers} bestFormations={styleFormations[previewStyle]} />
      <button className="save-tactic-button" disabled={previewStyle === tacticalDNA} onClick={() => { setTacticalDNA(previewStyle); setSaveMessage(`${previewStyle} is now your active style.`) }} type="button">{previewStyle === tacticalDNA ? `${previewStyle} is your active style` : `Use ${previewStyle}`}</button>{saveMessage && <p className="save-tactic-message" role="status">{saveMessage}</p>}
    </div>}
    {section === 'Tactic' && <div className="tactics-section-content"><div className="tactics-subhead"><span className="eyebrow">MANUAL SETUP</span><h2>Build your own tactic</h2><p>Choose each instruction yourself instead of using a ready-made style, then save.</p></div><ManualChoice title="Match Tempo" options={['Slow', 'Balanced', 'Fast']} value={matchTempo} onChange={setMatchTempo} /><ManualChoice title="Passing Style" options={['Short', 'Mixed', 'Direct']} value={passingStyle} onChange={setPassingStyle} /><ManualChoice title="Aggression Level" options={['Cautious', 'Normal', 'Hard']} value={aggressionLevel} onChange={setAggressionLevel} /><ManualChoice title="Pitch Width" options={['Narrow', 'Balanced', 'Wide']} value={pitchWidth} onChange={setPitchWidth} /><ManualChoice title="Attack Focus" options={['Left Wing', 'Right Wing', 'Both Wings', 'Center']} value={attackFocus} onChange={setAttackFocus} /><ManualChoice title="Defensive Line" options={['Deep Block', 'Mid Block', 'High Line']} value={defensiveLine} onChange={setDefensiveLine} /><ManualChoice title="Pressing Intensity" options={['Low', 'Standard', 'High']} value={pressingIntensity} onChange={setPressingIntensity} /><ManualChoice title="Creative Freedom" options={['Disciplined', 'Expressive']} value={creativeFreedom} onChange={setCreativeFreedom} /><button className="save-tactic-button" onClick={saveTactic} type="button">Save tactic</button>{saveMessage && <p className="save-tactic-message" role="status">{saveMessage}</p>}</div>}
  </div>
}

function ManualChoice({ title, options, value, onChange }: { title: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <section className="mentality-panel manual-tactics-choice"><span className="eyebrow">{title.toUpperCase()}</span><div className="style-options">{options.map((item) => <button aria-pressed={value === item} className={value === item ? 'style-option active' : 'style-option'} key={item} onClick={() => onChange(item)} type="button">{item}</button>)}</div></section>
}

function AssistantAdvice({ style, compatibility, bestFormations, advantages, disadvantages, excellingPlayers, strugglingPlayers }: { style: string; compatibility: number; bestFormations: string[]; advantages: string[]; disadvantages: string[]; excellingPlayers: { player: Player; reason: string }[]; strugglingPlayers: { player: Player; reason: string }[] }) {
  return <section className="assistant-advice-card"><div className="assistant-advice-header"><div><span className="eyebrow">ASSISTANT MANAGER EXPLAINS</span><h2>{style}</h2></div><span className="advice-compatibility">{compatibility}% FIT</span></div><p className="advice-recommendation"><strong>Works best in {bestFormations.join(' or ')}</strong></p><div className="advice-pros-cons"><div><strong>Advantages</strong>{advantages.map((advantage) => <span key={advantage}>{advantage}</span>)}</div><div><strong>Disadvantages</strong>{disadvantages.map((disadvantage) => <span key={disadvantage}>{disadvantage}</span>)}</div></div><div className="advice-suitability"><section><strong>Players who will excel</strong>{excellingPlayers.map(({ player, reason }) => <span className="advice-player" key={player.id}><b>{player.name}</b><i>{reason}</i></span>)}</section><section><strong>Players who might struggle</strong>{strugglingPlayers.map(({ player, reason }) => <span className="advice-player" key={player.id}><b>{player.name}</b><i>{reason}</i></span>)}</section></div></section>
}
