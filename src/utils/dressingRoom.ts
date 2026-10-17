import type { Player } from '../types/game'

export type HierarchyLevel = 'Team Leader' | 'Influential' | 'Core Player' | 'Fringe'
export type SocialGroup = 'Core Group' | 'Secondary Group'

export interface Connection {
  player: Player
  label: string
  reason: string
}

export interface CharacterTraits {
  loyalty: number
  professionalism: number
  workRate: number
  leadership: number
  determination: number
  morale: number
}

export interface Mentorship {
  role: 'Mentor' | 'Mentee' | 'None'
  partner?: Player
  text: string
}

export interface DressingRoomView {
  hierarchy: HierarchyLevel
  group: SocialGroup
  traits: CharacterTraits
  mentorship: Mentorship
  positive: Connection[]
  negative: Connection[]
}

const proficiencyRank = { Basic: 0, Conversational: 1, Fluent: 2, Native: 3 } as const

/** Stable pseudo-random value in [0, 1) so a player's character does not change between visits. */
function seeded(key: string): number {
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619)
  return ((hash >>> 0) % 10000) / 10000
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const spread = (key: string, amount: number) => (seeded(key) - 0.5) * 2 * amount

// Baselines per personality archetype. A mercenary starts low on loyalty, but the spread means it is never zero.
const baselines: Record<string, { loyalty: number; professionalism: number }> = {
  'Model Professional': { loyalty: 75, professionalism: 90 },
  'Resilient Leader': { loyalty: 80, professionalism: 85 },
  'Ambitious Youth': { loyalty: 55, professionalism: 65 },
  Mercenary: { loyalty: 25, professionalism: 55 },
  'Free Spirit': { loyalty: 50, professionalism: 45 },
  Perfectionist: { loyalty: 60, professionalism: 88 },
  'Born Winner': { loyalty: 60, professionalism: 78 },
  Journeyman: { loyalty: 70, professionalism: 72 },
  'Local Hero': { loyalty: 92, professionalism: 75 },
  'Fiery Competitor': { loyalty: 55, professionalism: 50 },
}

const traitAdjust: Record<string, Partial<CharacterTraits>> = {
  Loyal: { loyalty: 15 },
  'Loves the Club': { loyalty: 12 },
  'Money Motivated': { loyalty: -15 },
  Consistent: { professionalism: 8 },
  Inconsistent: { professionalism: -10 },
  'Team Player': { professionalism: 6, loyalty: 4 },
  'Hot-Headed': { professionalism: -12 },
  'Big Game Player': { professionalism: 4 },
}

const moraleBase: Record<Player['morale'], number> = { 'Very Good': 88, Good: 70, Okay: 50, Poor: 28 }

export function characterTraits(player: Player): CharacterTraits {
  const base = baselines[player.personalInfo.personality] ?? { loyalty: 60, professionalism: 60 }
  const adjust = traitAdjust[player.personalInfo.characterTrait] ?? {}
  return {
    loyalty: clamp(base.loyalty + (adjust.loyalty ?? 0) + spread(`${player.id}-loyalty`, 8)),
    professionalism: clamp(base.professionalism + (adjust.professionalism ?? 0) + spread(`${player.id}-pro`, 8)),
    workRate: clamp(player.attributes.workRate),
    leadership: clamp(player.attributes.leadership),
    determination: clamp(player.attributes.determination),
    morale: clamp(moraleBase[player.morale] + (player.form - 5) * 3),
  }
}

/** How much weight a player carries in the dressing room. It comes from character and standing, not from hobbies. */
function influence(player: Player, traits: CharacterTraits, squad: Player[]): number {
  const experience = Math.min(1, Math.max(0, player.age - 18) / 12) * 100
  const best = Math.max(...squad.map((candidate) => candidate.overall), 1)
  const status = (player.overall / best) * 100
  const drive = (traits.determination + traits.workRate) / 2
  return traits.leadership * 0.28 + traits.professionalism * 0.16 + traits.loyalty * 0.1 + drive * 0.14 + traits.morale * 0.06 + experience * 0.12 + status * 0.14
}

export function hierarchyOf(player: Player, squad: Player[]): HierarchyLevel {
  const members = squad.some((candidate) => candidate.id === player.id) ? squad : [...squad, player]
  const ranked = members.map((member) => ({ member, value: influence(member, characterTraits(member), members) })).sort((first, second) => second.value - first.value)
  const rank = ranked.findIndex((entry) => entry.member.id === player.id)
  const traits = characterTraits(player)
  const share = rank / members.length
  // Leaders must actually lead: top of the ranking with real leadership and respect in the room.
  if (share < 0.17 && traits.leadership >= 50 && traits.professionalism >= 50 && player.age >= 22) return 'Team Leader'
  if (share < 0.3 || (traits.leadership >= 72 && player.age >= 26)) return 'Influential'
  // Fringe players are low in the ranking and have no character to make up for it.
  if (share >= 0.7 && traits.leadership < 65 && traits.determination < 75) return 'Fringe'
  return 'Core Player'
}

const clashes: [string, string][] = [
  ['Mercenary', 'Local Hero'],
  ['Fiery Competitor', 'Perfectionist'],
  ['Free Spirit', 'Perfectionist'],
  ['Mercenary', 'Model Professional'],
  ['Fiery Competitor', 'Model Professional'],
  ['Ambitious Youth', 'Journeyman'],
]
const harmonies: [string, string][] = [
  ['Model Professional', 'Resilient Leader'],
  ['Model Professional', 'Perfectionist'],
  ['Local Hero', 'Journeyman'],
  ['Born Winner', 'Resilient Leader'],
  ['Free Spirit', 'Ambitious Youth'],
]
const paired = (list: [string, string][], first: string, second: string) => list.some(([a, b]) => (a === first && b === second) || (a === second && b === first))

type Kind = 'country' | 'language' | 'hobby' | 'personality' | 'mentor' | 'unit' | 'rivalry' | 'temper' | 'age'
interface Factor { kind: Kind; delta: number; text: string }

const lineOf = (position: Player['position']) => position === 'GK' ? 'GK' : position.startsWith('D') && position !== 'DM' ? 'DEF' : position === 'DM' || position.startsWith('M') ? 'MID' : 'ATT'
const lastName = (name: string) => name.split(' ').slice(1).join(' ') || name

interface Context {
  speakers: Map<string, number>
  dominant: string
}

const speaks = (player: Player) => player.personalInfo.languages.filter((language) => proficiencyRank[language.proficiency] >= 1).map((language) => language.name)

function buildContext(squad: Player[]): Context {
  const speakers = new Map<string, number>()
  for (const member of squad) for (const language of speaks(member)) speakers.set(language, (speakers.get(language) ?? 0) + 1)
  const dominant = [...speakers.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ?? 'English'
  return { speakers, dominant }
}

function mentorFit(mentor: Player, mentee: Player, mentorTraits: CharacterTraits): number {
  if (mentee.age > 23 || mentor.age < mentee.age + 5) return 0
  if (mentorTraits.professionalism < 68 || mentorTraits.leadership < 45) return 0
  return lineOf(mentor.position) === lineOf(mentee.position) ? 22 : 12
}

function factorsFor(player: Player, other: Player, context: Context, traits: Map<string, CharacterTraits>): Factor[] {
  const factors: Factor[] = []
  const mine = player.personalInfo
  const theirs = other.personalInfo
  const myTraits = traits.get(player.id) ?? characterTraits(player)
  const theirTraits = traits.get(other.id) ?? characterTraits(other)

  const countries = mine.nationalities.map((nation) => nation.country)
  const sharedCountry = theirs.nationalities.find((nation) => countries.includes(nation.country))
  if (sharedCountry) factors.push({ kind: 'country', delta: 14, text: `Fellow countryman from ${sharedCountry.country}` })

  // A shared language counts for more when few teammates speak it, and most of all for a player nobody else can talk to.
  const mySpeech = speaks(player)
  const common = mySpeech.filter((language) => speaks(other).includes(language))
  const rare = common.filter((language) => language !== context.dominant).sort((first, second) => (context.speakers.get(first) ?? 0) - (context.speakers.get(second) ?? 0))[0]
  const cannotUseDominant = !mySpeech.includes(context.dominant)
  if (rare) {
    const count = context.speakers.get(rare) ?? 0
    const isolated = cannotUseDominant && count <= 3
    factors.push({ kind: 'language', delta: isolated ? 26 : cannotUseDominant ? 18 : 8, text: isolated ? `One of only ${count} teammates who speak ${rare}` : `Both speak ${rare}` })
  } else if (cannotUseDominant && common.length === 0) {
    factors.push({ kind: 'language', delta: -8, text: 'No common language to talk in' })
  }

  const hobbies = mine.hobbies.filter((hobby) => theirs.hobbies.includes(hobby))
  if (hobbies.length > 0) factors.push({ kind: 'hobby', delta: Math.min(14, hobbies.length * 7), text: `Shares hobbies (${hobbies.slice(0, 2).join(', ')})` })

  if (paired(clashes, mine.personality, theirs.personality)) factors.push({ kind: 'personality', delta: -22, text: `Personalities clash (${mine.personality} vs ${theirs.personality})` })
  else if (paired(harmonies, mine.personality, theirs.personality) || mine.personality === theirs.personality) factors.push({ kind: 'personality', delta: 9, text: `Compatible personalities (${mine.personality} & ${theirs.personality})` })

  if (mine.characterTrait === 'Hot-Headed' && theirs.characterTrait === 'Hot-Headed') factors.push({ kind: 'temper', delta: -9, text: 'Both are short-tempered' })

  if (player.position === other.position) {
    const gap = Math.abs(player.overall - other.overall)
    if (gap <= 8) {
      const text = other.overall >= player.overall ? `Held back by ${lastName(other.name)} for the ${player.position} starting spot` : `Competes with ${lastName(other.name)} for the ${player.position} starting spot`
      const edgy = mine.characterTrait === 'Hot-Headed' || mine.personality === 'Ambitious Youth' ? 4 : 0
      factors.push({ kind: 'rivalry', delta: -(12 + Math.round((8 - gap) * 1.2) + edgy), text })
    }
  } else if (lineOf(player.position) === lineOf(other.position)) {
    factors.push({ kind: 'unit', delta: 4, text: 'Plays in the same unit' })
  }

  const guidedBy = mentorFit(other, player, theirTraits)
  const guides = mentorFit(player, other, myTraits)
  if (guidedBy > 0) factors.push({ kind: 'mentor', delta: guidedBy, text: `${lastName(other.name)} guides younger players` })
  else if (guides > 0) factors.push({ kind: 'mentor', delta: Math.round(guides * 0.8), text: `Takes ${lastName(other.name)} under his wing` })

  if (Math.abs(player.age - other.age) <= 2) factors.push({ kind: 'age', delta: 3, text: 'Similar age' })
  return factors
}

const positiveLabel: Record<Kind, string> = { country: 'Countryman', language: 'Language Bond', hobby: 'Shared Interests', personality: 'Kindred Spirit', mentor: 'Mentor', unit: 'Teammate', rivalry: 'Rival', temper: 'Short Fuse', age: 'Peer' }
const negativeLabel: Record<Kind, string> = { country: 'Distant', language: 'Language Barrier', hobby: 'Distant', personality: 'Personality Clash', mentor: 'Distant', unit: 'Distant', rivalry: 'Rival', temper: 'Short Fuse', age: 'Distant' }

function buildConnections(player: Player, squad: Player[], context: Context, traits: Map<string, CharacterTraits>) {
  const others = squad.filter((other) => other.id !== player.id).map((other) => {
    const factors = factorsFor(player, other, context, traits)
    const pairKey = [player.id, other.id].sort().join('-')
    return { other, factors, score: 50 + factors.reduce((sum, factor) => sum + factor.delta, 0) + spread(pairKey, 4) }
  })
  const describe = (entry: typeof others[number], positive: boolean): Connection => {
    const ordered = entry.factors.filter((factor) => positive ? factor.delta > 0 : factor.delta < 0).sort((first, second) => positive ? second.delta - first.delta : first.delta - second.delta)
    const top = ordered[0]
    const isMentor = positive && top?.kind === 'mentor'
    const closeFriend = positive && !isMentor && entry.score >= 78 && ordered.length >= 2
    const label = isMentor ? (entry.other.age >= player.age ? 'Mentor' : 'Mentee') : closeFriend ? 'Close Friend' : top ? (positive ? positiveLabel[top.kind] : negativeLabel[top.kind]) : positive ? 'Good Colleague' : 'Distant'
    return { player: entry.other, label, reason: ordered.slice(0, 2).map((factor) => factor.text).join(' · ') || (positive ? 'Gets on well in the dressing room' : 'Little in common') }
  }
  return {
    positive: others.filter((entry) => entry.score >= 62).sort((first, second) => second.score - first.score).slice(0, 4).map((entry) => describe(entry, true)),
    negative: others.filter((entry) => entry.score <= 40).sort((first, second) => first.score - second.score).slice(0, 4).map((entry) => describe(entry, false)),
  }
}

function buildMentorship(player: Player, squad: Player[], traits: Map<string, CharacterTraits>): Mentorship {
  const others = squad.filter((other) => other.id !== player.id)
  if (player.age <= 23) {
    const mentor = others.map((other) => ({ other, fit: mentorFit(other, player, traits.get(other.id) ?? characterTraits(other)) })).filter((entry) => entry.fit > 0).sort((first, second) => second.fit - first.fit || second.other.age - first.other.age)[0]
    if (!mentor) return { role: 'None', text: 'No suitable mentor in the squad yet.' }
    const sameUnit = lineOf(mentor.other.position) === lineOf(player.position)
    return { role: 'Mentee', partner: mentor.other, text: `Learns from ${mentor.other.name}, ${sameUnit ? 'who plays in his unit' : 'a senior professional'}. Development and morale benefit.` }
  }
  const mine = traits.get(player.id) ?? characterTraits(player)
  const mentee = others.map((other) => ({ other, fit: mentorFit(player, other, mine) })).filter((entry) => entry.fit > 0).sort((first, second) => second.fit - first.fit || second.other.potential - first.other.potential)[0]
  if (!mentee) return { role: 'None', text: player.age >= 28 ? 'No young player currently needs his guidance.' : 'Too young to take on a mentoring role.' }
  return { role: 'Mentor', partner: mentee.other, text: `Guides ${mentee.other.name} (${mentee.other.age}) with his professionalism and experience.` }
}

export function buildDressingRoom(player: Player, squad: Player[]): DressingRoomView {
  const members = squad.some((candidate) => candidate.id === player.id) ? squad : [...squad, player]
  const traits = new Map(members.map((member) => [member.id, characterTraits(member)]))
  const hierarchy = hierarchyOf(player, members)
  const context = buildContext(members)
  const mine = traits.get(player.id) ?? characterTraits(player)
  // Players who cannot talk to most of the squad drift to the edge of the group.
  const isolated = !speaks(player).includes(context.dominant) ? 8 : 0
  const sociability = player.attributes.teamwork * 0.25 + player.personalInfo.teamOpinion * 0.25 + mine.loyalty * 0.15 + mine.professionalism * 0.1 + mine.morale * 0.15 + mine.workRate * 0.1 - isolated
  const { positive, negative } = buildConnections(player, members, context, traits)
  const group: SocialGroup = sociability >= 62 && (hierarchy !== 'Fringe' || sociability >= 72) ? 'Core Group' : 'Secondary Group'
  return {
    hierarchy,
    group,
    traits: mine,
    mentorship: buildMentorship(player, members, traits),
    positive,
    negative,
  }
}
