import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword } from '@/lib/auth'
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  conflict,
  serverError,
  logActivity,
} from '@/lib/api'
import { createUserSchema } from '@/lib/validations'

// GET /api/users — list CRM users. Admin only.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const role = req.nextUrl.searchParams.get('role') || undefined
    const where: Record<string, unknown> = {}
    if (role) where.role = role

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        active: true,
        canTransferLeads: true,
        canViewAllLeads: true,
        partnerId: true,
        lastLoginAt: true,
        createdAt: true,
        partner: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ users })
  } catch (e) {
    return serverError('Failed to fetch users', e)
  }
}

// POST /api/users — create a CRM user (admin only).
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden('Only admins can create users')

    const body = await req.json().catch(() => null)
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid user data', parsed.error.flatten().fieldErrors)
    }
    const d = parsed.data
    const email = d.email.toLowerCase()

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return conflict('A user with this email already exists')

    const passwordHash = await hashPassword(d.password)

    // If creating a partner, also create the Partner record.
    let partnerId: string | null = null
    if (d.role === 'PARTNER') {
      const partner = await db.partner.create({
        data: {
          companyName: d.companyName || null,
          contactName: d.name,
          phone: d.phone || null,
          email,
        },
      })
      partnerId = partner.id
    }

    const created = await db.user.create({
      data: {
        email,
        name: d.name,
        phone: d.phone || null,
        role: d.role,
        passwordHash,
        active: d.active,
        canTransferLeads: d.canTransferLeads,
        canViewAllLeads: d.canViewAllLeads,
        partnerId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        active: true,
        canTransferLeads: true,
        canViewAllLeads: true,
        partnerId: true,
        partner: { select: { id: true, companyName: true } },
      },
    })

    await logActivity({
      userId: user.id,
      action: 'USER_CREATED',
      details: `Created ${d.role} account: ${d.email}`,
      meta: { role: d.role, email },
    })

    return ok({ user: created })
  } catch (e) {
    return serverError('Failed to create user', e)
  }
}
