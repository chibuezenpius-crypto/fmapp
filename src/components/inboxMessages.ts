import { club, getSquadHealth } from '../data/mockData'
import { computeConfidence } from '../state/confidence'
import { financialHealth } from '../state/dashboard'
import type { GameView } from '../state/gameStore'
import type { SponsorMail } from '../state/sponsorDeals'
import { markSponsorMailRead } from '../state/sponsors'
import type { NavActions } from './navTypes'

export type MessageSender = 'Board' | 'Player' | 'Staff' | 'Sponsor' | 'Fans'

export interface HeaderMessage { id: string; title: string; detail: string; go: () => void; sender?: MessageSender; from?: string }

export function buildAlerts(game: GameView, nav: NavActions): HeaderMessage[] {
  const health = getSquadHealth(game.date)
  const items: HeaderMessage[] = []
  if (health.activeInjuries > 0) items.push({ id: 'injuries', title: `${health.activeInjuries} injured`, detail: health.injuriesNote, go: () => nav.onOpenClubSection('Squad') })
  if (financialHealth().tone === 'bad') items.push({ id: 'wages', title: 'Wage bill over the limit', detail: 'Reduce wages or release players.', go: () => nav.onOpenClubSection('Finances') })
  const next = game.nextFixture
  if (next && next.date === game.date) items.push({ id: 'matchday', title: 'Matchday', detail: `${next.homeClubName} vs ${next.awayClubName}`, go: () => nav.onSelectMatch(next.id) })
  return items
}

/** Messages from the board, players, staff and sponsors, most recent / most important first. */
export function buildInbox(game: GameView, nav: NavActions, mail: SponsorMail[]): HeaderMessage[] {
  const confidence = computeConfidence(game)
  const health = getSquadHealth(game.date)
  const assistant = club.staff.find((member) => member.role === 'Assistant Manager')
  const physio = club.staff.find((member) => /physio|medical/i.test(member.role))
  const unhappy = club.squad.find((player) => player.morale === 'Poor')
  const inForm = [...club.squad].sort((first, second) => second.form - first.form)[0]
  const sponsorMail: HeaderMessage[] = mail.map((item) => ({ id: item.id, sender: 'Sponsor', from: 'Commercial Team', title: `${item.read ? '' : '● '}${item.subject}`, detail: item.body, go: () => { markSponsorMailRead(item.id); nav.onOpenClubSection('Sponsorship') } }))
  const staffMail: HeaderMessage[] = []
  if (physio && health.activeInjuries > 0) staffMail.push({ id: 'staff-medical', sender: 'Staff', from: physio.name, title: `${physio.role}: ${health.activeInjuries} injured`, detail: health.injuriesNote, go: () => nav.onOpenClubSection('Facilities') })
  if (assistant) staffMail.push({ id: 'staff-assistant', sender: 'Staff', from: assistant.name, title: 'Assistant Manager', detail: game.nextFixture ? `Squad fitness is ${health.averageFitness}%. Let's review the plan for ${game.nextFixture.homeClubId === club.id ? game.nextFixture.awayClubName : game.nextFixture.homeClubName}.` : `Squad fitness is ${health.averageFitness}%.`, go: () => nav.onNavigate('Tactics') })
  const playerMail: HeaderMessage[] = []
  if (unhappy) playerMail.push({ id: `player-${unhappy.id}`, sender: 'Player', from: unhappy.name, title: `${unhappy.name} · Unhappy`, detail: 'I want to know where I stand and when I will get more minutes.', go: () => nav.onSelectPlayer(unhappy) })
  if (inForm) playerMail.push({ id: `player-form-${inForm.id}`, sender: 'Player', from: inForm.name, title: `${inForm.name} · Feeling sharp`, detail: 'Training is going well and I feel ready for the next match.', go: () => nav.onSelectPlayer(inForm) })
  return [
    ...sponsorMail,
    { id: 'board', sender: 'Board', from: 'The Board', title: `Board · ${confidence.board.status}`, detail: confidence.board.note, go: () => nav.onOpenConfidence('board') },
    ...staffMail,
    ...playerMail,
    { id: 'fans', sender: 'Fans', from: 'Supporters', title: `Fans · ${confidence.fan.status}`, detail: confidence.fan.note, go: () => nav.onOpenConfidence('fan') },
  ]
}
