import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-security', () => ({
  assertRequestNotBlocked: vi.fn(async () => {}),
  applyRateLimit: vi.fn(() => {}),
  withNoStore: vi.fn((response) => response),
}))

vi.mock('@/lib/audit-log', () => ({
  logAction: vi.fn(async () => {}),
}))

vi.mock('@/lib/firebase-rest-auth', () => ({
  signInWithPassword: vi.fn(async () => ({ uid: 'u-student', email: 'student@example.com' })),
}))

vi.mock('@/lib/session-cookie', () => ({
  createSessionCookie: vi.fn(async () => 'cookie-value'),
}))

vi.mock('@/lib/timing-instrumentation', () => ({
  RequestTimer: class RequestTimer {
    markPhase() {}
    getTotalDuration() {
      return 0
    }
    logReport() {}
  },
}))

vi.mock('@/lib/auth-security', () => ({
  clearFailedLoginAttempts: vi.fn(async () => {}),
  createTwoFactorChallenge: vi.fn(async () => null),
  detectNewDeviceAndAlert: vi.fn(async () => {}),
  emitSuspiciousActivityAlert: vi.fn(async () => {}),
  getSecurityControlsRecord: vi.fn(async () => ({ enable2FA: false })),
  isLoginLocked: vi.fn(async () => ({ locked: false })),
  recordFailedLoginAttempt: vi.fn(async () => ({ attempts: 0, locked: false })),
}))

vi.mock('@/lib/suspicious-activity', () => ({
  logSuspiciousActivity: vi.fn(async () => {}),
}))

vi.mock('@/lib/admin-protection', () => ({
  isSuperAdminEmail: vi.fn(() => false),
}))

vi.mock('@/lib/request-validation', () => ({
  sanitizePlainText: vi.fn((value) => String(value || '').trim()),
}))

vi.mock('@/lib/server-data', () => ({
  createAuditRecord: vi.fn(async () => {}),
  createSessionRecord: vi.fn(async () => {}),
  findUserRecordByEmail: vi.fn(async () => ({
    id: 'u-student',
    data: {
      uid: 'u-student',
      email: 'student@example.com',
      displayName: 'Student User',
      role: 'student',
      status: 'active',
      authProvider: 'credentials',
    },
    user: {
      uid: 'u-student',
      id: 'u-student',
      email: 'student@example.com',
      displayName: 'Student User',
      role: 'student',
      status: 'active',
      authProvider: 'credentials',
    },
  })),
  findUserRecordByLoginId: vi.fn(async () => null),
  getUserRecordById: vi.fn(async () => ({
    uid: 'u-student',
    id: 'u-student',
    email: 'student@example.com',
    displayName: 'Student User',
    role: 'student',
    status: 'active',
    authProvider: 'credentials',
  })),
  touchUserLogin: vi.fn(async () => {}),
}))

describe('api/auth/credential-login route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows credential-provisioned students to sign in', async () => {
    const mod = await import('@/app/api/auth/credential-login/route')

    const request = new Request('https://example.com/api/auth/credential-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'student@example.com', password: 'correct-horse-battery-staple' }),
    })

    const response = await mod.POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.role).toBe('student')
    expect(payload.user.email).toBe('student@example.com')
  })
})