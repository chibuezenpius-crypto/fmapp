import { useState } from 'react'
import { club, getClubBadge } from './data/mockData'
import { getClubSquad } from './data/clubSquads'
import ClubBadge from './ClubBadge'
import type { MatchInfo, MatchLineupPlayer, Player } from './types/game'

export type MatchSection = 'Overview' | 'Head to Head' | 'Lineups' | 'Commentary' | 'Match Stats'

const sections: MatchSection[] = ['Overview', 'Head to Head', 'Lineups', 'Commentary', 'Match Stats']
const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

interface MatchCenterProps {
  match: MatchInfo
  selectedClubName: string | null
  onSelectClub: (name: string) => void
  onOpenClub: () => void
  onSelectPlayer: (player: Player) => void
  onSelectPersonnel: (idOrName: string) => void
  onSimulateMatch: () => void
  simulationError: string
}

function ClubReference({ name, selectedClubName, onSelectClub, onOpenClub }: { name: string; selectedClubName: string | null; onSelectClub: (name: string) => void; onOpenClub: () => void }) {
  const isOwnClub = name === club.name
  return <button aria-pressed={!isOwnClub && selectedClubName === name} className={`entity-link ${!isOwnClub && selectedClubName === name ? 'selected' : ''}`} onClick={() => isOwnClub ? onOpenClub() : onSelectClub(name)} type="button">{name}</button>
}

function PlayerReference({ name, clubIds, onSelectPlayer }: { name: string; clubIds: string[]; onSelectPlayer: (player: Player) => void }) {
  const player = clubIds.flatMap(getClubSquad).find((candidate) => candidate.name === name)
  return player ? <button className="entity-link" onClick={() => onSelectPlayer(player)} type="button">{name}</button> : <strong>{name}</strong>
}

function FormStrip({ results }: { results: ('W' | 'D' | 'L')[] }) {
  return <span className="match-form-strip">{results.map((result, index) => <i className={`form-${result.toLowerCase()}`} key={`${result}-${index}`}>{result}</i>)}</span>
}

function MatchPitchPlayer({ player, team, clubId, onSelectPlayer }: { player: MatchLineupPlayer; team: 'home' | 'away'; clubId: string; onSelectPlayer: (player: Player) => void }) {
  const squadPlayer = player.playerId ? getClubSquad(clubId).find((candidate) => candidate.id === player.playerId) : undefined
  const slotY = team === 'home' ? player.y : 100 - player.y
  const halfY = 56 + (slotY - 28) / 63 * 31
  const top = team === 'home' ? halfY : 100 - halfY
  const content = <><span className="match-pitch-shirt">{String(player.shirtNumber).padStart(2, '0')}</span><strong>{player.name.split(' ')[0]}</strong><small>{player.position}</small></>
  return squadPlayer ? <button aria-label={`Open ${player.name} profile`} className={`match-pitch-player ${team}`} onClick={() => onSelectPlayer(squadPlayer)} style={{ left: `${player.x}%`, top: `${top}%` }} type="button">{content}</button>
    : <div className={`match-pitch-player ${team}`} style={{ left: `${player.x}%`, top: `${top}%` }}>{content}</div>
}

function StatBar({ label, home, away, suffix = '' }: { label: string; home: number; away: number; suffix?: string }) {
  const total = Math.max(home + away, 1)
  return <div className="match-stat-row">
    <div className="match-stat-values"><strong>{home}{suffix}</strong><span>{label}</span><strong>{away}{suffix}</strong></div>
    <div className="match-stat-track"><i className="home-stat" style={{ width: `${home / total * 100}%` }} /><i className="away-stat" style={{ width: `${away / total * 100}%` }} /></div>
  </div>
}

export default function MatchCenter({ match, selectedClubName, onSelectClub, onOpenClub, onSelectPlayer, onSelectPersonnel, onSimulateMatch, simulationError }: MatchCenterProps) {
  const [section, setSection] = useState<MatchSection>('Overview')
  const isPlayed = match.status === 'Completed'

  const changeSection = (nextSection: MatchSection) => {
    setSection(nextSection)
  }

  return <div className="match-center">
    <header className="match-center-banner">
      <div className="match-center-topline"><span>{match.competition.toUpperCase()} · MATCHDAY {match.matchday}</span><span className={`match-status ${match.status.toLowerCase()}`}>{match.status === 'Completed' ? 'FULL TIME' : 'UPCOMING'}</span></div>
      <div className="match-center-teams">
        <div className="match-center-team home"><span className="match-team-crest"><ClubBadge badge={getClubBadge(match.homeClubId)} name={match.homeClubName} /></span><ClubReference name={match.homeClubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} onOpenClub={onOpenClub} /></div>
        <div className="match-center-score">{match.score ? <><strong>{match.score.home}</strong><i>:</i><strong>{match.score.away}</strong></> : <><strong>{new Date(`${match.date}T12:00:00`).getDate()}</strong><i>VS</i><strong>{new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(`${match.date}T12:00:00`)).toUpperCase()}</strong></>}</div>
        <div className="match-center-team away"><span className="match-team-crest away"><ClubBadge badge={getClubBadge(match.awayClubId)} name={match.awayClubName} /></span><ClubReference name={match.awayClubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} onOpenClub={onOpenClub} /></div>
      </div>
      <div className="match-center-date"><span>{dateFormat.format(new Date(`${match.date}T12:00:00`))}</span><span>{match.kickOff} · {match.venue}</span></div>
    </header>

    <nav className="match-tabs" aria-label="Match information sections">
      {sections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'match-tab active' : 'match-tab'} disabled={item === 'Commentary' && !isPlayed} key={item} onClick={() => changeSection(item)} type="button">{item}</button>)}
    </nav>

    <div className="match-center-content" key={section}>
      {simulationError && <p className="match-storage-error" role="alert">{simulationError}</p>}
      {!isPlayed && section === 'Overview' && <section className="match-simulation-action">
        <div><strong>Ready for kick-off?</strong><span>Your starting XI, tactical style, pressing and tempo shape this seeded simulation.</span></div>
        <button onClick={onSimulateMatch} type="button">Simulate Match</button>
      </section>}
      {isPlayed && match.simulationSeed !== undefined && <p className="match-seed-note">SIMULATED RESULT · SEED {match.simulationSeed} · {match.eventLog?.length ?? match.commentary.length} EVENTS</p>}
      {section === 'Overview' && <>
        <section className="match-overview-venue"><div className="match-venue-icon">⌂</div><div><span className="eyebrow">VENUE</span><strong>{match.venue}</strong><span>{match.weather}</span></div><div className="venue-capacity"><span>CAPACITY</span><strong>{club.stadium.capacity.toLocaleString('en-GB')}</strong></div></section>
        <section className="match-overview-facts"><div><span>REFEREE</span><strong><button className="entity-link" onClick={() => onSelectPersonnel(match.referee)} type="button">{match.referee}</button></strong></div><div><span>KICK-OFF</span><strong>{match.kickOff}</strong></div><div><span>HOME COACH</span><strong><button className="entity-link" onClick={() => onSelectPersonnel(match.coaches.home)} type="button">{match.coaches.home}</button></strong></div><div><span>AWAY COACH</span><strong><button className="entity-link" onClick={() => onSelectPersonnel(match.coaches.away)} type="button">{match.coaches.away}</button></strong></div></section>
        <section className="match-watch-section"><div className="match-section-heading"><div><span className="eyebrow">ONES TO WATCH</span><h2>Key players</h2></div><span>{isPlayed ? 'FULL TIME' : 'PRE-MATCH'}</span></div><div className="match-watch-grid">
          <article className="match-watch-card home"><span className="watch-side">HOME</span><span className="watch-player-mark">{match.keyPlayers.home.split(' ').map((part) => part[0]).join('')}</span><div><span className="eyebrow">{match.homeClubName.toUpperCase()}</span><PlayerReference name={match.keyPlayers.home} clubIds={[match.homeClubId, match.awayClubId]} onSelectPlayer={onSelectPlayer} /></div></article>
          <article className="match-watch-card away"><span className="watch-side">AWAY</span><span className="watch-player-mark">{match.keyPlayers.away.split(' ').map((part) => part[0]).join('')}</span><div><span className="eyebrow">{match.awayClubName.toUpperCase()}</span><strong>{match.keyPlayers.away}</strong></div></article>
        </div></section>
        <section className="match-form-panel"><div className="match-section-heading"><div><span className="eyebrow">RECENT FORM</span><h2>Last five</h2></div></div><div className="match-form-team"><ClubReference name={match.homeClubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} onOpenClub={onOpenClub} /><FormStrip results={match.lastFiveForm.home} /></div><div className="match-form-team"><ClubReference name={match.awayClubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} onOpenClub={onOpenClub} /><FormStrip results={match.lastFiveForm.away} /></div></section>
      </>}

      {section === 'Head to Head' && <>
        <section className="h2h-record-card"><span className="eyebrow">ALL-TIME MEETINGS</span><div className="h2h-record-numbers"><div><strong>{match.headToHead.homeWins}</strong><span>WINS</span></div><div><strong>{match.headToHead.draws}</strong><span>DRAWS</span></div><div><strong>{match.headToHead.awayWins}</strong><span>WINS</span></div></div><div className="h2h-record-names"><ClubReference name={match.homeClubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} onOpenClub={onOpenClub} /><span>HEAD TO HEAD</span><ClubReference name={match.awayClubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} onOpenClub={onOpenClub} /></div></section>
        <section className="match-form-panel"><div className="match-section-heading"><div><span className="eyebrow">RECENT RESULTS</span><h2>Form guide</h2></div><span>LAST FIVE</span></div><div className="match-form-team"><ClubReference name={match.homeClubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} onOpenClub={onOpenClub} /><FormStrip results={match.lastFiveForm.home} /></div><div className="match-form-team"><ClubReference name={match.awayClubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} onOpenClub={onOpenClub} /><FormStrip results={match.lastFiveForm.away} /></div></section>
        <section className="recent-meetings"><div className="match-section-heading"><div><span className="eyebrow">HEAD-TO-HEAD</span><h2>Recent meetings</h2></div></div>{match.headToHead.recentMeetings.map((meeting) => <article className="meeting-row" key={`${meeting.date}-${meeting.homeClubName}`}><span>{shortDate(meeting.date)}</span><div><strong>{meeting.homeClubName}</strong><strong>{meeting.awayClubName}</strong></div><b>{meeting.homeScore} - {meeting.awayScore}</b></article>)}</section>
      </>}

      {section === 'Lineups' && <>
        <div className="lineup-heading"><div><span className="eyebrow">STARTING XI</span><h2>{match.lineups.home.formation} <small>vs</small> {match.lineups.away.formation}</h2></div><span>{match.status === 'Upcoming' ? 'EXPECTED' : 'CONFIRMED'}</span></div>
        <div className="match-lineup-pitch" aria-label={`${match.homeClubName} and ${match.awayClubName} lineups`}><div className="lineup-boundary" /><div className="lineup-halfway" /><div className="lineup-circle" /><div className="lineup-box top" /><div className="lineup-box bottom" /><div className="lineup-team-tag away">{match.awayClubName}</div><div className="lineup-team-tag home">{match.homeClubName}</div>
          {match.lineups.away.startingXI.map((player) => <MatchPitchPlayer key={player.id} player={player} team="away" clubId={match.awayClubId} onSelectPlayer={onSelectPlayer} />)}
          {match.lineups.home.startingXI.map((player) => <MatchPitchPlayer key={player.id} player={player} team="home" clubId={match.homeClubId} onSelectPlayer={onSelectPlayer} />)}
        </div>
        <div className="match-benches"><BenchList title={match.homeClubName} substitutes={match.lineups.home.substitutes} team="home" /><BenchList title={match.awayClubName} substitutes={match.lineups.away.substitutes} team="away" /></div>
      </>}

      {section === 'Commentary' && <>
        {isPlayed ? <section className="commentary-list"><div className="match-section-heading"><div><span className="eyebrow">{match.simulationSeed === undefined ? 'FULL-TIME REPORT' : 'EVENT-DRIVEN COMMENTARY'}</span><h2>Match events</h2></div><span>{match.commentary.length} EVENTS</span></div>{match.commentary.map((event, index) => <article className={`commentary-event ${event.team}`} key={event.eventId ?? `${event.minute}-${event.player}-${index}`}><span className="commentary-minute">{event.minute}'{event.second !== undefined && <small>{String(event.second).padStart(2, '0')}</small>}</span><span className={`commentary-type ${event.type.toLowerCase().replace(' ', '-')}`}>{event.type === 'Goal' ? '⚽' : event.type === 'Yellow Card' ? '▰' : event.type === 'Red Card' ? '▰' : event.type === 'Save' ? '✦' : event.type === 'Substitution' ? '↔' : event.type === 'Injury' ? '✚' : event.type === 'Kick Off' || event.type === 'Half Time' || event.type === 'Full Time' ? '◷' : '·'}</span><div><strong>{event.player}</strong><span>{event.detail}</span></div><i className="event-side">{event.team === 'home' ? 'HOME' : 'AWAY'}</i></article>)}</section> : <div className="match-unavailable"><span className="unavailable-icon">◷</span><strong>Commentary starts at kick-off</strong><span>This fixture has not been played yet.</span></div>}
      </>}

      {section === 'Match Stats' && <>
        {match.stats ? <section className="match-stats-panel"><div className="match-section-heading"><div><span className="eyebrow">FULL-TIME DATA</span><h2>Match statistics</h2></div><span>{match.score?.home} - {match.score?.away}</span></div><div className="stats-team-labels"><ClubReference name={match.homeClubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} onOpenClub={onOpenClub} /><span>STAT</span><ClubReference name={match.awayClubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} onOpenClub={onOpenClub} /></div><StatBar label="Possession" home={match.stats.possession.home} away={match.stats.possession.away} suffix="%" /><StatBar label="Total shots" home={match.stats.shots.home} away={match.stats.shots.away} /><StatBar label="Shots on target" home={match.stats.shotsOnTarget.home} away={match.stats.shotsOnTarget.away} /><StatBar label="Pass accuracy" home={match.stats.passAccuracy.home} away={match.stats.passAccuracy.away} suffix="%" /><StatBar label="Fouls committed" home={match.stats.fouls.home} away={match.stats.fouls.away} /></section> : <div className="match-unavailable"><span className="unavailable-icon">◷</span><strong>Stats available after the match</strong><span>Match data will appear here at full time.</span></div>}
      </>}
    </div>
  </div>
}

function BenchList({ title, substitutes, team }: { title: string; substitutes: MatchLineupPlayer[]; team: 'home' | 'away' }) {
  return <section className={`bench-list ${team}`}><div className="match-section-heading"><div><span className="eyebrow">SUBSTITUTES</span><h3>{title}</h3></div></div>{substitutes.map((player) => <div className="bench-player" key={player.id}><span>{String(player.shirtNumber).padStart(2, '0')}</span><strong>{player.name}</strong><small>{player.position}</small></div>)}</section>
}
