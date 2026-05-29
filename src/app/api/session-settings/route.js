import { NextResponse } from 'next/server'
import { jsonError, withNoStore } from '@/lib/api-security'
import { getSessionSettingsRecord } from '@/lib/server-data'

export async function GET() {
  try {
    const settings = await getSessionSettingsRecord()
    return withNoStore(NextResponse.json({ settings }))
  } catch (error) {
    return jsonError(error, 'Could not load session settings.')
  }
}
