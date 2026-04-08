import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-security', () => ({
  assertSameOrigin: vi.fn(),
  jsonError: vi.fn((error) => new Response(JSON.stringify({ error: String(error?.message || 'error') }), { status: 500 })),
  requireApiSession: vi.fn(async () => ({ uid: 'admin-1', role: 'admin', email: 'admin@example.com' })),
  withNoStore: vi.fn((response) => response),
}))

vi.mock('@/lib/rbac-middleware', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/lib/request-validation', () => ({
  validateEmail: vi.fn((value) => value),
  validateRole: vi.fn((value) => value),
  validateDisplayName: vi.fn((value) => value || ''),
  validatePagination: vi.fn(() => ({ page: 1, limit: 10 })),
}))

vi.mock('@/lib/audit-log', () => ({
  logAction: vi.fn(async () => {}),
}))

vi.mock('@/lib/activity-log', () => ({
  logActivity: vi.fn(async () => {}),
}))

vi.mock('@/lib/server-data', () => ({
  createManagedUser: vi.fn(async ({ email, role, displayName }) => ({
    user: { id: 'u-1', email, role, displayName },
    credentials: { loginId: 'login-1', temporaryPassword: 'temp-1' },
  })),
  listUserRecords: vi.fn(async () => [
    { id: '1', email: 'a@example.com', displayName: 'A', role: 'admin', status: 'active' },
    { id: '2', email: 'b@example.com', displayName: 'B', role: 'faculty', status: 'disabled' },
  ]),
}))

describe('api/admin/users route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects manual student creation', async () => {
    const mod = await import('@/app/api/admin/users/route')
    const request = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@example.com', role: 'student', displayName: 'Student' }),
    })

    const response = await mod.POST(request)
    expect(response.status).toBe(400)
  })

  it('lists users with pagination object', async () => {
    const mod = await import('@/app/api/admin/users/route')
    const request = new Request('http://localhost/api/admin/users?page=1&limit=10', { method: 'GET' })

    const response = await mod.GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(payload.users)).toBe(true)
    expect(payload.pagination).toBeTruthy()
    expect(typeof payload.pagination.total).toBe('number')
  })
})
