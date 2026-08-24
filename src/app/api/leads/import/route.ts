import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  serverError,
  logActivity,
} from '@/lib/api'
import Papa from 'papaparse'
import { LEAD_PRIORITIES } from '@/lib/constants'

// POST /api/leads/import
// Accepts either:
//   - multipart/form-data with field "file" (csv or text)
//   - application/json: { rows: Array<{name, phone, ...}>, source?, priority? }
// Admins/partners can import. Partners' imports are tagged origin=PARTNER.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
      return forbidden('Only admins and partners can import leads')
    }

    const contentType = req.headers.get('content-type') || ''
    let rows: Record<string, unknown>[] = []
    let defaultPriority: string = 'MEDIUM'
    let defaultSource: string = user.role === 'PARTNER' ? 'PARTNER' : 'IMPORT'

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const file = form.get('file')
      const priority = String(form.get('priority') || 'MEDIUM')
      const source = String(form.get('source') || defaultSource)
      if (LEAD_PRIORITIES.includes(priority as never)) defaultPriority = priority
      defaultSource = source
      if (!(file instanceof File)) {
        return badRequest('No file uploaded')
      }
      const text = await file.text()
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
      })
      rows = parsed.data
    } else {
      const body = await req.json().catch(() => null)
      if (!body?.rows || !Array.isArray(body.rows)) {
        return badRequest('Expected rows array or a multipart file')
      }
      rows = body.rows
      if (body.priority && LEAD_PRIORITIES.includes(body.priority)) defaultPriority = body.priority
      if (body.source) defaultSource = body.source
    }

    if (!rows.length) return badRequest('No rows found to import')

    const norm = (v: unknown) => (v == null ? '' : String(v).trim())

    let created = 0
    let duplicates = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const name = norm(r.name || r['full name'] || r['customer name'])
      const phoneRaw = norm(r.phone || r.mobile || r['phone number'] || r.contact)
      if (!name || !phoneRaw) {
        skipped++
        errors.push(`Row ${i + 2}: missing name or phone`)
        continue
      }
      const phone = phoneRaw.replace(/\D/g, '').replace(/^0+/, '')
      if (phone.length < 6) {
        skipped++
        errors.push(`Row ${i + 2}: invalid phone`)
        continue
      }
      const parseNum = (v: unknown) => {
        const s = norm(v).replace(/[^\d.]/g, '')
        return s ? Number(s) : null
      }
      const origin = user.role === 'PARTNER' ? 'PARTNER' : 'IMPORT'
      const dedupeKey = `${phone}:${origin}`
      try {
        const existing = await db.lead.findUnique({ where: { dedupeKey } })
        if (existing) {
          duplicates++
          continue
        }
        await db.lead.create({
          data: {
            name,
            email: norm(r.email) || null,
            phone,
            altPhone: norm(r.altphone || r['alt phone']) || null,
            cibilScore: norm(r.cibil || r['cibil score']) || null,
            loanAmount: parseNum(r['loan amount'] || r.amount),
            loanType: norm(r['loan type'] || r.loantype) || null,
            employmentType: norm(r['employment type'] || r.employment) || null,
            monthlyIncome: parseNum(r['monthly income'] || r.income),
            city: norm(r.city) || null,
            state: norm(r.state) || null,
            notes: norm(r.notes || r.note) || null,
            origin,
            source: defaultSource,
            priority: defaultPriority,
            status: 'NEW',
            partnerId: user.role === 'PARTNER' ? user.partnerId : null,
            createdById: user.id,
            dedupeKey,
          },
        })
        created++
      } catch (e) {
        skipped++
        errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'import error'}`)
      }
    }

    await logActivity({
      userId: user.id,
      action: 'LEADS_IMPORTED',
      details: `Imported ${created} leads (${duplicates} duplicates, ${skipped} skipped)`,
      meta: { created, duplicates, skipped, source: defaultSource },
    })

    return ok({ created, duplicates, skipped, errors: errors.slice(0, 20) })
  } catch (e) {
    return serverError('Import failed', e)
  }
}
