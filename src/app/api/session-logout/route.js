import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { assertSameOrigin, jsonError, withNoStore } from '@/lib/api-security'
import { deleteSessionRecord } from '@/lib/server-data'
import { readSessionCookie } from '@/lib/session-cookie'

export async function POST(request) {
  try {
    assertSameOrigin(request)

    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (sessionCookie) {
      const session = await readSessionCookie(sessionCookie)
      if (session?.sid) {
        await deleteSessionRecord(session.sid)
      }
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
    return jsonError(error, 'Could not end the current session.')
  }
}
