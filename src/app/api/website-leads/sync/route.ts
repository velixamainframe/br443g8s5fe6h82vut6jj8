import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
  logActivity,
} from '@/lib/api'

// POST /api/website-leads/sync  { id }  or  { ids: string[] }
// Imports one or more website leads into the Universal Lead Box, marking them
// imported and creating a Lead with origin=WEBSITE. Urgent/callback requests
// are imported with priority=URGENT and status=CALLBACK (red-highlighted).
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role === 'PARTNER') return forbidden()

    const body = await req.json().catch(() => null)
    const ids: string[] = Array.isArray(body?.ids)
      ? body.ids
      : body?.id
        ? [body.id]
        : []
    if (!ids.length) return badRequest('id or ids required')

    let imported = 0
    let skipped = 0
    const createdLeads: Array<{ id: string; name: string; phone: string; status: string; priority: string }> = []

    for (const id of ids) {
      const wl = await db.websiteLead.findUnique({ where: { id } })
      if (!wl) {
        skipped++
        continue
      }
      if (wl.leadId) {
        skipped++
        continue
      }
      const dedupeKey = `${wl.phone}:WEBSITE`
      const existing = await db.lead.findUnique({ where: { dedupeKey } })
      if (existing) {
        // link website lead to existing lead
        await db.websiteLead.update({
          where: { id },
          data: { leadId: existing.id, importedAt: new Date() },
        })
        skipped++
        continue
      }
      const isUrgent = wl.isUrgent || wl.source === 'CALLBACK_REQUEST'
      const lead = await db.lead.create({
        data: {
          name: wl.name,
          email: wl.email,
          phone: wl.phone,
          cibilScore: wl.cibilScore,
          loanAmount: wl.loanAmount ? Number(wl.loanAmount.replace(/[^\d.]/g, '')) || null : null,
          loanType: wl.loanType,
          employmentType: wl.employmentType,
          monthlyIncome: wl.monthlyIncome ? Number(wl.monthlyIncome.replace(/[^\d.]/g, '')) || null : null,
          city: wl.city,
          state: wl.state,
          notes: wl.message || wl.preferredCallbackTime ? `Preferred callback: ${wl.preferredCallbackTime || 'N/A'}` : null,
          origin: 'WEBSITE',
          source: wl.source,
          priority: isUrgent ? 'URGENT' : 'MEDIUM',
          status: isUrgent ? 'CALLBACK' : 'NEW',
          createdById: user.id,
          dedupeKey,
        },
      })
      await db.websiteLead.update({
        where: { id },
        data: { leadId: lead.id, importedAt: new Date() },
      })
      createdLeads.push(lead)
      imported++
    }

    await logActivity({
      userId: user.id,
      action: 'WEBSITE_LEADS_IMPORTED',
      details: `Imported ${imported} website lead(s) into the Lead Box`,
      meta: { imported, skipped },
    })

    return ok({ imported, skipped, leads: createdLeads })
  } catch (e) {
    return serverError('Failed to sync website leads', e)
  }
}
