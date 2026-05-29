import { NextResponse } from 'next/server'
import { assertRequestNotBlocked, assertSameOrigin, jsonError, withNoStore, applyRateLimit } from '@/lib/api-security'
import { resendTwoFactorChallenge } from '@/lib/auth-security'
import { validateChallengeId } from '@/lib/request-validation'

export async function POST(request) {
  try {
    assertSameOrigin(request)
    await assertRequestNotBlocked(request)
    applyRateLimit(request, 'auth')
    const body = await request.json().catch(() => ({}))
    const challengeId = validateChallengeId(body?.challengeId)

    const result = await resendTwoFactorChallenge({ challengeId, ttlMinutes: 5 })
    return withNoStore(NextResponse.json({
      message: 'A new verification code was sent.',
      challengeId: result.challengeId,
      expiresAt: result.expiresAt,
      ...(result.otpPreview ? { otpPreview: result.otpPreview } : {}),
    }), request)
  } catch (error) {
    return jsonError(error, 'Could not resend verification code.')
  }
}
