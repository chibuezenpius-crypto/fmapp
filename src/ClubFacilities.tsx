import { useState } from 'react'
import { Activity, BarChart3, Building2, Dumbbell, GraduationCap, Search, type LucideIcon } from 'lucide-react'
import { club } from './data/mockData'
import { useGame } from './state/gameStore'
import { conditionOf, FACILITY_INFO, FACILITY_ORDER, FACILITY_UPGRADE_COSTS, facilityLevel, type FacilityCondition, type FacilityUpgrade } from './state/facilities'
import { upgradeFacility } from './state/transfers'

const ICONS: Record<FacilityUpgrade, LucideIcon> = { stadium: Building2, training: Dumbbell, youth: GraduationCap, medical: Activity, analysis: BarChart3, scouting: Search }
const BANDS: FacilityCondition[] = ['Excellent', 'Good', 'Average', 'Poor']
const money = (value: number) => `£${(value / 1000000).toFixed(1)}M`

export default function ClubFacilities() {
  useGame()
  const [notice, setNotice] = useState('')
  const { facilities } = club
  const max = facilities.maxLevel
  const balance = club.finances.balance
  const levels = FACILITY_ORDER.map((id) => ({ id, level: facilityLevel(facilities, id) }))
  const quality = Math.round(levels.reduce((total, item) => total + item.level, 0) / (levels.length * max) * 100)
  const overall = conditionOf(Math.round(quality / 100 * max))
  const counts = BANDS.map((band) => levels.filter((item) => conditionOf(item.level) === band).length)
  const circumference = 2 * Math.PI * 30
  const segments = counts.map((count, index) => ({ band: BANDS[index], count, length: count / levels.length * circumference, start: counts.slice(0, index).reduce((total, value) => total + value, 0) / levels.length * circumference }))
  const priority = levels.filter((item) => item.level < max)
    .sort((a, b) => (max - b.level) * weight(b.id) - (max - a.level) * weight(a.id))

  return <>
    <div className="club-subpage-heading"><div><span className="eyebrow">INVEST IN THE FUTURE</span><h2>Facilities</h2></div><span className={`facility-quality ${overall.toLowerCase()}`}>{overall} quality</span></div>
    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">UPGRADE BUDGET</span><h2>{money(balance)}</h2></div></div>
      {notice && <p className="club-action-notice" role="status">{notice}</p>}
      {levels.map(({ id, level }) => {
        const info = FACILITY_INFO[id]
        const Icon = ICONS[id]
        const cost = FACILITY_UPGRADE_COSTS[id]
        const maxed = level >= max
        const metric = id === 'stadium' ? club.stadium.capacity.toLocaleString('en-GB') : id === 'youth' ? `${level}/${max}` : conditionOf(level)
        return <article className="facility-row facility-row-rich" key={id}>
          <div className="facility-icon"><Icon size={16} /></div>
          <div className="facility-info"><strong>{info.name}</strong><span>{info.place}</span><small>{info.effect}</small>
            <div className="facility-levels">{Array.from({ length: max }, (_, index) => <i className={index < level ? 'filled' : ''} key={index} />)}</div></div>
          <div className="facility-metric"><span>{info.metric}</span><b className={`cond-${conditionOf(level).toLowerCase()}`}>{metric}</b></div>
          <button aria-label={`Upgrade ${info.name} for ${money(cost)}`} className="facility-upgrade" disabled={maxed || balance < cost} onClick={() => setNotice(upgradeFacility(id))} type="button">{maxed ? 'MAX' : `Upgrade ${money(cost)}`}</button>
        </article>
      })}
    </section>
    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">OVERVIEW</span><h2>Facility quality</h2></div></div>
      <div className="facility-overview">
        <svg viewBox="0 0 80 80" role="img" aria-label={`Facility quality ${quality}%`}>
          <circle cx="40" cy="40" r="30" fill="none" stroke="#e5eaf0" strokeWidth="9" />
          {segments.filter((segment) => segment.count).map((segment) => <circle key={segment.band} cx="40" cy="40" r="30" fill="none" className={`band-${segment.band.toLowerCase()}`} strokeWidth="9" strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={-segment.start} transform="rotate(-90 40 40)" />)}
          <text x="40" y="44" textAnchor="middle" className="facility-donut-text">{quality}%</text>
        </svg>
        <ul>{BANDS.map((band, index) => <li key={band}><i className={`band-dot band-${band.toLowerCase()}`} />{band}<b>{counts[index]}</b></li>)}</ul>
      </div>
    </section>
    <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">WHERE TO SPEND NEXT</span><h2>Upgrade priority</h2></div></div>
      {priority.length === 0 && <p className="empty-note">Every facility is at maximum level.</p>}
      {priority.map((item, index) => {
        const rank = index < 2 ? 'High' : index < 4 ? 'Medium' : 'Low'
        return <div className="facility-priority" key={item.id}><span>{FACILITY_INFO[item.id].name}</span><small>{FACILITY_INFO[item.id].effect}</small><b className={`priority-${rank.toLowerCase()}`}>{rank}</b></div>
      })}
      <p className="facility-note">Upgrades are paid from the club balance and take effect immediately: better medical care shortens injuries, training and analysis speed up tactic learning, scouting enlarges youth intakes and a bigger stadium raises matchday income.</p>
    </section>
  </>
}

// Training and medical gains reach the first team directly, so they rank ahead of the long-term projects.
function weight(id: FacilityUpgrade) {
  return { training: 1.3, medical: 1.2, analysis: 1.1, stadium: 1, youth: 0.9, scouting: 0.8 }[id]
}
