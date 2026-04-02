import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth-constants'

export function proxy(request) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const { pathname } = request.nextUrl

  const isDashboardRoute = pathname.startsWith('/dashboard')

  if (isDashboardRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
