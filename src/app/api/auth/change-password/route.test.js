import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth-server', () => ({
  getSessionUser: vi.fn(async () => ({ user: { uid: 'u-1', email: 'student@example.com' } })),
}))

vi.mock('@/lib/api-security', () => ({
  assertSameOrigin: vi.fn(),
  withNoStore: vi.fn((response) => response),
}))

vi.mock('@/lib/firebase-rest-auth', () => ({
  signInWithPassword: vi.fn(async () => ({ idToken: 'token-1' })),
  updateFirebasePassword: vi.fn(async () => {}),
}))

vi.mock('@/lib/request-validation', () => ({
  validatePassword: vi.fn((password) => {
    if (String(password) === 'weak') {
      const error = new Error('Password must include uppercase, lowercase, number, and special character.')
      error.status = 400
      throw error
    }
    return true
  }),
}))

describe('api/auth/change-password route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects weak new password before current password verification', async () => {
    const mod = await import('@/app/api/auth/change-password/route')
    const authApi = await import('@/lib/firebase-rest-auth')

    // Suppress console output for expected error
    const originalError = console.error
    console.error = vi.fn()

    const request = new Request('http://localhost/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'Current1!', newPassword: 'weak' }),
    })

    const response = await mod.POST(request)
    const payload = await response.json()

    // Restore console
    console.error = originalError

    expect(response.status).toBe(400)
    expect(payload.error).toContain('Password must include uppercase, lowercase, number, and special character')
    expect(authApi.signInWithPassword).not.toHaveBeenCalled()
    expect(authApi.updateFirebasePassword).not.toHaveBeenCalled()
  })
})
