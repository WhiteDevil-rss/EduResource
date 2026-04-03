import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import {
  listAuditRecords,
  listResourceRecords,
  listUserRecords,
} from '@/lib/server-data'

export async function GET(request) {
  try {
    requireApiSession(request, ['admin'])

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
    return jsonError(error, 'Could not load the admin overview.')
  }
}
