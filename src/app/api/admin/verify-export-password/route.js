import { NextResponse } from 'next/server'
import {
  ApiError,
  assertSameOrigin,
  jsonError,
  requireApiSession,
  withNoStore,
} from '@/lib/api-security'
import {
  PROTECTED_ADMIN_EMAIL,
  isProtectedAdminEmail,
} from '@/lib/admin-protection'
import { logAction } from '@/lib/audit-log'
import { signInWithPassword } from '@/lib/firebase-rest-auth'
import { createExportVerificationToken } from '@/lib/server-data'

function isInvalidPasswordMessage(message = '') {
  return (
    message.includes('INVALID_LOGIN_CREDENTIALS') ||
    message.includes('INVALID_PASSWORD') ||
    message.includes('EMAIL_NOT_FOUND')
  )
}

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['admin'])

    if (isProtectedAdminEmail(session.email)) {
      await logAction({
        user: session,
        action: 'VERIFY_EXPORT_PASSWORD',
        description: 'Protected admin bypassed export password verification.',
        module: 'User Management',
        status: 'SUCCESS',
        request,
      })
      return withNoStore(NextResponse.json({ verified: true, verificationToken: null }))
    }

    const body = await request.json().catch(() => ({}))
    const password = String(body?.password || '')
    if (!password) {
      throw new ApiError(400, 'Password is required for admin verification.')
    }

    try {
      const result = await signInWithPassword(PROTECTED_ADMIN_EMAIL, password)
      if (!isProtectedAdminEmail(result?.email || PROTECTED_ADMIN_EMAIL)) {
        throw new ApiError(403, 'Incorrect admin password.')
      }
    } catch (error) {
      const message = String(error?.message || '')
      if (isInvalidPasswordMessage(message)) {
        throw new ApiError(401, 'Incorrect admin password.')
      }
      throw error
    }

    const { token, expiresAt } = await createExportVerificationToken({
      actorUid: session.uid,
      actorEmail: session.email,
      ttlMs: 5 * 60 * 1000,
    })

    await logAction({
      user: session,
      action: 'VERIFY_EXPORT_PASSWORD',
      description: 'Verified protected admin password for CSV export.',
      module: 'User Management',
      status: 'SUCCESS',
      request,
    })

    return withNoStore(
      NextResponse.json({
        verified: true,
        verificationToken: token,
        expiresAt,
      })
    )
  } catch (error) {
    await logAction({
      user: await requireApiSession(request, ['admin']).catch(() => null),
      action: 'VERIFY_EXPORT_PASSWORD',
      description: 'Failed protected admin password verification for CSV export.',
      module: 'User Management',
      status: 'FAILED',
      request,
      metadata: { reason: String(error?.message || 'Unknown error') },
    }).catch(() => {})
    return jsonError(error, 'Could not verify export password.')
  }
}
