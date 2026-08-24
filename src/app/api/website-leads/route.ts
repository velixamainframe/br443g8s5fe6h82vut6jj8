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
import { websiteLeadSchema } from '@/lib/validations'

// ---------------------------------------------------------------------------
// GET /api/website-leads
// CRM-side listing of leads received from the main website. Admins see all;
// employees see urgent/unprocessed ones (for the callback queue).
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    if (user.role === 'PARTNER') return forbidden()

    const sp = req.nextUrl.searchParams
    const onlyUrgent = sp.get('urgent') === '1'
    const onlyUnprocessed = sp.get('unprocessed') === '1'
    const source = sp.getAll('source')
    const page = Math.max(1, Number(sp.get('page') ?? '1'))
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('pageSize') ?? '20')))

    const where: Record<string, unknown> = { AND: [] }
    if (onlyUrgent) (where.AND as unknown[]).push({ isUrgent: true })
    if (onlyUnprocessed) (where.AND as unknown[]).push({ leadId: null })
    if (source.length) (where.AND as unknown[]).push({ source: { in: source } })

    const [total, items] = await Promise.all([
      db.websiteLead.count({ where: where as never }),
      db.websiteLead.findMany({
        where: where as never,
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { lead: { select: { id: true, name: true, status: true, assignedToId: true } } },
      }),
    ])

    return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (e) {
    return serverError('Failed to fetch website leads', e)
  }
}

// ---------------------------------------------------------------------------
// POST /api/website-leads
// Public-ish ingestion endpoint used by the MAIN WEBSITE to push leads.
// Secured by a shared server-side token (WEBSITE_INGEST_TOKEN) so the public
// website server can call it but random actors cannot spam it.
// ---------------------------------------------------------------------------
const INGEST_TOKEN = process.env.WEBSITE_INGEST_TOKEN

export async function POST(req: NextRequest) {
  try {
    // If an ingest token is configured, require it.
    if (INGEST_TOKEN) {
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '')
      if (token !== INGEST_TOKEN) {
        return unauthorized('Invalid ingest token')
      }
    }

    const body = await req.json().catch(() => null)
    const parsed = websiteLeadSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest('Invalid website lead payload', parsed.error.flatten().fieldErrors)
    }
    const d = parsed.data
    const phone = d.phone.replace(/\s+/g, '')
    const isCallback = d.source === 'CALLBACK_REQUEST'

    const created = await db.websiteLead.create({
      data: {
        source: d.source ?? 'ENQUIRY_FORM',
        name: d.name,
        email: d.email || null,
        phone,
        cibilScore: d.cibilScore || null,
        loanAmount: d.loanAmount || null,
        loanType: d.loanType || null,
        employmentType: d.employmentType || null,
        monthlyIncome: d.monthlyIncome || null,
        city: d.city || null,
        state: d.state || null,
        message: d.message || null,
        preferredCallbackTime: d.preferredCallbackTime || null,
        isUrgent: d.isUrgent ?? isCallback, // callbacks default urgent
        websiteUrl: d.websiteUrl || null,
        userAgent: d.userAgent || null,
        referrer: d.referrer || null,
        submittedAt: new Date(),
      },
    })

    return ok({ id: created.id, received: true })
  } catch (e) {
    return serverError('Failed to ingest website lead', e)
  }
}
