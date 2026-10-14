import type { Player } from '../types/game'

export function positionFit(playerPosition: string, slotPosition: string) {
  if (playerPosition === slotPosition) return 3
  if (slotPosition.startsWith('D') && playerPosition.startsWith('D')) return 2
  if (slotPosition === 'DM' && playerPosition === 'M (C)') return 1
  if (slotPosition === 'M (C)' && ['DM', 'AM (C)'].includes(playerPosition)) return 1
  if (slotPosition.startsWith('M') && playerPosition.startsWith('D')) return 1
  if (slotPosition === 'ST (C)' && playerPosition === 'AM (C)') return 1
  return 0
}

export function fitPlayersToSlots(slots: { position: string }[], availablePlayers: Player[], preferredIds: Set<string> = new Set()) {
  const remaining = [...availablePlayers]
  const score = (player: Player, slot: { position: string }) => positionFit(player.position, slot.position) * 100 + player.overall + player.fitness * 0.05 + (preferredIds.has(player.id) ? 5 : 0)
  return slots.map((slot) => {
    const selected = [...remaining].sort((first, second) => score(second, slot) - score(first, slot))[0]
    if (!selected) return null
    remaining.splice(remaining.findIndex((player) => player.id === selected.id), 1)
    return selected
  }).filter((player): player is Player => player !== null).map((player) => player.id)
}

// Slot order matches the 4-3-3 formation used by the Tactics hub.
export const DEFAULT_SLOTS = [
  { position: 'GK', label: 'GK', x: 50, y: 91 },
  { position: 'D (R)', label: 'RB', x: 84, y: 77 },
  { position: 'D (C)', label: 'CB', x: 62, y: 78 },
  { position: 'D (C)', label: 'CB', x: 38, y: 78 },
  { position: 'D (L)', label: 'LB', x: 16, y: 77 },
  { position: 'DM', label: 'DM', x: 50, y: 63 },
  { position: 'M (C)', label: 'CM', x: 64, y: 53 },
  { position: 'M (C)', label: 'CM', x: 36, y: 53 },
  { position: 'M (R)', label: 'RW', x: 83, y: 35 },
  { position: 'ST (C)', label: 'ST', x: 50, y: 28 },
  { position: 'M (L)', label: 'LW', x: 17, y: 35 },
]
