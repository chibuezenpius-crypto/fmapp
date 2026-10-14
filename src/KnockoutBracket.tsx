import rawGlobalLeagues from './data/globalLeaguesAndTeams.json'
import Flag from './Flag'
import type { GlobalLeaguesDatabase, InternationalTournament, ProceduralClubBadge } from './types/game'
import ClubBadge from './ClubBadge'

const globalLeagues = rawGlobalLeagues as unknown as GlobalLeaguesDatabase

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
  winner: BracketTeam
}

interface BracketRound {
  name: string
  matches: BracketMatch[]
}

function tournamentCountry(code: string): BracketTeam {
  const country = globalLeagues.countries.find((entry) => entry.countryCode === code)
  return { code: country?.flagCode ?? code, name: country?.countryName ?? code }
}

function scoreSeed(value: string) {
  return [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0)
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
      status: 'SIM',
      winner: resolvedHomeScore >= resolvedAwayScore ? home : away,
    })
  }
  return { name, matches }
}

function qualifiedCountries(tournament: InternationalTournament, bracketSize: number) {
  const groups = tournament.stages.find((stage) => stage.format === 'groups')?.groups ?? []
  const perGroup = groups.length ? Math.ceil(bracketSize / groups.length) : 1
  const qualified = groups.flatMap((group) => group.countryCodes.slice(0, perGroup))
  for (const code of tournament.eligibleCountryCodes) {
    if (qualified.length >= bracketSize) break
    if (!qualified.includes(code)) qualified.push(code)
  }
  return qualified.slice(0, bracketSize).map(tournamentCountry)
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

function FlagTeam({ team, onSelectCountry }: { team: BracketTeam; onSelectCountry?: (country: string) => void }) {
  return <span className="bracket-team">{team.badge ? <ClubBadge badge={team.badge} name={team.name} /> : <Flag code={team.code} countryName={team.name} onSelectCountry={() => onSelectCountry?.(team.name)} />}<strong>{team.name}</strong></span>
}

function BracketMatchCard({ match, onSelectCountry }: { match: BracketMatch; onSelectCountry?: (country: string) => void }) {
  return <article className="bracket-match-card"><div className={match.winner.code === match.home.code ? 'bracket-match-team winner' : 'bracket-match-team'}><FlagTeam team={match.home} onSelectCountry={onSelectCountry} /><b>{match.homeScore}</b></div><div className={match.winner.code === match.away.code ? 'bracket-match-team winner' : 'bracket-match-team'}><FlagTeam team={match.away} onSelectCountry={onSelectCountry} /><b>{match.awayScore}</b></div><span className="bracket-match-status">{match.status}</span></article>
}

function Branch({ side, rounds, onSelectCountry }: { side: 'left' | 'right'; rounds: BracketRound[]; onSelectCountry?: (country: string) => void }) {
  return <div className={`bracket-branch ${side}`}>{rounds.map((round) => <section className="bracket-branch-round" key={`${side}-${round.name}`}><h3>{round.name}</h3>{round.matches.map((match, index) => <BracketMatchCard key={`${side}-${round.name}-${index}`} match={match} onSelectCountry={onSelectCountry} />)}</section>)}</div>
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
  const finalScore = simulateRound([finalHome, finalAway], 'Final', roundNames.length).matches[0]
  const thirdPlace = knockoutStage?.rounds?.find((round) => round.toLowerCase().includes('third-place'))

  return <div className="knockout-bracket-tree">
    <Branch side="left" rounds={left.rounds} onSelectCountry={onSelectCountry} />
    <section className="bracket-center-final"><span className="eyebrow">FINAL</span><svg className="bracket-trophy" aria-hidden="true" viewBox="0 0 48 48"><path d="M15 7h18v8c0 8-4 13-9 13s-9-5-9-13V7Zm0 3H8v3c0 6 3 9 8 9m17-12h7v3c0 6-3 9-8 9M24 28v8m-8 5h16m-13-5h10v5H19z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg><span className="bracket-tournament-title">{title}</span><BracketMatchCard match={finalScore} onSelectCountry={onSelectCountry} /><span className="bracket-season">{season ?? tournament?.season ?? 'FINAL'}</span>{thirdPlace && <small className="bracket-third-place">{thirdPlace}</small>}</section>
    <Branch side="right" rounds={right.rounds} onSelectCountry={onSelectCountry} />
  </div>
}
