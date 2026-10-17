import type { MatchEvent } from '../../types/game'
import { createCommentaryGenerator } from './engine'

const generateCommentary = createCommentaryGenerator()
const context = { homeTeamName: 'Onitsha City', awayTeamName: 'Ijebu-Ode County' }

// A logged event from the match engine (31:20, midfield).
const event: MatchEvent = {
  id: 'fixture:event:42',
  matchId: 'fixture',
  sequence: 42,
  elapsedSeconds: 1880,
  type: 'Interception',
  team: 'home',
  playerId: 'p1',
  player: 'Lotanna Uche',
  x: 50,
  y: 34,
  outcome: 'intercepted',
}

console.log(generateCommentary(event, context))
console.log(generateCommentary(event, context)) // never the same line twice in a row
