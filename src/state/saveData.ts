/** Dependency-free save helpers shared by the data layer, the stores and the career flow. Safe to import anywhere (tests included). */
export const SAVE_PREFIX = 'fmapp-'
export const CAREER_KEY = 'fmapp-career-v1'
export const HISTORY_KEY = 'fmapp-season-history-v1'
export const DATE_KEY = 'fmapp-game-date-v4'
export const SIMULATED_MATCHES_KEY = 'fmapp-simulated-matches-v5'
export const PLAYER_CONDITION_KEY = 'fmapp-player-condition-v1'
export const SHORTLIST_KEY = 'fmapp-transfer-shortlist'
export const ECONOMY_KEY = 'fmapp-economy-v1'

/** Keys describing the shared football world; they survive a change of club. Everything else belongs to one club. */
const WORLD_KEYS = new Set([CAREER_KEY, HISTORY_KEY, DATE_KEY, SIMULATED_MATCHES_KEY, PLAYER_CONDITION_KEY, SHORTLIST_KEY])

export const DEFAULT_CLUB_ID = 'nga-06'

export interface CareerState {
  clubId: string
  status: 'employed' | 'unemployed'
  /** Manager level when the job was left; job offers are sized from it. */
  level: number
  previousClubId?: string
  resignedOn?: string
}

const storage = () => (typeof window === 'undefined' ? null : window.localStorage)

export function readCareer(): CareerState {
  const fallback: CareerState = { clubId: DEFAULT_CLUB_ID, status: 'employed', level: 12 }
  try {
    const raw = storage()?.getItem(CAREER_KEY)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback
    const value = parsed as Record<string, unknown>
    if (typeof value.clubId !== 'string' || (value.status !== 'employed' && value.status !== 'unemployed') || !Number.isFinite(value.level)) return fallback
    return {
      clubId: value.clubId, status: value.status, level: Number(value.level),
      ...(typeof value.previousClubId === 'string' ? { previousClubId: value.previousClubId } : {}),
      ...(typeof value.resignedOn === 'string' ? { resignedOn: value.resignedOn } : {}),
    }
  } catch {
    return fallback
  }
}

export function writeCareer(state: CareerState) {
  storage()?.setItem(CAREER_KEY, JSON.stringify(state))
}

export function readSeasonsElapsed(): number {
  try {
    const parsed: unknown = JSON.parse(storage()?.getItem(HISTORY_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

function removeKeys(keep: (key: string) => boolean) {
  const store = storage()
  if (!store) return
  const doomed: string[] = []
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index)
    if (key?.startsWith(SAVE_PREFIX) && !keep(key)) doomed.push(key)
  }
  doomed.forEach((key) => store.removeItem(key))
}

/** Wipes every `fmapp-*` key, including any added in the future. */
export const clearAllSaveData = () => removeKeys(() => false)

/** Clears everything that belongs to the club being left (ledger, tactics, sponsors, training, academy, economy...). */
export const clearClubSaveData = () => removeKeys((key) => WORLD_KEYS.has(key))
