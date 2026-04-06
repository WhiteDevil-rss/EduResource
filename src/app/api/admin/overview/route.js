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
    const message = String(error?.message || '')

    if (
      message.includes('Privileged Firebase access is not configured') ||
      message.includes('FIREBASE_PRIVATE_KEY') ||
      message.includes('base64 input') ||
      message.includes('PKCS8')
    ) {
      return withNoStore(
        NextResponse.json({
          users: [],
          resources: [],
          activity: [],
          warning:
            'Admin overview is unavailable: Firebase service credentials are malformed (FIREBASE_PRIVATE_KEY). Update env vars and redeploy.',
        })
      )
    }

    console.error('Admin Overview Error:', error?.message || error)
    return jsonError(error, 'Could not load the admin overview.')
  }
}
