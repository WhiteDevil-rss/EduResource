import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-security', () => ({
  requireApiSession: vi.fn(async () => ({ uid: 'faculty-1', role: 'faculty', email: 'faculty@example.com' })),
  withNoStore: vi.fn((response) => response),
  jsonError: vi.fn((error, _message, status = 500) =>
    new Response(JSON.stringify({ error: String(error?.message || 'error') }), { status })
  ),
}))

vi.mock('@/lib/server-data', () => ({
  createResourceReview: vi.fn(),
  listResourceReviews: vi.fn(async () => []),
  moderateResourceReview: vi.fn(async () => ({ id: 'r-1', resourceId: 'res-1', status: 'published' })),
  respondToResourceReview: vi.fn(async () => ({ id: 'r-1', resourceId: 'res-1', response: 'ok' })),
}))

describe('api/resources/[resourceId]/reviews PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing reviewId before any lookup/mutation', async () => {
    const mod = await import('@/app/api/resources/[resourceId]/reviews/route')
    const serverData = await import('@/lib/server-data')

    const request = new Request('http://localhost/api/resources/res-1/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'moderate', status: 'hidden' }),
    })

    const response = await mod.PATCH(request, { params: { resourceId: 'res-1' } })

    expect(response.status).toBe(400)
    expect(serverData.listResourceReviews).not.toHaveBeenCalled()
    expect(serverData.moderateResourceReview).not.toHaveBeenCalled()
    expect(serverData.respondToResourceReview).not.toHaveBeenCalled()
  })

  it('rejects reviewId that does not belong to resource', async () => {
    const mod = await import('@/app/api/resources/[resourceId]/reviews/route')
    const serverData = await import('@/lib/server-data')

    vi.mocked(serverData.listResourceReviews).mockResolvedValueOnce([
      { id: 'r-2', resourceId: 'res-2', status: 'published' },
    ])

    const request = new Request('http://localhost/api/resources/res-1/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: 'r-1', response: 'thanks' }),
    })

    const response = await mod.PATCH(request, { params: { resourceId: 'res-1' } })

    expect(response.status).toBe(400)
    expect(serverData.respondToResourceReview).not.toHaveBeenCalled()
    expect(serverData.moderateResourceReview).not.toHaveBeenCalled()
  })

  it('allows response update only when review belongs to resource', async () => {
    const mod = await import('@/app/api/resources/[resourceId]/reviews/route')
    const serverData = await import('@/lib/server-data')

    vi.mocked(serverData.listResourceReviews).mockResolvedValueOnce([
      { id: 'r-1', resourceId: 'res-1', status: 'published' },
    ])

    const request = new Request('http://localhost/api/resources/res-1/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: 'r-1', response: 'thanks' }),
    })

    const response = await mod.PATCH(request, { params: { resourceId: 'res-1' } })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(serverData.respondToResourceReview).toHaveBeenCalledWith(
      expect.objectContaining({ reviewId: 'r-1', response: 'thanks' })
    )
    expect(payload.review.id).toBe('r-1')
  })
})
