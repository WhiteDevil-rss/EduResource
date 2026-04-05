import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  createResourceRequestRecord,
  listResourceRequestRecordsForUser,
} from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['student'])
    const requests = await listResourceRequestRecordsForUser(session.uid)
    return withNoStore(NextResponse.json({ requests }))
  } catch (error) {
    return jsonError(error, 'Could not load resource requests.')
  }
}

export async function POST(request) {
  try {
    const session = await requireApiSession(request, ['student'])
    const body = await request.json().catch(() => ({}))
    const requestRecord = await createResourceRequestRecord({ session, payload: body })

    return withNoStore(
      NextResponse.json({ request: requestRecord }, { status: 201 })
    )
  } catch (error) {
    return jsonError(error, 'Could not submit the resource request.')
  }
}
