import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { listResourceRequestRecords } from '@/lib/server-data'

export async function GET(request) {
  try {
    await requireApiSession(request, ['faculty', 'admin'])
    const requests = await listResourceRequestRecords()
    return withNoStore(NextResponse.json({ requests }))
  } catch (error) {
    return jsonError(error, 'Could not load faculty requests.')
  }
}