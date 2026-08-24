import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api'

// GET /api/stats/conversions?userId=xxx — detailed conversion report for a specific employee
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return unauthorized()

    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return badRequest('userId is required')

    const conversions = await db.lead.findMany({
      where: {
        assignedToId: userId,
        status: 'CONVERTED',
      },
      select: {
        id: true,
        name: true,
        phone: true,
        loanType: true,
        loanAmount: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return ok({ conversions })
  } catch (e) {
    return serverError('Failed to fetch conversion details', e)
  }
}
