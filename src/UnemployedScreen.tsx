import { useMemo } from 'react'
import ClubBadge from './ClubBadge'
import { advanceDays, resetGame, useGame } from './state/gameStore'
import { generateJobOffers, type JobOffer } from './state/career'
import { clearClubSaveData, readCareer, writeCareer } from './state/saveData'
import { reputationLabel } from './state/dashboard'

const weekOf = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / (7 * 86_400_000))

function OfferCard({ offer, onAccept }: { offer: JobOffer; onAccept: (offer: JobOffer) => void }) {
  return <section className="fin-panel">
    <div className="flex items-center gap-3">
      <ClubBadge badge={offer.badge} name={offer.clubName} size="medium" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-bold text-slate-900">{offer.clubName}</h3>
        <p className="text-xs text-slate-500">{offer.leagueName} · {offer.country}</p>
      </div>
      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{reputationLabel(offer.prestige)}</span>
    </div>
    <p className="mt-2 text-sm text-slate-600">{offer.note} Currently {offer.position}{offer.position === 1 ? 'st' : offer.position === 2 ? 'nd' : offer.position === 3 ? 'rd' : 'th'} in the table. Contract: {offer.years} year{offer.years === 1 ? '' : 's'}.</p>
    <button className="board-meeting-submit" onClick={() => onAccept(offer)} type="button">Accept the job</button>
  </section>
}

/** Shown after resigning: the manager has no club and receives offers sized to his experience until he accepts one. */
export default function UnemployedScreen() {
  const game = useGame()
  const career = readCareer()
  const offers = useMemo(() => generateJobOffers(career.level, `${career.resignedOn ?? 'start'}:${weekOf(game.date)}`, career.previousClubId), [career.level, career.resignedOn, career.previousClubId, game.date])

  const accept = (offer: JobOffer) => {
    writeCareer({ clubId: offer.clubId, status: 'employed', level: career.level, previousClubId: career.previousClubId })
    clearClubSaveData()
    window.location.reload()
  }

  return <div className="app-backdrop">
    <div className="app-shell">
      <main className="main-content">
        <div className="relations-view">
          <header className="fin-panel">
            <span className="eyebrow">UNEMPLOYED</span>
            <h2 className="text-xl font-bold text-slate-900">Looking for a new club</h2>
            <p className="board-meeting-intro">You resigned on {career.resignedOn ?? game.date}. Clubs are watching your career, and your level {career.level} reputation decides who calls. New offers arrive every week.</p>
            <p className="text-xs text-slate-500">Today is {game.date}</p>
          </header>
          {offers.map((offer) => <OfferCard key={offer.clubId} offer={offer} onAccept={accept} />)}
          <div className="board-choice-row">
            <button className="board-choice" onClick={() => advanceDays(7)} type="button"><strong>Wait a week</strong><small>Look for fresh offers</small></button>
            <button className="board-choice" onClick={resetGame} type="button"><strong>Start a new career</strong><small>Erases this save</small></button>
          </div>
          {game.message && <p className="board-result rejected" role="alert">{game.message}</p>}
        </div>
      </main>
    </div>
  </div>
}
