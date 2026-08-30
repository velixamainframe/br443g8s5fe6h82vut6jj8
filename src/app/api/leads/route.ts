import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  serverError,
  logActivity,
} from '@/lib/api'
import { leadCreateSchema } from '@/lib/validations'
import { LEAD_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from '@/lib/constants'

// ---- GET /api/leads ---- list + filter + sort + paginate
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const sp = req.nextUrl.searchParams
    const page = Math.max(1, Number(sp.get('page') ?? '1'))
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? '20')))
    const q = sp.get('q')?.trim() || undefined
    const city = sp.get('city')?.trim() || undefined
    const cibilMin = sp.get('cibilMin') ? Number(sp.get('cibilMin')) : undefined
    const cibilMax = sp.get('cibilMax') ? Number(sp.get('cibilMax')) : undefined
    const loanMin = sp.get('loanMin') ? Number(sp.get('loanMin')) : undefined
    const loanMax = sp.get('loanMax') ? Number(sp.get('loanMax')) : undefined
    const status = sp.getAll('status').filter((s) => LEAD_STATUSES.includes(s as never))
    const priority = sp.getAll('priority').filter((p) => LEAD_PRIORITIES.includes(p as never))
    const source = sp.getAll('source').filter((s) => LEAD_SOURCES.includes(s as never))
    const assignedToId = sp.get('assignedToId') || undefined
    const partnerId = sp.get('partnerId') || undefined
    const origin = sp.get('origin') || undefined
    const onlyUrgent = sp.get('urgent') === '1'
    const onlyMine = sp.get('mine') === '1'
    const onlyUnassigned = sp.get('unassigned') === '1'
    const onlyCallbacks = sp.get('callbacks') === '1'
    const sortBy = sp.get('sortBy') || 'createdAt'
    const sortDir = sp.get('sortDir') === 'asc' ? 'asc' : 'desc'

    // Build where clause by role
    const where: Record<string, unknown> = { AND: [] }

    // Role-based scoping
    if (user.role === 'EMPLOYEE') {
      if (onlyMine) {
        ;(where.AND as unknown[]).push({ assignedToId: user.id })
      } else if (onlyUnassigned) {
        ;(where.AND as unknown[]).push({ assignedToId: null })
      } else if (user.canViewAllLeads) {
        // employees with explicit permission can view all
      } else {
        // default: see unassigned (lead box) + their own
        ;(where.AND as unknown[]).push({
          OR: [{ assignedToId: null }, { assignedToId: user.id }],
        })
      }
    } else if (user.role === 'PARTNER') {
      ;(where.AND as unknown[]).push({ partnerId: user.partnerId ?? '__none__' })
    }
    // ADMIN: no scoping

    if (status.length) (where.AND as unknown[]).push({ status: { in: status } })
    if (priority.length) (where.AND as unknown[]).push({ priority: { in: priority } })
    if (source.length) (where.AND as unknown[]).push({ source: { in: source } })
    if (city) (where.AND as unknown[]).push({ city: { contains: city, mode: 'insensitive' } })
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
    if (origin) (where.AND as unknown[]).push({ origin })
    if (assignedToId) (where.AND as unknown[]).push({ assignedToId })
    if (partnerId) (where.AND as unknown[]).push({ partnerId })
    if (onlyUrgent) (where.AND as unknown[]).push({ priority: 'URGENT' })
    if (onlyCallbacks) (where.AND as unknown[]).push({ status: 'CALLBACK' })
    if (q) {
      ;(where.AND as unknown[]).push({
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
          { city: { contains: q } },
        ],
      })
    }

    const allowedSort = [
      'createdAt',
      'updatedAt',
      'name',
      'phone',
      'loanAmount',
      'priority',
      'status',
      'cibilScore',
      'nextFollowUpAt',
      'claimedAt',
    ]
    const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt'

    const [total, leads] = await Promise.all([
      db.lead.count({ where: where as never }),
      db.lead.findMany({
        where: where as never,
        orderBy: { [sortField]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedTo: { select: { id: true, name: true, email: true, role: true } },
          partner: { select: { id: true, companyName: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { notesRel: true, followups: true, activities: true } },
        },
      }),
    ])

    return ok({
      leads,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (e) {
    return serverError('Failed to fetch leads', e)
  }
}

// ---- POST /api/leads ---- create a lead (admin/partner/employee)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const body = await req.json().catch(() => null)
    const parsed = leadCreateSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid lead data', parsed.error.flatten().fieldErrors)
    }
    const d = parsed.data

    // Role-based origin/source rules
    let origin = 'MANUAL'
    let source = d.source ?? 'MANUAL'
    let partnerId: string | null = null
    let assignedToId: string | null = d.assignedToId || null

    if (user.role === 'PARTNER') {
      origin = 'PARTNER'
      source = 'PARTNER'
      partnerId = user.partnerId ?? null
      if (!partnerId) return forbidden('Partner account not linked')
      // partners cannot assign to arbitrary employees; leads start unassigned
      assignedToId = null
    } else if (user.role === 'EMPLOYEE') {
      // employees can create leads but they're assigned to themselves or unassigned
      origin = 'MANUAL'
      source = d.source ?? 'MANUAL'
      assignedToId = assignedToId || user.id
    } else {
      // admin
      origin = 'MANUAL'
      source = d.source ?? 'MANUAL'
    }

    const phone = d.phone.replace(/\s+/g, '')
    const dedupeKey = `${phone}:${origin}`

    // duplicate-safe: if an active lead with same phone+origin exists, return it
    const existing = await db.lead.findUnique({ where: { dedupeKey } })
    if (existing) {
      return ok({ lead: existing, duplicate: true })
    }

    const lead = await db.lead.create({
      data: {
        name: d.name,
        email: d.email || null,
        phone,
        altPhone: d.altPhone || null,
        cibilScore: d.cibilScore || null,
        loanAmount: d.loanAmount ?? null,
        loanType: d.loanType || null,
        employmentType: d.employmentType || null,
        monthlyIncome: d.monthlyIncome ?? null,
        city: d.city || null,
        state: d.state || null,
        notes: d.notes || null,
        origin,
        source,
        partnerId,
        assignedToId,
        claimedAt: assignedToId ? new Date() : null,
        status: assignedToId ? (d.status ?? 'CLAIMED') : (d.status ?? 'NEW'),
        priority: d.priority ?? 'MEDIUM',
        createdById: user.id,
        dedupeKey,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        partner: { select: { id: true, companyName: true } },
      },
    })

    await logActivity({
      userId: user.id,
      action: 'LEAD_CREATED',
      leadId: lead.id,
      details: `Created lead for ${lead.name} (${lead.phone})`,
      meta: { origin, source, assignedToId },
    })

    return ok({ lead, duplicate: false })
  } catch (e) {
    return serverError('Failed to create lead', e)
  }
}
