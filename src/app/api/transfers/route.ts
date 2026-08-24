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

// GET /api/transfers — list pending transfers (admin) or own transfers (employee)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const sp = req.nextUrl.searchParams
    const status = sp.get('status') || undefined
    const where: Record<string, unknown> = {}
    if (status) where.status = status

    if (user.role === 'EMPLOYEE') {
      where.OR = [{ fromUserId: user.id }, { toUserId: user.id }]
    }

    const transfers = await db.leadTransfer.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, phone: true, status: true } },
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ transfers })
  } catch (e) {
    return serverError('Failed to fetch transfers', e)
  }
}
