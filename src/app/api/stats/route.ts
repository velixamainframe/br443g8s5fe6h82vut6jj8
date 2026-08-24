import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/api'

// GET /api/stats — role-scoped dashboard statistics
export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const role = user.role

    if (role === 'ADMIN') {
      const [
        totalLeads,
        newLeads,
        claimed,
        contacted,
        converted,
        rejected,
        followUps,
        callbacks,
        urgent,
        totalUsers,
        activeEmployees,
        totalPartners,
        pendingTransfers,
        openRequests,
        websiteLeadsUnprocessed,
        websiteUrgent,
      ] = await Promise.all([
        db.lead.count(),
        db.lead.count({ where: { status: 'NEW' } }),
        db.lead.count({ where: { status: 'CLAIMED' } }),
        db.lead.count({ where: { status: 'CONTACTED' } }),
        db.lead.count({ where: { status: 'CONVERTED' } }),
        db.lead.count({ where: { status: 'REJECTED' } }),
        db.lead.count({ where: { status: 'FOLLOW_UP' } }),
        db.lead.count({ where: { status: 'CALLBACK' } }),
        db.lead.count({ where: { priority: 'URGENT' } }),
        db.user.count(),
        db.user.count({ where: { role: 'EMPLOYEE', active: true } }),
        db.user.count({ where: { role: 'PARTNER', active: true } }),
        db.leadTransfer.count({ where: { status: 'PENDING' } }),
        db.internalRequest.count({ where: { status: 'OPEN' } }),
        db.websiteLead.count({ where: { leadId: null } }),
        db.websiteLead.count({ where: { isUrgent: true, leadId: null } }),
      ])

      // top employees by conversions
      const topEmployeesRaw = await db.lead.groupBy({
        by: ['assignedToId'],
        where: { status: 'CONVERTED', assignedToId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      })
      const topEmployees = await Promise.all(
        topEmployeesRaw.map(async (r) => {
          const u = r.assignedToId
            ? await db.user.findUnique({ where: { id: r.assignedToId }, select: { id: true, name: true, email: true } })
            : null
          return { user: u, converted: r._count._all }
        })
      )

      // leads by source
      const bySourceRaw = await db.lead.groupBy({
        by: ['source'],
        _count: { _all: true },
      })
      const bySource = bySourceRaw.map((r) => ({ source: r.source, count: r._count._all }))

      return ok({
        role,
        totalLeads, newLeads, claimed, contacted, converted, rejected,
        followUps, callbacks, urgent,
        totalUsers, activeEmployees, totalPartners,
        pendingTransfers, openRequests,
        websiteLeadsUnprocessed, websiteUrgent,
        topEmployees, bySource,
      })
    }

    if (role === 'EMPLOYEE') {
      const uid = user.id
      const [
        assigned,
        contacted,
        converted,
        followUps,
        callbacks,
        pending,
        urgent,
        todaysFollowUps,
      ] = await Promise.all([
        db.lead.count({ where: { assignedToId: uid } }),
        db.lead.count({ where: { assignedToId: uid, status: 'CONTACTED' } }),
        db.lead.count({ where: { assignedToId: uid, status: 'CONVERTED' } }),
        db.lead.count({ where: { assignedToId: uid, status: 'FOLLOW_UP' } }),
        db.lead.count({ where: { assignedToId: uid, status: 'CALLBACK' } }),
        db.lead.count({ where: { assignedToId: uid, status: { in: ['NEW', 'CLAIMED'] } } }),
        db.lead.count({ where: { assignedToId: uid, priority: 'URGENT' } }),
        db.followUp.count({
          where: {
            createdBy: uid,
            completed: false,
            scheduledAt: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
          },
        }),
      ])
      const available = await db.lead.count({ where: { assignedToId: null, status: 'NEW' } })
      return ok({
        role,
        assigned, contacted, converted, followUps, callbacks, pending, urgent,
        availableInBox: available, todaysFollowUps,
      })
    }

    // PARTNER
    const pid = user.partnerId
    const [
      submitted,
      processed,
      approved,
      rejected,
      pending,
    ] = await Promise.all([
      db.lead.count({ where: { partnerId: pid ?? undefined } }),
      db.lead.count({ where: { partnerId: pid ?? undefined, status: { in: ['CONTACTED', 'FOLLOW_UP', 'CALLBACK', 'QUALIFIED'] } } }),
      db.lead.count({ where: { partnerId: pid ?? undefined, status: 'CONVERTED' } }),
      db.lead.count({ where: { partnerId: pid ?? undefined, status: 'REJECTED' } }),
      db.lead.count({ where: { partnerId: pid ?? undefined, status: 'NEW' } }),
    ])
    return ok({ role, submitted, processed, approved, rejected, pending })
  } catch (e) {
    return serverError('Failed to fetch stats', e)
  }
}
