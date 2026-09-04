import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, badRequest, unauthorized, forbidden, serverError, logActivity } from '@/lib/api'

// ---- PATCH /api/calls/[sessionToken]/result ---- save call result and feedback
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ sessionToken: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { sessionToken } = await ctx.params
    const body = await req.json().catch(() => null)

    if (!sessionToken) {
      return badRequest('Missing session token')
    }

    const callSession = await db.callSession.findUnique({
      where: { sessionToken },
      include: { lead: true },
    })

    if (!callSession) return badRequest('Call session not found')

    // Permission check: only the user who initiated the call can submit the result
    if (callSession.userId !== user.id && user.role !== 'ADMIN') {
      return forbidden('You do not have access to this call session')
    }

    const {
      callStatus, // SUCCESS | FAILED | NOT_ATTEMPTED
      callDuration,
      callResult, // SCHEDULED | TRANSFERRED | PENDING_DOCS | CLOSED | OTHER
      feedback,
      wasSuccessful,
      shouldReschedule,
      rescheduledAt,
      isPendingDocs,
      transferredToId,
      newLeadStatus,
    } = body

    // Build update data
    const updateData: Record<string, unknown> = {
      endedAt: new Date(),
      returnedAt: new Date(),
      callStatus: callStatus || null,
      callDuration: callDuration || null,
      callResult: callResult || null,
      feedback: feedback || null,
      wasSuccessful: wasSuccessful ?? false,
      shouldReschedule: shouldReschedule ?? false,
      rescheduledAt: rescheduledAt ? new Date(rescheduledAt) : null,
      isPendingDocs: isPendingDocs ?? false,
      transferredToId: transferredToId || null,
    }

    const updated = await db.callSession.update({
      where: { sessionToken },
      data: updateData,
      include: {
        lead: true,
        user: true,
        transferredTo: true,
      },
    })

    // Update lead status if specified
    if (newLeadStatus && callSession.lead) {
      await db.lead.update({
        where: { id: callSession.lead.id },
        data: { status: newLeadStatus },
      })
    }

    // Handle lead transfer if requested
    if (transferredToId && callSession.lead) {
      await db.lead.update({
        where: { id: callSession.lead.id },
        data: { assignedToId: transferredToId },
      })
      await logActivity({
        userId: user.id,
        action: 'LEAD_TRANSFERRED_FROM_CALL',
        leadId: callSession.lead.id,
        details: `Lead transferred from ${user.name} to another employee after call`,
        meta: { callSessionId: callSession.id, transferredToId },
      })
    }

    // Log call result
    await logActivity({
      userId: user.id,
      action: 'CALL_COMPLETED',
      leadId: callSession.lead?.id,
      details: `Call completed - Status: ${callStatus}, Result: ${callResult}`,
      meta: {
        callSessionId: callSession.id,
        callStatus,
        callResult,
        wasSuccessful,
        shouldReschedule,
        isPendingDocs,
      },
    })

    return ok({ callSession: updated })
  } catch (e) {
    return serverError('Failed to save call result', e)
  }
}
