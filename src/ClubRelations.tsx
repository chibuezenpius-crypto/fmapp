import { useMemo, useState } from 'react'
import { ArrowLeft, Users } from 'lucide-react'
import { BOARD_REQUEST_PERCENTS, boardCooldownDaysLeft, boardRequestAmount, getBoardRequests, requestBoardFunds, type BoardFundingReason } from './state/transfers'
import { club, getWageLimit, league } from './data/mockData'
import { computeConfidence, getBoardObjectives } from './state/confidence'
import { financialHealth, managerProgress } from './state/dashboard'
import { useGame } from './state/gameStore'
import { writeCareer } from './state/saveData'
import { createRng, generatePlayerIdentity } from './utils/proceduralGenerator'
import { PLACEHOLDER_PORTRAIT } from './portrait'
import type { ClubConfidenceItem } from './types/game'

function ConfidenceSummary({ label, item }: { label: string; item: ClubConfidenceItem }) {
  return <section className="relations-summary">
    <div className="confidence-label-row"><span className="confidence-title">{label}</span><div className="confidence-badge-group"><span className={`confidence-badge ${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span><strong className="confidence-pct">{item.percentage}%</strong></div></div>
    <div className="confidence-track" role="progressbar" aria-valuenow={item.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${item.percentage}%`}><div className={`confidence-fill ${item.percentage >= 85 ? 'high' : 'medium'}`} style={{ width: `${item.percentage}%` }} /></div>
    <span className="confidence-note">{item.note}</span>
  </section>
}

const CHAIRMAN_PERSONALITIES = ['Ambitious', 'Patient', 'Pragmatic', 'Traditional']

function ConfidenceRing({ percentage, status }: { percentage: number; status: string }) {
  const radius = 34, circumference = 2 * Math.PI * radius
  return <div className="board-ring" role="img" aria-label={`Board confidence ${percentage}%, ${status}`}>
    <svg viewBox="0 0 84 84"><circle cx="42" cy="42" fill="none" r={radius} stroke="#dbe2f2" strokeWidth="9" /><circle cx="42" cy="42" fill="none" r={radius} stroke="#2fa866" strokeDasharray={`${circumference * percentage / 100} ${circumference}`} strokeLinecap="round" strokeWidth="9" transform="rotate(-90 42 42)" /></svg>
    <strong>{percentage}%</strong>
  </div>
}

type MeetingAgenda = 'Budget' | 'Resign'

function BoardMeeting({ confidence, onBack, onDecision }: { confidence: number; onBack: () => void; onDecision: (result: { status: string; message: string }) => void }) {
  const [agenda, setAgenda] = useState<MeetingAgenda>('Budget')
  const [reason, setReason] = useState<BoardFundingReason>('Squad development')
  const [percent, setPercent] = useState(BOARD_REQUEST_PERCENTS[1])
  const [confirmResign, setConfirmResign] = useState(false)
  const [error, setError] = useState('')
  const game = useGame()
  const level = managerProgress(game).level
  const resign = () => {
    writeCareer({ clubId: club.id, status: 'unemployed', level, previousClubId: club.id, resignedOn: game.date })
    window.location.reload()
  }
  const history = getBoardRequests().slice().reverse()
  const wait = boardCooldownDaysLeft()
  const money = (value: number) => `£${(value / 1_000_000).toFixed(2)}m`
  const submit = () => {
    const result = requestBoardFunds(reason, percent, confidence, club.finances.weeklyWages > getWageLimit())
    if (result.status === 'failed') setError(result.message)
    else onDecision(result)
  }
  const reasons: { id: BoardFundingReason; note: string }[] = [
    { id: 'Squad development', note: 'Adds to your transfer budget' },
    { id: 'Facilities', note: 'Adds to your upgrade budget' },
  ]
  return <div className="relations-view board-view">
    <div className="board-meeting-head"><button aria-label="Back to board overview" className="header-back-button" onClick={onBack} type="button"><ArrowLeft size={18} /></button><div className="club-subpage-heading"><div><span className="eyebrow">BOARD MEETING</span><h2>{agenda === 'Budget' ? 'Request more budget' : 'Resign as manager'}</h2></div></div></div>
    <div className="board-choice-row" role="tablist" aria-label="Meeting agenda">{(['Budget', 'Resign'] as const).map((item) => <button aria-selected={agenda === item} className={agenda === item ? 'board-choice active' : 'board-choice'} key={item} onClick={() => { setAgenda(item); setConfirmResign(false); setError('') }} role="tab" type="button"><strong>{item === 'Budget' ? 'Ask for budget' : 'Resign'}</strong></button>)}</div>
    {agenda === 'Budget' && <>
      <section className="fin-panel">
        <p className="board-meeting-intro">The board is {confidence}% confident in you. Requests are a share of the {money(boardRequestAmount(100))} budget you started with, and the more it trusts you, the more it will fund.</p>
        <span className="eyebrow">REASON FOR THE REQUEST</span>
        <div className="board-choice-row">{reasons.map((item) => <button aria-pressed={reason === item.id} className={reason === item.id ? 'board-choice active' : 'board-choice'} key={item.id} onClick={() => setReason(item.id)} type="button"><strong>{item.id}</strong><small>{item.note}</small></button>)}</div>
        <span className="eyebrow">AMOUNT · % OF ORIGINAL BUDGET</span>
        <div className="board-choice-row amounts">{BOARD_REQUEST_PERCENTS.map((value) => <button aria-pressed={percent === value} className={percent === value ? 'board-choice active' : 'board-choice'} key={value} onClick={() => setPercent(value)} type="button"><strong>{value}%</strong><small>{money(boardRequestAmount(value))}</small></button>)}</div>
        <button className="board-meeting-submit" disabled={wait > 0} onClick={submit} type="button">{wait > 0 ? `Next meeting in ${wait} days` : 'Make request'}</button>
        {error && <p className="board-result failed" role="alert">{error}</p>}
      </section>
      <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">PREVIOUS MEETINGS</span><h2>Request history</h2></div><span className="fin-count">{history.length}</span></div>
        {history.length ? <div className="fin-table"><div className="fin-row head board-history-row" role="row"><span>DATE</span><span>REASON</span><span>ASKED</span><span>GRANTED</span></div>
          {history.map((item, index) => <div className="fin-row board-history-row" key={`${item.date}-${index}`}><span>{item.date}</span><span>{item.reason}</span><span>{money(item.requested)}</span><span className={item.granted > 0 ? 'pos' : 'neg'}>{money(item.granted)}</span></div>)}</div>
          : <p className="empty-note">No requests yet.</p>}
      </section>
    </>}
    {agenda === 'Resign' && <section className="fin-panel">
      <p className="board-meeting-intro">Resigning ends your time at {club.name}. You leave the club and become unemployed; your save stays, and clubs will send you job offers based on your experience (level {level}). This cannot be undone.</p>
      {!confirmResign
        ? <button className="board-meeting-submit danger" onClick={() => setConfirmResign(true)} type="button">Resign as manager</button>
        : <><p className="board-result rejected" role="alert">Are you sure you want to leave {club.name}?</p>
          <div className="board-choice-row"><button className="board-choice" onClick={() => setConfirmResign(false)} type="button"><strong>Stay</strong></button><button className="board-meeting-submit danger" onClick={resign} type="button">Confirm resignation</button></div></>}
    </section>}
  </div>
}

export function BoardOverview({ embedded = false }: { embedded?: boolean }) {
  const view = useGame()
  const [meeting, setMeeting] = useState(false)
  const [decision, setDecision] = useState<{ status: string; message: string } | null>(null)
  const confidence = computeConfidence(view)
  const objectives = getBoardObjectives(view)
  const finances = club.finances
  const chairman = useMemo(() => {
    const random = createRng(`${club.id}:chairman`)
    const identity = generatePlayerIdentity({ birthCountryCode: 'NGA', random })
    return { name: identity.name, country: identity.birthCountry, tenure: 3 + Math.floor(random() * 8), personality: CHAIRMAN_PERSONALITIES[Math.floor(random() * CHAIRMAN_PERSONALITIES.length)] }
  }, [])
  const board = confidence.board
  if (meeting) return <BoardMeeting confidence={board.percentage} onBack={() => setMeeting(false)} onDecision={(result) => { setDecision(result); setMeeting(false) }} />
  const relationship = board.percentage >= 75 ? 'Good' : board.percentage >= 45 ? 'Fair' : 'Strained'
  const health = financialHealth()
  const met = objectives.filter((objective) => objective.status === 'Met' || objective.status === 'On track').length
  const statusClass = (status: string) => status.toLowerCase().replace(' ', '-')
  return <div className="relations-view board-view">
    {embedded
      ? <div className="club-subpage-heading"><div><span className="eyebrow">CLUB BOARD</span><h2>Board overview</h2></div><span className="club-tactic-tag">{met}/{objectives.length} ON TRACK</span></div>
      : <div className="page-intro"><span className="eyebrow">CLUB BOARD</span><h1>Board overview</h1><p>What the board expects from you this season.</p></div>}
    {decision && <p className={`board-result ${decision.status}`} role="status">{decision.message}<button aria-label="Dismiss board decision" className="board-result-close" onClick={() => setDecision(null)} type="button">×</button></p>}

    <div className="board-top">
      <section className="board-card board-confidence"><span className="eyebrow">BOARD CONFIDENCE</span><ConfidenceRing percentage={board.percentage} status={board.status} /><strong>{board.status}</strong><small>{board.note}</small></section>
      <section className="board-card board-chairman"><span className="eyebrow">CHAIRMAN</span>
        <div className="board-chairman-head"><img alt={`Portrait of ${chairman.name}`} src={PLACEHOLDER_PORTRAIT} /><div><strong>{chairman.name}</strong><small>{chairman.country}</small></div></div>
        <dl><div><dt>Tenure</dt><dd>{chairman.tenure} years</dd></div><div><dt>Personality</dt><dd>{chairman.personality}</dd></div><div><dt>Relationship</dt><dd className={relationship === 'Good' ? 'pos' : relationship === 'Fair' ? '' : 'neg'}>{relationship}</dd></div></dl>
      </section>
    </div>

    <div className="board-top">
      <section className="board-card board-vision"><span className="eyebrow">CLUB VISION</span><p>“Establish {club.name} among the best in {league.country}, competing for continental places every season.”</p></section>
      <section className="board-card board-vision"><span className="eyebrow">CLUB PHILOSOPHY</span><p>Attacking football in a {club.formation} shape, built around developing young talent.</p></section>
    </div>

    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">THIS SEASON</span><h2>Board objectives</h2></div><span className="fin-count">{objectives.length}</span></div>
      <div className="fin-table board-objectives" role="table" aria-label="Board objectives">
        <div className="fin-row head" role="row"><span>OBJECTIVE</span><span>IMPORTANCE</span><span>STATUS</span></div>
        {objectives.map((objective) => <div className="fin-row" key={objective.title} role="row">
          <span className="board-objective-name"><strong>{objective.title}</strong><small>Target {objective.target} · Now {objective.current}</small></span>
          <span className={`board-importance ${objective.importance.toLowerCase()}`}>{objective.importance}</span>
          <span className={`objective-tag ${statusClass(objective.status)}`}>{objective.status}</span>
        </div>)}
      </div>
    </section>

    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">BOARD INFORMATION</span><h2>Finances provided</h2></div></div>
      <div className="board-info">
        <div><span>Finances provided</span><strong className={health.tone === 'bad' ? 'neg' : 'pos'}>{health.label}</strong></div>
        <div><span>Transfer budget</span><strong>£{(finances.transferBudget / 1000000).toFixed(1)}m</strong></div>
        <div><span>Weekly wage bill</span><strong>£{Math.round(finances.weeklyWages).toLocaleString('en-GB')}</strong></div>
        <div><span>Wage limit</span><strong>£{Math.round(getWageLimit()).toLocaleString('en-GB')}/wk</strong></div>
        <div><span>Club balance</span><strong>£{(finances.balance / 1000000).toFixed(1)}m</strong></div>
        <div><span>Board influence</span><strong className="pos">High</strong></div>
      </div>
    </section>

    <section className="fin-panel board-feedback"><span className="eyebrow">RECENT BOARD FEEDBACK</span><p>{board.note}.</p>
      <button className="board-meeting-submit" onClick={() => setMeeting(true)} type="button"><Users size={14} /> Board meeting</button></section>
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
