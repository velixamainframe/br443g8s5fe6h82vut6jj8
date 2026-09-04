import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, badRequest, unauthorized, forbidden, serverError, logActivity } from '@/lib/api'
import crypto from 'crypto'

// ---- POST /api/calls ---- initiate a new call session
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
      return forbidden('Only employees and admins can initiate calls')
    }

    const body = await req.json().catch(() => null)
    if (!body?.leadId || !body?.phone) {
      return badRequest('Missing leadId or phone')
    }

    const { leadId, phone } = body
    const lead = await db.lead.findUnique({ where: { id: leadId } })
    if (!lead) return badRequest('Lead not found')

    // Auto-assign lead to employee if unassigned and user is employee
    let assignedToId = lead.assignedToId
    if (user.role === 'EMPLOYEE' && !lead.assignedToId) {
      assignedToId = user.id
      await db.lead.update({
        where: { id: leadId },
        data: { assignedToId: user.id, claimedAt: new Date() },
      })
      await logActivity({
        userId: user.id,
        action: 'LEAD_AUTO_ASSIGNED',
        leadId,
        details: `Lead auto-assigned to ${user.name} on phone call click`,
      })
    }

    // Create call session
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const callSession = await db.callSession.create({
      data: {
        leadId,
        userId: user.id,
        phone,
        sessionToken,
      },
    })

    // Log call initiation
    await logActivity({
      userId: user.id,
      action: 'CALL_INITIATED',
      leadId,
      details: `Call initiated to ${phone}`,
      meta: { callSessionId: callSession.id, phone },
    })

    return ok({
      callSession,
      telLink: `tel:${phone}`,
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/call-return/${sessionToken}`,
    })
  } catch (e) {
    return serverError('Failed to initiate call', e)
  }
}

// ---- GET /api/calls/[sessionToken] ---- get call session details
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const url = new URL(req.url)
    const sessionToken = url.pathname.split('/').pop()

    if (!sessionToken) {
      return badRequest('Missing session token')
    }

    const callSession = await db.callSession.findUnique({
      where: { sessionToken },
      include: {
        lead: true,
        user: true,
        transferredTo: true,
      },
    })

    if (!callSession) return badRequest('Call session not found')

    // Permission check: only the user who initiated the call can access it
    if (callSession.userId !== user.id && user.role !== 'ADMIN') {
      return forbidden('You do not have access to this call session')
    }

    return ok({ callSession })
  } catch (e) {
    return serverError('Failed to fetch call session', e)
  }
}
