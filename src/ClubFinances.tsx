import { useState, type ReactNode } from 'react'
import { club, getWageLimit } from './data/mockData'
import { seasonLabel, useGame } from './state/gameStore'
import { acceptSponsorOffer, declineSponsorOffer, useSponsors } from './state/sponsors'
import { buildFinanceModel, type FinanceModel, type SeasonFinance } from './state/finances'
import { PLACEHOLDER_PORTRAIT } from './portrait'

const million = (amount: number) => `${amount < 0 ? '-' : ''}£${(Math.abs(amount) / 1_000_000).toFixed(1)}M`
const tone = (amount: number) => amount < 0 ? 'neg' : 'pos'
const displayDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2)

function Panel({ kicker, title, children, aside }: { kicker: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return <section className="fin-panel"><div className="club-panel-heading"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2></div>{aside}</div>{children}</section>
}

function TrendChart({ rows }: { rows: SeasonFinance[] }) {
  const width = 300, height = 124, left = 30, top = 8, bottom = 18
  const values = rows.flatMap((row) => [row.revenue, row.expenses, row.profit])
  const max = Math.max(0, ...values), min = Math.min(0, ...values)
  const span = max - min || 1
  const x = (index: number) => left + index * ((width - left - 6) / Math.max(1, rows.length - 1))
  const y = (value: number) => top + (max - value) / span * (height - top - bottom)
  const line = (pick: (row: SeasonFinance) => number) => rows.map((row, index) => `${x(index)},${y(pick(row))}`).join(' ')
  const ticks = [max, 0, min].filter((value, index, all) => all.indexOf(value) === index)
  return <svg aria-label="Revenue, expenses and profit by season" className="fin-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
    {ticks.map((tick) => <g key={tick}><line className="fin-grid" x1={left} x2={width - 4} y1={y(tick)} y2={y(tick)} /><text className="fin-axis" textAnchor="end" x={left - 4} y={y(tick) + 2}>{million(tick)}</text></g>)}
    <polyline className="fin-line revenue" points={line((row) => row.revenue)} />
    <polyline className="fin-line expenses" points={line((row) => row.expenses)} />
    <polyline className="fin-line profit" points={line((row) => row.profit)} />
    {rows.map((row, index) => <text className="fin-axis" key={row.season} textAnchor="middle" x={x(index)} y={height - 4}>{row.season.slice(2)}</text>)}
  </svg>
}

function ProjectionChart({ rows }: { rows: { season: string; revenue: number; expenses: number; profit: number }[] }) {
  const width = 300, height = 110, left = 6, top = 6, bottom = 16
  const max = Math.max(...rows.flatMap((row) => [row.revenue, row.expenses, row.profit]), 1)
  const min = Math.min(0, ...rows.map((row) => row.profit))
  const span = max - min
  const y = (value: number) => top + (max - value) / span * (height - top - bottom)
  const group = (width - left * 2) / rows.length
  return <svg aria-label="Three year projection" className="fin-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
    <line className="fin-grid" x1={left} x2={width - left} y1={y(0)} y2={y(0)} />
    {rows.map((row, index) => {
      const base = left + index * group + group * 0.2
      const bar = group * 0.2
      return <g key={row.season}>
        {([['revenue', row.revenue], ['expenses', row.expenses], ['profit', row.profit]] as const).map(([name, value], barIndex) => <rect className={`fin-bar ${name}`} height={Math.max(1, Math.abs(y(value) - y(0)))} key={name} rx="1.5" width={bar - 2} x={base + barIndex * bar} y={Math.min(y(value), y(0))} />)}
        <text className="fin-axis" textAnchor="middle" x={left + index * group + group / 2} y={height - 3}>{row.season}</text>
      </g>
    })}
  </svg>
}

function RiskGauge({ risk }: { risk: number }) {
  const label = risk < 35 ? 'Low' : risk < 65 ? 'Moderate' : 'High'
  const angle = -90 + risk * 1.8
  return <div className="fin-gauge">
    <svg aria-label={`Financial risk ${label}`} role="img" viewBox="0 0 110 64">
      <path d="M10 56 A45 45 0 0 1 36 15" fill="none" stroke="#2fa866" strokeLinecap="round" strokeWidth="9" />
      <path d="M40 13 A45 45 0 0 1 70 13" fill="none" stroke="#f0b73c" strokeLinecap="round" strokeWidth="9" />
      <path d="M74 15 A45 45 0 0 1 100 56" fill="none" stroke="#e0534c" strokeLinecap="round" strokeWidth="9" />
      <g transform={`rotate(${angle} 55 56)`}><path d="M55 56 L53 22 L57 22 Z" fill="#182646" /></g>
      <circle cx="55" cy="56" r="4" fill="#182646" />
    </svg>
    <strong className={`fin-risk-${label.toLowerCase()}`}>{label}</strong><small>RISK</small>
  </div>
}

function Indicators({ model }: { model: FinanceModel }) {
  const wageLimit = getWageLimit()
  const compliant = club.finances.weeklyWages <= wageLimit
  const growing = model.forecast[2].profit > model.current.profit
  const items = [
    { label: 'TRANSFER FLEXIBILITY', value: club.finances.transferBudget >= 3_000_000 ? 'Good' : 'Limited', note: `${million(club.finances.transferBudget)} available`, good: club.finances.transferBudget >= 3_000_000 },
    { label: 'WAGE GROWTH', value: model.wageToRevenue < 0.55 ? 'Controlled' : 'Moderate', note: `${Math.round(model.wageToRevenue * 100)}% of revenue`, good: model.wageToRevenue < 0.55 },
    { label: 'PROFITABILITY', value: growing ? 'Strong' : 'Flat', note: growing ? 'Profit expected to rise' : 'Profit expected to hold', good: growing },
    { label: 'FFP / SUSTAINABILITY', value: compliant ? 'Compliant' : 'Breach', note: compliant ? 'Within wage limits' : 'Above the wage limit', good: compliant },
  ]
  return <div className="fin-indicators">{items.map((item) => <article key={item.label}><span>{item.label}</span><strong className={item.good ? 'pos' : 'neg'}>{item.value}</strong><small>{item.note}</small></article>)}</div>
}

export function ClubFinances() {
  const view = useGame()
  const model = buildFinanceModel(view.season, seasonLabel)
  const { current, history, forecast } = model
  const rows = [...history, current]
  const outlookNote = model.outlook === 'Positive'
    ? `The club is projected to make a profit over the next ${forecast.length} seasons. Wage growth is the main thing to watch.`
    : model.outlook === 'Stable'
      ? 'Income and spending are roughly balanced. New signings or wage rises could tip the club into a loss.'
      : 'At current spending levels the club is projected to lose money. Cut wages or raise income.'
  return <>
    <div className="club-subpage-heading"><div><span className="eyebrow">{current.season} SEASON</span><h2>Finances</h2></div><span className={`club-tactic-tag fin-outlook-tag ${model.outlook.toLowerCase()}`}>{model.outlook.toUpperCase()} OUTLOOK</span></div>

    <section className="club-balance-card"><span className="eyebrow">CLUB BALANCE</span><strong>{million(club.finances.balance)}</strong>
      <div className="balance-columns"><span>Transfer budget <b>{million(club.finances.transferBudget)}</b></span><span>Weekly wage bill <b>£{Math.round(club.finances.weeklyWages).toLocaleString('en-GB')}</b></span></div>
    </section>

    <Panel kicker="THIS SEASON" title="Summary">
      <div className="fin-summary">
        <article><span>REVENUE</span><strong className="pos">{million(current.revenue)}</strong></article>
        <article><span>EXPENSES</span><strong className="neg">{million(current.expenses)}</strong></article>
        <article><span>PROFIT / LOSS</span><strong className={tone(current.profit)}>{million(current.profit)}</strong></article>
        <article><span>WAGE BILL</span><strong>{million(current.wageBill)}</strong></article>
      </div>
    </Panel>

    <Panel kicker="FINANCIAL HISTORY" title="Financial trend">
      <div className="fin-legend"><i className="revenue" />Revenue<i className="expenses" />Expenses<i className="profit" />Profit / loss</div>
      <TrendChart rows={rows} />
      <div className="fin-table" role="table" aria-label="Financial history">
        <div className="fin-row head" role="row"><span>SEASON</span><span>REVENUE</span><span>EXPENSES</span><span>PROFIT</span><span>WAGES</span></div>
        {[...rows].reverse().map((row) => <div className="fin-row" key={row.season} role="row"><strong>{row.season}</strong><span className="pos">{million(row.revenue)}</span><span className="neg">{million(row.expenses)}</span><span className={tone(row.profit)}>{million(row.profit)}</span><span>{million(row.wageBill)}</span></div>)}
      </div>
      <p className="fin-footnote">Past seasons are estimates based on the club’s current finances. All amounts are after tax.</p>
    </Panel>

    <Panel kicker="WHERE THE MONEY COMES FROM" title="Revenue streams">
      {model.streams.map((stream) => {
        const share = current.revenue > 0 ? stream.amount / current.revenue * 100 : 0
        return <div className="fin-stream" key={stream.label}><div><strong>{stream.label}</strong><span>{share.toFixed(0)}% of revenue</span></div><b>{million(stream.amount)}</b><i><u style={{ width: `${share}%` }} /></i></div>
      })}
    </Panel>

    <Panel kicker="FINANCIAL FORECAST" title="Next 3 seasons">
      <div className="fin-advisor">
        <img alt="Finance advisor" src={PLACEHOLDER_PORTRAIT} />
        <div><span className="eyebrow">FINANCE ADVISOR SUMMARY</span><p>{outlookNote}</p></div>
        <div className="fin-advisor-outlook"><span>OUTLOOK</span><strong className={model.outlook === 'Negative' ? 'neg' : 'pos'}>{model.outlook}</strong></div>
      </div>
      <div className="fin-forecast-grid"><div><span className="eyebrow">3 YEAR PROJECTION</span><div className="fin-legend"><i className="revenue" />Revenue<i className="expenses" />Expenses<i className="profit" />Profit</div><ProjectionChart rows={forecast} /></div><RiskGauge risk={model.risk} /></div>
      <div className="fin-table" role="table" aria-label="Financial forecast">
        <div className="fin-row head forecast" role="row"><span>FORECAST</span>{forecast.map((row) => <span key={row.season}>{row.season}</span>)}</div>
        <div className="fin-row forecast" role="row"><strong>Revenue</strong>{forecast.map((row) => <span className="pos" key={row.season}>{million(row.revenue)}</span>)}</div>
        <div className="fin-row forecast" role="row"><strong>Expenses</strong>{forecast.map((row) => <span className="neg" key={row.season}>{million(row.expenses)}</span>)}</div>
        <div className="fin-row forecast" role="row"><strong>Profit</strong>{forecast.map((row) => <span className={tone(row.profit)} key={row.season}>{million(row.profit)}</span>)}</div>
        <div className="fin-row forecast" role="row"><strong>Cash balance</strong>{forecast.map((row) => <span key={row.season}>{million(row.cash)}</span>)}</div>
        <div className="fin-row forecast" role="row"><strong>Wage bill</strong>{forecast.map((row) => <span key={row.season}>{million(row.wageBill)}</span>)}</div>
      </div>
      <Indicators model={model} />
    </Panel>
  </>
}

function SponsorOffers({ date }: { date: string }) {
  const { offers, slots } = useSponsors()
  const [notice, setNotice] = useState('')
  if (!offers.length && !notice) return null
  return <Panel kicker="NEW OFFERS" title="Sponsors want to sign" aside={<span className="fin-count">{offers.length}</span>}>
    {notice && <p className="board-result accepted" role="status">{notice}</p>}
    <div className="sponsor-list">{offers.map((offer) => {
      const previous = slots.find((slot) => slot.id === offer.slotId)?.previousValue ?? offer.valueAnnual
      const change = Math.round((offer.valueAnnual - previous) / previous * 100)
      return <article className="sponsor-row offer" key={offer.id}>
        <span className="sponsor-logo">{initials(offer.company)}</span>
        <div className="sponsor-identity"><strong>{offer.company}</strong><span>{offer.years} season{offer.years === 1 ? '' : 's'} · open until {displayDate(offer.validUntil)}</span></div>
        <span className="sponsor-category">{offer.category.toUpperCase()}</span>
        <div className="sponsor-value"><b>{`£${(offer.valueAnnual / 1_000_000).toFixed(2)}M`}<small> / yr</small></b><em className={change < 0 ? 'down' : 'up'}>{change >= 0 ? '+' : ''}{change}% vs last deal</em></div>
        <div className="sponsor-actions"><button className="sponsor-accept" onClick={() => setNotice(acceptSponsorOffer(offer.id, date))} type="button">Accept</button><button className="sponsor-decline" onClick={() => { declineSponsorOffer(offer.id); setNotice('') }} type="button">Decline</button></div>
      </article>
    })}</div>
  </Panel>
}

export function ClubSponsorship() {
  const view = useGame()
  useSponsors()
  const model = buildFinanceModel(view.season, seasonLabel)
  const sponsors = [...club.sponsors].sort((first, second) => second.valueAnnual - first.valueAnnual)
  const total = club.finances.sponsorshipIncomeAnnual
  const stadiumRights = Math.round(club.stadium.capacity * 85 / 10000) * 10000
  const nextExpiry = [...club.sponsors].sort((first, second) => first.endDate.localeCompare(second.endDate))[0]
  const expiresSoon = (endDate: string) => Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${view.date}T12:00:00Z`) < 365 * 86_400_000
  return <>
    <div className="club-subpage-heading"><div><span className="eyebrow">{model.current.season} SEASON</span><h2>Sponsorship</h2></div><span className="club-tactic-tag">{million(total)} / YR</span></div>
    <div className="club-overview-metrics">
      <article><span>ANNUAL INCOME</span><strong>{million(total)}</strong><small>{Math.round(total / model.current.revenue * 100)}% of revenue</small></article>
      <article><span>PARTNERS</span><strong>{sponsors.length}</strong><small>Active deals</small></article>
      <article><span>NEXT EXPIRY</span><strong>{nextExpiry ? displayDate(nextExpiry.endDate) : '—'}</strong><small>{nextExpiry?.name ?? 'No deals'}</small></article>
    </div>

    <SponsorOffers date={view.date} />

    <Panel kicker="PARTNERS" title="Main & shirt sponsors" aside={<span className="fin-count">{sponsors.length}</span>}>
      <div className="sponsor-list">{sponsors.map((sponsor, index) => <article className="sponsor-row" key={sponsor.name}>
        <span className="sponsor-logo">{initials(sponsor.name)}</span>
        <div className="sponsor-identity"><strong>{sponsor.name}</strong><span>Ends {displayDate(sponsor.endDate)}</span></div>
        <span className="sponsor-category">{index === 0 ? 'MAIN' : sponsor.category.toUpperCase()}</span>
        <div className="sponsor-value"><b>{million(sponsor.valueAnnual)}<small> / yr</small></b><i><u style={{ width: `${total > 0 ? sponsor.valueAnnual / total * 100 : 0}%` }} /></i>{expiresSoon(sponsor.endDate) && <em>Renewal due</em>}</div>
      </article>)}</div>
    </Panel>

    <Panel kicker="NAMING RIGHTS" title="Stadium rights">
      <article className="sponsor-row"><span className="sponsor-logo">{initials(club.stadium.name)}</span><div className="sponsor-identity"><strong>Naming rights unsold</strong><span>{club.stadium.name} · {club.stadium.capacity.toLocaleString('en-GB')} seats</span></div><span className="sponsor-category">OFFER</span><div className="sponsor-value"><b>{million(stadiumRights)}<small> / yr</small></b></div></article>
    </Panel>

    <Panel kicker="REVENUE & SPEND" title="Income streams">
      <div className="finance-line"><span>Sponsorship income <small>per season</small></span><strong>{million(total)}</strong></div>
      <div className="finance-line"><span>Ticket sales <small>per home match</small></span><strong>£{club.finances.ticketSalesPerHomeMatch.toLocaleString('en-GB')}</strong></div>
      <div className="finance-line"><span>Weekly wages <small>of £{club.finances.wageBudget.toLocaleString('en-GB')} budget</small></span><strong>£{Math.round(club.finances.weeklyWages).toLocaleString('en-GB')}</strong></div>
      <div className="finance-line"><span>Monthly operations</span><strong>£{club.finances.operationsPerMonth.toLocaleString('en-GB')}</strong></div>
    </Panel>
  </>
}
