import { NextResponse } from 'next/server'
import { jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { isProtectedAdminEmail } from '@/lib/admin-protection'
// Legacy admin check removed
import {
  listAuditRecords,
  listResourceRecords,
  listUserRecords,
} from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])

    const includeAuditActivity = isProtectedAdminEmail(session.email)

    const [users, resources, activity] = await Promise.all([
      listUserRecords(),
      listResourceRecords(),
      includeAuditActivity ? listAuditRecords(12) : Promise.resolve([]),
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
