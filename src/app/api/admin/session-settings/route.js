import { NextResponse } from 'next/server'
import {
  ApiError,
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import {
  normalizeSessionSettings,
  SESSION_SETTINGS_DEFAULTS,
  SESSION_SETTINGS_LIMITS,
} from '@/lib/session-settings'
import { logAction } from '@/lib/audit-log'
import { getSessionSettingsRecord, upsertSessionSettingsRecord } from '@/lib/server-data'

function validateTimeoutInput(settings) {
  const inactivityTimeout = Number(settings?.inactivityTimeout)
  const warningTimeout = Number(settings?.warningTimeout)
  const maxSessionTimeout = Number(settings?.maxSessionTimeout)

  if (![inactivityTimeout, warningTimeout, maxSessionTimeout].every((value) => Number.isFinite(value))) {
    throw new ApiError(400, 'All timeout values must be valid numbers.')
  }

  if (
    inactivityTimeout < SESSION_SETTINGS_LIMITS.minMs ||
    warningTimeout < SESSION_SETTINGS_LIMITS.minMs ||
    maxSessionTimeout < SESSION_SETTINGS_LIMITS.minMs
  ) {
    throw new ApiError(400, 'All timeout values must be at least 1 minute.')
  }

  if (
    inactivityTimeout > SESSION_SETTINGS_LIMITS.maxMs ||
    warningTimeout > SESSION_SETTINGS_LIMITS.maxMs ||
    maxSessionTimeout > SESSION_SETTINGS_LIMITS.maxMs
  ) {
    throw new ApiError(400, 'Timeout values are too large. Maximum allowed is 24 hours.')
  }

  if (warningTimeout >= inactivityTimeout) {
    throw new ApiError(400, 'Warning timeout must be less than inactivity timeout.')
  }

  if (maxSessionTimeout < inactivityTimeout) {
    throw new ApiError(400, 'Max session timeout must be greater than or equal to inactivity timeout.')
  }

  return normalizeSessionSettings({
    inactivityTimeout,
    warningTimeout,
    maxSessionTimeout,
  })
}

export async function GET(request) {
  try {
    const session = await requireApiSession(request, ['admin'])
    
    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Session settings access is restricted to super admin only.')
    }
    
    const settings = await getSessionSettingsRecord()

    return withNoStore(
      NextResponse.json({
        settings,
        defaults: SESSION_SETTINGS_DEFAULTS,
      })
    )
  } catch (error) {
    return jsonError(error, 'Could not load session settings.')
  }
}

export async function PUT(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['admin'])
    
    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Session settings access is restricted to super admin only.')
    }
    
    const body = await request.json().catch(() => ({}))
    const validatedSettings = validateTimeoutInput(body)

    const settings = await upsertSessionSettingsRecord({
      settings: validatedSettings,
      actorUid: session.uid,
    })

    await logAction({
      user: session,
      action: 'UPDATE_SESSION_SETTINGS',
      description: 'Updated global session timeout settings.',
      module: 'Security Settings',
      status: 'SUCCESS',
      request,
      metadata: settings,
    })

    return withNoStore(
      NextResponse.json({
        message: 'Session settings updated successfully.',
        settings,
      })
    )
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['admin']).catch(() => null),
      action: 'UPDATE_SESSION_SETTINGS',
      description: 'Failed to update global session timeout settings.',
      module: 'Security Settings',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not update session settings.')
  }
}
