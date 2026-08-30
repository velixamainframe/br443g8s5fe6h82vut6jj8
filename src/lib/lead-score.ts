export type LeadScoreBand = 'Cold' | 'Warm' | 'Hot' | 'Priority'

export function getLeadScore(input: {
  cibilScore?: string | number | null
  loanAmount?: number | null
  city?: string | null
  status?: string | null
  priority?: string | null
  source?: string | null
}) {
  let score = 18

  const cibil = Number(String(input.cibilScore ?? '').replace(/[^\d.]/g, '')) || null
  if (cibil !== null) {
    if (cibil >= 750) score += 34
    else if (cibil >= 700) score += 24
    else if (cibil >= 650) score += 14
    else if (cibil >= 600) score += 8
  }

  const loan = input.loanAmount ?? null
  if (loan !== null) {
    if (loan >= 2000000) score += 30
    else if (loan >= 1000000) score += 22
    else if (loan >= 500000) score += 14
    else if (loan >= 200000) score += 8
  }

  const city = (input.city ?? '').trim().toLowerCase()
  const metroCities = ['mumbai', 'delhi', 'gurugram', 'noida', 'bangalore', 'hyderabad', 'pune', 'chennai', 'ahmedabad', 'surat']
  if (metroCities.includes(city)) score += 12
  else if (city) score += 6

  const status = input.status ?? ''
  if (status === 'CALLBACK') score += 18
  else if (status === 'QUALIFIED') score += 16
  else if (status === 'FOLLOW_UP') score += 12
  else if (status === 'CONTACTED') score += 10
  else if (status === 'CLAIMED') score += 8
  else if (status === 'NEW') score += 4

  const priority = input.priority ?? ''
  if (priority === 'URGENT') score += 20
  else if (priority === 'HIGH') score += 15
  else if (priority === 'MEDIUM') score += 8
  else if (priority === 'LOW') score += 4

  const source = (input.source ?? '').toUpperCase()
  if (source === 'REFERRAL') score += 8
  else if (source === 'WEBSITE') score += 7
  else if (source === 'PARTNER') score += 5
  else if (source === 'IMPORT') score += 4
  else if (source === 'MANUAL') score += 3

  const clamped = Math.min(100, Math.max(12, score))
  let band: LeadScoreBand = 'Cold'
  if (clamped >= 80) band = 'Priority'
  else if (clamped >= 60) band = 'Hot'
  else if (clamped >= 35) band = 'Warm'

  return { score: clamped, band }
}
