import rawNameDatabase from '../data/names/globalNameDatabase.json'
import rawWorldCountries from '../data/worldCountries.json'
import rawLeagues from '../data/globalLeaguesAndTeams.json'
import rawCulture from '../data/playerCulture.json'
import type { Player, PlayerAttributes, PlayerPersonalInfo, PlayerPosition, PlayerSeasonStats } from '../types/game'

type Proficiency = PlayerPersonalInfo['languages'][number]['proficiency']
type Random = () => number
type AttributeKey = keyof PlayerAttributes

interface LanguagePool { name: string; fluencyRates: Partial<Record<Proficiency, number>> }
interface NameRegion { name: string; weight?: number; cities?: string[]; regionalLanguages?: LanguagePool[]; firstNames: string[]; lastNames: string[] }
interface NameCountry {
  countryName: string
  code: string
  iso2: string
  supplemental?: boolean
  commonSecondaryCountries: { code: string; countryName: string; probability: number }[]
  defaultLanguages: LanguagePool[]
  subRegions: Record<string, NameRegion>
}
interface WorldCountry { code: string; name: string; flagCode: string; confederation: string }
interface LeagueTeam { id: string; name: string }
interface LeagueCountry { id: string; name: string; countryCode: string; teams: LeagueTeam[] }
interface Culture {
  nameCultureByConfederation: Record<string, string>
  nameCultureByCountry: Record<string, string>
  languagesByCountry: Record<string, string[]>
  cultureTagByConfederation: Record<string, string>
  cultureTagByCountry: Record<string, string>
  universalHobbies: string[]
  hobbiesByTag: Record<string, string[]>
}

export interface GeneratePlayerIdentityOptions {
  birthCountryCode: string
  birthRegionKey?: string
  secondaryCountryCode?: string
  nationalTeamCode?: string
  secondaryNationalityChance?: number
  crossCulturalSurnameChance?: number
  mixedHeritage?: boolean
  random?: Random
}

export interface GeneratedPlayerIdentity {
  name: string
  firstName: string
  surname: string
  birthCountry: string
  birthCountryCode: string
  birthRegionKey: string
  placeOfBirth: string
  firstNameCultureCode: string
  surnameCultureCode: string
  nationalities: PlayerPersonalInfo['nationalities']
  languages: PlayerPersonalInfo['languages']
  nationalTeamRepresentation: { country: string; code: string }
}

export interface PlayerGenerationOptions {
  /** Same seed + same options always produce the same player. Ignored when `random` is supplied. */
  seed?: number | string
  random?: Random
  ageRange?: readonly [number, number]
  /** Birth/primary nationality: world country code ("NGA"), ISO2 ("NG") or name ("Nigeria"). */
  nationality?: string
  secondaryNationality?: string
  mixedHeritage?: boolean
  birthRegionKey?: string
  position?: PlayerPosition
  targetOVR?: number
  /** Team id from globalLeaguesAndTeams.json (e.g. "nga-01"). Omit for a free agent. */
  clubId?: string
  shirtNumber?: number
  /** ISO date used as "today" (defaults to the in-game start date). */
  currentDate?: string
  /** Names of squad-mates / staff so group relationships can reference real people. */
  teammateNames?: string[]
  personnelNames?: string[]
}

const DEFAULT_DATE = '2026-10-14'
const FREE_AGENT_ID = 'free-agent'

const nameDatabase = (rawNameDatabase as unknown as { countries: Record<string, NameCountry> }).countries
const worldList = (rawWorldCountries as { countries: WorldCountry[] }).countries
const leagueList = (rawLeagues as unknown as { countries: LeagueCountry[] }).countries
const culture = rawCulture as unknown as Culture

const uniqueClean = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))]

// Indexes: every lookup below is O(1).
const worldByCode = new Map(worldList.map((country) => [country.code, country]))
const countryLookup = new Map<string, string>()
for (const country of worldList) {
  countryLookup.set(country.code.toLowerCase(), country.code)
  countryLookup.set(country.name.toLowerCase(), country.code)
}
const nameCountries = new Map<string, NameCountry>()
for (const [code, country] of Object.entries(nameDatabase)) {
  nameCountries.set(code, {
    ...country,
    subRegions: Object.fromEntries(Object.entries(country.subRegions).map(([key, region]) => [key, { ...region, firstNames: uniqueClean(region.firstNames), lastNames: uniqueClean(region.lastNames) }])),
  })
  countryLookup.set(country.iso2.toLowerCase(), code)
}
const clubIndex = new Map<string, { id: string; name: string; countryCode: string }>()
const clubsByCountry = new Map<string, string[]>()
for (const league of leagueList) {
  for (const team of league.teams) {
    clubIndex.set(team.id, { id: team.id, name: team.name, countryCode: league.countryCode })
    clubsByCountry.set(league.countryCode, [...(clubsByCountry.get(league.countryCode) ?? []), team.id])
  }
}

const majorFootballHubs = new Set(['NGA', 'ENG', 'ESP', 'FRA', 'GER', 'ITA', 'POR', 'BRA', 'ARG', 'COL', 'GHA', 'SEN', 'CIV', 'CMR', 'MAR', 'EGY'])
const confederationWeight: Record<string, number> = { Europe: 2, Africa: 2, 'South America': 2.5, 'North America': 1, Asia: 1, Oceania: 0.5 }
const nationalityPool = worldList.map((country) => ({
  code: country.code,
  weight: majorFootballHubs.has(country.code) ? 10 : nameCountries.has(country.code) && !nameCountries.get(country.code)?.supplemental ? 5 : confederationWeight[country.confederation] ?? 1,
}))

const proficiencyRank: Record<Proficiency, number> = { Basic: 0, Conversational: 1, Fluent: 2, Native: 3 }
const proficiencies = Object.keys(proficiencyRank) as Proficiency[]

// ---------------------------------------------------------------- randomness

export function createRng(seed: number | string): Random {
  let h = 1779033703 ^ String(seed).length
  for (const char of String(seed)) {
    h = Math.imul(h ^ char.charCodeAt(0), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let state = (Math.imul(h ^ (h >>> 16), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const unit = (random: Random) => Math.min(Math.max(random(), 0), 0.999999999999)
const chance = (random: Random, probability: number) => unit(random) < probability
const between = (random: Random, min: number, max: number) => min + unit(random) * (max - min)
const intBetween = (random: Random, min: number, max: number) => Math.floor(between(random, min, max + 1))
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const pick = <T,>(values: readonly T[], random: Random): T => values[Math.floor(unit(random) * values.length)]

function gaussian(random: Random) {
  return Math.sqrt(-2 * Math.log(1 - unit(random))) * Math.cos(2 * Math.PI * unit(random))
}

function pickWeighted<T>(values: readonly T[], getWeight: (value: T) => number, random: Random): T | undefined {
  if (!values.length) return undefined
  const total = values.reduce((sum, value) => sum + Math.max(0, getWeight(value)), 0)
  if (total <= 0) return pick(values, random)
  let cursor = unit(random) * total
  for (const value of values) {
    cursor -= Math.max(0, getWeight(value))
    if (cursor < 0) return value
  }
  return values.at(-1)
}

function pickMany<T>(values: readonly T[], count: number, random: Random): T[] {
  const pool = [...values]
  const result: T[] = []
  while (result.length < count && pool.length) result.push(pool.splice(Math.floor(unit(random) * pool.length), 1)[0])
  return result
}

// ------------------------------------------------------------ country lookup

export function resolveCountryCode(codeOrName: string): string | undefined {
  return countryLookup.get(codeOrName.trim().toLowerCase())
}

function requireCountry(codeOrName: string, label: string) {
  const code = resolveCountryCode(codeOrName)
  const country = code ? worldByCode.get(code) : undefined
  if (!country) throw new RangeError(`Unknown ${label} "${codeOrName}".`)
  return country
}

/** Country whose name pools supply names for a nation (itself, or the closest culture). */
function nameCultureCode(country: WorldCountry) {
  if (nameCountries.has(country.code)) return country.code
  const override = culture.nameCultureByCountry[country.code]
  return override && nameCountries.has(override) ? override : culture.nameCultureByConfederation[country.confederation] ?? 'ENG'
}

function chooseRegion(country: NameCountry, requestedKey: string | undefined, random: Random) {
  if (requestedKey) {
    const region = country.subRegions[requestedKey]
    if (!region) throw new RangeError(`Unknown sub-region "${requestedKey}" for ${country.countryName}.`)
    return [requestedKey, region] as const
  }
  const entries = Object.entries(country.subRegions)
  const selected = pickWeighted(entries, ([, region]) => region.weight ?? 1, random) ?? entries[0]
  if (!selected) throw new Error(`${country.countryName} has no name sub-regions.`)
  return selected
}

function chooseProficiency(rates: Partial<Record<Proficiency, number>>, random: Random): Proficiency {
  const entries = proficiencies.map((proficiency) => ({ proficiency, rate: rates[proficiency] ?? 0 })).filter((entry) => entry.rate > 0)
  return pickWeighted(entries, (entry) => entry.rate, random)?.proficiency ?? 'Conversational'
}

function collectLanguages(country: WorldCountry, region: NameRegion | undefined, random: Random) {
  const languages = new Map<string, Proficiency>()
  const add = (name: string, proficiency: Proficiency) => {
    const existing = languages.get(name)
    if (!existing || proficiencyRank[proficiency] > proficiencyRank[existing]) languages.set(name, proficiency)
  }
  const nameCountry = nameCountries.get(country.code)
  if (nameCountry) {
    for (const language of [...nameCountry.defaultLanguages, ...(region?.regionalLanguages ?? [])]) add(language.name, chooseProficiency(language.fluencyRates, random))
    return languages
  }
  const own = culture.languagesByCountry[country.code]
  if (own?.length) {
    own.forEach((name, index) => add(name, index === 0 ? 'Native' : chooseProficiency({ Native: 0.3, Fluent: 0.5, Conversational: 0.2 }, random)))
    return languages
  }
  for (const language of nameCountries.get(nameCultureCode(country))?.defaultLanguages ?? []) add(language.name, chooseProficiency(language.fluencyRates, random))
  return languages
}

const mergeLanguages = (...sources: Map<string, Proficiency>[]) => {
  const merged = new Map<string, Proficiency>()
  for (const source of sources) {
    for (const [name, proficiency] of source) {
      const existing = merged.get(name)
      if (!existing || proficiencyRank[proficiency] > proficiencyRank[existing]) merged.set(name, proficiency)
    }
  }
  return [...merged].map(([name, proficiency]) => ({ name, proficiency }))
}

function chooseSecondaryCountry(primary: WorldCountry, options: GeneratePlayerIdentityOptions, random: Random) {
  if (options.secondaryCountryCode) {
    const explicit = requireCountry(options.secondaryCountryCode, 'secondary country code')
    return explicit.code === primary.code ? undefined : explicit
  }
  const links = nameCountries.get(primary.code)?.commonSecondaryCountries.filter((link) => worldByCode.has(link.code)) ?? []
  if (!links.length) return undefined
  const defaultChance = majorFootballHubs.has(primary.code) ? 0.25 : 0.08
  if (!options.mixedHeritage && !chance(random, clamp(options.secondaryNationalityChance ?? defaultChance, 0, 1))) return undefined
  const link = pickWeighted(links, (item) => item.probability, random)
  return link ? worldByCode.get(link.code) : undefined
}

// -------------------------------------------------------------------- names

export function generatePlayerIdentity(options: GeneratePlayerIdentityOptions): GeneratedPlayerIdentity {
  const random = options.random ?? Math.random
  const primary = requireCountry(options.birthCountryCode, 'birth country code')
  const primaryCulture = nameCountries.get(nameCultureCode(primary))!
  const [birthRegionKey, birthRegion] = chooseRegion(primaryCulture, options.birthRegionKey, random)
  const secondary = chooseSecondaryCountry(primary, options, random)
  const secondaryCulture = secondary ? nameCountries.get(nameCultureCode(secondary)) : undefined
  const secondaryRegion = secondaryCulture ? chooseRegion(secondaryCulture, undefined, random)[1] : undefined
  const blendSurname = Boolean(secondaryCulture && secondaryRegion && chance(random, clamp(options.crossCulturalSurnameChance ?? 0.7, 0, 1)))
  const surnameCulture = blendSurname ? secondaryCulture! : primaryCulture
  const surnameRegion = blendSurname ? secondaryRegion! : birthRegion
  const firstName = pick(birthRegion.firstNames, random)
  const surname = pick(surnameRegion.lastNames, random)

  const nationalities: PlayerPersonalInfo['nationalities'] = [
    { country: primary.name, code: primary.code, type: 'Primary' },
    ...(secondary ? [{ country: secondary.name, code: secondary.code, type: 'Secondary' as const }] : []),
  ]
  const requestedTeam = options.nationalTeamCode ? requireCountry(options.nationalTeamCode, 'national team code') : undefined
  const represented = requestedTeam ? nationalities.find((nationality) => nationality.code === requestedTeam.code) : nationalities[0]
  if (!represented) throw new RangeError(`National team ${options.nationalTeamCode} must match a generated nationality.`)

  // Name pools only describe a real birth city when the birth country has its own pool.
  const hasOwnPool = nameCountries.has(primary.code)
  const city = hasOwnPool && birthRegion.cities?.length ? pick(birthRegion.cities, random) : undefined
  return {
    name: `${firstName} ${surname}`,
    firstName,
    surname,
    birthCountry: primary.name,
    birthCountryCode: primary.code,
    birthRegionKey,
    placeOfBirth: city ? `${city}, ${primary.name}` : primary.name,
    firstNameCultureCode: primaryCulture.code,
    surnameCultureCode: surnameCulture.code,
    nationalities,
    languages: mergeLanguages(collectLanguages(primary, hasOwnPool ? birthRegion : undefined, random), secondary ? collectLanguages(secondary, secondaryRegion, random) : new Map()),
    nationalTeamRepresentation: { country: represented.country, code: represented.code },
  }
}

export function applyGeneratedIdentity(personalInfo: PlayerPersonalInfo, identity: GeneratedPlayerIdentity): PlayerPersonalInfo {
  return {
    ...personalInfo,
    placeOfBirth: identity.placeOfBirth,
    nationalities: identity.nationalities,
    languages: identity.languages,
    nationalTeamRepresentation: identity.nationalTeamRepresentation,
  }
}

// ------------------------------------------------------------------ hobbies

function generateHobbies(countryCode: string, random: Random) {
  const country = worldByCode.get(countryCode)
  const tag = culture.cultureTagByCountry[countryCode] ?? (country ? culture.cultureTagByConfederation[country.confederation] : undefined)
  const local = pickMany(culture.hobbiesByTag[tag ?? ''] ?? [], intBetween(random, 1, 2), random)
  const general = pickMany(culture.universalHobbies.filter((hobby) => !local.includes(hobby)), 3 - local.length, random)
  return [...local, ...general]
}

// ------------------------------------------------------------- personality

interface Archetype {
  name: string
  weight: (age: number, overall: number) => number
  traits: Record<string, number>
  morale: number
  manager: number
  opinion: number
  mood: string
}

const archetypes: Archetype[] = [
  { name: 'Model Professional', weight: () => 18, traits: { Consistent: 4, Loyal: 2, 'Team Player': 2, 'Loves the Club': 2 }, morale: 72, manager: 82, opinion: 78, mood: 'Focused' },
  { name: 'Resilient Leader', weight: (age, ovr) => (age >= 26 && ovr >= 68 ? 14 : 1.5), traits: { 'Big Game Player': 4, Loyal: 3, Consistent: 3, 'Team Player': 3 }, morale: 76, manager: 80, opinion: 88, mood: 'Driven' },
  { name: 'Ambitious Youth', weight: (age) => (age <= 21 ? 24 : 0.3), traits: { 'Big Game Player': 2, Inconsistent: 3, 'Money Motivated': 2, 'Media Savvy': 2 }, morale: 68, manager: 70, opinion: 66, mood: 'Hungry for Minutes' },
  { name: 'Mercenary', weight: () => 8, traits: { 'Money Motivated': 6, Inconsistent: 2, 'Media Savvy': 1 }, morale: 55, manager: 55, opinion: 52, mood: 'Eyeing a Move' },
  { name: 'Free Spirit', weight: () => 8, traits: { Inconsistent: 4, 'Media Savvy': 3, 'Big Game Player': 2, 'Hot-Headed': 1 }, morale: 66, manager: 62, opinion: 68, mood: 'Carefree' },
  { name: 'Perfectionist', weight: () => 10, traits: { Consistent: 4, 'Big Game Player': 2, 'Hot-Headed': 1 }, morale: 62, manager: 74, opinion: 66, mood: 'Demanding' },
  { name: 'Born Winner', weight: (_age, ovr) => (ovr >= 72 ? 12 : 3), traits: { 'Big Game Player': 6, Consistent: 2, 'Hot-Headed': 1 }, morale: 70, manager: 72, opinion: 72, mood: 'Competitive' },
  { name: 'Journeyman', weight: (age) => (age >= 28 ? 12 : 1), traits: { 'Team Player': 3, Consistent: 3, Loyal: 1 }, morale: 64, manager: 68, opinion: 72, mood: 'Settled' },
  { name: 'Local Hero', weight: () => 6, traits: { 'Loves the Club': 6, Loyal: 5, 'Team Player': 1 }, morale: 78, manager: 76, opinion: 84, mood: 'At Home' },
  { name: 'Fiery Competitor', weight: () => 6, traits: { 'Hot-Headed': 6, 'Big Game Player': 2, 'Team Player': 1 }, morale: 62, manager: 60, opinion: 62, mood: 'Fired Up' },
]

const moodByMorale: Record<Player['morale'], string[]> = {
  'Very Good': ['Buzzing', 'Confident'],
  Good: ['Content', 'Positive'],
  Okay: ['Restless', 'Neutral'],
  Poor: ['Frustrated', 'Unsettled'],
}

function generatePersonality(age: number, overall: number, random: Random, teammateNames: string[], personnelNames: string[]) {
  const archetype = pickWeighted(archetypes, (item) => item.weight(age, overall), random)!
  const trait = pickWeighted(Object.entries(archetype.traits), ([, weight]) => weight, random)![0]
  const score = (base: number, spread: number) => clamp(Math.round(base + gaussian(random) * spread), 20, 99)
  const moraleScore = score(archetype.morale, 9)
  const morale: Player['morale'] = moraleScore >= 80 ? 'Very Good' : moraleScore >= 62 ? 'Good' : moraleScore >= 45 ? 'Okay' : 'Poor'
  const teamOpinion = score(archetype.opinion, 8)
  const note = (value: number) => (value >= 80 ? 'Strong understanding on the pitch' : value >= 65 ? 'Good training-ground connection' : 'Professional relationship')
  return {
    personality: archetype.name,
    characterTrait: trait,
    morale,
    teamOpinion,
    moodBadges: [pick(moodByMorale[morale], random), archetype.mood],
    relationships: {
      manager: score(archetype.manager, 8),
      teammates: pickMany(teammateNames, 3, random).map((playerName) => {
        const relationship = score(teamOpinion, 10)
        return { playerName, relationship, note: note(relationship) }
      }),
      favoritePersonnel: pickMany(personnelNames, 1, random),
      dislikedPersonnel: [] as string[],
    },
  }
}

// ------------------------------------------------- attributes and ratings

export const playerPositions: PlayerPosition[] = ['GK', 'D (C)', 'D (L)', 'D (R)', 'DM', 'M (C)', 'M (L)', 'M (R)', 'AM (C)', 'ST (C)']
const positionWeights: Record<PlayerPosition, number> = { GK: 8, 'D (C)': 15, 'D (L)': 6, 'D (R)': 6, DM: 8, 'M (C)': 14, 'M (L)': 5, 'M (R)': 5, 'AM (C)': 8, 'ST (C)': 12 }

const attributeKeys: AttributeKey[] = ['crossing', 'dribbling', 'finishing', 'firstTouch', 'heading', 'longShots', 'marking', 'passing', 'tackling', 'technique', 'vision', 'teamwork', 'decisions', 'determination', 'offTheBall', 'positioning', 'leadership', 'workRate', 'pace', 'acceleration', 'stamina', 'strength', 'agility', 'jumpingReach']

const wide: { key: AttributeKey[]; secondary: AttributeKey[] } = { key: ['crossing', 'dribbling', 'pace', 'acceleration', 'workRate', 'stamina'], secondary: ['technique', 'passing', 'agility', 'offTheBall', 'firstTouch'] }
const fullBack: { key: AttributeKey[]; secondary: AttributeKey[] } = { key: ['tackling', 'marking', 'pace', 'stamina', 'crossing', 'workRate'], secondary: ['acceleration', 'positioning', 'dribbling', 'teamwork', 'agility'] }
const positionProfiles: Record<PlayerPosition, { key: AttributeKey[]; secondary: AttributeKey[] }> = {
  GK: { key: ['positioning', 'decisions', 'agility', 'jumpingReach', 'determination'], secondary: ['leadership', 'strength', 'firstTouch', 'passing', 'vision', 'teamwork'] },
  'D (C)': { key: ['marking', 'tackling', 'heading', 'positioning', 'strength', 'jumpingReach'], secondary: ['decisions', 'determination', 'pace', 'passing', 'leadership', 'teamwork'] },
  'D (L)': fullBack,
  'D (R)': fullBack,
  DM: { key: ['tackling', 'positioning', 'marking', 'passing', 'workRate', 'stamina'], secondary: ['decisions', 'teamwork', 'strength', 'vision', 'determination'] },
  'M (C)': { key: ['passing', 'vision', 'decisions', 'teamwork', 'stamina', 'firstTouch'], secondary: ['technique', 'workRate', 'tackling', 'longShots', 'dribbling'] },
  'M (L)': wide,
  'M (R)': wide,
  'AM (C)': { key: ['technique', 'vision', 'passing', 'dribbling', 'firstTouch', 'offTheBall'], secondary: ['finishing', 'decisions', 'longShots', 'agility', 'acceleration'] },
  'ST (C)': { key: ['finishing', 'offTheBall', 'pace', 'acceleration', 'firstTouch'], secondary: ['heading', 'dribbling', 'technique', 'strength', 'decisions', 'jumpingReach'] },
}

function attributeWeight(position: PlayerPosition, key: AttributeKey) {
  const profile = positionProfiles[position]
  return profile.key.includes(key) ? 3 : profile.secondary.includes(key) ? 1.5 : 0.4
}

/** Position-weighted average of all 24 attributes on the internal 1-99 scale. */
function calculateOverall99(attributes: PlayerAttributes, position: PlayerPosition) {
  let total = 0
  let weights = 0
  for (const key of attributeKeys) {
    const weight = attributeWeight(position, key)
    total += attributes[key] * weight
    weights += weight
  }
  return Math.round(total / weights)
}

export const MAX_ATTRIBUTE = 20

/** Position-weighted overall rating from game-scale (1-20) attributes. */
export function calculateOverall(attributes: PlayerAttributes, position: PlayerPosition) {
  const scaled = Object.fromEntries(attributeKeys.map((key) => [key, attributes[key] * 5])) as unknown as PlayerAttributes
  return calculateOverall99(scaled, position)
}

/** Converts the internal 1-99 attribute scale to the game's 1-20 scale. */
function toGameScale(attributes: PlayerAttributes): PlayerAttributes {
  return Object.fromEntries(attributeKeys.map((key) => [key, clamp(Math.round(attributes[key] / 5), 1, MAX_ATTRIBUTE)])) as unknown as PlayerAttributes
}

function ageAdjustment(key: AttributeKey, age: number) {
  if (key === 'pace' || key === 'acceleration' || key === 'agility') return age > 29 ? -(age - 29) * 1.2 : 0
  if (key === 'strength') return age < 20 ? -5 : 0
  if (['vision', 'decisions', 'positioning', 'leadership', 'teamwork'].includes(key)) return age > 25 ? Math.min((age - 25) * 0.6, 5) : age < 21 ? -4 : 0
  return 0
}

function generateAttributes(position: PlayerPosition, age: number, targetOverall: number, random: Random): PlayerAttributes {
  const profile = positionProfiles[position]
  const irrelevant = position === 'GK' ? -26 : -14
  const noise = Object.fromEntries(attributeKeys.map((key) => [key, gaussian(random) * 3])) as Record<AttributeKey, number>
  const build = (base: number) => Object.fromEntries(attributeKeys.map((key) => {
    const offset = profile.key.includes(key) ? 7 : profile.secondary.includes(key) ? 1 : irrelevant
    return [key, clamp(Math.round(base + offset + ageAdjustment(key, age) + noise[key]), 1, 99)]
  })) as unknown as PlayerAttributes
  let base = targetOverall
  let attributes = build(base)
  for (let step = 0; step < 12; step += 1) {
    const difference = targetOverall - calculateOverall99(attributes, position)
    if (difference === 0) break
    base += difference * 0.8 || Math.sign(difference)
    attributes = build(base)
  }
  return attributes
}

// ------------------------------------------------------------- dates / money

const MS_PER_DAY = 86400000
const toIso = (date: Date) => date.toISOString().slice(0, 10)

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid currentDate "${value}".`)
  return date
}

function dateOfBirth(today: Date, age: number, random: Random) {
  const birthday = new Date(Date.UTC(today.getUTCFullYear() - age, today.getUTCMonth(), today.getUTCDate()))
  return toIso(new Date(birthday.getTime() - Math.floor(unit(random) * 364) * MS_PER_DAY))
}

const addMonths = (date: Date, months: number) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()))
const roundTo = (value: number, step: number) => Math.round(value / step) * step

function marketValue(overall: number, potential: number, age: number) {
  const base = 28000 * Math.exp(0.13 * (overall - 40))
  const ageFactor = age <= 21 ? 1 + (potential - overall) * 0.04 : age >= 31 ? Math.max(0.2, 1 - (age - 30) * 0.12) : 1
  return Math.max(25000, roundTo(base * ageFactor, 25000))
}

// --------------------------------------------------------------- the player

function generateAge(range: readonly [number, number], random: Random) {
  const [min, max] = range
  const peak = clamp(25, min, max)
  const u = unit(random)
  const f = (peak - min) / (max - min || 1)
  const triangular = u < f ? min + Math.sqrt(u * (max - min) * (peak - min)) : max - Math.sqrt((1 - u) * (max - min) * (max - peak))
  return clamp(Math.round(triangular), min, max)
}

function generatePotential(overall: number, age: number, random: Random) {
  if (age >= 30) return overall
  const room = age <= 21 ? between(random, 3, (22 - age) * 3 + 8) : age <= 25 ? between(random, 0, 6) : between(random, 0, 2)
  return clamp(Math.round(overall + room), overall, 99)
}

function squadRoleFor(overall: number, potential: number, age: number): Player['contract']['squadRole'] {
  if (age <= 20 && overall < 62 && potential >= overall + 5) return 'Prospect'
  return overall >= 80 ? 'Key Player' : overall >= 74 ? 'Regular Starter' : overall >= 66 ? 'First Team' : 'Squad Player'
}

function pickShirtNumber(position: PlayerPosition, random: Random) {
  const ranges: Record<string, number[]> = { GK: [1, 12, 13, 22, 31], D: [2, 3, 4, 5, 6, 15, 16, 23, 24], DM: [4, 6, 8, 14, 18], M: [7, 8, 10, 11, 14, 16, 17, 20], AM: [10, 8, 21, 25], ST: [9, 11, 19, 20, 29] }
  const group = position === 'GK' ? 'GK' : position === 'DM' ? 'DM' : position.startsWith('D') ? 'D' : position.startsWith('AM') ? 'AM' : position.startsWith('M') ? 'M' : 'ST'
  return chance(random, 0.8) ? pick(ranges[group], random) : intBetween(random, 2, 49)
}

function preferredFoot(position: PlayerPosition, random: Random): PlayerPersonalInfo['preferredFoot'] {
  const left = position === 'D (L)' || position === 'M (L)' ? 0.7 : position === 'D (R)' || position === 'M (R)' ? 0.08 : 0.22
  const roll = unit(random)
  return roll < 0.07 ? 'Both' : roll < 0.07 + left * 0.93 ? 'Left' : 'Right'
}

function heightFor(position: PlayerPosition, random: Random) {
  const mean = position === 'GK' ? 190 : position === 'D (C)' ? 186 : position === 'ST (C)' ? 182 : position === 'DM' ? 181 : position === 'D (L)' || position === 'D (R)' || position.startsWith('M') ? 177 : 178
  return clamp(Math.round(mean + gaussian(random) * 5), 160, 205)
}

function generateSeasons(position: PlayerPosition, age: number, overall: number, clubName: string, today: Date, random: Random) {
  const seasons: PlayerSeasonStats[] = []
  const latestStartYear = today.getUTCMonth() >= 6 ? today.getUTCFullYear() - 1 : today.getUTCFullYear() - 2
  const goalRate = position === 'ST (C)' ? 0.45 : position === 'AM (C)' ? 0.28 : position.startsWith('M') ? 0.12 : position === 'GK' ? 0 : 0.04
  const assistRate = position === 'AM (C)' ? 0.28 : position.startsWith('M') || position === 'D (L)' || position === 'D (R)' ? 0.14 : 0.05
  const count = clamp(age - 17, 0, 3)
  for (let index = count - 1; index >= 0; index -= 1) {
    const startYear = latestStartYear - index
    const appearances = clamp(Math.round(14 + (overall - 50) * 0.6 + gaussian(random) * 4), 3, 38)
    seasons.push({
      season: `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`,
      clubName,
      appearances,
      goals: Math.max(0, Math.round(appearances * goalRate * between(random, 0.6, 1.4))),
      assists: Math.max(0, Math.round(appearances * assistRate * between(random, 0.6, 1.4))),
      cleanSheets: position === 'GK' ? Math.round(appearances * between(random, 0.2, 0.4)) : 0,
      averageRating: Math.round((6.2 + (overall - 50) * 0.02 + between(random, -0.2, 0.2)) * 10) / 10,
    })
  }
  return seasons
}

export function generatePlayer(options: PlayerGenerationOptions = {}): Player {
  const random = options.random ?? (options.seed !== undefined ? createRng(options.seed) : createRng(`${Date.now()}-${Math.random()}`))
  const today = parseDate(options.currentDate ?? DEFAULT_DATE)
  const ageRange = options.ageRange ?? [17, 35]
  if (ageRange[0] > ageRange[1] || ageRange[0] < 15 || ageRange[1] > 45) throw new RangeError('ageRange must be [min, max] within 15-45.')
  if (options.targetOVR !== undefined && (options.targetOVR < 1 || options.targetOVR > 99)) throw new RangeError('targetOVR must be between 1 and 99.')
  if (options.position && !playerPositions.includes(options.position)) throw new RangeError(`Unknown position "${options.position}".`)
  const club = options.clubId ? clubIndex.get(options.clubId) : undefined
  if (options.clubId && !club) throw new RangeError(`Unknown clubId "${options.clubId}".`)

  const requestedNationality = options.nationality ? requireCountry(options.nationality, 'nationality') : undefined
  const nationalityCode = requestedNationality?.code
    ?? (club && worldByCode.has(club.countryCode) && chance(random, 0.55) ? club.countryCode : pickWeighted(nationalityPool, (entry) => entry.weight, random)!.code)

  const position = options.position ?? pickWeighted(playerPositions, (item) => positionWeights[item], random)!
  const age = generateAge(ageRange, random)
  const ageCurve = age < 20 ? -7 : age < 23 ? -3 : age > 33 ? -3 : 0
  const overall = Math.round(clamp(options.targetOVR ?? 63 + ageCurve + gaussian(random) * 9, 30, 92))

  const identity = generatePlayerIdentity({
    birthCountryCode: nationalityCode,
    birthRegionKey: options.birthRegionKey,
    secondaryCountryCode: options.secondaryNationality,
    mixedHeritage: options.mixedHeritage,
    random,
  })
  const rawAttributes = generateAttributes(position, age, overall, random)
  const finalOverall = calculateOverall99(rawAttributes, position)
  const attributes = toGameScale(rawAttributes)
  const potential = generatePotential(finalOverall, age, random)
  const personality = generatePersonality(age, finalOverall, random, options.teammateNames ?? [], options.personnelNames ?? [])
  const value = marketValue(finalOverall, potential, age)
  const clubName = club?.name ?? 'Free Agent'
  const contractStart = addMonths(today, -intBetween(random, 1, 36))
  const contractEnd = addMonths(today, intBetween(random, 6, 54))
  const seasonStats = generateSeasons(position, age, finalOverall, clubName, today, random)
  const careerTotals = seasonStats.reduce((totals, season) => ({
    appearances: totals.appearances + season.appearances,
    goals: totals.goals + season.goals,
    assists: totals.assists + season.assists,
    cleanSheets: totals.cleanSheets + season.cleanSheets,
    trophies: totals.trophies,
  }), { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, trophies: 0 })
  const idSuffix = Array.from({ length: 3 }, () => Math.floor(unit(random) * 0xffffff).toString(16).padStart(6, '0')).join('')

  return {
    id: `gen-${idSuffix}`,
    name: identity.name,
    shirtNumber: options.shirtNumber ?? pickShirtNumber(position, random),
    position,
    age,
    overall: finalOverall,
    potential,
    value,
    fitness: intBetween(random, 88, 100),
    form: Math.round(clamp(6.3 + gaussian(random) * 0.5 + (personality.morale === 'Very Good' ? 0.3 : personality.morale === 'Poor' ? -0.4 : 0), 4.5, 9) * 10) / 10,
    morale: personality.morale,
    moodBadges: personality.moodBadges,
    attributes,
    personalInfo: {
      dateOfBirth: dateOfBirth(today, age, random),
      placeOfBirth: identity.placeOfBirth,
      nationalities: identity.nationalities,
      languages: identity.languages,
      preferredFoot: preferredFoot(position, random),
      heightCm: heightFor(position, random),
      hobbies: generateHobbies(identity.birthCountryCode, random),
      teamOpinion: personality.teamOpinion,
      personality: personality.personality,
      characterTrait: personality.characterTrait,
      nationalTeamRepresentation: identity.nationalTeamRepresentation,
    },
    contract: {
      clubId: club?.id ?? FREE_AGENT_ID,
      startDate: toIso(contractStart),
      endDate: toIso(contractEnd),
      weeklyWage: Math.max(250, roundTo(value / 700, 50)),
      squadRole: squadRoleFor(finalOverall, potential, age),
      ...(finalOverall >= 70 ? { releaseClause: roundTo(value * between(random, 1.5, 2.5), 250000) } : {}),
      interestedClubs: [],
      offerHistory: [],
    },
    transferHistory: [],
    seasonStats,
    careerTotals,
    relationships: personality.relationships,
    achievements: { trophies: [], individualAwards: [], seasonRecognitions: [] },
  }
}

/** Generates `count` players; with a seed each player derives its own stable sub-seed. */
export function generatePlayers(count: number, options: PlayerGenerationOptions = {}): Player[] {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('count must be a non-negative integer.')
  const parent = options.random ?? (options.seed !== undefined ? createRng(options.seed) : createRng(`${Date.now()}-${Math.random()}`))
  return Array.from({ length: count }, (_, index) => generatePlayer({ ...options, seed: undefined, random: createRng(`${Math.floor(parent() * 4294967296)}:${index}`) }))
}

export function listClubIdsForCountry(countryCode: string): string[] {
  return clubsByCountry.get(countryCode) ?? []
}
