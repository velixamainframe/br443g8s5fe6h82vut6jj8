import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword } from '@/lib/auth'
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  logActivity,
} from '@/lib/api'
import { updateUserSchema } from '@/lib/validations'

// PATCH /api/users/[id] — admin updates a user
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()
    const { id } = await ctx.params

    const target = await db.user.findUnique({ where: { id } })
    if (!target) return notFound('User not found')

    const body = await req.json().catch(() => null)
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid user data', parsed.error.flatten().fieldErrors)
    }
    const d = parsed.data

    const data: Record<string, unknown> = {}
    if (d.name !== undefined) data.name = d.name
    if (d.email !== undefined) {
      // check email uniqueness
      const existing = await db.user.findFirst({ where: { email: d.email, NOT: { id } } })
      if (existing) return badRequest('Email is already in use')
      data.email = d.email
    }
    if (d.phone !== undefined) data.phone = d.phone || null
    if (d.role !== undefined) data.role = d.role
    if (d.active !== undefined) data.active = d.active
    if (d.canTransferLeads !== undefined) data.canTransferLeads = d.canTransferLeads
    if (d.canViewAllLeads !== undefined) data.canViewAllLeads = d.canViewAllLeads
    if (d.password) data.passwordHash = await hashPassword(d.password)

    // prevent deactivating the last active admin
    if (d.active === false && target.role === 'ADMIN') {
      const activeAdmins = await db.user.count({ where: { role: 'ADMIN', active: true } })
      if (activeAdmins <= 1) {
        return badRequest('Cannot deactivate the last active admin')
      }
    }

    const updated = await db.user.update({
      where: { id },
      data,
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
      },
    })

    await logActivity({
      userId: user.id,
      action: 'USER_UPDATED',
      details: `Updated user ${target.email}`,
      meta: { fields: Object.keys(data) },
    })

    return ok({ user: updated })
  } catch (e) {
    return serverError('Failed to update user', e)
  }
}

// DELETE /api/users/[id] — deactivate (soft delete) a user
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()
    const { id } = await ctx.params

    if (id === user.id) return badRequest('You cannot delete your own account')

    const target = await db.user.findUnique({ where: { id } })
    if (!target) return notFound('User not found')

    if (target.role === 'ADMIN') {
      const activeAdmins = await db.user.count({ where: { role: 'ADMIN', active: true } })
      if (activeAdmins <= 1) return badRequest('Cannot delete the last active admin')
    }

    // soft delete: deactivate + scramble credentials
    await db.user.update({
      where: { id },
      data: {
        active: false,
        passwordHash: '__deactivated__',
      },
    })

    await logActivity({
      userId: user.id,
      action: 'USER_DEACTIVATED',
      details: `Deactivated user ${target.email}`,
    })

    return ok({ success: true })
  } catch (e) {
    return serverError('Failed to deactivate user', e)
  }
}
