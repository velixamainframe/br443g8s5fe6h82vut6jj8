import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api'

// GET /api/activities — audit log (admin only)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const sp = req.nextUrl.searchParams
    const page = Math.max(1, Number(sp.get('page') ?? '1'))
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? '50')))
    const action = sp.get('action') || undefined
    const userId = sp.get('userId') || undefined
    const leadId = sp.get('leadId') || undefined

    const where: Record<string, unknown> = {}
    if (action) where.action = { contains: action }
    if (userId) where.userId = userId
    if (leadId) where.leadId = leadId

    const [total, items] = await Promise.all([
      db.activityLog.count({ where }),
      db.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, role: true, email: true } },
          lead: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])
    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (e) {
    return serverError('Failed to fetch audit log', e)
  }
}
