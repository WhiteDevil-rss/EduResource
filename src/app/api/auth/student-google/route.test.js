import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-security', () => ({
  assertSameOrigin: vi.fn(),
  assertRequestNotBlocked: vi.fn(async () => {}),
  jsonError: vi.fn((error, _message, status = 500) =>
    new Response(JSON.stringify({ error: String(error?.message || 'error') }), { status })
  ),
  withNoStore: vi.fn((response) => response),
}))

vi.mock('@/lib/firebase-edge', () => ({
  auth: {
    verifyIdToken: vi.fn(async () => ({ uid: 'u-1', email: 'student@example.com', firebase: { sign_in_provider: 'google.com' } })),
  },
}))

vi.mock('@/lib/auth-constants', () => ({
  SESSION_COOKIE_NAME: 'session',
  SESSION_MAX_AGE_MS: 3600000,
}))

vi.mock('@/lib/session-cookie', () => ({
  createSessionCookie: vi.fn(async () => 'cookie-value'),
}))

vi.mock('@/lib/auth-security', () => ({
  detectNewDeviceAndAlert: vi.fn(async () => {}),
  getSecurityControlsRecord: vi.fn(async () => ({})),
}))

vi.mock('@/lib/server-data', () => ({
  createAuditRecord: vi.fn(async () => {}),
  createSessionRecord: vi.fn(async () => {}),
  resolveStudentGoogleUser: vi.fn(async () => ({
    uid: 'u-1',
    email: 'student@example.com',
    role: 'student',
    status: 'active',
    isBlocked: false,
  })),
}))

vi.mock('@/lib/audit-log', () => ({
  logAction: vi.fn(async () => {}),
}))

describe('api/auth/student-google route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects malformed JWT token format before verification', async () => {
    const mod = await import('@/app/api/auth/student-google/route')
    const firebase = await import('@/lib/firebase-edge')

    const request = new Request('http://localhost/api/auth/student-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'not-a-jwt' }),
    })

    const response = await mod.POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('Invalid Google token format')
    expect(firebase.auth.verifyIdToken).not.toHaveBeenCalled()
  })
})
