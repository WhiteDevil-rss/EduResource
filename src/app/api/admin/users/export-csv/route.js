import { NextResponse } from 'next/server'
import {
  ApiError,
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { logAction } from '@/lib/audit-log'
import { consumeExportVerificationToken, listUserRecords } from '@/lib/server-data'
import { isProtectedAdminEmail } from '@/lib/admin-protection'

function authProviderLabel(entry) {
  if (entry.authProvider === 'google') {
    return entry.pending ? 'Google access pending' : 'Google OAuth'
  }
  return 'Admin-issued credentials'
}

function getDisplayName(entry) {
  return entry.displayName || String(entry.email || 'User').split('@')[0] || 'User'
}

function buildCsv(rows) {
  return rows
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['admin'])
    const body = await request.json().catch(() => ({}))

    const requiresVerification = !isProtectedAdminEmail(session.email)
    const verificationToken = String(body?.verificationToken || '').trim()

    if (requiresVerification) {
      const isValidToken = await consumeExportVerificationToken({
        token: verificationToken,
        actorUid: session.uid,
      })

      if (!isValidToken) {
        throw new ApiError(403, 'Export verification is required before downloading CSV.')
      }
    }

    const searchTerm = String(body?.searchTerm || '').trim().toLowerCase()
    const roleFilter = String(body?.roleFilter || 'all').trim().toLowerCase()

    let users = await listUserRecords()

    if (roleFilter && roleFilter !== 'all') {
      users = users.filter((entry) => String(entry.role || '').toLowerCase() === roleFilter)
    }

    if (searchTerm) {
      users = users.filter((entry) =>
        [entry.displayName, entry.email, entry.loginId, entry.role, entry.status]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm)
      )
    }

    const headers = ['Name', 'Email', 'Login ID', 'Role', 'Auth Provider', 'Status']
    const rows = users.map((entry) => [
      getDisplayName(entry),
      entry.email || '',
      entry.loginId || '-',
      entry.role || '',
      authProviderLabel(entry),
      entry.status || '',
    ])

    const csv = buildCsv([headers, ...rows])
    const response = new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sps-educationam-access-control.csv"',
      },
    })

    await logAction({
      user: session,
      action: 'EXPORT_CSV',
      description: `Exported user CSV with ${users.length} rows.`,
      module: 'User Management',
      status: 'SUCCESS',
      request,
      metadata: {
        searchTerm,
        roleFilter,
      },
    })

    return withNoStore(response)
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['admin']).catch(() => null),
      action: 'EXPORT_CSV',
      description: 'Failed CSV export attempt.',
      module: 'User Management',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not export user CSV.')
  }
}
