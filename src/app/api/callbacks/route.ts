import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api'

// GET /api/callbacks — urgent callback queue (red-highlighted leads)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role === 'PARTNER') return forbidden()

    const sp = req.nextUrl.searchParams
    const onlyMine = sp.get('mine') === '1'

    const where: Record<string, unknown> = {
      OR: [{ status: 'CALLBACK' }, { priority: 'URGENT' }],
    }
    if (user.role === 'EMPLOYEE' && !user.canViewAllLeads) {
      where.AND = [{ OR: [{ assignedToId: null }, { assignedToId: user.id }] }]
    }
    if (onlyMine && user.role === 'EMPLOYEE') {
      where.assignedToId = user.id
    }

    const leads = await db.lead.findMany({
      where: where as never,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 100,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    })
    return ok({ leads })
  } catch (e) {
    return serverError('Failed to fetch callbacks', e)
  }
}
