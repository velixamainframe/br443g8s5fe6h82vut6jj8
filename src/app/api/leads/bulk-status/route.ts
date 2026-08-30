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
import { LEAD_STATUSES } from '@/lib/constants'

// POST /api/leads/bulk-status { leadIds: string[], status: LeadStatus }
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden('Only admins can bulk-update lead status')

    const body = await req.json().catch(() => null)
    const leadIds: unknown = body?.leadIds
    const status: unknown = body?.status

    if (!Array.isArray(leadIds) || !leadIds.length || typeof status !== 'string') {
      return badRequest('leadIds[] and status are required')
    }
    if (!LEAD_STATUSES.includes(status as never)) {
      return badRequest('Invalid lead status')
    }

    const result = await db.lead.updateMany({
      where: { id: { in: leadIds as string[] } },
      data: { status },
    })

    await logActivity({
      userId: user.id,
      action: 'LEADS_BULK_STATUS_UPDATED',
      details: `Updated ${result.count} lead(s) to ${status}`,
      meta: { count: result.count, status, leadIds },
    })

    return ok({ updated: result.count })
  } catch (e) {
    return serverError('Bulk status update failed', e)
  }
}
