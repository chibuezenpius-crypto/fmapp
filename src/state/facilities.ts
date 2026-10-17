import type { Club } from '../types/game'

export type FacilityUpgrade = 'stadium' | 'training' | 'youth' | 'medical' | 'analysis' | 'scouting'
type Facilities = Club['facilities']
type LevelKey = Exclude<keyof Facilities, 'maxLevel'>

export const FACILITY_ORDER: FacilityUpgrade[] = ['stadium', 'training', 'youth', 'medical', 'analysis', 'scouting']
export const FACILITY_UPGRADE_COSTS: Record<FacilityUpgrade, number> = { stadium: 3200000, training: 2500000, youth: 1800000, medical: 1500000, analysis: 1200000, scouting: 1000000 }
export const FACILITY_LEVEL_KEY: Record<FacilityUpgrade, LevelKey> = { stadium: 'stadiumLevel', training: 'trainingLevel', youth: 'youthLevel', medical: 'medicalLevel', analysis: 'analysisLevel', scouting: 'scoutingLevel' }
export const isFacilityUpgrade = (value: unknown): value is FacilityUpgrade => typeof value === 'string' && value in FACILITY_UPGRADE_COSTS

/** Stadium upgrades add seats and ticket income by this share. */
export const STADIUM_UPGRADE_GROWTH = 0.1

export const facilityLevel = (facilities: Facilities, facility: FacilityUpgrade) => facilities[FACILITY_LEVEL_KEY[facility]]
export const allFacilitiesMaxed = (facilities: Facilities) => FACILITY_ORDER.every((facility) => facilityLevel(facilities, facility) >= facilities.maxLevel)

export type FacilityCondition = 'Poor' | 'Average' | 'Good' | 'Excellent'
export const conditionOf = (level: number): FacilityCondition => level >= 4 ? 'Excellent' : level === 3 ? 'Good' : level === 2 ? 'Average' : 'Poor'

/** Medical centre: every level above 3 shortens injuries by 6%, every level below lengthens them. */
export const injuryDurationScale = (medicalLevel: number) => Math.min(1.2, Math.max(0.8, 1 - (medicalLevel - 3) * 0.06))

/** Training ground and data analysis both speed up how quickly the squad learns a tactic. */
export const trainingGrowthBonus = (facilities: Facilities) => 1 + facilities.trainingLevel * 0.08 + facilities.analysisLevel * 0.05

/** Extra youth-intake places from the scouting network (3 is the baseline). */
export const intakeScoutingBonus = (scoutingLevel: number) => scoutingLevel - 3

export const FACILITY_INFO: Record<FacilityUpgrade, { name: string; place: string; metric: string; effect: string }> = {
  stadium: { name: 'Stadium', place: 'Home ground', metric: 'Capacity', effect: '+10% seats and ticket income per level' },
  training: { name: 'Training Ground', place: 'First-team complex', metric: 'Condition', effect: 'Squad learns tactics faster' },
  youth: { name: 'Youth Academy', place: 'Academy', metric: 'Youth rating', effect: 'Better academy prospects' },
  medical: { name: 'Medical Centre', place: 'Medical department', metric: 'Condition', effect: 'Shorter injuries' },
  analysis: { name: 'Data Analysis', place: 'Performance centre', metric: 'Level', effect: 'Squad learns tactics faster' },
  scouting: { name: 'Scouting Network', place: 'Regional network', metric: 'Coverage', effect: 'Larger youth intakes' },
}
