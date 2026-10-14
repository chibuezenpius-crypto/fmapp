import { writeFileSync } from 'node:fs'

const tournamentsPath = new URL('../src/data/internationalTournaments.json', import.meta.url)
const worldPath = new URL('../src/data/worldCountries.json', import.meta.url)

// code|flag|name, strongest seeds first within each confederation
const CONFEDERATIONS = {
  UEFA: ['ENG|gb-eng|England', 'FRA|fr|France', 'ESP|es|Spain', 'GER|de|Germany', 'POR|pt|Portugal', 'NED|nl|Netherlands', 'ITA|it|Italy', 'BEL|be|Belgium', 'CRO|hr|Croatia', 'SCO|gb-sct|Scotland', 'WAL|gb-wls|Wales', 'IRL|ie|Ireland', 'NOR|no|Norway', 'SWE|se|Sweden', 'SUI|ch|Switzerland', 'DEN|dk|Denmark', 'AUT|at|Austria', 'POL|pl|Poland', 'UKR|ua|Ukraine', 'TUR|tr|Turkey', 'SRB|rs|Serbia', 'CZE|cz|Czechia', 'HUN|hu|Hungary', 'ROU|ro|Romania', 'GRE|gr|Greece', 'SVK|sk|Slovakia', 'SVN|si|Slovenia', 'NIR|gb-nir|Northern Ireland', 'FIN|fi|Finland', 'ISL|is|Iceland', 'ALB|al|Albania', 'GEO|ge|Georgia', 'BIH|ba|Bosnia and Herzegovina', 'MKD|mk|North Macedonia', 'MNE|me|Montenegro', 'BUL|bg|Bulgaria', 'ISR|il|Israel', 'RUS|ru|Russia', 'KOS|xk|Kosovo', 'ARM|am|Armenia', 'AZE|az|Azerbaijan', 'BLR|by|Belarus', 'CYP|cy|Cyprus', 'EST|ee|Estonia', 'KAZ|kz|Kazakhstan', 'LVA|lv|Latvia', 'LTU|lt|Lithuania', 'LUX|lu|Luxembourg', 'MDA|md|Moldova', 'MLT|mt|Malta', 'FRO|fo|Faroe Islands', 'GIB|gi|Gibraltar', 'AND|ad|Andorra', 'LIE|li|Liechtenstein', 'SMR|sm|San Marino'],
  CAF: ['SEN|sn|Senegal', 'MAR|ma|Morocco', 'NGA|ng|Nigeria', 'CIV|ci|Ivory Coast', 'EGY|eg|Egypt', 'GHA|gh|Ghana', 'CMR|cm|Cameroon', 'ANG|ao|Angola', 'ALG|dz|Algeria', 'TUN|tn|Tunisia', 'COD|cd|DR Congo', 'MLI|ml|Mali', 'RSA|za|South Africa', 'BFA|bf|Burkina Faso', 'GAB|ga|Gabon', 'CPV|cv|Cape Verde', 'GUI|gn|Guinea', 'ZAM|zm|Zambia', 'UGA|ug|Uganda', 'BEN|bj|Benin', 'MOZ|mz|Mozambique', 'KEN|ke|Kenya', 'MTN|mr|Mauritania', 'MAD|mg|Madagascar', 'LBY|ly|Libya', 'COM|km|Comoros', 'ZIM|zw|Zimbabwe', 'TAN|tz|Tanzania', 'CGO|cg|Congo', 'SDN|sd|Sudan', 'EQG|gq|Equatorial Guinea', 'TOG|tg|Togo', 'NAM|na|Namibia', 'SLE|sl|Sierra Leone', 'GNB|gw|Guinea-Bissau', 'MWI|mw|Malawi', 'BOT|bw|Botswana', 'LBR|lr|Liberia', 'CTA|cf|Central African Republic', 'RWA|rw|Rwanda', 'NIG|ne|Niger', 'ETH|et|Ethiopia', 'GAM|gm|Gambia', 'BDI|bi|Burundi', 'LES|ls|Lesotho', 'SSD|ss|South Sudan', 'CHA|td|Chad', 'MRI|mu|Mauritius', 'SWZ|sz|Eswatini', 'DJI|dj|Djibouti', 'STP|st|Sao Tome and Principe', 'SEY|sc|Seychelles', 'SOM|so|Somalia', 'ERI|er|Eritrea'],
  AFC: ['JPN|jp|Japan', 'KOR|kr|South Korea', 'AUS|au|Australia', 'IRN|ir|Iran', 'KSA|sa|Saudi Arabia', 'QAT|qa|Qatar', 'UZB|uz|Uzbekistan', 'JOR|jo|Jordan', 'IRQ|iq|Iraq', 'UAE|ae|United Arab Emirates', 'CHN|cn|China', 'OMA|om|Oman', 'BHR|bh|Bahrain', 'SYR|sy|Syria', 'PLE|ps|Palestine', 'KGZ|kg|Kyrgyzstan', 'THA|th|Thailand', 'VIE|vn|Vietnam', 'IND|in|India', 'LIB|lb|Lebanon', 'PRK|kp|North Korea', 'TJK|tj|Tajikistan', 'KUW|kw|Kuwait', 'MAS|my|Malaysia', 'IDN|id|Indonesia', 'TKM|tm|Turkmenistan', 'AFG|af|Afghanistan', 'YEM|ye|Yemen', 'PHI|ph|Philippines', 'HKG|hk|Hong Kong', 'SIN|sg|Singapore', 'MYA|mm|Myanmar', 'TPE|tw|Chinese Taipei', 'MDV|mv|Maldives', 'NEP|np|Nepal', 'BAN|bd|Bangladesh', 'PAK|pk|Pakistan', 'LAO|la|Laos', 'CAM|kh|Cambodia', 'SRI|lk|Sri Lanka', 'MNG|mn|Mongolia', 'BRU|bn|Brunei', 'BHU|bt|Bhutan', 'TLS|tl|Timor-Leste', 'MAC|mo|Macau', 'GUM|gu|Guam'],
  CONCACAF: ['USA|us|United States', 'MEX|mx|Mexico', 'CAN|ca|Canada', 'PAN|pa|Panama', 'CRC|cr|Costa Rica', 'JAM|jm|Jamaica', 'HON|hn|Honduras', 'SLV|sv|El Salvador', 'HAI|ht|Haiti', 'CUW|cw|Curacao', 'TRI|tt|Trinidad and Tobago', 'GUA|gt|Guatemala', 'SUR|sr|Suriname', 'CUB|cu|Cuba', 'NCA|ni|Nicaragua', 'DOM|do|Dominican Republic', 'GUY|gy|Guyana', 'PUR|pr|Puerto Rico', 'BER|bm|Bermuda', 'GRN|gd|Grenada', 'SKN|kn|Saint Kitts and Nevis', 'LCA|lc|Saint Lucia', 'ATG|ag|Antigua and Barbuda', 'VIN|vc|Saint Vincent and the Grenadines', 'BLZ|bz|Belize', 'BRB|bb|Barbados', 'DMA|dm|Dominica', 'MSR|ms|Montserrat', 'CAY|ky|Cayman Islands', 'BAH|bs|Bahamas', 'ARU|aw|Aruba', 'TCA|tc|Turks and Caicos Islands', 'VGB|vg|British Virgin Islands', 'VIR|vi|US Virgin Islands', 'AIA|ai|Anguilla'],
  CONMEBOL: ['ARG|ar|Argentina', 'BRA|br|Brazil', 'URU|uy|Uruguay', 'COL|co|Colombia', 'ECU|ec|Ecuador', 'PAR|py|Paraguay', 'CHI|cl|Chile', 'PER|pe|Peru', 'VEN|ve|Venezuela', 'BOL|bo|Bolivia'],
  OFC: ['NZL|nz|New Zealand', 'FIJ|fj|Fiji', 'NCL|nc|New Caledonia', 'TAH|pf|Tahiti', 'SOL|sb|Solomon Islands', 'PNG|pg|Papua New Guinea', 'VAN|vu|Vanuatu', 'SAM|ws|Samoa', 'TGA|to|Tonga', 'COK|ck|Cook Islands', 'ASA|as|American Samoa'],
}

const WORLD_CUP_PLAYOFFS = ['BOL', 'COD']
const WORLD_CUP_SLOTS = { UEFA: 16, CAF: 9, AFC: 8, CONMEBOL: 6, CONCACAF: 6, OFC: 1 }

const CONFEDERATION_LABELS = { UEFA: 'Europe', CAF: 'Africa', AFC: 'Asia', CONCACAF: 'North America', CONMEBOL: 'South America', OFC: 'Oceania' }

const SIX_ROUNDS = ['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final']
const COMPETITIONS = [
  { id: 'avfac-2027', name: 'AVFAC Africa Cup', confederation: 'CAF', groupSize: 6, rounds: SIX_ROUNDS, season: '2027', hostCountryCodes: ['MAR'], history: [{ season: '2025', champion: 'Senegal', runnerUp: 'Morocco' }, { season: '2023', champion: 'Ivory Coast', runnerUp: 'Nigeria' }] },
  { id: 'vfa-euros-2028', name: 'VFA Euros', confederation: 'UEFA', groupSize: 5, rounds: SIX_ROUNDS, season: '2028', hostCountryCodes: ['ENG', 'SCO', 'WAL', 'IRL'], history: [{ season: '2024', champion: 'Spain', runnerUp: 'England' }, { season: '2020', champion: 'Italy', runnerUp: 'England' }] },
  { id: 'vfa-south-american-cup-2028', name: 'VFA South American Cup', confederation: 'CONMEBOL', groupSize: 5, rounds: ['Quarter-finals', 'Semi-finals', 'Final'], season: '2028', hostCountryCodes: ['ARG'], history: [{ season: '2024', champion: 'Argentina', runnerUp: 'Colombia' }, { season: '2021', champion: 'Argentina', runnerUp: 'Brazil' }] },
  { id: 'vfa-asian-cup-2027', name: 'VFA Asian Cup', confederation: 'AFC', groupSize: 5, rounds: SIX_ROUNDS, season: '2027', hostCountryCodes: ['JPN'], history: [{ season: '2023', champion: 'Qatar', runnerUp: 'Jordan' }, { season: '2019', champion: 'Qatar', runnerUp: 'Japan' }] },
  { id: 'vfa-gold-cup-2027', name: 'VFA Gold Cup', confederation: 'CONCACAF', groupSize: 5, rounds: SIX_ROUNDS, season: '2027', hostCountryCodes: ['USA', 'MEX'], history: [{ season: '2025', champion: 'Mexico', runnerUp: 'United States' }, { season: '2023', champion: 'United States', runnerUp: 'Mexico' }] },
  { id: 'vfa-oceania-cup-2028', name: 'VFA Oceania Cup', confederation: 'OFC', groupSize: 4, rounds: ['Quarter-finals', 'Semi-finals', 'Final'], season: '2028', hostCountryCodes: ['NZL'], history: [{ season: '2024', champion: 'New Zealand', runnerUp: 'Vanuatu' }, { season: '2020', champion: 'New Zealand', runnerUp: 'Tahiti' }] },
]
const worldCountries = Object.entries(CONFEDERATIONS).flatMap(([confederation, entries]) => entries.map((entry) => {
  const [code, flagCode, name] = entry.split('|')
  return { code, name, flagCode, confederation }
}))

const codes = worldCountries.map((country) => country.code)
if (new Set(codes).size !== codes.length) throw new Error('Duplicate country codes')

const byConfederation = (confederation) => worldCountries.filter((country) => country.confederation === confederation).map((country) => country.code)

// Balanced groups using a snake draw so the strongest seeds are spread out
function drawGroups(teamCodes, groupSize) {
  const groupCount = Math.ceil(teamCodes.length / groupSize)
  const groups = Array.from({ length: groupCount }, (_, index) => ({ name: `Group ${String.fromCharCode(65 + index)}`, countryCodes: [] }))
  teamCodes.forEach((code, index) => {
    const row = Math.floor(index / groupCount)
    const column = index % groupCount
    groups[row % 2 === 0 ? column : groupCount - 1 - column].countryCodes.push(code)
  })
  return groups
}

const nameOf = (code) => worldCountries.find((country) => country.code === code).name
const tournamentsFile = { metadata: {}, tournaments: [] }
const label = (confederation) => CONFEDERATION_LABELS[confederation]

const continental = COMPETITIONS.map((config) => {
  const teamCodes = byConfederation(config.confederation)
  const groups = drawGroups(teamCodes, config.groupSize)
  const bracketSize = 2 ** config.rounds.length
  const perGroup = Math.floor(bracketSize / groups.length)
  const extra = bracketSize - perGroup * groups.length
  const advancement = extra > 0
    ? `The top ${perGroup} teams in each group and the ${extra} best next-placed teams advance to the ${config.rounds[0].toLowerCase()}.`
    : `The top ${perGroup} teams in each group advance to the ${config.rounds[0].toLowerCase()}.`
  return {
    id: config.id,
    name: config.name,
    category: 'International',
    region: 'International',
    season: config.season,
    hostCountryCodes: config.hostCountryCodes,
    eligibleCountryCodes: teamCodes,
    stages: [
      { id: 'group-stage', name: 'Group Stage', format: 'groups', groups, advancement },
      { id: 'knockout-stage', name: 'Knockout Stage', format: 'knockout', rounds: config.rounds },
    ],
    rules: [
      `All ${teamCodes.length} ${label(config.confederation)} member nations are drawn into ${groups.length} groups.`,
      'Each team plays every other team in its group once; a win earns three points and a draw one.',
      advancement,
      'Knockout matches use extra time and penalties when required.',
      'Results also feed the VFA World Cup qualification rankings.',
    ],
    history: config.history,
  }
})

// Nations League: promotion/relegation divisions, then the League A winners meet in the finals
const europeCodes = byConfederation('UEFA')
const divisions = [['League A', 16], ['League B', 16], ['League C', 16], ['League D', europeCodes.length - 48]]
let divisionStart = 0
const nationsLeagueGroups = divisions.flatMap(([division, size]) => {
  const divisionGroups = drawGroups(europeCodes.slice(divisionStart, divisionStart + size), 4)
  divisionStart += size
  return divisionGroups.map((group) => ({ ...group, name: `${division} · ${group.name}` }))
})
const nationsLeague = {
  id: 'euro-nations-league-2027',
  name: 'Euro Nations League',
  category: 'International',
  region: 'International',
  season: '2027',
  hostCountryCodes: ['POR'],
  eligibleCountryCodes: europeCodes,
  stages: [
    { id: 'league-phase', name: 'League Phase', format: 'groups', groups: nationsLeagueGroups, advancement: 'The four League A group winners advance to the finals. Group winners are promoted and last-placed teams are relegated between divisions.' },
    { id: 'knockout-stage', name: 'Finals', format: 'knockout', rounds: ['Semi-finals', 'Final'] },
  ],
  rules: [
    `All ${europeCodes.length} European nations are placed into four divisions by ranking: League A, B and C hold 16 teams each and League D holds the rest.`,
    'Each division is split into groups of four; every team plays the others home and away.',
    'Group winners are promoted, last-placed teams are relegated, and League A winners play the finals.',
    'Knockout matches use extra time and penalties when required.',
  ],
  history: [{ season: '2025', champion: 'Spain', runnerUp: 'Portugal' }, { season: '2023', champion: 'Spain', runnerUp: 'Croatia' }],
}
const qualified = []
for (const [confederation, slots] of Object.entries(WORLD_CUP_SLOTS)) {
  const pool = byConfederation(confederation).filter((code) => !WORLD_CUP_PLAYOFFS.includes(code))
  qualified.push(...pool.slice(0, slots))
}
qualified.push(...WORLD_CUP_PLAYOFFS)
if (qualified.length !== 48) throw new Error(`Expected 48 qualifiers, got ${qualified.length}`)

const strengthOrder = (code) => codes.indexOf(code)
const seeded = [...qualified].sort((a, b) => {
  const confederationRank = (code) => Object.keys(CONFEDERATIONS).indexOf(worldCountries.find((country) => country.code === code).confederation)
  const aPos = CONFEDERATIONS[worldCountries.find((c) => c.code === a).confederation].findIndex((entry) => entry.startsWith(`${a}|`))
  const bPos = CONFEDERATIONS[worldCountries.find((c) => c.code === b).confederation].findIndex((entry) => entry.startsWith(`${b}|`))
  return aPos - bPos || confederationRank(a) - confederationRank(b) || strengthOrder(a) - strengthOrder(b)
})

const worldCup = {
  id: 'vfa-world-cup-2030',
  name: 'VFA World Cup',
  category: 'International',
  region: 'International',
  season: '2030',
  hostCountryCodes: ['ESP', 'POR', 'MAR', 'ARG', 'URU', 'BRA'],
  eligibleCountryCodes: codes,
  qualifiedCountryCodes: qualified,
  stages: [
    { id: 'group-stage', name: 'Group Stage', format: 'groups', groups: drawGroups(seeded, 4), advancement: 'The top two teams and the eight best third-placed teams advance to the round of 32.' },
    { id: 'knockout-stage', name: 'Knockout Stage', format: 'knockout', rounds: ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'] },
  ],
  rules: [
    `All ${codes.length} VFA member nations enter qualification through their confederations.`,
    'Forty-eight qualified teams are drawn into twelve groups of four.',
    'The top two teams and the eight best third-placed teams advance to the round of 32.',
    'Knockout matches use extra time and penalties when required.',
  ],
  history: [{ season: '2026', champion: 'Argentina', runnerUp: 'France' }, { season: '2022', champion: 'Argentina', runnerUp: 'France' }],
}

tournamentsFile.metadata = { version: '3.0.0', description: 'Simulated VFA international competitions covering every member nation.' }
tournamentsFile.tournaments = [worldCup, continental[1], nationsLeague, continental[0], ...continental.slice(2)]

writeFileSync(tournamentsPath, `${JSON.stringify(tournamentsFile, null, 2)}\n`)
writeFileSync(worldPath, `${JSON.stringify({ countryCount: worldCountries.length, confederations: Object.keys(CONFEDERATIONS).map(label), countries: worldCountries.map((country) => ({ ...country, confederation: label(country.confederation) })) }, null, 2)}\n`)
console.log(`countries ${worldCountries.length}; world cup qualifiers ${qualified.length}; ${nameOf('NGA')}`)
