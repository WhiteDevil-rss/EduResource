import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-security', () => ({
  requireApiSession: vi.fn(async () => ({ uid: 'student-1', role: 'student', email: 'student@example.com' })),
  withNoStore: vi.fn((response) => response),
  jsonError: vi.fn((error, _message, status = 500) =>
    new Response(JSON.stringify({ error: String(error?.message || 'error') }), { status })
  ),
}))

vi.mock('@/lib/server-data', () => ({
  toggleCollectionSaveForStudent: vi.fn(async () => ({ saved: true })),
}))

describe('api/collections/[collectionId]/save route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes student session and collectionId to save toggle', async () => {
    const mod = await import('@/app/api/collections/[collectionId]/save/route')
    const serverData = await import('@/lib/server-data')

    const request = new Request('http://localhost/api/collections/c-1/save', { method: 'POST' })
    const response = await mod.POST(request, { params: { collectionId: 'c-1' } })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.saved).toBe(true)
    expect(serverData.toggleCollectionSaveForStudent).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: 'c-1',
        student: expect.objectContaining({ uid: 'student-1' }),
      })
    )
  })
})
