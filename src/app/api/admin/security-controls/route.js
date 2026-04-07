import { NextResponse } from 'next/server'
import {
  ApiError,
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { logAction } from '@/lib/audit-log'
import {
  getSecurityControlsRecord,
  upsertSecurityControlsRecord,
} from '@/lib/auth-security'

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])
    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Security controls access is restricted to super admin only.')
    }

    const settings = await getSecurityControlsRecord()
    return withNoStore(NextResponse.json({ settings }))
  } catch (error) {
    return jsonError(error, 'Could not load security controls.')
  }
}

export async function PUT(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['admin'])
    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Security controls access is restricted to super admin only.')
    }

    const body = await request.json().catch(() => ({}))
    const settings = await upsertSecurityControlsRecord({ settings: body, actorUid: session.uid })

    await logAction({
      user: session,
      action: 'UPDATE_SECURITY_CONTROLS',
      description: 'Updated global security controls (2FA, lockout, alerts).',
      module: 'Security Settings',
      status: 'SUCCESS',
      request,
      metadata: settings,
    })

    return withNoStore(NextResponse.json({ message: 'Security controls updated.', settings }))
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['admin']).catch(() => null),
      action: 'UPDATE_SECURITY_CONTROLS',
      description: 'Failed to update global security controls.',
      module: 'Security Settings',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})

    return jsonError(error, 'Could not update security controls.')
  }
}
