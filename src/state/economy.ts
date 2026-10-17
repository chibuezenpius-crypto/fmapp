import { club } from '../data/mockData'
import { cashFlowForDays, daysBetween, matchdayIncome } from './cashFlow'
import { onDayAdvance } from './gameStore'
import { ECONOMY_KEY, readCareer } from './saveData'

const storage = () => (typeof window === 'undefined' ? null : window.localStorage)

function readNet() {
  try {
    const value = Number(JSON.parse(storage()?.getItem(ECONOMY_KEY) ?? '0'))
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

// The running total is saved so the balance is rebuilt exactly after a reload.
let net = readNet()
club.finances.balance += net

onDayAdvance((from, to, played) => {
  const days = daysBetween(from, to)
  if (days === 0 || readCareer().status === 'unemployed') return
  const change = cashFlowForDays({ ...club.finances, prestige: club.prestige }, days) + matchdayIncome(played, club.id, club.finances.ticketSalesPerHomeMatch)
  club.finances.balance += change
  net += change
  try { storage()?.setItem(ECONOMY_KEY, JSON.stringify(net)) } catch { /* the balance stays correct for this session */ }
})
