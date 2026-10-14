import nameDatabase from './data/names/globalNameDatabase.json'

const countryEntries = Object.values((nameDatabase as { countries: Record<string, { code: string; countryName: string; iso2: string; flagCode?: string }> }).countries)
const flagOverrides: Record<string, string> = { ENG: 'gb-eng', SCO: 'gb-sct', WAL: 'gb-wls' }
const nameAliases: Record<string, string> = { english: 'england', scottish: 'scotland', welsh: 'wales', irish: 'ireland', nigerian: 'nigeria', portuguese: 'portugal', spanish: 'spain' }

export function resolveFlagCode(countryCode: string) {
  const normalized = countryCode.trim().toLowerCase()
  const code = normalized.toUpperCase()
  const country = countryEntries.find((entry) => entry.code.toLowerCase() === normalized || entry.iso2.toLowerCase() === normalized || entry.countryName.toLowerCase() === (nameAliases[normalized] ?? normalized))
  return flagOverrides[code] ?? country?.flagCode ?? country?.iso2 ?? normalized
}

export function displayCountryName(countryName: string) {
  const normalized = countryName.trim().toLowerCase()
  const alias = nameAliases[normalized] ?? normalized
  return countryEntries.find((entry) => entry.countryName.toLowerCase() === alias || entry.code.toLowerCase() === normalized || entry.iso2.toLowerCase() === normalized)?.countryName ?? countryName
}
