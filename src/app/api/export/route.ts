import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { LEAD_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from '@/lib/constants'
import { ok, unauthorized, serverError } from '@/lib/api'

// GET /api/export?format=csv — export leads as CSV
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const sp = req.nextUrl.searchParams
    const q = sp.get('q')?.trim() || undefined
    const city = sp.get('city')?.trim() || undefined
    const cibilMin = sp.get('cibilMin') ? Number(sp.get('cibilMin')) : undefined
    const cibilMax = sp.get('cibilMax') ? Number(sp.get('cibilMax')) : undefined
    const loanMin = sp.get('loanMin') ? Number(sp.get('loanMin')) : undefined
    const loanMax = sp.get('loanMax') ? Number(sp.get('loanMax')) : undefined
    const status = sp.getAll('status').filter((s) => LEAD_STATUSES.includes(s as never))
    const priority = sp.getAll('priority').filter((p) => LEAD_PRIORITIES.includes(p as never))
    const source = sp.getAll('source').filter((s) => LEAD_SOURCES.includes(s as never))

    const where: Record<string, unknown> = { AND: [] }
    if (user.role === 'EMPLOYEE') {
      ;(where.AND as unknown[]).push({ assignedToId: user.id })
    } else if (user.role === 'PARTNER') {
      ;(where.AND as unknown[]).push({ partnerId: user.partnerId ?? '__none__' })
    }
    if (status.length) (where.AND as unknown[]).push({ status: { in: status } })
    if (priority.length) (where.AND as unknown[]).push({ priority: { in: priority } })
    if (source.length) (where.AND as unknown[]).push({ source: { in: source } })
    if (city) (where.AND as unknown[]).push({ city: { contains: city, mode: 'insensitive' } })
    if (q) (where.AND as unknown[]).push({ OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }] })
    if (cibilMin !== undefined || cibilMax !== undefined) {
      const cibilWhere: Record<string, number> = {}
      if (cibilMin !== undefined) cibilWhere.gte = cibilMin
      if (cibilMax !== undefined) cibilWhere.lte = cibilMax
      ;(where.AND as unknown[]).push({ cibilScore: { not: null, ...(cibilWhere as Record<string, number>) } })
    }
    if (loanMin !== undefined || loanMax !== undefined) {
      const loanWhere: Record<string, number> = {}
      if (loanMin !== undefined) loanWhere.gte = loanMin
      if (loanMax !== undefined) loanWhere.lte = loanMax
      ;(where.AND as unknown[]).push({ loanAmount: { not: null, ...(loanWhere as Record<string, number>) } })
    }

    const leads = await db.lead.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: {
        assignedTo: { select: { name: true } },
        partner: { select: { companyName: true } },
      },
    })

    const headers = [
      'Name', 'Phone', 'AltPhone', 'Email', 'CIBIL', 'LoanAmount', 'LoanType',
      'Employment', 'MonthlyIncome', 'City', 'State', 'Status', 'Priority',
      'Source', 'Origin', 'AssignedTo', 'Partner', 'CreatedAt',
    ]
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v)
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const rows = leads.map((l) =>
      [
        l.name, l.phone, l.altPhone ?? '', l.email ?? '', l.cibilScore ?? '',
        l.loanAmount ?? '', l.loanType ?? '', l.employmentType ?? '',
        l.monthlyIncome ?? '', l.city ?? '', l.state ?? '', l.status, l.priority,
        l.source, l.origin, l.assignedTo?.name ?? '', l.partner?.companyName ?? '',
        l.createdAt.toISOString(),
      ].map(escape).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="velixa-leads-${Date.now()}.csv"`,
      },
    })
  } catch (e) {
    return serverError('Export failed', e)
  }
}
