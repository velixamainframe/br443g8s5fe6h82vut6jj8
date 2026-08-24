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
import { internalRequestSchema } from '@/lib/validations'

// GET /api/internal-requests
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const sp = req.nextUrl.searchParams
    const status = sp.getAll('status')
    const where: Record<string, unknown> = {}

    if (user.role === 'EMPLOYEE' || user.role === 'PARTNER') {
      where.requestedById = user.id
    }
    if (status.length) where.status = { in: status }

    const items = await db.internalRequest.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, name: true, role: true, email: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ items })
  } catch (e) {
    return serverError('Failed to fetch requests', e)
  }
}

// POST /api/internal-requests
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role === 'ADMIN') return forbidden('Admins do not submit requests')

    const body = await req.json().catch(() => null)
    const parsed = internalRequestSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid request data', parsed.error.flatten().fieldErrors)
    }
    const d = parsed.data

    const item = await db.internalRequest.create({
      data: {
        requestedById: user.id,
        type: d.type,
        subject: d.subject,
        description: d.description,
        priority: d.priority ?? 'MEDIUM',
        status: 'OPEN',
        leadId: d.leadId || null,
      },
      include: {
        requestedBy: { select: { id: true, name: true, role: true, email: true } },
      },
    })
    await logActivity({
      userId: user.id,
      action: 'INTERNAL_REQUEST_CREATED',
      leadId: d.leadId || undefined,
      details: `Submitted ${d.type} request: ${d.subject}`,
    })
    return ok({ request: item })
  } catch (e) {
    return serverError('Failed to create request', e)
  }
}
