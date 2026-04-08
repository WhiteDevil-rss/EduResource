import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}), { virtual: true })

const { mockFirestore, mockIsProtectedAdminEmail } = vi.hoisted(() => {
  const getDoc = vi.fn()
  const setDoc = vi.fn(async () => {})
  const deleteDoc = vi.fn(async () => {})
  const addDoc = vi.fn(async () => ({ id: 'audit-1' }))

  return {
    mockFirestore: {
      getDoc,
      setDoc,
      deleteDoc,
      addDoc,
      listDocs: vi.fn(async () => []),
      runQuery: vi.fn(async () => []),
    },
    mockIsProtectedAdminEmail: vi.fn((email) => email === 'admin@example.com'),
  }
})

vi.mock('@/lib/firebase-edge', () => ({
  auth: {},
  firestore: mockFirestore,
}))

vi.mock('@/lib/admin-protection', () => ({
  isProtectedAdminEmail: mockIsProtectedAdminEmail,
}))

vi.mock('@/lib/session-settings', () => ({
  normalizeSessionSettings: vi.fn((value) => value),
  SESSION_SETTINGS_DEFAULTS: {
    inactivityTimeoutMs: 30 * 60 * 1000,
    warningThresholdMs: 5 * 60 * 1000,
    maxSessionDurationMs: 8 * 60 * 60 * 1000,
  },
}))

describe('server-data security guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('toggleCollectionSaveForStudent', () => {
    it('rejects when target collection does not exist', async () => {
      const mod = await import('@/lib/server-data')

      mockFirestore.getDoc.mockImplementation(async (path) => {
        if (path === 'resource_collections/c-1') return null
        return null
      })

      await expect(
        mod.toggleCollectionSaveForStudent({
          student: { uid: 'student-1', email: 'student@example.com', name: 'Student' },
          collectionId: 'c-1',
        })
      ).rejects.toThrow('Collection not found.')

      expect(mockFirestore.setDoc).not.toHaveBeenCalled()
      expect(mockFirestore.deleteDoc).not.toHaveBeenCalled()
    })

    it('rejects when collection is not visible to students', async () => {
      const mod = await import('@/lib/server-data')

      mockFirestore.getDoc.mockImplementation(async (path) => {
        if (path === 'resource_collections/c-1') return { visibility: 'private' }
        return null
      })

      await expect(
        mod.toggleCollectionSaveForStudent({
          student: { uid: 'student-1', email: 'student@example.com', name: 'Student' },
          collectionId: 'c-1',
        })
      ).rejects.toThrow('Collection is not available to students.')

      expect(mockFirestore.setDoc).not.toHaveBeenCalled()
      expect(mockFirestore.deleteDoc).not.toHaveBeenCalled()
    })

    it('creates a save when collection is public and not already saved', async () => {
      const mod = await import('@/lib/server-data')

      mockFirestore.getDoc.mockImplementation(async (path) => {
        if (path === 'resource_collections/c-1') return { visibility: 'public' }
        if (path === 'collection_saves/student-1_c-1') return null
        return null
      })

      const result = await mod.toggleCollectionSaveForStudent({
        student: { uid: 'student-1', email: 'student@example.com', name: 'Student' },
        collectionId: 'c-1',
      })

      expect(result.saved).toBe(true)
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        'collection_saves/student-1_c-1',
        expect.objectContaining({ collectionId: 'c-1', studentUid: 'student-1' }),
        true
      )
    })

    it('removes an existing save for public collection', async () => {
      const mod = await import('@/lib/server-data')

      mockFirestore.getDoc.mockImplementation(async (path) => {
        if (path === 'resource_collections/c-1') return { visibility: 'shared' }
        if (path === 'collection_saves/student-1_c-1') return { collectionId: 'c-1', studentUid: 'student-1' }
        return null
      })

      const result = await mod.toggleCollectionSaveForStudent({
        student: { uid: 'student-1', email: 'student@example.com', name: 'Student' },
        collectionId: 'c-1',
      })

      expect(result.saved).toBe(false)
      expect(mockFirestore.deleteDoc).toHaveBeenCalledWith('collection_saves/student-1_c-1')
    })
  })

  describe('addResourceVersionNote', () => {
    it('rejects when user is not owner and not admin', async () => {
      const mod = await import('@/lib/server-data')

      mockFirestore.getDoc.mockImplementation(async (path) => {
        if (path === 'resource_versions/v-1') return { resourceId: 'res-1', note: '' }
        if (path === 'resources/res-1') return { uploadedBy: 'faculty-2', facultyId: 'faculty-2' }
        return null
      })

      await expect(
        mod.addResourceVersionNote({
          resourceId: 'res-1',
          versionId: 'v-1',
          session: { uid: 'faculty-1', role: 'faculty', email: 'faculty@example.com' },
          note: 'updated note',
        })
      ).rejects.toThrow('You can only manage resources you uploaded.')

      expect(mockFirestore.setDoc).not.toHaveBeenCalledWith(
        'resource_versions/v-1',
        expect.anything(),
        true
      )
    })

    it('allows owner to update version note', async () => {
      const mod = await import('@/lib/server-data')

      mockFirestore.getDoc.mockImplementation(async (path) => {
        if (path === 'resource_versions/v-1') return { resourceId: 'res-1', note: 'old' }
        if (path === 'resources/res-1') return { uploadedBy: 'faculty-1', facultyId: 'faculty-1' }
        return null
      })

      const result = await mod.addResourceVersionNote({
        resourceId: 'res-1',
        versionId: 'v-1',
        session: { uid: 'faculty-1', role: 'faculty', email: 'faculty@example.com' },
        note: 'updated note',
      })

      expect(result.id).toBe('v-1')
      expect(result.note).toBe('updated note')
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        'resource_versions/v-1',
        expect.objectContaining({ resourceId: 'res-1', note: 'updated note' }),
        true
      )
    })

    it('allows protected admin to update version note', async () => {
      const mod = await import('@/lib/server-data')

      mockFirestore.getDoc.mockImplementation(async (path) => {
        if (path === 'resource_versions/v-1') return { resourceId: 'res-1', note: 'old' }
        if (path === 'resources/res-1') return { uploadedBy: 'faculty-2', facultyId: 'faculty-2' }
        return null
      })

      const result = await mod.addResourceVersionNote({
        resourceId: 'res-1',
        versionId: 'v-1',
        session: { uid: 'admin-1', role: 'admin', email: 'admin@example.com' },
        note: 'admin note',
      })

      expect(result.id).toBe('v-1')
      expect(result.note).toBe('admin note')
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        'resource_versions/v-1',
        expect.objectContaining({ resourceId: 'res-1', note: 'admin note' }),
        true
      )
    })
  })
})
