import { NextResponse } from 'next/server'
import { assertRequestNotBlocked, assertSameOrigin, jsonError, withNoStore } from '@/lib/api-security'
import { resendTwoFactorChallenge } from '@/lib/auth-security'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    await assertRequestNotBlocked(request)
    const body = await request.json().catch(() => ({}))
    const challengeId = String(body?.challengeId || '').trim()
    if (!challengeId) {
      return withNoStore(NextResponse.json({ error: 'Challenge ID is required.' }, { status: 400 }))
    }

    const result = await resendTwoFactorChallenge({ challengeId, ttlMinutes: 5 })
    return withNoStore(NextResponse.json({
      message: 'A new verification code was sent.',
      challengeId: result.challengeId,
      expiresAt: result.expiresAt,
      ...(result.otpPreview ? { otpPreview: result.otpPreview } : {}),
    }))
  } catch (error) {
    return jsonError(error, 'Could not resend verification code.')
  }
}
