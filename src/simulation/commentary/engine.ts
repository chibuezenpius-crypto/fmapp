import type { MatchEvent } from '../../types/game'
import { commentaryTemplates } from './templates'
import type { CommentaryContext, CommentaryKey, CommentaryTemplates, TemplatePlaceholder } from './types'

export type RandomSource = () => number

export interface CommentaryGeneratorOptions {
  templates?: CommentaryTemplates
  // Pass a seeded source so the same match always produces the same commentary.
  random?: RandomSource
  /** Also narrate routine play (passes, possession) so every minute of a live match has something to say. */
  minor?: boolean
}

const PITCH_LENGTH = 105
const FIRST_HALF_SECONDS = 2700
const LONG_RANGE_METRES = 22
const PLACEHOLDER_PATTERN = /\{(playerName|teamName|opponentName|targetName|zone|minute|distance)\}/g

/**
 * Maps a simulation event onto a template pool; null means the event is not worth a line.
 * `minor` also narrates routine play (passes, spells of possession) for the minute-by-minute live feed.
 */
function commentaryKeyFor(event: MatchEvent, zone: string, minor: boolean): CommentaryKey | null {
  const dangerZone = zone === 'the final third' || zone === 'the penalty area'
  if (minor) {
    if (event.type === 'Possession') return 'possession'
    if (event.type === 'Pass') {
      if (event.outcome !== 'complete') return null
      return dangerZone ? 'attacking_pass' : zone === 'midfield' ? 'build_up' : null
    }
  }
  switch (event.type) {
    case 'Kick Off': return 'kick_off'
    case 'Goal': return Number(event.data?.distance ?? 0) >= LONG_RANGE_METRES ? 'goal_long_range' : 'goal'
    case 'Save': return 'save'
    case 'Miss': return 'shot_off_target'
    case 'Shot':
      if (event.outcome !== 'on-target') return null
      return Number(event.data?.distance ?? 0) >= LONG_RANGE_METRES ? 'shot_long_range' : 'shot_on_target'
    case 'Foul': return 'foul'
    case 'Yellow Card': return 'yellow_card'
    case 'Red Card': return event.outcome === 'second-yellow' ? 'second_yellow' : 'red_card'
    case 'Offside': return 'offside'
    case 'Injury': return event.outcome === 'serious' ? 'injury_serious' : event.outcome === 'muscle' ? 'injury_muscle' : 'injury_knock'
    case 'Substitution': return 'substitution'
    case 'Half Time': return 'half_time'
    case 'Full Time': return 'full_time'
    // Routine defensive actions deep in a team's own half would flood the feed.
    case 'Interception': return zone === 'midfield' || dangerZone ? 'interception' : null
    case 'Tackle': return zone === 'midfield' || dangerZone ? 'tackle' : null
    // Only successful runs near goal are worth narrating.
    case 'Carry': return event.outcome === 'advanced' && dangerZone ? 'dribble' : null
    default: return null
  }
}

/** Describes where an event happened from the point of view of the team in possession. */
export function zoneFor(event: MatchEvent): string {
  // Fouls and saves are logged against the defending team but happen in the attacker's build-up.
  const viewedFromAttacker = event.type === 'Save' || event.type === 'Foul'
  const firstHalf = event.elapsedSeconds < FIRST_HALF_SECONDS
  const team = viewedFromAttacker ? (event.team === 'home' ? 'away' : 'home') : event.team
  // Home attacks towards x = 0 in the first half; sides swap at half-time.
  const attacksTowardsZero = (team === 'home') === firstHalf
  const progress = attacksTowardsZero ? PITCH_LENGTH - event.x : event.x
  if (progress < 16.5) return 'their own box'
  if (progress < 35) return 'the defensive third'
  if (progress < 70) return 'midfield'
  if (progress < 88.5) return 'the final third'
  return 'the penalty area'
}

function placeholderValues(event: MatchEvent, context: CommentaryContext): Partial<Record<TemplatePlaceholder, string>> {
  const home = event.team === 'home'
  return {
    playerName: event.player,
    teamName: home ? context.homeTeamName : context.awayTeamName,
    opponentName: home ? context.awayTeamName : context.homeTeamName,
    targetName: event.target,
    zone: zoneFor(event),
    minute: String(Math.floor(event.elapsedSeconds / 60)),
    distance: event.data?.distance === undefined ? undefined : String(event.data.distance),
  }
}

function placeholdersIn(template: string): TemplatePlaceholder[] {
  return [...template.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1] as TemplatePlaceholder)
}

export function createCommentaryGenerator(options: CommentaryGeneratorOptions = {}) {
  const templates = options.templates ?? commentaryTemplates
  const random = options.random ?? Math.random
  // Last template used per pool, so the same line never appears twice in a row.
  const lastTemplateByKey = new Map<CommentaryKey, string>()

  /** Returns commentary text for a logged event, or null when the event should not be narrated. */
  return function generateCommentary(event: MatchEvent, context: CommentaryContext, keyOverride?: CommentaryKey): string | null {
    const values = placeholderValues(event, context)
    const key = keyOverride ?? commentaryKeyFor(event, values.zone ?? '', options.minor === true)
    if (!key) return null

    const pool = templates[key]
    const eligible = pool.filter((template) => placeholdersIn(template).every((name) => values[name] !== undefined))
    if (eligible.length === 0) throw new Error(`No usable commentary template for "${key}" on event ${event.id}.`)

    const lastTemplate = lastTemplateByKey.get(key)
    const fresh = eligible.length > 1 ? eligible.filter((template) => template !== lastTemplate) : eligible
    const chosen = fresh[Math.floor(random() * fresh.length)]
    lastTemplateByKey.set(key, chosen)
    return chosen.replace(PLACEHOLDER_PATTERN, (_match, name: TemplatePlaceholder) => values[name] ?? '')
  }
}
