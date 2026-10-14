import rawWorldCountries from './data/worldCountries.json'
import type { WorldCountriesDatabase } from './types/game'

export const worldCountries = rawWorldCountries as WorldCountriesDatabase

const byCode = new Map(worldCountries.countries.map((country) => [country.code, country]))

export function findWorldCountry(code: string) {
  return byCode.get(code)
}
