import { getCurrentUser, clearSessionCookie } from '@/lib/auth'
import { ok, unauthorized, serverError, logActivity } from '@/lib/api'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (user) {
      await logActivity({ userId: user.id, action: 'AUTH_LOGOUT', details: 'User signed out' })
    }
    await clearSessionCookie()
    return ok({ success: true })
  } catch (e) {
    return serverError('Logout failed', e)
  }
}

export async function GET() {
  // treat GET as logout too (convenience)
  try {
    await clearSessionCookie()
    return ok({ success: true })
  } catch (e) {
    return serverError('Logout failed', e)
  }
}
