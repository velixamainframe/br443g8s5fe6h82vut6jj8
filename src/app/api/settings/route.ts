import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api'

// GET /api/settings — admin only
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const rows = await db.setting.findMany()
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    return ok({ settings })
  } catch (e) {
    return serverError('Failed to fetch settings', e)
  }
}

// PATCH /api/settings — upsert settings (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return ok({ settings: {} })
    }
    const entries = Object.entries(body as Record<string, string>)
    for (const [key, value] of entries) {
      await db.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    }
    return ok({ success: true, updated: entries.length })
  } catch (e) {
    return serverError('Failed to update settings', e)
  }
}
