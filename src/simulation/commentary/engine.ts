import type { MatchEvent } from '../../types/game'
import { commentaryTemplates } from './templates'
import type { CommentaryContext, CommentaryKey, CommentaryTemplates, TemplatePlaceholder } from './types'

export type RandomSource = () => number

export interface CommentaryGeneratorOptions {
  templates?: CommentaryTemplates
  // Pass a seeded source so the same match always produces the same commentary.
  random?: RandomSource
}

const PITCH_LENGTH = 105
const FIRST_HALF_SECONDS = 2700
const PLACEHOLDER_PATTERN = /\{(playerName|teamName|opponentName|targetName|zone|minute)\}/g

/** Maps a simulation event onto a template pool; null means the event is not worth a line. */
function commentaryKeyFor(event: MatchEvent, zone: string): CommentaryKey | null {
  switch (event.type) {
    case 'Goal': return 'goal'
    case 'Save': return 'save'
    case 'Miss': return 'shot_off_target'
    case 'Shot': return event.outcome === 'on-target' ? 'shot_on_target' : null
    case 'Foul': return 'foul'
    case 'Yellow Card': return 'yellow_card'
    case 'Red Card': return 'red_card'
    case 'Offside': return 'offside'
    case 'Injury': return 'injury'
    case 'Substitution': return 'substitution'
    case 'Half Time': return 'half_time'
    case 'Full Time': return 'full_time'
    // Routine defensive actions deep in a team's own half would flood the feed.
    case 'Interception': return zone === 'midfield' || zone === 'the final third' || zone === 'the penalty area' ? 'interception' : null
    case 'Tackle': return zone === 'midfield' || zone === 'the final third' || zone === 'the penalty area' ? 'tackle' : null
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
  return function generateCommentary(event: MatchEvent, context: CommentaryContext): string | null {
    const values = placeholderValues(event, context)
    const key = commentaryKeyFor(event, values.zone ?? '')
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
