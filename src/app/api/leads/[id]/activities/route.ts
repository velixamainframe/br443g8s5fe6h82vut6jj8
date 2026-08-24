import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorized, forbidden, notFound, serverError } from '@/lib/api'

// GET /api/leads/[id]/activities
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
    const activities = await db.activityLog.findMany({
      where: { leadId: id },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return ok({ activities })
  } catch (e) {
    return serverError('Failed to fetch activities', e)
  }
}
