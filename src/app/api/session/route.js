import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { withNoStore } from '@/lib/api-security'

export async function GET() {
  const session = await getSessionUser()
  return withNoStore(NextResponse.json(session))
}
