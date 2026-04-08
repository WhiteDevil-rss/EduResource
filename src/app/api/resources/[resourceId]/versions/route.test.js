import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-security', () => ({
  requireApiSession: vi.fn(async () => ({ uid: 'faculty-1', role: 'faculty', email: 'faculty@example.com' })),
  withNoStore: vi.fn((response) => response),
  jsonError: vi.fn((error, _message, status = 500) =>
    new Response(JSON.stringify({ error: String(error?.message || 'error') }), { status })
  ),
}))

vi.mock('@/lib/server-data', () => ({
  addResourceVersionNote: vi.fn(async () => ({ id: 'v-1' })),
  listResourceVersions: vi.fn(async () => []),
  rollbackResourceVersion: vi.fn(async () => ({ id: 'v-2' })),
}))

describe('api/resources/[resourceId]/versions PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes session context to addResourceVersionNote', async () => {
    const mod = await import('@/app/api/resources/[resourceId]/versions/route')
    const security = await import('@/lib/api-security')
    const serverData = await import('@/lib/server-data')

    const request = new Request('http://localhost/api/resources/res-1/versions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId: 'v-1', note: 'update note' }),
    })

    const response = await mod.PATCH(request, { params: { resourceId: 'res-1' } })

    expect(response.status).toBe(200)
    expect(serverData.addResourceVersionNote).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'res-1',
        versionId: 'v-1',
        note: 'update note',
        session: expect.objectContaining({ uid: 'faculty-1' }),
      })
    )
    expect(security.requireApiSession).toHaveBeenCalled()
  })

  it('passes session context to rollback path', async () => {
    const mod = await import('@/app/api/resources/[resourceId]/versions/route')
    const serverData = await import('@/lib/server-data')

    const request = new Request('http://localhost/api/resources/res-1/versions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rollback', versionId: 'v-2', note: 'rollback' }),
    })

    const response = await mod.PATCH(request, { params: { resourceId: 'res-1' } })

    expect(response.status).toBe(200)
    expect(serverData.rollbackResourceVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'res-1',
        versionId: 'v-2',
        note: 'rollback',
        session: expect.objectContaining({ uid: 'faculty-1' }),
      })
    )
  })
})
