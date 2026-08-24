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
import { followUpSchema } from '@/lib/validations'

// GET /api/leads/[id]/followups
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    const { id } = await ctx.params
    const lead = await db.lead.findUnique({ where: { id }, select: { id: true, assignedToId: true, partnerId: true } })
    if (!lead) return notFound()
    if (user.role === 'EMPLOYEE' && lead.assignedToId !== user.id && !user.canViewAllLeads) return forbidden()
    if (user.role === 'PARTNER' && lead.partnerId !== user.partnerId) return forbidden()
    const followups = await db.followUp.findMany({
      where: { leadId: id },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { scheduledAt: 'asc' },
    })
    return ok({ followups })
  } catch (e) {
    return serverError('Failed to fetch follow-ups', e)
  }
}

// POST /api/leads/[id]/followups
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    const { id } = await ctx.params
    const lead = await db.lead.findUnique({ where: { id }, select: { id: true, assignedToId: true, partnerId: true } })
    if (!lead) return notFound()
    if (user.role === 'EMPLOYEE' && lead.assignedToId !== user.id) return forbidden()
    if (user.role === 'PARTNER' && lead.partnerId !== user.partnerId) return forbidden()
    const body = await req.json().catch(() => null)
    const parsed = followUpSchema.omit({ leadId: true }).safeParse(body)
    if (!parsed.success) return badRequest('Invalid follow-up', parsed.error.flatten().fieldErrors)

    const scheduledAt = new Date(parsed.data.scheduledAt)
    const followup = await db.followUp.create({
      data: {
        leadId: id,
        createdBy: user.id,
        scheduledAt,
        type: parsed.data.type ?? 'CALL',
        notes: parsed.data.notes || null,
      },
      include: { author: { select: { id: true, name: true } } },
    })
    await db.lead.update({
      where: { id },
      data: { nextFollowUpAt: scheduledAt, status: 'FOLLOW_UP' },
    })
    await logActivity({
      userId: user.id,
      action: 'FOLLOWUP_SCHEDULED',
      leadId: id,
      details: `Scheduled ${parsed.data.type ?? 'CALL'} for ${scheduledAt.toLocaleString()}`,
    })
    return ok({ followup })
  } catch (e) {
    return serverError('Failed to schedule follow-up', e)
  }
}

// PATCH /api/leads/[id]/followups?followupId=...  — mark complete
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    const { id } = await ctx.params
    const followupId = req.nextUrl.searchParams.get('followupId')
    if (!followupId) return badRequest('followupId query param required')
    const followup = await db.followUp.findUnique({ where: { id: followupId, leadId: id } })
    if (!followup) return notFound('Follow-up not found')
    const updated = await db.followUp.update({
      where: { id: followupId },
      data: { completed: true, completedAt: new Date() },
    })
    await logActivity({
      userId: user.id,
      action: 'FOLLOWUP_COMPLETED',
      leadId: id,
      details: `Completed follow-up`,
    })
    return ok({ followup: updated })
  } catch (e) {
    return serverError('Failed to update follow-up', e)
  }
}
