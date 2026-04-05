import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
// Legacy admin check removed
import {
  listAuditRecords,
  listResourceRecords,
  listUserRecords,
} from '@/lib/server-data'

export async function GET(request) {
  try {
    await requireApiSession(request, ['admin'])

    const [users, resources, activity] = await Promise.all([
      listUserRecords(),
      listResourceRecords(),
      listAuditRecords(12),
    ])

    return withNoStore(
      NextResponse.json({
        users,
        resources,
        activity,
      })
    )
  } catch (error) {
    console.error('Admin Overview Error:', error?.message || error)
    return jsonError(error, 'Could not load the admin overview.')
  }
}
