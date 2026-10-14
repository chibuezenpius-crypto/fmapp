import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fakerAR,
  fakerDE,
  fakerDE_AT,
  fakerDE_CH,
  fakerEN_GB,
  fakerEN_GH,
  fakerEN_NG,
  fakerEN_ZA,
  fakerES,
  fakerES_MX,
  fakerFR,
  fakerFR_BE,
  fakerFR_CA,
  fakerFR_CH,
  fakerFR_LU,
  fakerFR_SN,
  fakerIT,
  fakerPT_BR,
  fakerPT_PT,
} from '@faker-js/faker'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, '..')
const outputPath = path.join(projectDirectory, 'src', 'data', 'names', 'globalNameDatabase.json')
const primarySourceUrl = 'https://2000names.com/'
const minimums = { majorFirstNames: 700, majorSurnames: 300, regionalFirstNames: 150, regionalSurnames: 50 }

const localePools = {
  NGA: [fakerEN_NG, fakerEN_GH, fakerEN_ZA],
  GHA: [fakerEN_GH, fakerEN_NG],
  ANG: [fakerPT_PT, fakerPT_BR],
  SEN: [fakerFR_SN, fakerFR],
  CIV: [fakerFR, fakerFR_SN],
  CMR: [fakerFR, fakerEN_GH],
  MAR: [fakerFR, fakerAR],
  EGY: [fakerAR, fakerFR],
  ENG: [fakerEN_GB],
  GER: [fakerDE, fakerDE_AT, fakerDE_CH],
  ESP: [fakerES, fakerES_MX],
  FRA: [fakerFR, fakerFR_BE, fakerFR_CA, fakerFR_CH, fakerFR_LU, fakerFR_SN],
  ITA: [fakerIT],
  POR: [fakerPT_PT, fakerPT_BR],
}

const compoundGivenNames = {
  NGA: {
    igbo: ['Chukwu', 'Chika', 'Kelechi', 'Ifeanyi', 'Nnaemeka', 'Obinna'],
    yoruba: ['Ade', 'Olu', 'Baba', 'Ayo', 'Femi', 'Oluwa'],
    hausa: ['Abdul', 'Musa', 'Umar', 'Sani', 'Abubakar', 'Bello'],
    edo_delta: ['Osaro', 'Eghosa', 'Oghenetega', 'Ovie', 'Igho', 'Efe'],
  },
  GHA: { akan_ashanti: ['Kwame', 'Kofi', 'Yaw', 'Kojo', 'Kwabena'], coastal_ga_ewe: ['Nii', 'Tetteh', 'Kweku', 'Komla'], northern_mole: ['Mubarak', 'Yakubu', 'Issah', 'Fuseini'] },
  ANG: { luanda_coastal: ['Joao', 'Manuel', 'Antonio'], central_highlands: ['Domingos', 'Mateus', 'Paulo'], north_cabinda: ['Bento', 'Afonso', 'Francisco'] },
  SEN: { dakar_coastal: ['Mamadou', 'Ibrahima', 'Cheikh'], central_south: ['Ousmane', 'Amadou', 'Boubacar'] },
  CIV: { abidjan_south: ['Kouame', 'Yao', 'Koffi'], inland_north: ['Moussa', 'Issa', 'Adama'] },
  CMR: { douala_yaounde: ['Jean', 'Patrick', 'Etienne'], west_north: ['Boubacar', 'Amadou', 'Moussa'] },
  MAR: { coastal_central: ['Mohamed', 'Youssef', 'Amine'], north_rif: ['Rachid', 'Omar', 'Hamza'] },
  EGY: { cairo_delta: ['Mohamed', 'Ahmed', 'Mahmoud'], upper_egypt: ['Hassan', 'Hussein', 'Ibrahim'] },
}

const majorGivenNamePrefixes = {
  ENG: ['James', 'John', 'Thomas', 'George', 'William', 'Edward', 'Jack', 'Henry', 'Charles', 'Arthur', 'David', 'Joseph'],
  GER: ['Hans', 'Karl', 'Johann', 'Friedrich', 'Georg', 'Heinrich', 'Lukas', 'Max', 'Paul', 'Peter', 'Otto', 'Wilhelm'],
  ESP: ['Jose', 'Juan', 'Luis', 'Miguel', 'Carlos', 'Antonio', 'Manuel', 'Francisco', 'Jorge', 'Pablo', 'Diego', 'Rafael'],
  FRA: ['Jean', 'Pierre', 'Louis', 'Paul', 'Henri', 'Luc', 'Marc', 'Michel', 'Andre', 'Antoine', 'Jacques', 'Claude'],
  ITA: ['Giovanni', 'Giuseppe', 'Antonio', 'Marco', 'Paolo', 'Francesco', 'Luca', 'Carlo', 'Pietro', 'Domenico', 'Angelo', 'Luigi'],
  POR: ['Joao', 'Jose', 'Luis', 'Manuel', 'Antonio', 'Pedro', 'Paulo', 'Carlos', 'Miguel', 'Francisco', 'Rui', 'Jorge'],
}

const compoundSurnames = {
  ESP: ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Sanchez', 'Perez', 'Gomez', 'Martin'],
  POR: ['Silva', 'Santos', 'Oliveira', 'Pereira', 'Costa', 'Rodrigues', 'Ferreira', 'Almeida'],
  FRA: ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois'],
  GER: ['Mueller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann'],
  ITA: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Ricci', 'Marino'],
  ENG: ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Davies', 'Evans', 'Thomas'],
}

const surnameParticles = {
  ESP: ['de', 'del', 'de la'],
  POR: ['da', 'de', 'do', 'dos', 'das'],
  FRA: ['de', 'du', 'des'],
  GER: ['von', 'zu'],
  ITA: ['di', 'de', 'della'],
  ENG: ['of', 'St.'],
}

function cleanName(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s,;|]+|[\s,;|]+$/g, '')
}

function isName(value) {
  return value.length >= 2 && value.length <= 42 && /^[\p{L}][\p{L} .'-]*$/u.test(value) && value.split(' ').length <= 4
}

function scrapeNameCandidates(html) {
  const withoutNoisyBlocks = html.replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  const candidates = new Set()
  const entries = withoutNoisyBlocks.matchAll(/<(?:li|td|dd)\b[^>]*>([\s\S]*?)<\/(?:li|td|dd)>/gi)
  for (const entry of entries) {
    const text = cleanName(entry[1])
    for (const part of text.split(/[,;\n|]/)) {
      const candidate = cleanName(part)
      if (isName(candidate)) candidates.add(candidate)
    }
  }
  return [...candidates]
}

async function fetchPrimaryNames() {
  try {
    const response = await fetch(primarySourceUrl, {
      headers: { 'user-agent': 'Northbridge-FM-NameBuilder/1.0 (+local development tool)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return scrapeNameCandidates(await response.text())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Primary source unavailable (${message}); using regional fallback pools.`)
    return []
  }
}

function stableSeed(text) {
  let hash = 2166136261
  for (const character of text) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function addUnique(target, values) {
  const seen = new Set(target.map((name) => name.toLocaleLowerCase()))
  for (const value of values) {
    const name = cleanName(String(value))
    const key = name.toLocaleLowerCase()
    if (isName(name) && !seen.has(key)) {
      target.push(name)
      seen.add(key)
    }
  }
}

function generateLocaleNames(locales, kind, minimum, seed) {
  const generated = []
  const seen = new Set()
  for (const [localeIndex, faker] of locales.entries()) {
    faker.seed((seed + localeIndex * 7919) >>> 0)
    const attempts = minimum * 24
    for (let index = 0; index < attempts && generated.length < minimum * 2; index += 1) {
      const value = cleanName(kind === 'first' ? faker.person.firstName('male') : faker.person.lastName())
      const key = value.toLocaleLowerCase()
      if (isName(value) && !seen.has(key)) {
        generated.push(value)
        seen.add(key)
      }
    }
  }
  return generated
}

function addCompoundGivenNames(names, countryCode, regionKey, minimum) {
  const prefixes = compoundGivenNames[countryCode]?.[regionKey] ?? majorGivenNamePrefixes[countryCode] ?? []
  if (!prefixes.length) return
  const roots = [...names]
  for (const prefix of prefixes) {
    for (const root of roots) {
      addUnique(names, [`${prefix} ${root}`])
      if (names.length >= minimum) return
    }
  }
}

function addCompoundSurnames(names, countryCode, minimum) {
  const particles = surnameParticles[countryCode] ?? []
  const roots = [...names, ...(compoundSurnames[countryCode] ?? [])]
  for (const particle of particles) {
    for (const root of roots) {
      addUnique(names, [`${particle} ${root}`])
      if (names.length >= minimum) return
    }
  }
}

function ensureMinimum(existing, generated, remoteNames, minimum, compoundBuilder) {
  const names = []
  addUnique(names, existing)
  addUnique(names, generated)
  if (names.length < minimum) addUnique(names, remoteNames)
  if (names.length < minimum) compoundBuilder(names, minimum)
  if (names.length < minimum) {
    throw new Error(`Could not reach ${minimum} unique names (only found ${names.length}).`)
  }
  return names
}

function totals(database) {
  let totalSubRegions = 0
  let totalFirstNames = 0
  let totalLastNames = 0
  for (const country of Object.values(database.countries)) {
    for (const subRegion of Object.values(country.subRegions)) {
      totalSubRegions += 1
      totalFirstNames += subRegion.firstNames.length
      totalLastNames += subRegion.lastNames.length
    }
  }
  return { totalCountries: Object.keys(database.countries).length, totalSubRegions, totalFirstNames, totalLastNames }
}

async function main() {
  const database = JSON.parse(await readFile(outputPath, 'utf8'))
  const remoteNames = await fetchPrimaryNames()
  let fetchedPools = 0
  let generatedPools = 0

  for (const [countryCode, country] of Object.entries(database.countries)) {
    const locales = localePools[countryCode]
    const isMajorEuropean = ['ENG', 'GER', 'ESP', 'FRA', 'ITA', 'POR'].includes(countryCode)
    const isAfricanRegional = ['NGA', 'GHA', 'ANG', 'SEN', 'CIV', 'CMR', 'MAR', 'EGY'].includes(countryCode)
    if (!locales || (!isMajorEuropean && !isAfricanRegional)) continue

    for (const [regionKey, region] of Object.entries(country.subRegions)) {
      const minimumFirst = isMajorEuropean ? minimums.majorFirstNames : minimums.regionalFirstNames
      const minimumLast = isMajorEuropean ? minimums.majorSurnames : minimums.regionalSurnames
      const seed = stableSeed(`${countryCode}:${regionKey}`)
      const firstGenerated = generateLocaleNames(locales, 'first', minimumFirst, seed)
      const lastGenerated = generateLocaleNames(locales, 'last', minimumLast, seed ^ 0x9e3779b9)
      const priorFirstCount = region.firstNames.length
      const priorLastCount = region.lastNames.length

      region.firstNames = ensureMinimum(region.firstNames, firstGenerated, remoteNames, minimumFirst, (names, minimum) => addCompoundGivenNames(names, countryCode, regionKey, minimum))
      region.lastNames = ensureMinimum(region.lastNames, lastGenerated, remoteNames, minimumLast, (names, minimum) => addCompoundSurnames(names, countryCode, minimum))
      if (region.firstNames.length > priorFirstCount || region.lastNames.length > priorLastCount) generatedPools += 1
      if (remoteNames.length) fetchedPools += 1
    }
  }

  const summary = totals(database)
  database.metadata = {
    ...database.metadata,
    version: '1.2.0',
    description: 'Regional male first-name and surname pools for football manager simulation.',
    generatedAt: new Date().toISOString(),
    primarySource: primarySourceUrl,
    primarySourceNamesFetched: remoteNames.length,
    poolsEnriched: generatedPools,
    fetchedPools,
    minimums,
    ...summary,
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(database, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outputPath}`)
  console.log(`${summary.totalCountries} countries · ${summary.totalSubRegions} sub-regions · ${summary.totalFirstNames} first names · ${summary.totalLastNames} surnames`)
  console.log(`Remote source names: ${remoteNames.length}; regional pools enriched: ${generatedPools}`)
}

main().catch((error) => {
  console.error('Name database generation failed:', error)
  process.exitCode = 1
})
