import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { getAdminInitializationError } from '@/lib/firebase-admin'
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
    const message = String(error?.message || '')
    if (message.includes('Privileged Firebase access is not configured')) {
      const initError = getAdminInitializationError()
      return withNoStore(
        NextResponse.json({
          users: [],
          resources: [],
          activity: [],
          warning: initError?.message || 'Admin overview is unavailable until privileged Firebase access is configured.',
        })
      )
    }

    return jsonError(error, 'Could not load the admin overview.')
  }
}
