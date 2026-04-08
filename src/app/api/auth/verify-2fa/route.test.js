import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-security', () => ({
  assertSameOrigin: vi.fn(),
  assertRequestNotBlocked: vi.fn(async () => {}),
  ApiError: class ApiError extends Error {
    constructor(status, message) {
      super(message)
      this.status = status
    }
  },
  jsonError: vi.fn((error, _message, status = 500) =>
    new Response(JSON.stringify({ error: String(error?.message || 'error') }), { status: error?.status || status })
  ),
  withNoStore: vi.fn((response) => response),
}))

vi.mock('@/lib/auth-security', () => ({
  verifyTwoFactorChallenge: vi.fn(async () => ({ uid: 'u-1', role: 'admin', email: 'admin@example.com' })),
  detectNewDeviceAndAlert: vi.fn(async () => {}),
  getSecurityControlsRecord: vi.fn(async () => ({})),
}))

vi.mock('@/lib/auth-constants', () => ({
  SESSION_COOKIE_NAME: 'session',
  SESSION_MAX_AGE_MS: 3600000,
}))

vi.mock('@/lib/session-cookie', () => ({
  createSessionCookie: vi.fn(async () => 'cookie-value'),
}))

vi.mock('@/lib/server-data', () => ({
  createAuditRecord: vi.fn(async () => {}),
  createSessionRecord: vi.fn(async () => {}),
  touchUserLogin: vi.fn(async () => {}),
}))

vi.mock('@/lib/audit-log', () => ({
  logAction: vi.fn(async () => {}),
}))

describe('api/auth/verify-2fa route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid challengeId and does not call verifier', async () => {
    const mod = await import('@/app/api/auth/verify-2fa/route')
    const authSecurity = await import('@/lib/auth-security')

    const request = new Request('http://localhost/api/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: 'bad', otp: '123456' }),
    })

    const response = await mod.POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('Invalid challenge identifier')
    expect(authSecurity.verifyTwoFactorChallenge).not.toHaveBeenCalled()
  })

  it('rejects invalid OTP format and does not call verifier', async () => {
    const mod = await import('@/app/api/auth/verify-2fa/route')
    const authSecurity = await import('@/lib/auth-security')

    const request = new Request('http://localhost/api/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: 'challenge_token_123456', otp: 'abc' }),
    })

    const response = await mod.POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('OTP must be a 4 to 8 digit code')
    expect(authSecurity.verifyTwoFactorChallenge).not.toHaveBeenCalled()
  })
})
