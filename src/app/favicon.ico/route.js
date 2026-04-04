import { NextResponse } from 'next/server'

export function GET(request) {
  const iconUrl = new URL('/icon.svg', request.url)
  return NextResponse.redirect(iconUrl, { status: 307 })
}
