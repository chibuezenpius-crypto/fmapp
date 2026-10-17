import { club, getWageLimit } from './data/mockData'
import { computeConfidence, getBoardObjectives } from './state/confidence'
import { useGame } from './state/gameStore'
import type { ClubConfidenceItem } from './types/game'

function ConfidenceSummary({ label, item }: { label: string; item: ClubConfidenceItem }) {
  return <section className="relations-summary">
    <div className="confidence-label-row"><span className="confidence-title">{label}</span><div className="confidence-badge-group"><span className={`confidence-badge ${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span><strong className="confidence-pct">{item.percentage}%</strong></div></div>
    <div className="confidence-track" role="progressbar" aria-valuenow={item.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${item.percentage}%`}><div className={`confidence-fill ${item.percentage >= 85 ? 'high' : 'medium'}`} style={{ width: `${item.percentage}%` }} /></div>
    <span className="confidence-note">{item.note}</span>
  </section>
}

export function BoardOverview() {
  const view = useGame()
  const confidence = computeConfidence(view)
  const objectives = getBoardObjectives(view)
  const finances = club.finances
  return <div className="relations-view">
    <div className="page-intro"><span className="eyebrow">CLUB BOARD</span><h1>Board overview</h1><p>What the board expects from you this season.</p></div>
    <ConfidenceSummary label="Board confidence" item={confidence.board} />
    <section className="profile-section-block"><div className="profile-subheading"><h3>Objectives</h3><span>{objectives.length}</span></div>
      <div className="relations-list">{objectives.map((objective) => <article className="relations-row" key={objective.title}>
        <div><strong>{objective.title}</strong><span>Target: {objective.target}</span><span>Now: {objective.current}</span></div>
        <span className={`objective-tag ${objective.status.toLowerCase().replace(' ', '-')}`}>{objective.status}</span>
      </article>)}</div>
    </section>
    <section className="profile-section-block"><div className="profile-subheading"><h3>Financial expectations</h3></div>
      <div className="relations-list">
        <article className="relations-row"><div><strong>Transfer budget</strong><span>Available to spend</span></div><b>£{(finances.transferBudget / 1000000).toFixed(1)}m</b></article>
        <article className="relations-row"><div><strong>Weekly wage bill</strong><span>Compliance limit £{Math.round(getWageLimit()).toLocaleString('en-GB')}/wk</span></div><b>£{Math.round(finances.weeklyWages).toLocaleString('en-GB')}</b></article>
        <article className="relations-row"><div><strong>Club balance</strong><span>Cash reserves</span></div><b>£{(finances.balance / 1000000).toFixed(1)}m</b></article>
      </div>
    </section>
  </div>
}

export function FanOverview() {
  const view = useGame()
  const confidence = computeConfidence(view)
  const own = view.ownStanding
  const recent = view.matches.filter((match) => match.status === 'Completed' && (match.homeClubId === club.id || match.awayClubId === club.id)).slice(-5).reverse()
  return <div className="relations-view">
    <div className="page-intro"><span className="eyebrow">SUPPORTERS</span><h1>Fan relations</h1><p>How the {club.name} faithful feel about the team.</p></div>
    <ConfidenceSummary label="Fan confidence" item={confidence.fan} />
    <section className="profile-section-block"><div className="profile-subheading"><h3>Matchday</h3></div>
      <div className="relations-list">
        <article className="relations-row"><div><strong>Stadium</strong><span>{club.stadium.name}</span></div><b>{club.stadium.capacity.toLocaleString('en-GB')}</b></article>
        <article className="relations-row"><div><strong>Average attendance</strong><span>{Math.round(club.stadium.attendance / club.stadium.capacity * 100)}% full</span></div><b>{club.stadium.attendance.toLocaleString('en-GB')}</b></article>
        <article className="relations-row"><div><strong>Recent form</strong><span>Last five league games</span></div><span className="form-dots">{(own?.form ?? []).length ? own?.form.map((result, index) => <b className={`form-${result.toLowerCase()}`} key={`${result}-${index}`}>{result}</b>) : <em>No games played</em>}</span></article>
      </div>
    </section>
    <section className="profile-section-block"><div className="profile-subheading"><h3>Recent results</h3><span>{recent.length}</span></div>
      {recent.length ? <div className="relations-list">{recent.map((match) => <article className="relations-row" key={match.id}><div><strong>{match.homeClubName} {match.score?.home}–{match.score?.away} {match.awayClubName}</strong><span>{match.date} · MD {match.matchday}</span></div></article>)}</div>
        : <p className="empty-note">No matches played yet. Fan reaction will build as the season unfolds.</p>}
    </section>
  </div>
}
