import rawNameDatabase from '../data/names/globalNameDatabase.json'
import type { PlayerPersonalInfo } from '../types/game'

type Proficiency = 'Basic' | 'Conversational' | 'Fluent' | 'Native'

interface LanguagePool {
  name: string
  fluencyRates: Partial<Record<Proficiency, number>>
}

interface NameRegion {
  name: string
  weight?: number
  cities?: string[]
  regionalLanguages?: LanguagePool[]
  firstNames: string[]
  lastNames: string[]
}

interface NameCountry {
  countryName: string
  code: string
  iso2: string
  commonSecondaryCountries: { code: string; countryName: string; probability: number }[]
  defaultLanguages: LanguagePool[]
  subRegions: Record<string, NameRegion>
}

interface NameDatabase {
  countries: Record<string, NameCountry>
}

export interface GeneratePlayerIdentityOptions {
  birthCountryCode: string
  birthRegionKey?: string
  secondaryCountryCode?: string
  nationalTeamCode?: string
  secondaryNationalityChance?: number
  crossCulturalSurnameChance?: number
  mixedHeritage?: boolean
  random?: () => number
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

const database = rawNameDatabase as unknown as NameDatabase
const majorFootballHubs = new Set(['NGA', 'ENG', 'ESP', 'FRA', 'GER', 'ITA', 'POR', 'BRA', 'ARG', 'COL', 'GHA', 'SEN', 'CIV', 'CMR', 'MAR', 'EGY'])
const proficiencyRank: Record<Proficiency, number> = { Basic: 0, Conversational: 1, Fluent: 2, Native: 3 }
const proficiencies = Object.keys(proficiencyRank) as Proficiency[]

function randomUnit(random: () => number) {
  return Math.min(Math.max(random(), 0), 0.999999999999)
}

function pick<T>(values: T[], random: () => number): T {
  return values[Math.floor(randomUnit(random) * values.length)]
}

function pickWeighted<T>(values: T[], getWeight: (value: T) => number, random: () => number): T | undefined {
  if (!values.length) return undefined
  const total = values.reduce((sum, value) => sum + Math.max(0, getWeight(value)), 0)
  if (total <= 0) return pick(values, random)
  let cursor = randomUnit(random) * total
  for (const value of values) {
    cursor -= Math.max(0, getWeight(value))
    if (cursor < 0) return value
  }
  return values.at(-1)
}

function findCountry(codeOrIso2: string) {
  const normalized = codeOrIso2.trim().toUpperCase()
  return Object.entries(database.countries).find(([code, country]) => code === normalized || country.iso2.toUpperCase() === normalized)
}

function chooseRegion(country: NameCountry, requestedKey: string | undefined, random: () => number) {
  if (requestedKey) {
    const requestedRegion = country.subRegions[requestedKey]
    if (!requestedRegion) throw new RangeError(`Unknown sub-region "${requestedKey}" for ${country.countryName}.`)
    return [requestedKey, requestedRegion] as const
  }
  const entries = Object.entries(country.subRegions)
  const selected = pickWeighted(entries, ([, region]) => region.weight ?? 1, random) ?? entries[0]
  if (!selected) throw new Error(`${country.countryName} has no name sub-regions.`)
  return selected
}

function chooseSecondaryCountry(primary: NameCountry, options: GeneratePlayerIdentityOptions, random: () => number) {
  if (options.secondaryCountryCode) {
    const explicitSecondary = findCountry(options.secondaryCountryCode)
    if (!explicitSecondary) throw new RangeError(`Unknown secondary country code "${options.secondaryCountryCode}".`)
    if (explicitSecondary[0] === primary.code) return undefined
    return explicitSecondary
  }

  const migrationLinks = primary.commonSecondaryCountries
    .map((link) => ({ link, country: findCountry(link.code) }))
    .filter((entry): entry is { link: NameCountry['commonSecondaryCountries'][number]; country: [string, NameCountry] } => Boolean(entry.country))
  if (!migrationLinks.length) return undefined

  const defaultChance = majorFootballHubs.has(primary.code) ? 0.25 : 0.08
  const chance = Math.min(Math.max(options.secondaryNationalityChance ?? defaultChance, 0), 1)
  if (!options.mixedHeritage && randomUnit(random) >= chance) return undefined

  const selectedLink = pickWeighted(migrationLinks, ({ link }) => link.probability, random)
  return selectedLink?.country
}

function chooseProficiency(rates: Partial<Record<Proficiency, number>>, random: () => number): Proficiency {
  const entries = proficiencies.map((proficiency) => ({ proficiency, rate: rates[proficiency] ?? 0 })).filter((entry) => entry.rate > 0)
  return pickWeighted(entries, (entry) => entry.rate, random)?.proficiency ?? 'Conversational'
}

function collectLanguages(country: NameCountry, region: NameRegion, random: () => number) {
  const languages = new Map<string, Proficiency>()
  for (const language of [...country.defaultLanguages, ...(region.regionalLanguages ?? [])]) {
    const proficiency = chooseProficiency(language.fluencyRates, random)
    const existing = languages.get(language.name)
    if (!existing || proficiencyRank[proficiency] > proficiencyRank[existing]) languages.set(language.name, proficiency)
  }
  return [...languages].map(([name, proficiency]) => ({ name, proficiency }))
}

function mergeLanguages(primary: PlayerPersonalInfo['languages'], secondary: PlayerPersonalInfo['languages']) {
  const merged = new Map<string, Proficiency>()
  for (const language of [...primary, ...secondary]) {
    const proficiency = language.proficiency as Proficiency
    const existing = merged.get(language.name)
    if (!existing || proficiencyRank[proficiency] > proficiencyRank[existing]) merged.set(language.name, proficiency)
  }
  return [...merged].map(([name, proficiency]) => ({ name, proficiency }))
}

export function generatePlayerIdentity(options: GeneratePlayerIdentityOptions): GeneratedPlayerIdentity {
  const random = options.random ?? Math.random
  const primaryEntry = findCountry(options.birthCountryCode)
  if (!primaryEntry) throw new RangeError(`Unknown birth country code "${options.birthCountryCode}".`)
  const [birthCountryCode, primaryCountry] = primaryEntry
  const [birthRegionKey, birthRegion] = chooseRegion(primaryCountry, options.birthRegionKey, random)
  const secondaryEntry = chooseSecondaryCountry(primaryCountry, options, random)
  const secondaryCountry = secondaryEntry?.[1]
  const secondaryRegion = secondaryCountry ? chooseRegion(secondaryCountry, undefined, random)[1] : undefined
  const blendChance = options.crossCulturalSurnameChance ?? 0.7
  const blendSurname = Boolean(secondaryCountry && secondaryRegion && randomUnit(random) < Math.min(Math.max(blendChance, 0), 1))
  const surnameCountry = blendSurname ? secondaryCountry! : primaryCountry
  const surnameRegion = blendSurname ? secondaryRegion! : birthRegion
  const firstName = pick(birthRegion.firstNames, random)
  const surname = pick(surnameRegion.lastNames, random)
  const secondaryNationality = secondaryCountry ? { country: secondaryCountry.countryName, code: secondaryCountry.code, type: 'Secondary' as const } : undefined
  const nationalities: PlayerPersonalInfo['nationalities'] = [
    { country: primaryCountry.countryName, code: primaryCountry.code, type: 'Primary' },
    ...(secondaryNationality ? [secondaryNationality] : []),
  ]
  const requestedNationalTeam = options.nationalTeamCode ? findCountry(options.nationalTeamCode) : undefined
  const representedNationality = requestedNationalTeam
    ? nationalities.find((nationality) => nationality.code === requestedNationalTeam[0])
    : nationalities[0]
  if (options.nationalTeamCode && !representedNationality) {
    throw new RangeError(`National team ${options.nationalTeamCode} must match a generated nationality.`)
  }

  const primaryLanguages = collectLanguages(primaryCountry, birthRegion, random)
  const secondaryLanguages = secondaryCountry && secondaryRegion ? collectLanguages(secondaryCountry, secondaryRegion, random) : []
  const city = birthRegion.cities?.length ? pick(birthRegion.cities, random) : birthRegion.name

  return {
    name: `${firstName} ${surname}`,
    firstName,
    surname,
    birthCountry: primaryCountry.countryName,
    birthCountryCode,
    birthRegionKey,
    placeOfBirth: `${city}, ${primaryCountry.countryName}`,
    firstNameCultureCode: primaryCountry.code,
    surnameCultureCode: surnameCountry.code,
    nationalities,
    languages: mergeLanguages(primaryLanguages, secondaryLanguages),
    nationalTeamRepresentation: { country: representedNationality!.country, code: representedNationality!.code },
  }
}

export function applyGeneratedIdentity(personalInfo: PlayerPersonalInfo, identity: GeneratedPlayerIdentity): PlayerPersonalInfo {
  return {
    ...personalInfo,
    dateOfBirth: personalInfo.dateOfBirth,
    placeOfBirth: identity.placeOfBirth,
    nationalities: identity.nationalities,
    languages: identity.languages,
    nationalTeamRepresentation: identity.nationalTeamRepresentation,
  }
}
