import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const preferences = await getNotificationPreferences(session.uid)
    return withNoStore(NextResponse.json({ preferences }))
  } catch (error) {
    return jsonError(error, 'Could not load notification preferences.')
  }
}

export async function PATCH(request) {
  try {
    const session = await requireApiSession(request, ['student', 'faculty', 'admin'])
    const body = await request.json().catch(() => ({}))
    const preferences = await upsertNotificationPreferences({ user: session, payload: body })
    return withNoStore(NextResponse.json({ preferences }))
  } catch (error) {
    return jsonError(error, 'Could not update notification preferences.')
  }
}
