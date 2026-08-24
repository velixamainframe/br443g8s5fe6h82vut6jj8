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
import { leadUpdateSchema } from '@/lib/validations'

// GET /api/leads/[id] — single lead with relations
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    const { id } = await ctx.params

    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        partner: { select: { id: true, companyName: true, contactName: true } },
        createdBy: { select: { id: true, name: true } },
        websiteLead: true,
        notesRel: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        },
        followups: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { scheduledAt: 'asc' },
        },
        activities: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        transfers: {
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!lead) return notFound('Lead not found')

    // role-based access check
    if (user.role === 'EMPLOYEE') {
      if (lead.assignedToId && lead.assignedToId !== user.id && !user.canViewAllLeads) {
        return forbidden('You can only view leads assigned to you')
      }
    } else if (user.role === 'PARTNER') {
      if (lead.partnerId !== user.partnerId) {
        return forbidden('You can only view your own leads')
      }
    }

    return ok({ lead })
  } catch (e) {
    return serverError('Failed to fetch lead', e)
  }
}

// PATCH /api/leads/[id] — update lead
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    const { id } = await ctx.params

    const body = await req.json().catch(() => null)
    const parsed = leadUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid lead data', parsed.error.flatten().fieldErrors)
    }
    const d = parsed.data

    const lead = await db.lead.findUnique({ where: { id } })
    if (!lead) return notFound('Lead not found')

    // Role-based permission check
    if (user.role === 'EMPLOYEE') {
      if (lead.assignedToId !== user.id) {
        return forbidden('You can only edit leads assigned to you')
      }
    } else if (user.role === 'PARTNER') {
      if (lead.partnerId !== user.partnerId) {
        return forbidden('You can only edit your own leads')
      }
      // partners can only edit a subset
    }

    const data: Record<string, unknown> = {}
    if (d.name !== undefined) data.name = d.name
    if (d.email !== undefined) data.email = d.email || null
    if (d.phone !== undefined) data.phone = d.phone.replace(/\s+/g, '')
    if (d.altPhone !== undefined) data.altPhone = d.altPhone || null
    if (d.cibilScore !== undefined) data.cibilScore = d.cibilScore || null
    if (d.loanAmount !== undefined) data.loanAmount = d.loanAmount ?? null
    if (d.loanType !== undefined) data.loanType = d.loanType || null
    if (d.employmentType !== undefined) data.employmentType = d.employmentType || null
    if (d.monthlyIncome !== undefined) data.monthlyIncome = d.monthlyIncome ?? null
    if (d.city !== undefined) data.city = d.city || null
    if (d.state !== undefined) data.state = d.state || null
    if (d.notes !== undefined) data.notes = d.notes || null
    if (d.priority !== undefined) data.priority = d.priority
    if (d.assignedToId !== undefined && user.role === 'ADMIN') {
      data.assignedToId = d.assignedToId || null
    }

    const prevStatus = lead.status
    if (d.status !== undefined && d.status !== prevStatus) {
      data.status = d.status
      if (d.status === 'CONTACTED' && !lead.lastContactedAt) {
        data.lastContactedAt = new Date()
      } else if (d.status === 'CONTACTED') {
        data.lastContactedAt = new Date()
      }
    }

    if (d.nextFollowUpAt !== undefined) {
      data.nextFollowUpAt = d.nextFollowUpAt ? new Date(d.nextFollowUpAt) : null
    }

    const updated = await db.lead.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        partner: { select: { id: true, companyName: true } },
      },
    })

    if (d.status && d.status !== prevStatus) {
      await logActivity({
        userId: user.id,
        action: 'LEAD_STATUS_CHANGED',
        leadId: id,
        details: `Status changed from ${prevStatus} → ${d.status}`,
        meta: { from: prevStatus, to: d.status },
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      })
    } else {
      await logActivity({
        userId: user.id,
        action: 'LEAD_UPDATED',
        leadId: id,
        details: 'Lead details updated',
        meta: { fields: Object.keys(data) },
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
      })
    }

    return ok({ lead: updated })
  } catch (e) {
    return serverError('Failed to update lead', e)
  }
}

// DELETE /api/leads/[id] — admin only
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden('Only admins can delete leads')
    const { id } = await ctx.params

    const lead = await db.lead.findUnique({ where: { id } })
    if (!lead) return notFound('Lead not found')

    await db.lead.delete({ where: { id } })
    await logActivity({
      userId: user.id,
      action: 'LEAD_DELETED',
      leadId: id,
      details: `Deleted lead ${lead.name} (${lead.phone})`,
    })
    return ok({ success: true })
  } catch (e) {
    return serverError('Failed to delete lead', e)
  }
}
