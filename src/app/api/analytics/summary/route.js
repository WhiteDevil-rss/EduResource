import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { getPlatformAnalyticsSummary } from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const summary = await getPlatformAnalyticsSummary({ session })
    return withNoStore(NextResponse.json({ summary }))
  } catch (error) {
    return jsonError(error, 'Could not load analytics.')
  }
}
