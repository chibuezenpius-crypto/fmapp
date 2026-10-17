import { useState } from 'react'
import type { ManagerProfile, PersonnelProfile, RefereeProfile } from './types/game'
import Flag from './Flag'
import { PLACEHOLDER_PORTRAIT } from './portrait'
import { displayCountryName } from './countryFlagUtils'

type ManagerSection = 'Overview & Attributes' | 'Tactics & Style' | 'Achievements & History'
const managerSections: ManagerSection[] = ['Overview & Attributes', 'Tactics & Style', 'Achievements & History']
function ManagerView({ manager, onSelectCountry }: { manager: ManagerProfile; onSelectCountry: (country: string) => void }) {
  const [section, setSection] = useState<ManagerSection>('Overview & Attributes')
  const attributes = [
    ['Tactical Knowledge', manager.attributes.tacticalKnowledge],
    ['Man Management', manager.attributes.manManagement],
    ['Discipline', manager.attributes.discipline],
  ] as const

  return <div className="manager-profile">
    <section className="personnel-hero"><img alt={`Portrait of ${manager.name}`} className="personnel-avatar" src={PLACEHOLDER_PORTRAIT} /><div><span className="eyebrow">MANAGER PROFILE</span><h1>{manager.name}</h1><span className="personnel-country"><Flag code={manager.nationality} countryName={displayCountryName(manager.nationality)} onSelectCountry={onSelectCountry} />{manager.nationality} · Age {manager.age}</span></div><span className="personnel-role">COACH</span></section>
    <nav className="personnel-tabs" aria-label="Manager profile sections">{managerSections.map((item) => <button aria-current={section === item ? 'page' : undefined} className={section === item ? 'personnel-tab active' : 'personnel-tab'} key={item} onClick={() => setSection(item)} type="button">{item}</button>)}</nav>
    {section === 'Overview & Attributes' && <div className="personnel-content">
      <section className="personnel-panel"><div className="personnel-panel-heading"><span className="eyebrow">MANAGER ATTRIBUTES</span><strong>KEY SKILLS</strong></div>{attributes.map(([label, value]) => <div className="manager-attribute" key={label}><span>{label}</span><div><i style={{ width: `${value * 5}%` }} /></div><strong>{value}</strong></div>)}</section>
      <section className="personnel-panel manager-personality"><span className="eyebrow">PERSONALITY ARCHETYPE</span><h2>{manager.personality}</h2><p>Known for clear standards, thoughtful preparation, and building trust across the squad.</p><div className="language-tags">{manager.languages.map((language) => <span key={language.name}>{language.name} · {language.proficiency}</span>)}</div></section>
    </div>}
    {section === 'Tactics & Style' && <div className="personnel-content"><section className="manager-formation-card"><span className="eyebrow">PREFERRED FORMATION</span><strong>{manager.preferredFormation}</strong><div className="mini-formation" aria-label={`Preferred formation ${manager.preferredFormation}`}><i>ST</i><i>LW</i><i>RW</i><i>CM</i><i>CM</i><i>DM</i><i>LB</i><i>CB</i><i>CB</i><i>RB</i><i>GK</i></div></section><section className="personnel-panel"><span className="eyebrow">TACTICAL DNA</span>{manager.tacticalDNA.map((item) => <div className="tactical-dna-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</section></div>}
    {section === 'Achievements & History' && <div className="personnel-content"><section className="personnel-panel"><span className="eyebrow">TROPHIES</span>{manager.trophies.length ? manager.trophies.map((trophy) => <article className="personnel-achievement" key={`${trophy.season}-${trophy.title}`}><span>★</span><div><strong>{trophy.title}</strong><small>{trophy.season} · {trophy.clubName}</small></div></article>) : <p className="personnel-empty">No trophies recorded yet.</p>}</section><section className="personnel-panel"><span className="eyebrow">PERSONAL AWARDS</span>{manager.awards.length ? manager.awards.map((award) => <article className="personnel-achievement" key={`${award.season}-${award.title}`}><span>✦</span><div><strong>{award.title}</strong><small>{award.season} · {award.detail}</small></div></article>) : <p className="personnel-empty">No personal awards recorded yet.</p>}</section><section className="personnel-panel"><span className="eyebrow">SEASON RECORD</span><div className="manager-record-head"><span>SEASON / CLUB</span><span>W</span><span>D</span><span>L</span></div>{manager.seasonRecords.map((record) => <article className="manager-record-row" key={`${record.season}-${record.clubName}`}><div><strong>{record.season}</strong><small>{record.clubName}</small></div><span>{record.wins}</span><span>{record.draws}</span><span>{record.losses}</span></article>)}</section></div>}
  </div>
}

function RefereeView({ referee, onSelectCountry }: { referee: RefereeProfile; onSelectCountry: (country: string) => void }) {
  const strictness = referee.strictness.toLowerCase()
  return <div className="referee-profile">
    <section className="personnel-hero"><img alt={`Portrait of ${referee.name}`} className="personnel-avatar referee-avatar" src={PLACEHOLDER_PORTRAIT} /><div><span className="eyebrow">MATCH OFFICIAL</span><h1>{referee.name}</h1><span className="personnel-country"><Flag code={referee.countryCode} countryName={displayCountryName(referee.nationality)} onSelectCountry={onSelectCountry} />{referee.nationality} · Age {referee.age}</span></div><span className={`strictness-badge ${strictness}`}>{referee.strictness}</span></section>
    <section className="personnel-panel referee-languages"><span className="eyebrow">LANGUAGES</span><div className="language-tags">{referee.languages.map((language) => <span key={language.name}>{language.name} · {language.proficiency}</span>)}</div></section>
    <section className="personnel-panel"><span className="eyebrow">DISCIPLINARY TENDENCY</span><div className="referee-stats"><article><strong>{referee.yellowCardsPerMatch.toFixed(1)}</strong><span>YELLOW CARDS / MATCH</span></article><article><strong>{referee.redCardsPerMatch.toFixed(2)}</strong><span>RED CARDS / MATCH</span></article><article><strong>{referee.foulThreshold}</strong><span>FOULS BEFORE CARD</span></article></div><div className="referee-meter"><i style={{ width: `${referee.strictness === 'Lenient' ? 30 : referee.strictness === 'Balanced' ? 60 : 90}%` }} /></div></section>
  </div>
}

export default function PersonnelProfile({ personnel, onSelectCountry }: { personnel: PersonnelProfile; onSelectCountry: (country: string) => void }) {
  return personnel.type === 'Manager' ? <ManagerView manager={personnel.profile} onSelectCountry={onSelectCountry} /> : <RefereeView referee={personnel.profile} onSelectCountry={onSelectCountry} />
}
