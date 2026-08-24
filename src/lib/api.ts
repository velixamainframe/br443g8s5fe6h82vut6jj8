import { NextResponse } from 'next/server'
import { db } from './db'
import { getCurrentUser, type AuthUser } from './auth'
import type { Role } from './constants'

// ---- Consistent JSON helpers ----

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

export function badRequest(message = 'Bad request', details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 })
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'You do not have permission to perform this action') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function conflict(message = 'Conflict') {
  return NextResponse.json({ error: message }, { status: 409 })
}

export function serverError(message = 'Something went wrong', details?: unknown) {
  console.error('[serverError]', message, details)
  return NextResponse.json({ error: message }, { status: 500 })
}

// ---- Activity logging ----

export async function logActivity(params: {
  userId: string
  action: string
  leadId?: string
  details?: string
  meta?: Record<string, unknown>
  ipAddress?: string
}) {
  try {
    await db.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        leadId: params.leadId ?? null,
        details: params.details ?? null,
        meta: params.meta ? JSON.stringify(params.meta) : null,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (e) {
    console.error('[logActivity] failed', e)
  }
}

// ---- Route guards ----

export interface AuthedCtx {
  user: AuthUser
}

/** Fetch the current user, returning a 401 response tuple if missing. */
export async function resolveUser(): Promise<AuthUser | null> {
  return getCurrentUser()
}

export function assertRole(user: AuthUser, ...roles: Role[]): Response | null {
  if (!roles.includes(user.role)) return forbidden()
  return null
}
