import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const namesPath = path.join(root, 'src', 'data', 'names', 'globalNameDatabase.json')
const outputPath = path.join(root, 'src', 'data', 'globalLeaguesAndTeams.json')
const clubsPerCountry = 18

const leagueNames = {
  NGA: 'Nigeria Premier Football League', BRA: 'Campeonato Brasileiro Série A', ENG: 'English Premier League',
  ESP: 'La Liga', FRA: 'Ligue 1', GER: 'Bundesliga', ITA: 'Serie A', ARG: 'Liga Profesional',
  POR: 'Primeira Liga', NED: 'Eredivisie', SCO: 'Scottish Premiership', WAL: 'Cymru Premier',
  IRL: 'League of Ireland Premier Division', GHA: 'Ghana Premier League', ANG: 'Girabola', SEN: 'Ligue 1',
  CIV: 'Ligue 1', CMR: 'Elite One', MAR: 'Botola Pro', EGY: 'Egyptian Premier League',
  BEL: 'Belgian Pro League', JPN: 'J1 League', KOR: 'K League 1', USA: 'Major League Soccer',
  MEX: 'Liga MX', COL: 'Categoría Primera A', CRO: 'Hrvatska nogometna liga', URU: 'Primera División',
  NOR: 'Eliteserien', SWE: 'Allsvenskan',
}

const namingStyles = {
  NGA: { left: ['Enugu', 'Aba', 'Lagos', 'Ibadan', 'Kano', 'Kaduna', 'Jos', 'Benin', 'Uyo', 'Ilorin', 'Owerri', 'Onitsha', 'Minna', 'Akure', 'Makurdi', 'Warri', 'Nsukka', 'Zaria'], right: ['South', 'Township', 'Foundry', 'Athletic', 'Harbour', 'United', 'City', 'Valley', 'Rovers', 'Stars', 'Highlands', 'Creek', 'Cedar', 'Gate', 'Meadow', 'Bridge', 'Heights', 'County'], glue: ' ' },
  ENG: { left: ['Bath', 'Peckham', 'Rivergate', 'Northbridge', 'Ashcombe', 'Kingswell', 'Westcliff', 'Millbrook', 'Stonefield', 'Eastmoor', 'Lakeside', 'Harrowgate', 'Southgate', 'Briarwood', 'Dunmore', 'Cedar Vale', 'Portwell', 'Redmere'], right: ['Royal', 'Town', 'Athletic', 'FC', 'United', 'County', 'Vale', 'Harbour', 'Rovers', 'Foundry', 'Meadow', 'Gate', 'Forest', 'Wanderers', 'Albion', 'Mill', 'Park', 'Cross'], glue: ' ' },
  GER: { left: ['München Nord', 'Bavaria West', 'Rheinpark', 'Waldkirch', 'Sonnenfeld', 'Eichenheim', 'Neustadt', 'Hafenbruck', 'Silberhöhe', 'Falkenried', 'Lindenstadt', 'Bergheim', 'Westhain', 'Kronental', 'Eisenfeld', 'Nordhafen', 'Wiesenburg', 'Tannenhof'], right: ['SV', 'FC', 'SC', 'TSV', 'VfB', 'Sportfreunde', 'Eintracht', 'Union', 'Fortuna', 'Dynamo', 'Borussia', 'Rot-Weiß', 'Grün-Weiß', 'Blau-Weiß', 'Vorwärts', 'Athletic', 'Stadt', 'Verein'], glue: ' ' },
  ESP: { left: ['Costa Verde', 'Sierra Azul', 'Puerto Claro', 'Valle Dorado', 'Monte Alba', 'Río Claro', 'San Telmo', 'Villa Serena', 'Campo Norte', 'Mar de Plata', 'Las Brisas', 'Nueva Vega', 'Solana', 'Pinar Alto', 'Castillo Verde', 'Fuente Real', 'Santa Marina', 'Puerta del Sol'], right: ['CF', 'Unión', 'Deportivo', 'Atlético', 'Sporting', 'Balompié', 'Cultural', 'Club', 'Ciudad', 'Racing', 'Arenas', 'Juventud', 'Estrella', 'Náutico', 'Montañés', 'Valladolid', 'Gimnástico', 'Regional'], glue: ' ' },
  FRA: { left: ['Valmont', 'Saint-Clair', 'Belle-Rive', 'Montfleur', 'Port-Lumière', 'Boisvert', 'Clairval', 'Rochebrune', 'Fontenay', 'Villedor', 'Beaumont', 'Les Aulnes', 'Montreuil-sur-Rive', 'Bois-des-Lacs', 'Saint-Roch', 'Bellefontaine', 'Val-des-Prés', 'Côte-d’Or'], right: ['FC', 'Olympique', 'Sportif', 'Union', 'Athlétique', 'Racing', 'Étoile', 'Stade', 'AS', 'SC', 'Club', 'Avenir', 'Entente', 'Cercle', 'Jeunesse', 'Métropole', 'Montagnard', 'Littoral'], glue: ' ' },
  ITA: { left: ['Vallechiara', 'Porto Serena', 'Monteverde', 'Borgonuovo', 'Castelcampo', 'Rivaforte', 'Pianoro', 'San Felice', 'Fontelago', 'Collealto', 'Marina Nuova', 'Bellacosta', 'Roccaferma', 'Villadoria', 'Campo Fiorito', 'Serravalle', 'Pontealto', 'Città Nuova'], right: ['Calcio', 'AC', 'US', 'Sporting', 'Virtus', 'Atletico', 'Polisportiva', 'Unione', 'Aurora', 'Pro', 'Real', 'Rinascita', 'Dynamo', 'Libertas', 'Stella', 'Olimpia', 'Cittadella', 'Rovers'], glue: ' ' },
  POR: { left: ['Vila Serena', 'Costa Dourada', 'Monte Claro', 'Porto Novo', 'Vale Formoso', 'Lagoa Alta', 'Campo Verde', 'Ponte Velha', 'Serra Branca', 'Vila Nova', 'Ribeira Alta', 'São Lourenço', 'Alto Douro', 'Praia Norte', 'Várzea', 'Santa Luzia', 'Fonte Nova', 'Canto do Rio'], right: ['SC', 'FC', 'Atlético', 'União', 'Desportivo', 'Sporting', 'Académica', 'Clube', 'Estrela', 'Vitória', 'Nacional', 'Lusitano', 'Ferroviário', 'Juventude', 'Cultural', 'Olímpico', 'Real', 'Marítimo'], glue: ' ' },
  default: { left: ['Northgate', 'Riverbend', 'Highland', 'Greenfield', 'Westhaven', 'Eastport', 'Stonebridge', 'Clearwater', 'Pinecrest', 'Meadowbrook', 'Silverlake', 'Redwood', 'Oakridge', 'Fairview', 'Kingsford', 'Southmoor', 'Lakeshore', 'Cedar Grove'], right: ['FC', 'United', 'Athletic', 'Town', 'City', 'Rovers', 'County', 'Sporting', 'Stars', 'Harbour', 'Valley', 'Wanderers', 'Union', 'Olympic', 'Dynamo', 'SC', 'Racing', 'Club'], glue: ' ' },
}

const palette = [
  ['#146a50', '#f2d45c'], ['#284e87', '#e7e1cc'], ['#ad4539', '#f0d35d'], ['#452c70', '#f0e8d5'],
  ['#117d8b', '#ecb957'], ['#295d3d', '#d5e7dc'], ['#c05b34', '#204b74'], ['#755033', '#f2d45c'],
  ['#243e62', '#e0a94d'], ['#6c2f45', '#e2d3b0'], ['#4f6c35', '#ebe7dc'], ['#3f657a', '#cf543e'],
  ['#8c6c28', '#253d61'], ['#49615b', '#d2a64c'], ['#813e30', '#e8deca'], ['#31527c', '#8fc5aa'],
  ['#8a4e77', '#e8bd62'], ['#27614c', '#d4835a'],
]

const knownClubNames = new Set(['Manchester City', 'Manchester United', 'Arsenal', 'Chelsea', 'Real Madrid', 'Barcelona', 'Bayern Munich', 'Liverpool', 'Juventus', 'Paris Saint-Germain'])

function stableHash(value) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => value.trim()).filter(Boolean))]
}

function makeRegionalNames(country) {
  const style = namingStyles[country.code] ?? namingStyles.default
  const places = unique(Object.values(country.subRegions).flatMap((region) => region.cities ?? []))
  const left = places.length ? places : style.left
  const right = style.right
  const names = []
  const seen = new Set()
  const seed = stableHash(country.code)
  for (let index = 0; names.length < clubsPerCountry && index < clubsPerCountry * 20; index += 1) {
    const place = left[(index * 7 + seed % left.length) % left.length]
    const suffixIndex = Math.floor(index / left.length) + (index * 5 + Math.floor(seed / 17)) % right.length
    const suffix = right[suffixIndex % right.length]
    const name = `${place}${style.glue}${suffix}`
    const normalized = name.toLocaleLowerCase()
    if (!seen.has(normalized) && !knownClubNames.has(name)) {
      names.push(name)
      seen.add(normalized)
    }
  }
  for (let index = 0; names.length < clubsPerCountry; index += 1) {
    const place = left[index % left.length]
    const suffix = right[(Math.floor(index / left.length) + index + Math.floor(seed / 31)) % right.length]
    const name = `${place}${style.glue}${suffix} ${index + 2}`
    if (!seen.has(name.toLocaleLowerCase())) {
      names.push(name)
      seen.add(name.toLocaleLowerCase())
    }
  }
  return names
}

function buildStandings(countryCode, clubs) {
  const total = clubs.length
  return clubs.map((club, index) => {
    const played = 30 + (index % 5)
    const points = Math.max(9, 66 - index * 3 + (stableHash(`${countryCode}-${club}`) % 5))
    const won = Math.min(played, Math.floor(points / 3))
    const drawn = Math.min(played - won, points - won * 3)
    const lost = played - won - drawn
    const goalsFor = Math.max(18, 58 - index * 2 + (stableHash(`${countryCode}-${club}`) % 7))
    const goalDifference = Math.round((total / 2 - index) * 2.2)
    const goalsAgainst = Math.max(10, goalsFor - goalDifference)
    return {
      position: index + 1,
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points: won * 3 + drawn,
      form: [0, 1, 2, 3, 4].map((formIndex) => {
        const value = stableHash(`${countryCode}-${club}-form-${formIndex}`) % 3
        return value === 0 ? 'W' : value === 1 ? 'D' : 'L'
      }),
    }
  })
}

function buildCountryLeague(country) {
  const clubNames = makeRegionalNames(country)
  const standings = buildStandings(country.code, clubNames)
  const clubs = clubNames.map((name, index) => {
    const [primaryColor, secondaryColor] = palette[(index + stableHash(country.code) % palette.length) % palette.length]
    const initials = name.split(/\s+/).filter((part) => !['FC', 'SC', 'SV', 'TSV', 'VfB', 'US', 'AC'].includes(part)).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
    const colors = { primary: primaryColor, secondary: secondaryColor }
    return {
      id: `${country.code.toLowerCase()}-${String(index + 1).padStart(2, '0')}`,
      name,
      founded: 1890 + (stableHash(name) % 125),
      colors,
      badge: { viewBox: '0 0 48 56', shape: 'shield', initials, primaryColor, secondaryColor },
      standing: standings[index],
    }
  })
  return {
    id: `${country.code.toLowerCase()}-top-division`,
    name: leagueNames[country.code] ?? `${country.countryName} Premier Division`,
    countryCode: country.code,
    countryName: country.countryName,
    flagCode: country.iso2.toLowerCase(),
    season: '2026/27',
    teams: clubs,
  }
}

async function main() {
  const source = JSON.parse(await readFile(namesPath, 'utf8'))
  const countries = Object.values(source.countries).map((country) => buildCountryLeague(country))
  const clubNames = countries.flatMap((country) => country.teams.map((team) => `${country.countryCode}:${team.name.toLocaleLowerCase()}`))
  if (countries.length !== Object.keys(source.countries).length) throw new Error('League country coverage does not match globalNameDatabase.json.')
  if (clubNames.length !== countries.length * clubsPerCountry) throw new Error('Generated club count does not match configured league size.')
  if (new Set(clubNames).size !== clubNames.length) throw new Error('Duplicate team names found within a country.')

  const output = {
    metadata: {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: 'Procedurally generated from regional cities in globalNameDatabase.json',
      countryCount: countries.length,
      clubsPerCountry,
      teamCount: clubNames.length,
      trademarkPolicy: 'Fictional regional club names; no real club names are used.',
    },
    countries,
  }
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${countries.length} country leagues and ${clubNames.length} fictional club records to ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
