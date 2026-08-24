import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  logActivity,
} from '@/lib/api'

// POST /api/transfers/[id]/approve  { decision: 'APPROVED' | 'REJECTED' }
// Admin only.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden('Only admins can approve transfers')
    const { id } = await ctx.params

    const transfer = await db.leadTransfer.findUnique({ where: { id } })
    if (!transfer) return notFound('Transfer not found')
    if (transfer.status !== 'PENDING') return badRequest('Transfer already resolved')

    const body = await req.json().catch(() => null)
    const decision = body?.decision
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return badRequest('decision must be APPROVED or REJECTED')
    }

    if (decision === 'APPROVED') {
      await db.$transaction([
        db.lead.update({
          where: { id: transfer.leadId },
          data: {
            assignedToId: transfer.toUserId,
            claimedAt: new Date(),
            status: 'CLAIMED',
          },
        }),
        db.leadTransfer.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            approvedById: user.id,
            resolvedAt: new Date(),
          },
        }),
      ])
      await logActivity({
        userId: user.id,
        action: 'TRANSFER_APPROVED',
        leadId: transfer.leadId,
        details: `Approved transfer to ${transfer.toUserId}`,
      })
    } else {
      await db.leadTransfer.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: user.id,
          resolvedAt: new Date(),
        },
      })
      await logActivity({
        userId: user.id,
        action: 'TRANSFER_REJECTED',
        leadId: transfer.leadId,
        details: `Rejected transfer request`,
      })
    }

    return ok({ success: true, decision })
  } catch (e) {
    return serverError('Failed to resolve transfer', e)
  }
}
