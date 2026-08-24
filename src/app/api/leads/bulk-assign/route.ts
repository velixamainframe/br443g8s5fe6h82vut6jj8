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

// POST /api/leads/bulk-assign  { leadIds: string[], assignedToId: string }
// Admin only.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden('Only admins can bulk-assign leads')

    const body = await req.json().catch(() => null)
    const leadIds: unknown = body?.leadIds
    const assignedToId: unknown = body?.assignedToId
    if (!Array.isArray(leadIds) || !leadIds.length || typeof assignedToId !== 'string') {
      return badRequest('leadIds[] and assignedToId are required')
    }
    const target = await db.user.findUnique({ where: { id: assignedToId } })
    if (!target || !target.active || target.role !== 'EMPLOYEE') {
      return badRequest('Target must be an active employee')
    }

    const result = await db.lead.updateMany({
      where: { id: { in: leadIds as string[] } },
      data: { assignedToId, claimedAt: new Date(), status: 'CLAIMED' },
    })

    await logActivity({
      userId: user.id,
      action: 'LEADS_BULK_ASSIGNED',
      details: `Assigned ${result.count} lead(s) to ${target.name}`,
      meta: { count: result.count, assignedToId, leadIds },
    })

    return ok({ assigned: result.count })
  } catch (e) {
    return serverError('Bulk assign failed', e)
  }
}
