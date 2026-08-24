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
import { internalRequestUpdateSchema } from '@/lib/validations'

// PATCH /api/internal-requests/[id]
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    const { id } = await ctx.params

    const item = await db.internalRequest.findUnique({ where: { id } })
    if (!item) return notFound('Request not found')

    const body = await req.json().catch(() => null)
    const parsed = internalRequestUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid update', parsed.error.flatten().fieldErrors)
    }
    const d = parsed.data

    // Employees/partners can only update status of their own request to CLOSED
    if (user.role !== 'ADMIN') {
      if (item.requestedById !== user.id) return forbidden()
      if (d.status && d.status !== 'CLOSED') return forbidden('You can only close your own request')
      const updated = await db.internalRequest.update({
        where: { id },
        data: { status: 'CLOSED' },
      })
      return ok({ request: updated })
    }

    const data: Record<string, unknown> = {}
    if (d.status !== undefined) data.status = d.status
    if (d.response !== undefined) data.response = d.response || null
    if (d.assignedToId !== undefined) data.assignedToId = d.assignedToId || null

    const updated = await db.internalRequest.update({
      where: { id },
      data,
      include: {
        requestedBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })
    await logActivity({
      userId: user.id,
      action: 'INTERNAL_REQUEST_UPDATED',
      details: `Updated request "${item.subject}" → ${d.status ?? 'edited'}`,
    })
    return ok({ request: updated })
  } catch (e) {
    return serverError('Failed to update request', e)
  }
}
