import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-security', () => ({
  requireApiSession: vi.fn(async () => ({ uid: 'admin-1', role: 'admin', email: 'admin@example.com' })),
  assertSameOrigin: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(status, message) {
      super(message)
      this.status = status
    }
  },
  jsonError: vi.fn((error) => new Response(JSON.stringify({ error: String(error?.message || 'error') }), { status: error?.status || 500 })),
}))

vi.mock('@/lib/admin-protection', () => ({
  isProtectedAdminEmail: vi.fn((email) => email === 'protected@example.com'),
}))

vi.mock('@/lib/audit-log', () => ({
  logAction: vi.fn(async () => {}),
}))

vi.mock('@/lib/activity-log', () => ({
  logActivity: vi.fn(async () => {}),
}))

vi.mock('@/lib/server-data', () => ({
  deleteUserAndData: vi.fn(async () => {}),
  getUserRecordById: vi.fn(async (id) => ({ id, email: 'faculty@example.com', role: 'faculty' })),
  resetManagedCredentials: vi.fn(async () => ({ credentials: { loginId: 'l-1', temporaryPassword: 'p-1' } })),
  setManagedUserStatus: vi.fn(async ({ userId, nextStatus }) => ({ id: userId, status: nextStatus })),
}))

describe('api/admin/users/[userId] route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates user status', async () => {
    const mod = await import('@/app/api/admin/users/[userId]/route')
    const request = new Request('http://localhost/api/admin/users/u-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-status', status: 'disabled' }),
    })

    const response = await mod.PATCH(request, { params: { userId: 'u-1' } })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.user.status).toBe('disabled')
  })

  it('deletes non-protected user', async () => {
    const mod = await import('@/app/api/admin/users/[userId]/route')
    const request = new Request('http://localhost/api/admin/users/u-2', { method: 'DELETE' })

    const response = await mod.DELETE(request, { params: { userId: 'u-2' } })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
  })
})
