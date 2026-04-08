import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api-security', () => ({
  assertSameOrigin: vi.fn(),
  requireApiSession: vi.fn(async () => ({ uid: 'faculty-1', role: 'faculty', email: 'faculty@example.com' })),
  withNoStore: vi.fn((response) => response),
  ApiError: class ApiError extends Error {
    constructor(status, message) {
      super(message)
      this.status = status
    }
  },
  jsonError: vi.fn((error, _message, status = 500) =>
    new Response(JSON.stringify({ error: String(error?.message || 'error') }), { status: error?.status || status })
  ),
}))

vi.mock('@/lib/audit-log', () => ({
  logAction: vi.fn(async () => {}),
}))

vi.mock('@/lib/server-data', () => ({
  countAuditRecords: vi.fn(async () => 0),
  createResourceRecord: vi.fn(async () => ({ id: 'res-1', title: 'Resource' })),
  listResourceRecords: vi.fn(async () => []),
  getRecentAuditCount: vi.fn(async () => 0),
}))

vi.mock('@/lib/google-drive', () => ({
  uploadToDrive: vi.fn(async () => ({ fileId: 'file-1', webViewLink: 'https://example.com/file' })),
}))

describe('api/faculty/resources POST route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unsupported MIME type before upload', async () => {
    const mod = await import('@/app/api/faculty/resources/route')
    const drive = await import('@/lib/google-drive')
    const serverData = await import('@/lib/server-data')

    const formDataEntries = {
      title: 'My Resource',
      subject: 'Math',
      class: 'CORE 101',
      file: new File(['test'], 'resource.png', { type: 'image/png' }),
    }

    const request = {
      headers: {
        get: (key) => (key === 'content-type' ? 'multipart/form-data; boundary=test' : null),
      },
      formData: async () => ({
        get: (key) => formDataEntries[key],
      }),
    }

    const response = await mod.POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('Unsupported file type')
    expect(drive.uploadToDrive).not.toHaveBeenCalled()
    expect(serverData.createResourceRecord).not.toHaveBeenCalled()
  })

  it('rejects invalid filename even with allowed MIME type', async () => {
    const mod = await import('@/app/api/faculty/resources/route')
    const drive = await import('@/lib/google-drive')
    const serverData = await import('@/lib/server-data')

    const formDataEntries = {
      title: 'My Resource',
      subject: 'Math',
      class: 'CORE 101',
      file: new File(['test'], '....', { type: 'application/pdf' }),
    }

    const request = {
      headers: {
        get: (key) => (key === 'content-type' ? 'multipart/form-data; boundary=test' : null),
      },
      formData: async () => ({
        get: (key) => formDataEntries[key],
      }),
    }

    const response = await mod.POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('Invalid file name')
    expect(drive.uploadToDrive).not.toHaveBeenCalled()
    expect(serverData.createResourceRecord).not.toHaveBeenCalled()
  })
})
