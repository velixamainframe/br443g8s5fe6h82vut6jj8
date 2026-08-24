import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
  logActivity,
} from '@/lib/api'

// POST /api/leads/claim  { leadId }
// Concurrency-safe: uses a conditional atomic update so two employees racing
// to claim the same lead cannot both succeed.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
      return forbidden('Only employees can claim leads')
    }

    const body = await req.json().catch(() => null)
    const leadId = body?.leadId
    if (!leadId || typeof leadId !== 'string') {
      return badRequest('leadId is required')
    }

    const lead = await db.lead.findUnique({ where: { id: leadId } })
    if (!lead) return notFound('Lead not found')

    // Already assigned to this user → idempotent success
    if (lead.assignedToId === user.id) {
      return ok({ lead, alreadyMine: true })
    }
    // Assigned to someone else → conflict
    if (lead.assignedToId) {
      return conflict('This lead was just claimed by another agent')
    }

    // Atomic conditional claim: only updates if still unassigned.
    const result = await db.lead.updateMany({
      where: { id: leadId, assignedToId: null },
      data: {
        assignedToId: user.id,
        claimedAt: new Date(),
        status: 'CLAIMED',
      },
    })

    if (result.count === 0) {
      // lost the race
      return conflict('This lead was just claimed by another agent')
    }

    const updated = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        partner: { select: { id: true, companyName: true } },
      },
    })

    await logActivity({
      userId: user.id,
      action: 'LEAD_CLAIMED',
      leadId,
      details: `Claimed lead ${lead.name} (${lead.phone})`,
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    })

    return ok({ lead: updated })
  } catch (e) {
    return serverError('Failed to claim lead', e)
  }
}
