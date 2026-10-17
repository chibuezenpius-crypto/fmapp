import { useState } from 'react'
import type { Player, PlayerAttributes, PlayerAchievement } from './types/game'
import { club, getWageRoom, isOwnPlayer } from './data/mockData'
import { getWageDemand, releasePlayer, renewContract, submitBid, type DealResult } from './state/transfers'
import { useGame } from './state/gameStore'
import { moveToReserves, promoteReserve, squadLocation } from './state/matchSquad'
import { findGeneratedClub, getClubSquad } from './data/clubSquads'
import Flag from './Flag'
import { PositionBadge } from './SquadPlayerRow'
import { buildDressingRoom, type Connection, type HierarchyLevel } from './utils/dressingRoom'

export type ProfileSection = 'Overview' | 'Personal Info' | 'Contracts' | 'History' | 'Relationships' | 'Achievements'

const sections: ProfileSection[] = ['Overview', 'Personal Info', 'Contracts', 'History', 'Relationships', 'Achievements']
const attributeGroups: { title: string; keys: (keyof PlayerAttributes)[] }[] = [
  { title: 'Technical', keys: ['crossing', 'dribbling', 'finishing', 'firstTouch', 'heading', 'longShots', 'marking', 'passing', 'tackling', 'technique', 'vision'] },
  { title: 'Physical', keys: ['acceleration', 'agility', 'jumpingReach', 'pace', 'stamina', 'strength'] },
  { title: 'Mental', keys: ['decisions', 'determination', 'leadership', 'offTheBall', 'positioning', 'teamwork', 'workRate'] },
]

interface PlayerProfileProps {
  player: Player
  section: ProfileSection
  selectedClubName: string | null
  onSectionChange: (section: ProfileSection) => void
  onSelectClub: (name: string) => void
  onSelectPlayer: (player: Player) => void
  onSelectCountry: (country: string) => void
}

const money = (amount: number) => `£${new Intl.NumberFormat('en-GB').format(amount)}`
const displayDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
const ratingTone = (rating: number) => rating >= 75 ? 'positive' : rating < 45 ? 'negative' : 'neutral'

const playerClubName = (player: Player) => findGeneratedClub(player.contract.clubId)?.clubName ?? 'Free Agent'

function ClubReference({ name, selectedClubName, onSelectClub }: { name: string; selectedClubName: string | null; onSelectClub: (name: string) => void }) {
  return <button aria-pressed={selectedClubName === name} className={`entity-link ${selectedClubName === name ? 'selected' : ''}`} onClick={() => onSelectClub(name)} type="button">{name}</button>
}


const hierarchyTone: Record<HierarchyLevel, string> = {
  'Team Leader': 'bg-amber-100 text-amber-700',
  Influential: 'bg-blue-100 text-blue-700',
  'Core Player': 'bg-emerald-100 text-emerald-700',
  Fringe: 'bg-slate-100 text-slate-600',
}

function ConnectionList({ title, tone, connections, empty, onSelectPlayer }: { title: string; tone: 'positive' | 'negative'; connections: Connection[]; empty: string; onSelectPlayer: (player: Player) => void }) {
  return <section>
    <div className="profile-subheading"><h3>{title}</h3><span>{connections.length} {connections.length === 1 ? 'PLAYER' : 'PLAYERS'}</span></div>
    <div className="overflow-hidden rounded-2xl border border-[#d0d9ee] bg-white shadow-sm">
      {connections.length === 0 && <p className="m-0 px-3 py-4 text-center text-[11px] text-[#6376a4]">{empty}</p>}
      {connections.map((connection) => <button aria-label={`Open ${connection.player.name} profile`} className="flex w-full items-center gap-2.5 border-x-0 border-b-0 border-t border-solid border-t-[#e2e8f6] bg-transparent px-3 py-2.5 text-left first:border-t-0 hover:bg-blue-50" key={connection.player.id} onClick={() => onSelectPlayer(connection.player)} type="button">
        <PositionBadge position={connection.player.position} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2"><strong className="truncate text-sm font-bold text-[#1b2847]">{connection.player.name}</strong><span className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-extrabold ${tone === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{connection.label}</span></span>
          <small className="text-[11px] leading-snug text-[#6376a4]">{connection.reason}</small>
        </span>
      </button>)}
    </div>
  </section>
}

function DressingRoomCard({ player, squad, onSelectPlayer }: { player: Player; squad: Player[]; onSelectPlayer: (player: Player) => void }) {
  const view = buildDressingRoom(player, squad)
  const info = player.personalInfo
  return <>
    <section className="rounded-2xl border border-[#d0d9ee] bg-white p-3 shadow-sm">
      <span className="eyebrow">DRESSING ROOM INFLUENCE</span>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1"><small className="text-[9px] font-extrabold text-[#6376a4]">HIERARCHY</small><span className={`w-fit rounded-lg px-2 py-1 text-xs font-extrabold ${hierarchyTone[view.hierarchy]}`}>{view.hierarchy}</span></div>
        <div className="flex flex-col gap-1"><small className="text-[9px] font-extrabold text-[#6376a4]">SOCIAL GROUP</small><span className={`w-fit rounded-lg px-2 py-1 text-xs font-extrabold ${view.group === 'Core Group' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{view.group}</span></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-lg bg-[#dbe4fa] px-2 py-1 text-[10px] font-extrabold text-[#183a8b]">{info.personality}</span>
        <span className="rounded-lg bg-[#dbe4fa] px-2 py-1 text-[10px] font-extrabold text-[#183a8b]">{info.characterTrait}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {([['Loyalty', view.traits.loyalty], ['Professionalism', view.traits.professionalism], ['Work rate', view.traits.workRate], ['Leadership', view.traits.leadership], ['Determination', view.traits.determination], ['Morale', view.traits.morale]] as const).map(([name, value]) => <div className="flex flex-col gap-1" key={name}>
          <span className="flex items-baseline justify-between text-[10px] font-extrabold text-[#6376a4]"><span>{name.toUpperCase()}</span><span className="text-[#1b2847]">{value}</span></span>
          <span className="h-1.5 overflow-hidden rounded-full bg-[#e2e8f6]"><i className={`block h-full rounded-full ${value >= 70 ? 'bg-emerald-500' : value >= 45 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${value}%` }} /></span>
        </div>)}
      </div>
    </section>
    <section className="rounded-2xl border border-[#d0d9ee] bg-white p-3 shadow-sm">
      <span className="eyebrow">MENTORSHIP</span>
      <div className="mt-2 flex items-start gap-2.5">
        <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-extrabold ${view.mentorship.role === 'None' ? 'bg-slate-100 text-slate-600' : 'bg-violet-100 text-violet-700'}`}>{view.mentorship.role === 'None' ? 'No link' : view.mentorship.role}</span>
        <p className="m-0 text-[11px] leading-snug text-[#6376a4]">{view.mentorship.text}</p>
      </div>
      {view.mentorship.partner && <button className="mt-2 flex w-full items-center gap-2.5 rounded-xl border border-[#e2e8f6] bg-transparent px-2.5 py-2 text-left hover:bg-blue-50" onClick={() => view.mentorship.partner && onSelectPlayer(view.mentorship.partner)} type="button">
        <PositionBadge position={view.mentorship.partner.position} />
        <strong className="truncate text-sm font-bold text-[#1b2847]">{view.mentorship.partner.name}</strong>
      </button>}
    </section>
    <ConnectionList connections={view.positive} empty="No close bonds in the squad yet." onSelectPlayer={onSelectPlayer} title="Positive connections" tone="positive" />
    <ConnectionList connections={view.negative} empty="No conflicts in the dressing room." onSelectPlayer={onSelectPlayer} title="Conflicts" tone="negative" />
  </>
}

const SHORTLIST_KEY = 'fmapp-transfer-shortlist'
const readShortlist = (): string[] => {
  try { return JSON.parse(window.localStorage.getItem(SHORTLIST_KEY) ?? '[]') } catch { return [] }
}
const shortMoney = (amount: number) => `£${(amount / 1000000).toFixed(1)}m`
const scoutedPlayers = new Set<string>()

function PlayerActions({ player }: { player: Player }) {
  const [panel, setPanel] = useState<'none' | 'renew' | 'bid' | 'release'>('none')
  const [message, setMessage] = useState('')
  const [counter, setCounter] = useState<number | null>(null)
  const [wageTerm, setWageTerm] = useState(1)
  const [shortlisted, setShortlisted] = useState(() => readShortlist().includes(player.id))
  const own = isOwnPlayer(player)
  const free = !player.contract.clubId
  const done = (text: string) => { setMessage(text); setPanel('none'); setCounter(null) }

  const renew = (years: number, raise: number) => done(renewContract(player, years, raise).message)

  const moveSquad = () => {
    if (squadLocation(club.squad, player.id) === 'reserve') {
      const dropped = promoteReserve(club.squad, player.id)
      done(dropped ? `${player.name} joins the first team; ${dropped} moves to the reserves.` : 'Could not update the squad.')
    } else {
      const replacement = moveToReserves(club.squad, player.id)
      done(replacement === null ? 'Could not move the player to the reserves.' : `${player.name} moves to the reserves.`)
    }
  }

  const bid = (fee: number) => {
    const result: DealResult = submitBid(player, { fee, wageMultiplier: wageTerm, years: 3 })
    setMessage(result.message)
    if (result.status === 'accepted') { setPanel('none'); setCounter(null) } else setCounter(result.status === 'counter' ? result.counterFee ?? null : null)
  }

  const scout = () => {
    scoutedPlayers.add(player.id)
    setMessage(`Scout report: potential ${Math.max(player.overall, player.potential - 3)}-${Math.min(99, player.potential + 3)}, asking around ${shortMoney(player.value)}.`)
  }

  const toggleShortlist = () => {
    const current = readShortlist()
    const next = current.includes(player.id) ? current.filter((id) => id !== player.id) : [...current, player.id]
    window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify(next))
    setShortlisted(next.includes(player.id))
  }

  if (!own && player.contract.clubId === club.id) return null
  const demand = getWageDemand(player)

  return <section className="player-actions" aria-label="Player actions">
    <div className="player-action-buttons">
      {own ? <>
        <button className="player-action primary" onClick={() => setPanel(panel === 'renew' ? 'none' : 'renew')} type="button">Renew contract</button>
        <button className="player-action danger" onClick={() => setPanel(panel === 'release' ? 'none' : 'release')} type="button">Release</button>
        <button className="player-action" onClick={moveSquad} type="button">{squadLocation(club.squad, player.id) === 'reserve' ? 'Move to first team' : 'Move to reserves'}</button>
      </> : <>
        <button className="player-action primary" onClick={() => setPanel(panel === 'bid' ? 'none' : 'bid')} type="button">{free ? 'Sign free agent' : 'Place bid'}</button>
        <button className="player-action" onClick={scout} type="button">{scoutedPlayers.has(player.id) ? 'Scouted' : 'Scout'}</button>
        <button aria-pressed={shortlisted} className="player-action" onClick={toggleShortlist} type="button">{shortlisted ? '★ Shortlisted' : '☆ Shortlist'}</button>
      </>}
    </div>
    {panel === 'renew' && <div className="player-action-panel"><span className="eyebrow">OFFER · CURRENT {money(player.contract.weeklyWage)}/WK</span>{[2, 3, 4].map((years) => <div className="player-offer-row" key={years}><strong>{years} years</strong>{[0, 10, 20].map((raise) => <button key={raise} onClick={() => renew(years, raise)} type="button">{raise === 0 ? 'Same wage' : `+${raise}%`}</button>)}</div>)}</div>}
    {panel === 'bid' && <div className="player-action-panel">
      <span className="eyebrow">{free ? 'FREE TRANSFER' : `BID · VALUE ${shortMoney(player.value)}`} · BUDGET {shortMoney(club.finances.transferBudget)} · WAGE ROOM {money(Math.max(0, getWageRoom()))}/WK</span>
      <div className="player-offer-row"><strong>Wage</strong>{[1, 1.1, 1.25].map((multiplier) => <button aria-pressed={wageTerm === multiplier} key={multiplier} onClick={() => setWageTerm(multiplier)} type="button">{money(Math.round(demand * multiplier / 50) * 50)}/wk</button>)}</div>
      {free ? <div className="player-offer-row"><button onClick={() => bid(0)} type="button">Offer contract</button></div>
        : <div className="player-offer-row"><strong>Fee</strong>{[0, 15, 30].map((premium) => <button disabled={player.value * (1 + premium / 100) > club.finances.transferBudget} key={premium} onClick={() => bid(Math.round(player.value * (1 + premium / 100) / 50000) * 50000)} type="button">{shortMoney(Math.round(player.value * (1 + premium / 100) / 50000) * 50000)}</button>)}</div>}
      {counter !== null && <div className="player-offer-row"><button className="primary" onClick={() => bid(counter)} type="button">Accept counter {shortMoney(counter)}</button></div>}
    </div>}
    {panel === 'release' && <div className="player-action-panel"><span className="eyebrow">RELEASE {player.name.toUpperCase()}?</span><div className="player-offer-row"><button className="danger" onClick={() => done(releasePlayer(player))} type="button">Confirm release</button><button onClick={() => setPanel('none')} type="button">Cancel</button></div></div>}
    {message && <p className="player-action-message" role="status">{message}</p>}
  </section>
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return <div className="attribute-row"><span>{label}</span><div className="attribute-track"><i className={ratingTone(value)} style={{ width: `${value}%` }} /></div><strong className={ratingTone(value)}>{value}</strong></div>
}

function AchievementList({ title, achievements, emptyText }: { title: string; achievements: PlayerAchievement[]; emptyText: string }) {
  return <section className="profile-section-block"><div className="profile-subheading"><h3>{title}</h3><span>{achievements.length}</span></div>
    {achievements.length > 0 ? <div className="achievement-list">{achievements.map((achievement) => <article className="achievement-row" key={`${achievement.title}-${achievement.season}`}>
      <span className="achievement-mark">{achievement.title.slice(0, 1)}</span><div><strong>{achievement.title}</strong><span>{achievement.detail}</span></div><small>{achievement.season}</small>
    </article>)}</div> : <p className="empty-note">{emptyText}</p>}
  </section>
}

export default function PlayerProfile({ player, section, selectedClubName, onSectionChange, onSelectClub, onSelectPlayer, onSelectCountry }: PlayerProfileProps) {
  useGame()
  const squad = getClubSquad(player.contract.clubId)
  const profile = player.personalInfo
  const contract = player.contract
  const averageRating = player.seasonStats.at(-1)?.averageRating ?? player.form

  return <div className="player-profile">
    <section className="profile-hero">
      <img alt={`Portrait of ${player.name}`} className="profile-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" />
      <div className="profile-player-info"><span className="eyebrow">{player.position} · {player.age} YEARS</span><h1>{player.name}</h1>
        <div className="profile-clubline"><ClubReference name={playerClubName(player)} selectedClubName={selectedClubName} onSelectClub={onSelectClub} /><span>·</span><span>{player.contract.squadRole}</span></div>
      </div>
      <div className="profile-overall"><strong>{player.overall}</strong><span>OVR</span></div>
    </section>

    <div className="profile-status-strip">
      <div><span>FITNESS</span><strong>{player.fitness}%</strong><div className="status-track"><i style={{ width: `${player.fitness}%` }} /></div></div>
      <div><span>FORM</span><strong>{player.form.toFixed(1)} <small>/ 10</small></strong><div className="status-track"><i style={{ width: `${player.form * 10}%` }} /></div></div>
      <div><span>MOOD</span><strong className={`mood-badge mood-${player.morale.toLowerCase().replace(' ', '-')}`}>{player.morale}</strong></div>
    </div>

    <PlayerActions key={player.id} player={player} />

    <div className="profile-tabs" role="tablist" aria-label="Player profile sections">
      {sections.map((item) => <button aria-selected={section === item} className={section === item ? 'profile-tab active' : 'profile-tab'} key={item} onClick={() => onSectionChange(item)} role="tab" type="button">{item}</button>)}
    </div>

    <div className="profile-content" role="tabpanel" key={section}>
      {section === 'Overview' && <>
        <div className="profile-summary-strip"><div><span>MARKET VALUE</span><strong>{money(player.value)}</strong></div><div><span>POTENTIAL</span><strong>{player.potential}<small> / 100</small></strong></div><div><span>AVG RATING</span><strong>{averageRating.toFixed(1)}</strong></div></div>
        <div className="attribute-groups">{attributeGroups.map((group) => <section className="attribute-group" key={group.title}>
          <div className="profile-subheading"><h3>{group.title}</h3><span>{group.keys.length} ATTRIBUTES</span></div>
          <div className="attribute-grid">{group.keys.map((key) => <RatingBar key={key} label={key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())} value={player.attributes[key]} />)}</div>
        </section>)}</div>
      </>}

      {section === 'Personal Info' && <div className="profile-card-grid">
        <section className="profile-card"><span className="eyebrow">PERSONAL DETAILS</span><dl className="detail-list">
          <div><dt>Born</dt><dd>{displayDate(profile.dateOfBirth)}</dd></div><div><dt>Place of birth</dt><dd>{profile.placeOfBirth}</dd></div>
          {profile.nationalTeamRepresentation && <div><dt>National team</dt><dd>{profile.nationalTeamRepresentation.country}</dd></div>}
          <div><dt>Height</dt><dd>{profile.heightCm} cm</dd></div><div><dt>Preferred foot</dt><dd>{profile.preferredFoot}</dd></div>
        </dl></section>
        <section className="profile-card nationality-card"><span className="eyebrow">NATIONALITIES</span><div className="nationality-list">{profile.nationalities.map((nationality) => <span className={`nationality-badge ${nationality.type.toLowerCase()}`} key={nationality.type}><b className="nationality-flag-holder"><Flag code={nationality.code} countryName={nationality.country} onSelectCountry={onSelectCountry} /></b><span><small>{nationality.type}</small><strong>{nationality.country}</strong></span></span>)}</div></section>
        <section className="profile-card"><span className="eyebrow">LANGUAGES</span><div className="language-list">{profile.languages.map((language) => <div className="language-row" key={language.name}><strong>{language.name}</strong><span>{language.proficiency}</span></div>)}</div></section>
        <section className="profile-card"><span className="eyebrow">OFF THE PITCH</span><div className="tag-list">{profile.hobbies.map((hobby) => <span key={hobby}>{hobby}</span>)}</div></section>
        <section className="profile-card opinion-card"><span className="eyebrow">TEAM OPINION</span><strong>{profile.teamOpinion}<small> / 100</small></strong><div className="status-track"><i style={{ width: `${profile.teamOpinion}%` }} /></div><span className="muted-copy">{profile.teamOpinion >= 80 ? 'Strong relationship with the group' : 'Positive relationship with the group'}</span></section>
        <section className="profile-card character-card"><span className="eyebrow">PERSONALITY & CHARACTER</span><div className="character-traits"><span>Primary Personality: {profile.personality}</span><span>Character Trait: {profile.characterTrait}</span></div></section>
      </div>}

      {section === 'Contracts' && <>
        <section className="profile-card contract-card"><div className="contract-card-heading"><div><span className="eyebrow">ACTIVE CONTRACT</span><h3><ClubReference name={playerClubName(player)} selectedClubName={selectedClubName} onSelectClub={onSelectClub} /></h3></div><span className="active-pill">ACTIVE</span></div>
          <div className="contract-facts"><div><span>WEEKLY WAGE</span><strong>{money(contract.weeklyWage)}</strong></div><div><span>EXPIRES</span><strong>{displayDate(contract.endDate)}</strong></div><div><span>SQUAD ROLE</span><strong>{contract.squadRole}</strong></div>{contract.releaseClause && <div><span>RELEASE CLAUSE</span><strong>{money(contract.releaseClause)}</strong></div>}</div>
          {contract.sponsor ? <div className="sponsor-panel"><span className="sponsor-star">✦</span><div><span>ACTIVE SPONSOR</span><strong>{contract.sponsor.brand}</strong><small>{money(contract.sponsor.annualValue)} / year · ends {displayDate(contract.sponsor.endDate)}</small></div></div> : <div className="sponsor-panel no-sponsor"><div><span>SPONSORSHIP</span><strong>No active sponsor</strong><small>No personal sponsor contract on record</small></div></div>}
        </section>
        <section className="profile-section-block"><div className="profile-subheading"><h3>Interested clubs</h3><span>{contract.interestedClubs.length} TRACKING</span></div>
          <div className="interest-list">{contract.interestedClubs.map((interestedClub) => <div className="interest-row" key={interestedClub.clubName}><ClubReference name={interestedClub.clubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} /><span className="interest-status">{interestedClub.interest}</span><small>{displayDate(interestedClub.lastContact)}</small></div>)}</div>
        </section>
        <section className="profile-section-block"><div className="profile-subheading"><h3>Offer history</h3><span>{contract.offerHistory.length} OFFERS</span></div>
          <div className="offer-table"><div className="offer-table-head"><span>CLUB / DATE</span><span>WAGE</span><span>DECISION</span></div>{contract.offerHistory.map((offer) => <article className="offer-row" key={`${offer.clubName}-${offer.date}`}><div><ClubReference name={offer.clubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} /><small>{displayDate(offer.date)} · {offer.reason}</small></div><strong>{money(offer.weeklyWage)}</strong><span className={`offer-status ${offer.status.toLowerCase()}`}>{offer.status}</span></article>)}</div>
        </section>
      </>}

      {section === 'History' && <>
        <section className="profile-section-block"><div className="profile-subheading"><h3>Transfer history</h3><span>{player.transferHistory.length} MOVES</span></div>
          <div className="timeline">{player.transferHistory.map((move) => <article className="transfer-timeline-row" key={`${move.date}-${move.toClub}`}><span className="timeline-marker" /><div><span className="timeline-date">{displayDate(move.date)} · {move.type}</span><div className="transfer-route"><ClubReference name={move.fromClub} selectedClubName={selectedClubName} onSelectClub={onSelectClub} /><span>→</span><ClubReference name={move.toClub} selectedClubName={selectedClubName} onSelectClub={onSelectClub} /></div></div><strong>{move.fee ? money(move.fee) : 'Free'}</strong></article>)}</div>
        </section>
        <section className="profile-section-block"><div className="profile-subheading"><h3>Season statistics</h3><span>ALL COMPETITIONS</span></div>
          <div className="season-table"><div className="season-table-head"><span>SEASON / CLUB</span><span>APP</span><span>G</span><span>A</span><span>CS</span><span>RAT</span></div>{player.seasonStats.map((season) => <article className="season-row" key={season.season}><div><strong>{season.season}</strong><ClubReference name={season.clubName} selectedClubName={selectedClubName} onSelectClub={onSelectClub} /></div><span>{season.appearances}</span><span>{season.goals}</span><span>{season.assists}</span><span>{season.cleanSheets}</span><strong>{season.averageRating.toFixed(1)}</strong></article>)}</div>
        </section>
        <section className="profile-section-block"><div className="profile-subheading"><h3>Career totals</h3><span>ALL SEASONS</span></div>
          <div className="career-totals">{[['Appearances', player.careerTotals.appearances], ['Goals', player.careerTotals.goals], ['Assists', player.careerTotals.assists], ['Clean sheets', player.careerTotals.cleanSheets], ['Trophies', player.careerTotals.trophies]].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
        </section>
      </>}

      {section === 'Relationships' && <>
        <section className="profile-card relationship-manager"><div><span className="eyebrow">MANAGER RELATIONSHIP</span><strong>Alex Morgan</strong><span>Trust and respect</span></div><strong className="relationship-score">{player.relationships.manager}<small> / 100</small></strong><div className="status-track"><i style={{ width: `${player.relationships.manager}%` }} /></div></section>
        <DressingRoomCard player={player} squad={squad} onSelectPlayer={onSelectPlayer} />
      </>}

      {section === 'Achievements' && <>
        <div className="achievement-summary"><strong>{player.achievements.trophies.length + player.achievements.individualAwards.length + player.achievements.seasonRecognitions.length}</strong><span>CAREER HONOURS</span></div>
        <AchievementList title="Career trophies" achievements={player.achievements.trophies} emptyText="No career trophies recorded yet." />
        <AchievementList title="Individual awards" achievements={player.achievements.individualAwards} emptyText="No individual awards recorded yet." />
        <AchievementList title="Season recognitions" achievements={player.achievements.seasonRecognitions} emptyText="No seasonal recognitions recorded yet." />
      </>}
    </div>
  </div>
}
