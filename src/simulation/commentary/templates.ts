import type { CommentaryTemplates } from './types'

// Placeholders: {playerName} {teamName} {opponentName} {targetName} {zone} {minute}.
// A template is only eligible when every placeholder it uses can be filled from the event.
export const commentaryTemplates: CommentaryTemplates = {
  interception: [
    '{playerName} reads the pass perfectly and steps in to intercept in {zone}.',
    'Good awareness from {playerName}, cutting out the ball in {zone}.',
    '{teamName} snuff out the danger as {playerName} picks off the pass.',
    '{playerName} anticipates the ball and gets a foot in to win possession for {teamName}.',
    'The pass is too predictable and {playerName} makes the interception.',
    '{playerName} sniffs out the attack in {zone} and {teamName} can regroup.',
    'Sharp piece of defending from {playerName}, who intercepts the loose pass.',
    '{targetName} is dispossessed as {playerName} intercepts in {zone}.',
  ],
  tackle: [
    '{playerName} slides in with a crisp tackle in {zone} and wins the ball cleanly.',
    'Well-timed challenge from {playerName}, who dispossesses {targetName}.',
    '{playerName} stands firm and wins the ball back for {teamName}.',
    'Strong tackle by {playerName}, taking the ball off {targetName}\'s toes.',
    '{playerName} gets stuck in, and {teamName} have the ball back.',
    'Terrific recovery from {playerName}, who snaps into the tackle in {zone}.',
    '{targetName} tries to take on {playerName} in {zone} but comes off second best.',
  ],
  foul: [
    '{playerName} brings down {targetName} in {zone} and the referee blows for a free kick.',
    'Free kick given against {teamName} after a clumsy challenge from {playerName}.',
    '{playerName} mistimes it and the whistle goes.',
    'The referee penalises {playerName} for a late tackle on {targetName}.',
    '{playerName} catches {targetName} and {teamName} concede a foul.',
    'A cynical challenge from {playerName} stops the attack in {zone}.',
  ],
  shot_on_target: [
    '{playerName} tests the goalkeeper with an effort from {zone}.',
    'On target! {playerName} lets fly and the keeper has work to do.',
    '{playerName} gets a shot away from {zone} and it\'s heading for goal.',
    '{teamName} threaten as {playerName} fires a shot towards the corner.',
    'A clean strike from {playerName} that forces {opponentName} into action.',
    '{playerName} picks his spot and shoots on target.',
  ],
  shot_off_target: [
    '{playerName} lets fly from {zone}, but the effort sails wide of the post.',
    'Chance for {teamName}! {playerName} drags his shot off target.',
    '{playerName} tries his luck, though it\'s comfortably over the bar.',
    'The finish from {playerName} lacks accuracy and the ball drifts wide.',
    '{playerName} snatches at it and the shot is nowhere near the target.',
    'Wasteful from {playerName}, who blazes the opportunity off target.',
    '{teamName} come close as {playerName} shoots narrowly wide from {zone}.',
  ],
  save: [
    'Great stop! {playerName} gets down to keep {targetName}\'s shot out.',
    '{playerName} makes himself big and denies {targetName}.',
    'Excellent reflexes from {playerName} to push the effort away.',
    '{playerName} is equal to it, tipping the shot behind.',
    'Superb save by {playerName}, who keeps {teamName} in the game.',
    '{playerName} stands tall and smothers the attempt from {zone}.',
  ],
  goal: [
    'GOAL! {playerName} finds the net for {teamName} in minute {minute}!',
    '{playerName} makes no mistake and {teamName} score!',
    'The ball is in the back of the net! {playerName} with a clinical finish.',
    'What a strike from {playerName}! {teamName} have the breakthrough.',
    '{playerName} slots it home from {zone} and the crowd erupts!',
    'Brilliant finish by {playerName}, and {teamName} are celebrating.',
    'Unstoppable! {playerName} scores at the {minute}\' mark.',
    'GOAL! {targetName} sets it up and {playerName} converts for {teamName}.',
  ],
  yellow_card: [
    '{playerName} goes into the referee\'s book for {teamName}.',
    'Yellow card shown to {playerName} after that challenge.',
    'The referee reaches for his pocket and cautions {playerName}.',
    '{playerName} has to be careful now after picking up a booking.',
  ],
  red_card: [
    'RED CARD! {playerName} is sent off and {teamName} are down to ten.',
    '{playerName} sees red, and {teamName} face a real struggle now.',
    'The referee shows a straight red to {playerName}.',
  ],
  injury: [
    '{playerName} is down and the physio comes on to take a look.',
    'Concern for {teamName} as {playerName} goes down injured.',
    '{playerName} signals to the bench that something is wrong.',
  ],
  substitution: [
    '{teamName} make a change: {playerName} replaces {targetName}.',
    'Substitution for {teamName}. {playerName} comes on for {targetName}.',
    '{targetName} makes way and {playerName} enters the fray.',
  ],
  half_time: [
    'The referee blows for half-time.',
    'That\'s the end of the first half.',
    'Half-time. The players head down the tunnel.',
  ],
  full_time: [
    'The final whistle goes and the match is over.',
    'Full-time! The referee brings the match to a close.',
    'It\'s all over, and the players shake hands.',
  ],
}
