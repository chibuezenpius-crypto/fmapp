import { resolveFlagCode } from './countryFlagUtils'

interface FlagProps {
  code: string
  countryName: string
  onSelectCountry: (countryName: string) => void
  className?: string
}

export default function Flag({ code, countryName, onSelectCountry, className = '' }: FlagProps) {
  const flagCode = resolveFlagCode(code)
  return <button aria-label={`Open ${countryName} overview`} className={`country-flag-button ${className}`} onClick={() => onSelectCountry(countryName)} title={`Open ${countryName} overview`} type="button"><span aria-hidden="true" className={`fi fi-${flagCode} rounded-sm cursor-pointer`} /></button>
}
