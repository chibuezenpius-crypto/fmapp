import type { ProceduralClubBadge } from './types/game'

interface ClubBadgeProps {
  name: string
  badge: ProceduralClubBadge
  size?: 'small' | 'medium' | 'large'
}

export default function ClubBadge({ name, badge, size = 'small' }: ClubBadgeProps) {
  return <span aria-label={`${name} badge`} className={`club-badge ${size}`} role="img"><svg aria-hidden="true" viewBox={badge.viewBox}><path d="M4 4h40v29c0 9-8 15-20 19C12 48 4 42 4 33V4z" fill={badge.primaryColor} /><path d="M4 4h40v8H4zM10 12h6v26h-6z" fill={badge.secondaryColor} /><text fill={badge.secondaryColor} fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700" textAnchor="middle" x="24" y="31">{badge.initials}</text></svg></span>
}
