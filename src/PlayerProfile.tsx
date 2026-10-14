import type { Player, PlayerAttributes, PlayerAchievement } from './types/game'
import { squad } from './data/mockData'
import Flag from './Flag'

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
const ratingTone = (rating: number) => rating >= 15 ? 'positive' : rating < 9 ? 'negative' : 'neutral'

function ClubReference({ name, selectedClubName, onSelectClub }: { name: string; selectedClubName: string | null; onSelectClub: (name: string) => void }) {
  return <button aria-pressed={selectedClubName === name} className={`entity-link ${selectedClubName === name ? 'selected' : ''}`} onClick={() => onSelectClub(name)} type="button">{name}</button>
}

function PlayerReference({ player, onSelectPlayer }: { player: Player; onSelectPlayer: (player: Player) => void }) {
  return <button className="entity-link" onClick={() => onSelectPlayer(player)} type="button">{player.name}</button>
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return <div className="attribute-row"><span>{label}</span><div className="attribute-track"><i className={ratingTone(value)} style={{ width: `${value * 5}%` }} /></div><strong className={ratingTone(value)}>{value}</strong></div>
}

function AchievementList({ title, achievements, emptyText }: { title: string; achievements: PlayerAchievement[]; emptyText: string }) {
  return <section className="profile-section-block"><div className="profile-subheading"><h3>{title}</h3><span>{achievements.length}</span></div>
    {achievements.length > 0 ? <div className="achievement-list">{achievements.map((achievement) => <article className="achievement-row" key={`${achievement.title}-${achievement.season}`}>
      <span className="achievement-mark">{achievement.title.slice(0, 1)}</span><div><strong>{achievement.title}</strong><span>{achievement.detail}</span></div><small>{achievement.season}</small>
    </article>)}</div> : <p className="empty-note">{emptyText}</p>}
  </section>
}

export default function PlayerProfile({ player, section, selectedClubName, onSectionChange, onSelectClub, onSelectPlayer, onSelectCountry }: PlayerProfileProps) {
  const profile = player.personalInfo
  const contract = player.contract
  const averageRating = player.seasonStats.at(-1)?.averageRating ?? player.form

  return <div className="player-profile">
    <section className="profile-hero">
      <div className="profile-jersey">{String(player.shirtNumber).padStart(2, '0')}</div>
      <div className="profile-player-info"><span className="eyebrow">{player.position} · {player.age} YEARS</span><h1>{player.name}</h1>
        <div className="profile-clubline"><ClubReference name="Northbridge FC" selectedClubName={selectedClubName} onSelectClub={onSelectClub} /><span>·</span><span>{player.contract.squadRole}</span></div>
      </div>
      <div className="profile-overall"><strong>{player.overall}</strong><span>OVR</span></div>
    </section>

    <div className="profile-status-strip">
      <div><span>FITNESS</span><strong>{player.fitness}%</strong><div className="status-track"><i style={{ width: `${player.fitness}%` }} /></div></div>
      <div><span>FORM</span><strong>{player.form.toFixed(1)} <small>/ 10</small></strong><div className="status-track"><i style={{ width: `${player.form * 10}%` }} /></div></div>
      <div><span>MOOD</span><strong className={`mood-badge mood-${player.morale.toLowerCase().replace(' ', '-')}`}>{player.morale}</strong></div>
    </div>

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
        <section className="profile-card contract-card"><div className="contract-card-heading"><div><span className="eyebrow">ACTIVE CONTRACT</span><h3><ClubReference name="Northbridge FC" selectedClubName={selectedClubName} onSelectClub={onSelectClub} /></h3></div><span className="active-pill">ACTIVE</span></div>
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
        <section className="profile-section-block"><div className="profile-subheading"><h3>Teammates</h3><span>{player.relationships.teammates.length} CONNECTIONS</span></div>
          <div className="relationship-list">{player.relationships.teammates.map((teammate) => { const squadMate = squad.find((candidate) => candidate.name === teammate.playerName); return <div className="relationship-row" key={teammate.playerName}><div className="relationship-avatar">{teammate.playerName.split(' ').map((part) => part[0]).join('')}</div><div className="relationship-person">{squadMate ? <PlayerReference player={squadMate} onSelectPlayer={onSelectPlayer} /> : <strong>{teammate.playerName}</strong>}<span>{teammate.note}</span></div><div className="relationship-meter"><i style={{ width: `${teammate.relationship}%` }} /></div><strong>{teammate.relationship}</strong></div>})}</div>
        </section>
        <div className="profile-card-grid"><section className="profile-card"><span className="eyebrow">FAVORITE PERSONNEL</span><div className="name-stack">{player.relationships.favoritePersonnel.map((name) => { const squadMate = squad.find((candidate) => candidate.name === name); return squadMate ? <PlayerReference key={name} player={squadMate} onSelectPlayer={onSelectPlayer} /> : <strong key={name}>{name}</strong> })}</div></section>
          <section className="profile-card"><span className="eyebrow">DISLIKED PERSONNEL</span><div className="name-stack negative-stack">{player.relationships.dislikedPersonnel.map((name) => <strong key={name}>{name}</strong>)}</div></section></div>
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
