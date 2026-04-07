import { NextResponse } from 'next/server'
import { ApiError, jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { isProtectedAdminEmail } from '@/lib/admin-protection'
import { listAuditRecordsWithFilters } from '@/lib/server-data'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])

    if (!isProtectedAdminEmail(session.email)) {
      throw new ApiError(403, 'Only the protected admin can access audit logs.')
    }

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') || 1)
    const limit = Number(searchParams.get('limit') || 20)
    const search = String(searchParams.get('search') || '')
    const action = String(searchParams.get('action') || '')
    const status = String(searchParams.get('status') || '')
    const fromDate = String(searchParams.get('fromDate') || '')
    const toDate = String(searchParams.get('toDate') || '')

    const result = await listAuditRecordsWithFilters({
      page,
      limit,
      search,
      action,
      status,
      fromDate,
      toDate,
    })

    return withNoStore(
      NextResponse.json({
        logs: result.entries,
        pagination: result.pagination,
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not load audit logs.')
  }
}
