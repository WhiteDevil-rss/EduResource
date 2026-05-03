import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { assertSameOrigin, jsonError, withNoStore } from '@/lib/api-security'
import { logAction } from '@/lib/audit-log'
import { deleteSessionRecord } from '@/lib/server-data'
import { readSessionCookie } from '@/lib/session-cookie'

export async function POST(request) {
  try {
    assertSameOrigin(request)

    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (sessionCookie) {
      const session = await readSessionCookie(sessionCookie)
      if (session?.sid) {
        console.log(`[LOGOUT] Invalidating session SID: ${session.sid} for user: ${session.email}`)
        const deleted = await deleteSessionRecord(session.sid)
        if (!deleted) {
          console.warn(`[LOGOUT] Warning: Failed to delete session record ${session.sid} from database.`)
        }
      } else {
        console.warn('[LOGOUT] No SID found in session cookie payload.')
      }

      await logAction({
        user: {
          uid: session?.uid || null,
          name: session?.name || null,
          email: session?.email || null,
          role: session?.role || null,
        },
        action: 'LOGOUT',
        description: 'User signed out from active session.',
        module: 'Auth',
        status: 'SUCCESS',
        request,
      })
    } else {
      console.log('[LOGOUT] No active session cookie found during logout request.')
    }

    const response = withNoStore(NextResponse.json({ ok: true }))
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/',
    })
    return response
  } catch (error) {
    await logAction({
      user: null,
      action: 'LOGOUT',
      description: 'Failed logout attempt.',
      module: 'Auth',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not end the current session.')
  }
}
