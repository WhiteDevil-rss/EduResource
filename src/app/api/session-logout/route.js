import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  })
  return response
}
