const flagCodes: Record<string, string> = {
  eng: 'gb',
  sco: 'gb',
  wal: 'gb',
  england: 'gb',
  scotland: 'gb',
  wales: 'gb',
  irl: 'ie',
  ireland: 'ie',
  nga: 'ng',
  nigeria: 'ng',
  ang: 'ao',
  angola: 'ao',
  por: 'pt',
  portugal: 'pt',
  esp: 'es',
  spain: 'es',
  gha: 'gh',
  ghana: 'gh',
  english: 'gb',
  welsh: 'gb',
  irish: 'ie',
  nigerian: 'ng',
  portuguese: 'pt',
  spanish: 'es',
}

export function resolveFlagCode(countryCode: string) {
  const normalized = countryCode.trim().toLowerCase()
  return flagCodes[normalized] ?? normalized
}

export function displayCountryName(countryName: string) {
  const names: Record<string, string> = { english: 'England', welsh: 'Wales', irish: 'Ireland', nigerian: 'Nigeria', spanish: 'Spain', portuguese: 'Portugal' }
  return names[countryName.trim().toLowerCase()] ?? countryName
}
