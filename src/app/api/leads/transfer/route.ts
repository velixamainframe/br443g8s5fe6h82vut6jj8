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
import { transferSchema } from '@/lib/validations'

// POST /api/leads/transfer  { leadId, toUserId, reason }
// Employees can request a transfer (subject to their canTransferLeads perm);
// admins can transfer immediately.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const body = await req.json().catch(() => null)
    const parsed = transferSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid transfer data', parsed.error.flatten().fieldErrors)
    }
    const { leadId, toUserId, reason } = parsed.data

    const lead = await db.lead.findUnique({ where: { id: leadId } })
    if (!lead) return notFound('Lead not found')

    const toUser = await db.user.findUnique({ where: { id: toUserId } })
    if (!toUser || !toUser.active) return notFound('Target employee not found')
    if (toUser.role !== 'EMPLOYEE' && toUser.role !== 'ADMIN') {
      return badRequest('Leads can only be transferred to employees')
    }

    if (user.role === 'EMPLOYEE') {
      if (lead.assignedToId !== user.id) {
        return forbidden('You can only transfer leads assigned to you')
      }
      if (!user.canTransferLeads) {
        return forbidden('You do not have permission to transfer leads')
      }
      // Employees create a pending transfer request requiring admin approval.
      const existing = await db.leadTransfer.findFirst({
        where: { leadId, status: 'PENDING' },
      })
      if (existing) {
        return badRequest('A pending transfer request already exists for this lead')
      }
      const transfer = await db.leadTransfer.create({
        data: {
          leadId,
          fromUserId: user.id,
          toUserId,
          reason: reason || null,
          status: 'PENDING',
        },
        include: {
          lead: { select: { id: true, name: true, phone: true } },
          fromUser: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
        },
      })
      await logActivity({
        userId: user.id,
        action: 'TRANSFER_REQUESTED',
        leadId,
        details: `Requested transfer to ${toUser.name}`,
        meta: { toUserId },
      })
      return ok({ transfer, requiresApproval: true })
    }

    // ADMIN: execute transfer immediately.
    await db.lead.update({
      where: { id: leadId },
      data: { assignedToId: toUserId, claimedAt: new Date(), status: 'CLAIMED' },
    })
    const transfer = await db.leadTransfer.create({
      data: {
        leadId,
        fromUserId: lead.assignedToId ?? user.id,
        toUserId,
        reason: reason || null,
        status: 'COMPLETED',
        approvedById: user.id,
        resolvedAt: new Date(),
      },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    })
    await logActivity({
      userId: user.id,
      action: 'LEAD_TRANSFERRED',
      leadId,
      details: `Transferred lead to ${toUser.name}`,
      meta: { toUserId },
    })
    return ok({ transfer, requiresApproval: false })
  } catch (e) {
    return serverError('Failed to transfer lead', e)
  }
}
