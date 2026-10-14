import { findWorldCountry } from './worldCountries'
import Flag from './Flag'
import type { InternationalTournament, ProceduralClubBadge } from './types/game'
import ClubBadge from './ClubBadge'

interface BracketTeam {
  code: string
  name: string
  badge?: ProceduralClubBadge
}

interface KnockoutBracketProps {
  tournament?: InternationalTournament
  participants?: BracketTeam[]
  roundNames?: string[]
  title: string
  season?: string
  onSelectCountry?: (country: string) => void
}

interface BracketMatch {
  home: BracketTeam
  away: BracketTeam
  homeScore: number
  awayScore: number
  status: string
  date: string
  winner: BracketTeam
}

interface BracketRound {
  name: string
  matches: BracketMatch[]
}

function tournamentCountry(code: string): BracketTeam {
  const country = findWorldCountry(code)
  return { code: country?.flagCode ?? code, name: country?.name ?? code }
}

function scoreSeed(value: string) {
  return [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function matchDate(roundIndex: number, matchIndex: number) {
  const date = new Date(Date.UTC(2026, 5, 28 + roundIndex * 4 + (matchIndex % 3)))
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${WEEKDAYS[date.getUTCDay()]}`
}

function simulateRound(teams: BracketTeam[], name: string, roundIndex: number): BracketRound {
  const matches: BracketMatch[] = []
  for (let index = 0; index + 1 < teams.length; index += 2) {
    const home = teams[index]
    const away = teams[index + 1]
    const seed = scoreSeed(`${name}-${home.code}-${away.code}-${roundIndex}`)
    const homeScore = seed % 4
    const awayScore = (seed >> 2) % 3
    const resolvedHomeScore = homeScore === awayScore ? homeScore + 1 : homeScore
    const resolvedAwayScore = homeScore === awayScore ? awayScore : awayScore
    matches.push({
      home,
      away,
      homeScore: resolvedHomeScore,
      awayScore: resolvedAwayScore,
      status: 'FT',
      date: matchDate(roundIndex, index / 2),
      winner: resolvedHomeScore >= resolvedAwayScore ? home : away,
    })
  }
  return { name, matches }
}

function qualifiedCountries(tournament: InternationalTournament, bracketSize: number) {
  const groups = tournament.stages.find((stage) => stage.format === 'groups')?.groups ?? []
  const qualified: string[] = []
  const deepest = Math.max(0, ...groups.map((group) => group.countryCodes.length))
  // Take every group's winner first, then runners-up, and so on until the bracket is full
  for (let rank = 0; rank < deepest && qualified.length < bracketSize; rank += 1) {
    for (const group of groups) {
      const code = group.countryCodes[rank]
      if (code && qualified.length < bracketSize) qualified.push(code)
    }
  }
  for (const code of tournament.qualifiedCountryCodes ?? tournament.eligibleCountryCodes) {
    if (qualified.length >= bracketSize) break
    if (!qualified.includes(code)) qualified.push(code)
  }
  // Pair the strongest qualifiers with the weakest so winners don't meet early
  const paired = Array.from({ length: Math.floor(qualified.length / 2) }, (_, index) => [qualified[index], qualified[qualified.length - 1 - index]]).flat()
  return paired.map(tournamentCountry)
}

function buildBranch(teams: BracketTeam[], roundNames: string[]) {
  let advancing = teams
  const rounds: BracketRound[] = []
  for (let index = 0; index < roundNames.length && advancing.length > 1; index += 1) {
    const round = simulateRound(advancing, roundNames[index], index)
    rounds.push(round)
    advancing = round.matches.map((match) => match.winner)
  }
  return { rounds, finalist: advancing[0] }
}

function TeamRow({ team, score, won, onSelectCountry }: { team: BracketTeam; score: number; won: boolean; onSelectCountry?: (country: string) => void }) {
  return <div className={`flex items-center gap-2 ${won ? 'font-bold' : 'text-slate-500'}`}>
    {team.badge ? <ClubBadge badge={team.badge} name={team.name} /> : <Flag code={team.code} countryName={team.name} onSelectCountry={(name) => onSelectCountry?.(name)} />}
    <span className="min-w-0 flex-1 truncate text-xs">{team.name}</span>
    <b className="text-sm tabular-nums">{score}</b>
  </div>
}

function BracketMatchCard({ match, onSelectCountry }: { match: BracketMatch; onSelectCountry?: (country: string) => void }) {
  return <article className="w-40 shrink-0 rounded-2xl border border-[#cfd9f0] bg-white p-3 text-slate-800 shadow-sm">
    <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400"><span>{match.date}</span><span>{match.status}</span></div>
    <div className="space-y-1.5">
      <TeamRow team={match.home} score={match.homeScore} won={match.winner.code === match.home.code} onSelectCountry={onSelectCountry} />
      <TeamRow team={match.away} score={match.awayScore} won={match.winner.code === match.away.code} onSelectCountry={onSelectCountry} />
    </div>
  </article>
}

function Trophy() {
  return <svg aria-hidden="true" className="h-20 w-20 drop-shadow-[0_2px_6px_rgba(202,138,4,0.35)]" viewBox="0 0 64 64">
    <path d="M18 8h28v14c0 10-6 17-14 17S18 32 18 22V8Z" fill="#facc15" />
    <path d="M18 12H8v5c0 7 4 11 11 12M46 12h10v5c0 7-4 11-11 12" fill="none" stroke="#eab308" strokeLinecap="round" strokeWidth="3" />
    <path d="M29 39h6v8h-6z" fill="#eab308" />
    <path d="M20 47h24v8H20z" fill="#ca8a04" />
    <path d="M24 12v10c0 5 2 9 5 11" fill="none" stroke="#fef08a" strokeLinecap="round" strokeWidth="2.5" />
  </svg>
}

function Branch({ side, rounds, onSelectCountry }: { side: 'left' | 'right'; rounds: BracketRound[]; onSelectCountry?: (country: string) => void }) {
  const left = side === 'left'
  const ordered = left ? rounds : [...rounds].reverse()
  const line = 'border-[#b0bee0]'
  return <div className="flex">
    {ordered.map((round) => {
      const roundIndex = rounds.indexOf(round)
      const hasPrev = roundIndex > 0
      const paired = round.matches.length > 1
      const prevEdge = left ? 'left-0 border-t' : 'right-0 border-t'
      return <section className="flex flex-col" key={`${side}-${round.name}`}>
        <h3 className="mb-2 px-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#223257]">{round.name}</h3>
        <div className="flex flex-1 flex-col">
          {round.matches.map((match, index) => <div className="relative flex flex-1 items-center justify-center px-4 py-1.5" key={`${side}-${round.name}-${index}`}>
            {hasPrev && <span className={`absolute top-1/2 w-4 ${prevEdge} ${line}`} />}
            <BracketMatchCard match={match} onSelectCountry={onSelectCountry} />
            <span className={`absolute top-1/2 w-4 border-t ${line} ${left ? 'right-0' : 'left-0'} ${paired && index % 2 === 0 ? `h-full ${left ? 'border-r' : 'border-l'}` : ''}`} />
            {paired && index % 2 === 1 && <span className={`absolute bottom-1/2 h-1/2 w-4 ${left ? 'right-0 border-r' : 'left-0 border-l'} ${line}`} />}
          </div>)}
        </div>
      </section>
    })}
  </div>
}

export default function KnockoutBracket({ tournament, participants = [], roundNames: configuredRounds, title, season, onSelectCountry }: KnockoutBracketProps) {
  const knockoutStage = tournament?.stages.find((stage) => stage.format === 'knockout')
  const roundNames = (configuredRounds ?? knockoutStage?.rounds ?? []).filter((round) => !round.toLowerCase().includes('third-place'))
  const bracketSize = 2 ** roundNames.length
  const entrants = tournament ? qualifiedCountries(tournament, Math.min(bracketSize, tournament.eligibleCountryCodes.length)) : participants.slice(0, bracketSize)
  const leftCount = Math.ceil(entrants.length / 2)
  const left = buildBranch(entrants.slice(0, leftCount), roundNames.slice(0, -1))
  const right = buildBranch(entrants.slice(leftCount), roundNames.slice(0, -1))
  const finalHome = left.finalist ?? entrants[0]
  const finalAway = right.finalist ?? entrants[1] ?? entrants[0]
  const thirdPlace = knockoutStage?.rounds?.find((round) => round.toLowerCase().includes('third-place'))

  if (!finalHome || !finalAway) return <p className="rounded-2xl border border-[#cfd9f0] bg-white p-4 text-center text-sm text-slate-500">Bracket not available yet.</p>
  const finalMatch = simulateRound([finalHome, finalAway], 'Final', roundNames.length).matches[0]

  return <div className="overflow-x-auto rounded-[20px] border border-[#cfd9f0] bg-[#e6ebf8] p-3 snap-x" aria-label={`${title} knockout bracket`}>
    <div className="flex min-w-max items-stretch">
      <Branch side="left" rounds={left.rounds} onSelectCountry={onSelectCountry} />
      <section className="relative flex snap-center flex-col items-center justify-center gap-2 px-4">
        <span className={`absolute left-0 top-1/2 w-4 border-t ${left.rounds.length ? 'border-[#b0bee0]' : 'border-transparent'}`} />
        <span className={`absolute right-0 top-1/2 w-4 border-t ${right.rounds.length ? 'border-[#b0bee0]' : 'border-transparent'}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0030a0]">Final</span>
        <Trophy />
        <span className="max-w-40 text-center text-xs font-bold text-[#0f172a]">{title}</span>
        <BracketMatchCard match={finalMatch} onSelectCountry={onSelectCountry} />
        <span className="text-[10px] text-slate-400">{season ?? tournament?.season ?? ''}</span>
        {thirdPlace && <small className="text-[10px] text-slate-500">{thirdPlace}</small>}
      </section>
      <Branch side="right" rounds={right.rounds} onSelectCountry={onSelectCountry} />
    </div>
  </div>
}

