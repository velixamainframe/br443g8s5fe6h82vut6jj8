import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { db } from './db'
import { isRole, type Role } from './constants'

const SESSION_COOKIE = 'velixa_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days (seconds)

function getJwtSecret(): string {
  const secret =
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    'velixa-dev-only-insecure-secret-change-me'
  if (!secret || secret.length < 16) {
    // In dev with the fallback we still proceed; production must set JWT_SECRET.
    return 'velixa-dev-only-insecure-secret-change-me'
  }
  return secret
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

export interface SessionPayload {
  sub: string // user id
  role: Role
  email: string
  name: string
  iat?: number
  exp?: number
}

export function signSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_MAX_AGE })
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as SessionPayload
    if (!isRole(decoded.role)) return null
    return decoded
  } catch {
    return null
  }
}

/** Read + verify the session from the request cookies (server-only). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export async function setSessionCookie(payload: Omit<SessionPayload, 'iat' | 'exp'>) {
  const token = signSession(payload)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE

// ---- Current user helper ----

export interface AuthUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: Role
  active: boolean
  canTransferLeads: boolean
  canViewAllLeads: boolean
  partnerId: string | null
}

/** Returns the full user record for the current session, or null. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession()
  if (!session) return null
  const user = await db.user.findUnique({
    where: { id: session.sub },
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
  if (!user || !user.active) return null
  if (!isRole(user.role)) return null
  return { ...user, role: user.role as Role }
}

// ---- Role guards for API routes ----

export function requireRole(user: AuthUser | null, ...roles: Role[]) {
  if (!user) return false
  return roles.includes(user.role)
}

/** Bootstrap admin creation from env vars. Called on first run. */
export async function ensureBootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
  const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Velixa Administrator'
  if (!email || !password) return null

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return existing

  const passwordHash = await hashPassword(password)
  const admin = await db.user.create({
    data: { email, name, role: 'ADMIN', passwordHash, active: true },
  })
  return admin
}
