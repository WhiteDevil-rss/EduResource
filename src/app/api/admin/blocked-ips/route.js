import { NextResponse } from 'next/server'
import { ApiError, jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { listBlockedIpRecords } from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])
    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Access restricted to super admin only.')
    }

    const blockedIps = await listBlockedIpRecords()
    return withNoStore(NextResponse.json({ blockedIps }))
  } catch (error) {
    return jsonError(error, 'Could not load blocked IPs.')
  }
}
