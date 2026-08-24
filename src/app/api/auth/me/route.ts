import { db } from '@/lib/db'
import { getCurrentUser, ensureBootstrapAdmin } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/api'

export async function GET() {
  try {
    // Ensure bootstrap admin exists on every me-check (cheap, idempotent).
    await ensureBootstrapAdmin()
    const user = await getCurrentUser()
    if (!user) return unauthorized('Not authenticated')

    // attach partner record if relevant
    const partner = user.partnerId
      ? await db.partner.findUnique({ where: { id: user.partnerId } })
      : null

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        active: user.active,
        canTransferLeads: user.canTransferLeads,
        canViewAllLeads: user.canViewAllLeads,
        partnerId: user.partnerId,
        partner: partner
          ? {
              id: partner.id,
              companyName: partner.companyName,
              contactName: partner.contactName,
              phone: partner.phone,
              email: partner.email,
            }
          : null,
      },
    })
  } catch (e) {
    return serverError('Failed to fetch session', e)
  }
}
