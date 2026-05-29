import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}), { virtual: true })

const mockReadSessionCookie = vi.fn()
const mockGetSessionRecordById = vi.fn()
const mockGetUserRecordById = vi.fn()
const mockGetBlockedIpRecordByIp = vi.fn()

vi.mock('@/lib/session-cookie', () => ({
  readSessionCookie: mockReadSessionCookie,
}))

vi.mock('@/lib/server-data', () => ({
  getBlockedIpRecordByIp: mockGetBlockedIpRecordByIp,
  getSessionRecordById: mockGetSessionRecordById,
  getUserRecordById: mockGetUserRecordById,
}))

describe('api-security session validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBlockedIpRecordByIp.mockResolvedValue(null)
    mockGetUserRecordById.mockResolvedValue({ isBlocked: false })
  })

  it('keeps a signed session valid when the active session record is missing', async () => {
    const security = await import('@/lib/api-security')

    mockReadSessionCookie.mockResolvedValue({
      uid: 'faculty-1',
      role: 'faculty',
      status: 'active',
      sid: 'session-1',
    })
    mockGetSessionRecordById.mockResolvedValue(null)

    const request = {
      cookies: {
        get: () => ({ value: 'signed-session-cookie' }),
      },
      headers: {
        get: () => null,
      },
    }

    const session = await security.getSessionFromRequest(request)

    expect(session).toEqual({
      uid: 'faculty-1',
      role: 'faculty',
      status: 'active',
      sid: 'session-1',
    })
    expect(mockGetSessionRecordById).toHaveBeenCalledWith('session-1')
  })

  it('still rejects a session when the active session record belongs to a different user', async () => {
    const security = await import('@/lib/api-security')

    mockReadSessionCookie.mockResolvedValue({
      uid: 'faculty-1',
      role: 'faculty',
      status: 'active',
      sid: 'session-1',
    })
    mockGetSessionRecordById.mockResolvedValue({ id: 'session-1', uid: 'faculty-2' })

    const request = {
      cookies: {
        get: () => ({ value: 'signed-session-cookie' }),
      },
      headers: {
        get: () => null,
      },
    }

    const session = await security.getSessionFromRequest(request)

    expect(session).toBeNull()
  })
})