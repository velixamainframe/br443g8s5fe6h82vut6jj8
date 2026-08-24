import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api'

// GET /api/partners — list partners (admin)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const partners = await db.partner.findMany({
      include: {
        user: { select: { id: true, email: true, name: true, active: true, lastLoginAt: true } },
        leads: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    const withStats = partners.map((p) => ({
      id: p.id,
      companyName: p.companyName,
      contactName: p.contactName,
      phone: p.phone,
      email: p.email,
      user: p.user,
      stats: {
        total: p.leads.length,
        converted: p.leads.filter((l) => l.status === 'CONVERTED').length,
        rejected: p.leads.filter((l) => l.status === 'REJECTED').length,
        pending: p.leads.filter((l) => l.status === 'NEW').length,
      },
    }))
    return ok({ partners: withStats })
  } catch (e) {
    return serverError('Failed to fetch partners', e)
  }
}
