import { NextResponse } from 'next/server'
import { ApiError, assertSameOrigin, jsonError, requireApiSession, withNoStore } from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { logAction } from '@/lib/audit-log'
import { unblockIpAddress } from '@/lib/server-data'

export async function DELETE(request, { params }) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['admin'])

    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Access restricted to super admin only.')
    }

    const ipAddress = decodeURIComponent(String(params?.ip || '').trim())
    if (!ipAddress) {
      throw new ApiError(400, 'IP address is required.')
    }

    const result = await unblockIpAddress({ ipAddress, actor: session })

    await logAction({
      user: session,
      action: 'UNBLOCK_IP',
      description: `Unblocked IP ${result.ipAddress}.`,
      module: 'Security Controls',
      status: 'SUCCESS',
      request,
      targetId: result.ipAddress,
      targetRole: 'ip_address',
    }).catch(() => null)

    return withNoStore(NextResponse.json({ success: true }))
  } catch (error) {
    return jsonError(error, 'Could not unblock IP address.')
  }
}
