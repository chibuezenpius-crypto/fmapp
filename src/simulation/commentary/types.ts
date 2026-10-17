export type CommentaryKey =
  | 'interception'
  | 'tackle'
  | 'foul'
  | 'shot_on_target'
  | 'shot_off_target'
  | 'save'
  | 'goal'
  | 'yellow_card'
  | 'red_card'
  | 'offside'
  | 'injury'
  | 'substitution'
  | 'half_time'
  | 'full_time'

export type TemplatePlaceholder = 'playerName' | 'teamName' | 'opponentName' | 'targetName' | 'zone' | 'minute'

/** Club names needed to turn a `MatchEvent` team side into readable text. */
export interface CommentaryContext {
  homeTeamName: string
  awayTeamName: string
}

export type CommentaryTemplates = Record<CommentaryKey, readonly string[]>
