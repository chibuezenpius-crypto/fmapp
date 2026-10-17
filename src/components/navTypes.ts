import type { ClubSection } from '../ClubProfile'
import type { Player } from '../types/game'

export type NavTab = 'Home' | 'Academy' | 'Club' | 'Tactics' | 'Transfers' | 'League' | 'Matches'
export type ConfidenceTarget = 'board' | 'fan' | 'manager'

/** Every routing callback the header and dashboard widgets may use; new widgets only need this one prop. */
export interface NavActions {
  onNavigate: (tab: NavTab) => void
  onOpenClubSection: (section: ClubSection) => void
  onOpenConfidence: (view: ConfidenceTarget) => void
  onSelectMatch: (matchId: string) => void
  onSelectPlayer: (player: Player) => void
  onSelectCountry: (country: string) => void
}
