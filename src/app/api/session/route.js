import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-server'
import { withNoStore } from '@/lib/api-security'
import { getSessionSettingsRecord } from '@/lib/server-data'
import { SESSION_SETTINGS_DEFAULTS } from '@/lib/session-settings'

export async function GET() {
  const session = await getSessionUser()
  const settings = await getSessionSettingsRecord().catch(() => SESSION_SETTINGS_DEFAULTS)
  return withNoStore(NextResponse.json({ ...session, sessionSettings: settings }))
}
