import type { MatchCommentaryEvent, MatchEvent, MatchEventType, MatchInfo } from '../../types/game'
import { createCommentaryGenerator } from './engine'

/** One real second is one match minute. */
export const LIVE_MS_PER_MINUTE = 1000
export const MAX_LINES_PER_MINUTE = 3

export interface LiveCommentaryEntry extends MatchCommentaryEvent {
  /** Match-clock minute (fractional) at which the line appears, so up to three lines spread across one second. */
  at: number
}

const PRIORITY: Record<MatchEventType, number> = {
  'Kick Off': 100, 'Half Time': 100, 'Full Time': 100,
  Goal: 90, 'Red Card': 80, Injury: 70, Save: 60, 'Yellow Card': 55, Substitution: 50, Miss: 45, Shot: 44,
  Offside: 35, Foul: 30, Tackle: 25, Interception: 25, Carry: 20, Pass: 10, Possession: 5,
}

/**
 * Turns a simulated match into a minute-by-minute feed: at least one line every match minute and, when
 * several important things happen in the same minute, at most three (the most important ones win).
 */
export function buildLiveFeed(match: MatchInfo): LiveCommentaryEntry[] {
  const log = match.eventLog
  if (!log || log.length === 0) return []
  const narrate = createCommentaryGenerator({ minor: true, random: seededRandom((match.simulationSeed ?? 1) ^ 0x51ed270b) })
  const context = { homeTeamName: match.homeClubName, awayTeamName: match.awayClubName }
  const ordered = [...log].sort((first, second) => first.sequence - second.sequence)
  const lastMinute = Math.floor(ordered[ordered.length - 1].elapsedSeconds / 60)

  const byMinute = new Map<number, MatchCommentaryEvent[]>()
  const ranks = new Map<MatchCommentaryEvent, number>()
  for (const event of ordered) {
    const detail = narrate(event, context)
    if (detail === null) continue
    const minute = Math.min(lastMinute, Math.floor(event.elapsedSeconds / 60))
    const line = toLine(event, minute, detail)
    ranks.set(line, PRIORITY[event.type])
    byMinute.set(minute, [...(byMinute.get(minute) ?? []), line])
  }

  const feed: LiveCommentaryEntry[] = []
  let anchor: MatchEvent = ordered[0]
  for (let minute = 0; minute <= lastMinute; minute += 1) {
    let lines = byMinute.get(minute) ?? []
    if (lines.length > MAX_LINES_PER_MINUTE) {
      const keep = new Set([...lines].sort((first, second) => (ranks.get(second) ?? 0) - (ranks.get(first) ?? 0)).slice(0, MAX_LINES_PER_MINUTE))
      lines = lines.filter((line) => keep.has(line))
    }
    if (lines.length === 0) {
      const filler = narrate(anchor, context, 'quiet_spell')
      if (filler !== null) lines = [toLine(anchor, minute, filler, 'Possession')]
    }
    lines.forEach((line, index) => feed.push({ ...line, at: minute + index / lines.length }))
    const lastPossession = [...ordered].reverse().find((event) => event.type === 'Possession' && event.elapsedSeconds < (minute + 1) * 60)
    if (lastPossession) anchor = lastPossession
  }
  return feed
}

function toLine(event: MatchEvent, minute: number, detail: string, type: MatchEventType = event.type): MatchCommentaryEvent {
  return {
    eventId: type === event.type ? event.id : `${event.id}-quiet-${minute}`,
    minute,
    second: Math.floor(event.elapsedSeconds % 60),
    team: event.team,
    type,
    player: event.player,
    detail,
    x: event.x,
    y: event.y,
  }
}

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
