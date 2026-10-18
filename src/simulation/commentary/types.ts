export type CommentaryKey =
  | 'kick_off'
  | 'interception'
  | 'tackle'
  | 'dribble'
  | 'foul'
  | 'shot_on_target'
  | 'shot_off_target'
  | 'save'
  | 'goal'
  | 'goal_long_range'
  | 'yellow_card'
  | 'second_yellow'
  | 'red_card'
  | 'offside'
  | 'injury_knock'
  | 'injury_muscle'
  | 'injury_serious'
  | 'substitution'
  | 'half_time'
  | 'full_time'
  | 'possession'
  | 'build_up'
  | 'attacking_pass'
  | 'quiet_spell'
  | 'shot_long_range'

export type TemplatePlaceholder = 'playerName' | 'teamName' | 'opponentName' | 'targetName' | 'zone' | 'minute' | 'distance'

/** Club names needed to turn a `MatchEvent` team side into readable text. */
export interface CommentaryContext {
  homeTeamName: string
  awayTeamName: string
}

export type CommentaryTemplates = Record<CommentaryKey, readonly string[]>
