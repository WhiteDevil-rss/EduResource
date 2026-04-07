import { NextResponse } from 'next/server'
import { ApiError, assertSameOrigin, jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { logAction } from '@/lib/audit-log'
import { blockIpAddress } from '@/lib/server-data'

function isValidIp(value) {
  const ip = String(value || '').trim()
  return /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(ip) || /^[0-9a-fA-F:]+$/.test(ip)
}

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['admin'])

    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Access restricted to super admin only.')
    }

    const body = await request.json().catch(() => ({}))
    const ipAddress = String(body?.ipAddress || '').trim()
    const reason = String(body?.reason || '').trim()
    const durationMinutesRaw = body?.durationMinutes
    const durationMinutes = durationMinutesRaw === '' || durationMinutesRaw === null || durationMinutesRaw === undefined
      ? null
      : Number(durationMinutesRaw)

    if (!ipAddress) {
      throw new ApiError(400, 'IP address is required.')
    }

    if (!isValidIp(ipAddress)) {
      throw new ApiError(400, 'Invalid IP address format.')
    }

    if (durationMinutes !== null && (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 43200)) {
      throw new ApiError(400, 'Temporary block duration must be between 1 and 43200 minutes.')
    }

    const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null

    const blocked = await blockIpAddress({
      ipAddress,
      reason,
      actor: session,
      expiresAt,
    })

    await logAction({
      user: session,
      action: 'BLOCK_IP',
      description: `Blocked IP ${blocked.ipAddress}.`,
      module: 'Security Controls',
      status: 'SUCCESS',
      request,
      targetId: blocked.ipAddress,
      targetRole: 'ip_address',
      metadata: { reason: blocked.reason, expiresAt: blocked.expiresAt },
    }).catch(() => null)

    return withNoStore(NextResponse.json({ success: true, blockedIp: blocked }, { status: 201 }))
  } catch (error) {
    return jsonError(error, 'Could not block IP address.')
  }
}
