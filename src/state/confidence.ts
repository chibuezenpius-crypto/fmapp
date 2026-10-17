import { club, getSquadHealth, getTeam, getWageLimit, ownLeagueRules, SQUAD_MAX, SQUAD_MIN } from '../data/mockData'
import type { ClubConfidenceData, ClubConfidenceItem } from '../types/game'
import type { GameView } from './gameStore'

const clamp = (value: number) => Math.round(Math.min(100, Math.max(5, value)))
const statusFor = (value: number): ClubConfidenceItem['status'] =>
  value < 25 ? 'Critical' : value < 45 ? 'Poor' : value < 60 ? 'Moderate' : value < 75 ? 'Good' : value < 88 ? 'Very Good' : 'Exceptional'
const item = (percentage: number, note: string): ClubConfidenceItem => ({ percentage, status: statusFor(percentage), note })

/** Pre-season expectation: the board expects the club to finish where its strength ranks it. */
export const expectedPosition = () => getTeam(club.id)?.standing.position ?? 9

export interface BoardObjective {
  title: string
  target: string
  current: string
  status: 'On track' | 'Behind' | 'Not started' | 'Met'
}

export function getBoardObjectives(view: GameView): BoardObjective[] {
  const own = view.ownStanding
  const played = own?.played ?? 0
  const target = expectedPosition()
  const wageBill = club.finances.weeklyWages
  const wageLimit = getWageLimit()
  const youngsters = club.squad.filter((player) => player.age <= 21).length
  const position = own?.position ?? 99
  return [
    { title: 'League finish', target: `Top ${target}`, current: played ? `${position}${ordinal(position)} after ${played} games` : 'Season not started', status: !played ? 'Not started' : position <= target ? 'On track' : 'Behind' },
    { title: 'Qualify for continental football', target: `Top ${ownLeagueRules.continentalSlots}`, current: played ? `Position ${position}` : 'Season not started', status: !played ? 'Not started' : position <= ownLeagueRules.continentalSlots ? 'On track' : 'Behind' },
    { title: 'Stay within the wage budget', target: `£${Math.round(wageLimit).toLocaleString('en-GB')}/wk`, current: `£${Math.round(wageBill).toLocaleString('en-GB')}/wk`, status: wageBill <= wageLimit ? 'Met' : 'Behind' },
    { title: 'Keep a balanced squad', target: `${SQUAD_MIN}–${SQUAD_MAX} players`, current: `${club.squad.length} players`, status: club.squad.length >= SQUAD_MIN && club.squad.length <= SQUAD_MAX ? 'Met' : 'Behind' },
    { title: 'Develop young talent', target: '4 players aged 21 or under', current: `${youngsters} in the squad`, status: youngsters >= 4 ? 'Met' : 'Behind' },
  ]
}

function ordinal(value: number) {
  const mod = value % 100
  if (mod >= 11 && mod <= 13) return 'th'
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th'
}

export function computeConfidence(view: GameView): ClubConfidenceData {
  const own = view.ownStanding
  const played = own?.played ?? 0
  const formScore = (own?.form ?? []).reduce((sum, result) => sum + (result === 'W' ? 1 : result === 'L' ? -1 : 0), 0)
  const pointsPerGame = played ? (own?.points ?? 0) / played : 0
  const overspend = club.finances.weeklyWages > getWageLimit()
  const placeDelta = played ? expectedPosition() - (own?.position ?? expectedPosition()) : 0

  const board = clamp(70 + placeDelta * 2.5 - (overspend ? 12 : 0))
  const fan = clamp(65 + formScore * 5 + (played ? (pointsPerGame - 1.4) * 8 : 0))
  const manager = clamp(62 + (played ? (pointsPerGame - 1.4) * 22 : 0) + formScore * 2)
  const morale = getSquadHealth(view.date).moralePercentage

  return {
    board: item(board, !played ? 'Expectations set for the new season' : placeDelta >= 0 ? 'Pleased with results versus expectations' : 'Results are below the board’s targets'),
    fan: item(fan, !played ? 'Supporters are hopeful ahead of the opener' : formScore > 0 ? 'Fans are enjoying the recent run' : formScore < 0 ? 'Supporters are frustrated by recent results' : 'Fans are waiting for a spark'),
    manager: item(manager, !played ? 'A fresh start in the dugout' : pointsPerGame >= 1.6 ? 'Your methods are paying off' : 'The pressure is building'),
    player: item(clamp(morale), morale >= 75 ? 'Dressing room is united behind you' : 'Some players want more from the club'),
  }
}
