import { NextResponse } from 'next/server'
import { ApiError, jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { isProtectedAdminEmail } from '@/lib/admin-protection'
import { listAuditRecordsWithFilters } from '@/lib/server-data'
import { sanitizePlainText, validatePagination } from '@/lib/request-validation'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])

    if (!isProtectedAdminEmail(session.email)) {
      throw new ApiError(403, 'Only the protected admin can access audit logs.')
    }

    const { searchParams } = new URL(request.url)
    const { page, limit } = validatePagination(
      searchParams.get('page'),
      searchParams.get('limit')
    )
    const search = sanitizePlainText(searchParams.get('search') || '', { maxLength: 160, collapseWhitespace: true })
    const action = sanitizePlainText(searchParams.get('action') || '', { maxLength: 80, collapseWhitespace: true }).toLowerCase()
    const status = sanitizePlainText(searchParams.get('status') || '', { maxLength: 40, collapseWhitespace: true }).toLowerCase()
    const fromDate = sanitizePlainText(searchParams.get('fromDate') || '', { maxLength: 40, collapseWhitespace: true })
    const toDate = sanitizePlainText(searchParams.get('toDate') || '', { maxLength: 40, collapseWhitespace: true })

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
