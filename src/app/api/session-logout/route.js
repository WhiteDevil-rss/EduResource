import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'
import { assertSameOrigin, jsonError, withNoStore } from '@/lib/api-security'

export async function POST(request) {
  try {
    assertSameOrigin(request)

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
