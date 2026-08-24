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
import { noteSchema } from '@/lib/validations'

// GET /api/leads/[id]/notes
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
    if (user.role === 'EMPLOYEE' && lead.assignedToId !== user.id && !user.canViewAllLeads) {
      return forbidden()
    }
    if (user.role === 'PARTNER' && lead.partnerId !== user.partnerId) {
      return forbidden()
    }
    const notes = await db.note.findMany({
      where: { leadId: id },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })
    return ok({ notes })
  } catch (e) {
    return serverError('Failed to fetch notes', e)
  }
}

// POST /api/leads/[id]/notes
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
    if (user.role === 'EMPLOYEE' && lead.assignedToId !== user.id && !user.canViewAllLeads) {
      return forbidden()
    }
    if (user.role === 'PARTNER' && lead.partnerId !== user.partnerId) {
      return forbidden()
    }
    const body = await req.json().catch(() => null)
    const parsed = noteSchema.omit({ leadId: true }).safeParse(body)
    if (!parsed.success) return badRequest('Invalid note', parsed.error.flatten().fieldErrors)

    const note = await db.note.create({
      data: {
        leadId: id,
        authorId: user.id,
        content: parsed.data.content,
        isPinned: parsed.data.isPinned ?? false,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    })
    await logActivity({
      userId: user.id,
      action: 'NOTE_ADDED',
      leadId: id,
      details: `Added a note`,
    })
    return ok({ note })
  } catch (e) {
    return serverError('Failed to add note', e)
  }
}
