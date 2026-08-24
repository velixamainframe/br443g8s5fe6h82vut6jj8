import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, setSessionCookie, ensureBootstrapAdmin } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { ok, badRequest, unauthorized, serverError, logActivity } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid input', parsed.error.flatten().fieldErrors)
    }
    const { email, password } = parsed.data

    // Make sure the bootstrap admin exists (idempotent).
    await ensureBootstrapAdmin()

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !user.active) {
      return unauthorized('Invalid credentials')
    }
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return unauthorized('Invalid credentials')
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    await setSessionCookie({
      sub: user.id,
      role: user.role as 'ADMIN' | 'EMPLOYEE' | 'PARTNER',
      email: user.email,
      name: user.name,
    })

    await logActivity({
      userId: user.id,
      action: 'AUTH_LOGIN',
      details: `User signed in (${user.role})`,
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    })

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        canTransferLeads: user.canTransferLeads,
        canViewAllLeads: user.canViewAllLeads,
        partnerId: user.partnerId,
      },
    })
  } catch (e) {
    return serverError('Login failed', e)
  }
}
