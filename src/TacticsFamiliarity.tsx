import { ArrowLeft } from 'lucide-react'
import { club } from './data/mockData'
import { PLACEHOLDER_PORTRAIT } from './portrait'
import { CATEGORIES, categoryValues, familiarityLabel, improvementTips, overallFamiliarity, playerFamiliarity, positionFamiliarity, projectFamiliarity, type TacticSettings, type TrainingFocus } from './state/familiarityModel'
import { coachingQuality, growthBonus, setTrainingFocus, useTraining } from './state/training'
import type { Player } from './types/game'

export interface Starter { player: Player | null; slotPosition: string; slotLabel: string }
type Props = { settings: TacticSettings; starters: Starter[]; onBack: () => void; onOpen: (view: 'familiarity' | 'training') => void }

const FOCUSES: TrainingFocus[] = ['Balanced', ...CATEGORIES]
const tone = (value: number) => value >= 85 ? 'excellent' : value >= 70 ? 'good' : value >= 50 ? 'fair' : 'poor'

function TrendChart({ trend }: { trend: number[] }) {
  const points = trend.length > 1 ? trend : [trend[0], trend[0]]
  const low = Math.max(0, Math.min(...points) - 10)
  const high = Math.min(100, Math.max(...points) + 10)
  const xy = points.map((value, index) => `${8 + index / (points.length - 1) * 84},${44 - (value - low) / Math.max(1, high - low) * 36}`)
  return <svg className="fam-trend" viewBox="0 0 100 52" role="img" aria-label={`Familiarity trend: ${trend.join('%, ')}%`}>
    <polyline className="fam-trend-line" points={xy.join(' ')} />
    {xy.map((point, index) => <circle cx={point.split(',')[0]} cy={point.split(',')[1]} key={index} r="1.8" />)}
    <text x="2" y="50">{trend.length} wk</text><text x="98" y="50" textAnchor="end">now {trend[trend.length - 1]}%</text>
  </svg>
}

function Heading({ eyebrow, title, onBack }: { eyebrow: string; title: string; onBack: () => void }) {
  return <div className="club-subpage-heading"><button aria-label="Back to tactics" className="header-back-button" onClick={onBack} type="button"><ArrowLeft size={18} /></button><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div></div>
}

export function FamiliarityView({ settings, starters, onBack, onOpen }: Props) {
  const training = useTraining()
  const values = categoryValues(training, settings)
  const overall = overallFamiliarity(values)
  const fits: number[] = starters.map((starter) => starter.player ? positionFamiliarity(starter.player.position, starter.slotPosition) : 0)
  const filled = starters.filter((starter) => starter.player).length
  const averageFit = filled ? fits.reduce((total, fit) => total + fit, 0) / filled : 0
  const tips = improvementTips(values, averageFit, training.focus)
  const circumference = 2 * Math.PI * 30
  const assistant = club.staff.find((member) => member.role === 'Assistant Manager')

  return <div className="tactics-section-content">
    <Heading eyebrow="TACTICAL FAMILIARITY" title="How well the squad knows the plan" onBack={onBack} />
    <section className="fin-panel fam-summary">
      <svg viewBox="0 0 80 80" role="img" aria-label={`Overall familiarity ${overall}%`}><circle cx="40" cy="40" r="30" fill="none" stroke="#e5eaf0" strokeWidth="8" /><circle className={`fam-ring ${tone(overall)}`} cx="40" cy="40" r="30" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${overall / 100 * circumference} ${circumference}`} transform="rotate(-90 40 40)" /><text x="40" y="45" textAnchor="middle" className="facility-donut-text">{overall}%</text></svg>
      <div><span className="eyebrow">OVERALL</span><strong className={`fam-label ${tone(overall)}`}>{familiarityLabel(overall)}</strong><p>{settings.formation} · {settings.tacticalDNA}. Familiarity builds with training and matches, and fades for tactics you stop using.</p></div>
    </section>
    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">BREAKDOWN</span><h2>Tactical areas</h2></div></div>
      {!training.seeded && <p className="empty-note">Save your tactic once to start tracking familiarity.</p>}
      {CATEGORIES.map((category) => <div className="fam-bar" key={category}><span>{category}{training.focus === category && <em>focus</em>}</span><div><i className={tone(values[category])} style={{ width: `${values[category]}%` }} /></div><b>{values[category]}%</b></div>)}
    </section>
    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">WEEKLY TREND</span><h2>Familiarity over time</h2></div></div><TrendChart trend={training.trend} /></section>
    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">STARTING XI</span><h2>Player familiarity</h2></div></div>
      <table className="fin-table fam-table"><thead><tr><th>Player</th><th>Slot</th><th>Position fit</th><th>Familiarity</th></tr></thead><tbody>{starters.map((starter, index) => starter.player && <tr key={starter.player.id}>
        <td><img alt="" src={PLACEHOLDER_PORTRAIT} />{starter.player.name}</td><td>{starter.slotLabel}</td><td>{fits[index]}%</td><td className={`fam-cell ${tone(playerFamiliarity(fits[index], values))}`}>{playerFamiliarity(fits[index], values)}%</td></tr>)}</tbody></table>
    </section>
    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">HOW TO IMPROVE</span><h2>Suggestions</h2></div></div>
      {tips.map((tip) => <div className="facility-priority" key={tip.text}><span>{tip.text}</span><b className={`priority-${tip.impact.toLowerCase()}`}>{tip.impact}</b></div>)}
    </section>
    <section className="fin-panel fam-assistant"><img alt="" src={PLACEHOLDER_PORTRAIT} /><div><strong>{assistant?.name ?? 'Assistant Manager'}</strong><span>Assistant Manager</span><p>{values[[...CATEGORIES].sort((a, b) => values[a] - values[b])[0]] < 70 ? 'Some areas are still unfamiliar. Targeted training will help most.' : 'The squad is comfortable with the system.'}</p></div><button className="tactics-action primary" onClick={() => onOpen('training')} type="button">Training focus</button></section>
  </div>
}

export function TrainingView({ settings, onBack }: Pick<Props, 'settings' | 'onBack'>) {
  const training = useTraining()
  const values = categoryValues(training, settings)
  const projected = projectFamiliarity(training, settings, growthBonus(), 28)
  const coaching = coachingQuality()
  const { trainingLevel, analysisLevel, maxLevel } = club.facilities

  return <div className="tactics-section-content">
    <Heading eyebrow="TRAINING HUB" title="Tactical training" onBack={onBack} />
    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">TRAINING CAPACITY</span><h2>What speeds up learning</h2></div></div>
      <div className="facility-priority"><span>Training Ground</span><small>Level {trainingLevel} of {maxLevel}</small><b>+{trainingLevel * 8}%</b></div>
      <div className="facility-priority"><span>Data Analysis</span><small>Level {analysisLevel} of {maxLevel}</small><b>+{analysisLevel * 5}%</b></div>
      <div className="facility-priority"><span>Coaching staff</span><small>Tactical knowledge</small><b>+{coaching}%</b></div>
      <p className="facility-note">Upgrade the Training Ground and Data Analysis in Club → Facilities to learn tactics faster.</p>
    </section>
    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">SESSION FOCUS</span><h2>Training focus</h2></div></div>
      <div className="fam-focus">{FOCUSES.map((focus) => <button aria-pressed={training.focus === focus} className={training.focus === focus ? 'style-option active' : 'style-option'} key={focus} onClick={() => setTrainingFocus(focus)} type="button">{focus}</button>)}</div>
      <p className="facility-note">{training.focus === 'Balanced' ? 'Balanced sessions improve every area at a steady pace.' : `${training.focus} improves much faster; other areas slow down.`}</p>
    </section>
    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">NEXT 4 WEEKS</span><h2>Projection</h2></div></div>
      {CATEGORIES.map((category) => <div className="fam-bar" key={category}><span>{category}</span><div><i className={tone(projected[category])} style={{ width: `${projected[category]}%` }} /></div><b>{values[category]}% → {projected[category]}%</b></div>)}
      <p className="facility-note">Projection assumes no tactical changes and no matches. Matches add extra familiarity.</p>
    </section>
  </div>
}
