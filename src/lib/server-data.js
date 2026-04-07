import 'server-only'
import { auth, firestore } from '@/lib/firebase-edge'

const USERS_COLLECTION = 'users'
const RESOURCES_COLLECTION = 'resources'
const RESOURCE_REQUESTS_COLLECTION = 'resource_requests'
const AUDIT_COLLECTION = 'audit_logs'
const SESSIONS_COLLECTION = 'active_sessions'
const NOTIFICATIONS_COLLECTION = 'notifications'

function nowIso() {
  return new Date().toISOString()
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeLoginId(loginId) {
  return String(loginId || '').trim().toLowerCase()
}

function buildPendingStudentId(emailLower) {
  const slug = emailLower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `pending-${slug || 'student'}`
}

function createLoginIdBase(value) {
  const fallback = 'faculty'
  const base = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')

  return base || fallback
}

function randomIndex(max) {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % max
}

function generateTemporaryPassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_'
  let value = ''

  for (let index = 0; index < length; index += 1) {
    value += alphabet[randomIndex(alphabet.length)]
  }

  return `Edu-${value}`
}

function sanitizeUserData(docId, data = {}) {
  return {
    id: docId,
    uid: data.uid || docId,
    displayName: data.displayName || data.name || '',
    email: data.email || '',
    loginId: data.loginId || null,
    role: data.role || 'student',
    status: data.status || 'active',
    authProvider: data.authProvider || 'unknown',
    pending: Boolean(data.pending),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    lastLoginAt: data.lastLoginAt || null,
    avatar: data.avatar || null,
  }
}

function sanitizeAuditData(docId, data = {}) {
  return {
    id: docId,
    action: data.action || 'activity',
    message: data.message || '',
    actorUid: data.actorUid || null,
    actorRole: data.actorRole || null,
    targetId: data.targetId || null,
    targetRole: data.targetRole || null,
    createdAt: data.createdAt || null,
  }
}

function sanitizeResourceData(docId, data = {}) {
  return {
    id: docId,
    title: data.title || 'Untitled Resource',
    titleLower: data.titleLower || String(data.title || '').trim().toLowerCase(),
    subject: data.subject || 'General',
    class: data.class || 'CORE 101',
    fileUrl: data.fileUrl || '',
    fileType: data.fileType || '',
    fileSize: data.fileSize || 0,
    fileFormat: data.fileFormat || '',
    status: data.status || 'live',
    uploadedBy: data.uploadedBy || data.facultyId || '',
    facultyId: data.facultyId || data.uploadedBy || '',
    facultyEmail: data.facultyEmail || '',
    facultyName: data.facultyName || data.facultyEmail || '',
    summary: data.summary || data.description || '',
    driveFileId: data.driveFileId || '',
    driveFileLink: data.driveFileLink || '',
    category: data.category || '',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}

function sanitizeResourceRequestData(docId, data = {}) {
  return {
    id: docId,
    studentUid: data.studentUid || '',
    studentEmail: data.studentEmail || '',
    studentName: data.studentName || '',
    courseName: data.courseName || '',
    titleName: data.titleName || '',
    preferredFormat: data.preferredFormat || '',
    details: data.details || '',
    status: data.status || 'pending',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}

function sanitizeSessionData(docId, data = {}) {
  return {
    id: docId,
    uid: data.uid || '',
    email: data.email || '',
    name: data.name || null,
    role: data.role || null,
    status: data.status || 'active',
    authProvider: data.authProvider || null,
    userAgent: data.userAgent || null,
    createdAt: data.createdAt || null,
    lastSeenAt: data.lastSeenAt || null,
    expiresAt: data.expiresAt || null,
  }
}

export async function getRecentAuditCount(actorUid, action, windowMs = 600000) {
  const records = await getCollectionRecords(AUDIT_COLLECTION).catch(() => [])
  const now = Date.now()
  const cutoff = now - windowMs

  return records
    .map((document) => sanitizeAuditData(document.id, getDocumentData(document)))
    .filter((record) => {
      const createdAt = getTimestampValue(record.createdAt)
      return (
        record.actorUid === actorUid &&
        record.action === action &&
        createdAt &&
        createdAt >= cutoff
      )
    }).length
}

export async function deleteUserAndData(userId) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Invalid userId provided for deletion.')
  }

  // 1. Delete from Firestore
  await firestore.deleteDoc(`${USERS_COLLECTION}/${userId}`).catch(() => null)
  
  // 2. Delete from Auth (requires privileged access)
  await auth.deleteUser(userId).catch((err) => {
    console.warn(`Auth deletion failed for ${userId}:`, err?.message || err)
  })

  // 3. Mark as deleted in audit log
  await createAuditRecord({
    action: 'user.deleted',
    targetId: userId,
    targetRole: 'user',
    message: `User ${userId} was permanently removed.`,
  })

  return true
}

function sanitizeNotificationData(docId, data = {}) {
  return {
    id: docId,
    recipientUid: data.recipientUid || '',
    type: data.type || 'resource.created',
    resourceId: data.resourceId || '',
    resourceTitle: data.resourceTitle || '',
    resourceSubject: data.resourceSubject || '',
    resourceClass: data.resourceClass || '',
    facultyName: data.facultyName || data.facultyEmail || '',
    facultyEmail: data.facultyEmail || '',
    message: data.message || '',
    readAt: data.readAt || null,
    createdAt: data.createdAt || null,
  }
}

function getTimestampValue(value) {
  if (!value) {
    return null
  }

  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isSessionExpired(record) {
  const expiresAt = getTimestampValue(record?.expiresAt)
  return expiresAt ? Date.now() > expiresAt : false
}

function isActiveSessionRecord(record) {
  return String(record?.status || 'active') === 'active' && !isSessionExpired(record)
}

function isUnreadNotification(record) {
  return !record?.readAt
}

function isOwnedBySession(resource, session) {
  const sessionUid = String(session?.uid || '').trim()
  const sessionEmail = normalizeEmail(session?.email)
  const uploadedBy = String(resource?.uploadedBy || '').trim()
  const facultyId = String(resource?.facultyId || '').trim()
  const facultyEmail = normalizeEmail(resource?.facultyEmail)

  return (
    (sessionUid && (uploadedBy === sessionUid || facultyId === sessionUid)) ||
    (sessionEmail && facultyEmail === sessionEmail)
  )
}

function getDocumentData(document) {
  if (!document) return {}

  if (typeof document.data === 'function') {
    return document.data()
  }

  if (document.data && typeof document.data === 'object') {
    return document.data
  }

  return document
}

async function getCollectionRecords(collectionName) {
  return firestore.listDocs(collectionName)
}

export async function getUserRecordById(userId) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return null;
  }
  const data = await firestore.getDoc(`${USERS_COLLECTION}/${userId}`)
  if (!data) return null
  return sanitizeUserData(data.id, data)
}

export async function getResourceRecordById(resourceId) {
  if (!resourceId || typeof resourceId !== 'string' || resourceId.trim() === '') {
    return null;
  }
  const data = await firestore.getDoc(`${RESOURCES_COLLECTION}/${resourceId}`)
  if (!data) return null
  return sanitizeResourceData(data.id, data)
}

export async function getRawUserRecordById(userId) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.error('getRawUserRecordById: Invalid or missing userId');
    return null;
  }
  const data = await firestore.getDoc(`${USERS_COLLECTION}/${userId}`)
  if (!data) {
    return null
  }

  return {
    id: userId,
    data: data,
  }
}

export async function findUserRecordByEmail(email) {
  const emailLower = normalizeEmail(email)
  if (!emailLower) {
    return null
  }

  const match = await firestore.runQuery(USERS_COLLECTION, ['emailLower', '==', emailLower])
  if (!match) {
    return null
  }

  return {
    id: match.id,
    data: match,
    user: sanitizeUserData(match.id, match),
  }
}

export async function findUserRecordByLoginId(loginId) {
  const loginIdLower = normalizeLoginId(loginId)
  if (!loginIdLower) {
    return null
  }

  const match = await firestore.runQuery(USERS_COLLECTION, ['loginIdLower', '==', loginIdLower])
  if (!match) {
    return null
  }

  return {
    id: match.id,
    data: match,
    user: sanitizeUserData(match.id, match),
  }
}

export async function listUserRecords() {
  const records = await getCollectionRecords(USERS_COLLECTION)
  return records
    .map((document) => sanitizeUserData(document.id, getDocumentData(document)))
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )
}

export async function listResourceRecords() {
  const records = await getCollectionRecords(RESOURCES_COLLECTION)
  return records
    .map((document) => sanitizeResourceData(document.id, getDocumentData(document)))
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )
}

export async function listResourceRequestRecords() {
  const records = await getCollectionRecords(RESOURCE_REQUESTS_COLLECTION).catch(() => [])
  return records
    .map((document) => sanitizeResourceRequestData(document.id, getDocumentData(document)))
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )
}

export async function listResourceRequestRecordsForUser(studentUid) {
  const normalizedStudentUid = String(studentUid || '').trim()
  if (!normalizedStudentUid) {
    return []
  }

  const requests = await listResourceRequestRecords()
  return requests.filter((record) => record.studentUid === normalizedStudentUid)
}

export async function createResourceRequestRecord({ session, payload }) {
  const courseName = String(payload?.courseName || '').trim()
  const titleName = String(payload?.titleName || '').trim()
  const preferredFormat = String(payload?.preferredFormat || '').trim()
  const details = String(payload?.details || '').trim()

  if (!courseName || !titleName || !preferredFormat) {
    throw new Error('Course name, title name, and preferred format are required.')
  }

  const createdAt = nowIso()
  const record = await firestore.addDoc(RESOURCE_REQUESTS_COLLECTION, {
    studentUid: session.uid,
    studentEmail: session.email || '',
    studentName: session.name || '',
    courseName,
    titleName,
    preferredFormat,
    details,
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
  })

  await createAuditRecord({
    actorUid: session.uid,
    actorRole: session.role,
    action: 'resource.request.created',
    targetId: record.id,
    targetRole: 'resource_request',
    message: `Resource request created for "${titleName}".`,
  })

  return sanitizeResourceRequestData(record.id, {
    studentUid: session.uid,
    studentEmail: session.email || '',
    studentName: session.name || '',
    courseName,
    titleName,
    preferredFormat,
    details,
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
  })
}

export async function updateResourceRequestStatus({ requestId, status, actorUid, actorRole }) {
  const current = await firestore.getDoc(`${RESOURCE_REQUESTS_COLLECTION}/${requestId}`)
  if (!current) {
    throw new Error('Resource request not found.')
  }

  const nextStatus = ['pending', 'underreview', 'done'].includes(String(status || ''))
    ? String(status)
    : 'pending'

  const updated = {
    ...current,
    status: nextStatus,
    updatedAt: nowIso(),
  }

  await firestore.setDoc(`${RESOURCE_REQUESTS_COLLECTION}/${requestId}`, updated, true)
  await createAuditRecord({
    actorUid,
    actorRole,
    action: 'resource.request.status.updated',
    targetId: requestId,
    targetRole: 'resource_request',
    message: `Updated resource request status to ${nextStatus.toUpperCase()}.`,
  })

  return sanitizeResourceRequestData(requestId, updated)
}

export async function searchResourceRecords({
  searchTerm = '',
  subject = '',
  classFilter = '',
  status = 'live',
} = {}) {
  const allRecords = await listResourceRecords()
  const liveRecords = allRecords.filter((entry) => entry.status === status)

  return liveRecords.filter((entry) => {
    const matchesSearch =
      !searchTerm.trim() ||
      [entry.title, entry.subject, entry.class, entry.summary]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase())

    const matchesSubject = !subject || subject === 'All Subjects' || entry.subject === subject
    const matchesClass = !classFilter || entry.class === classFilter

    return matchesSearch && matchesSubject && matchesClass
  })
}

export async function listAuditRecords(limit = 12) {
  const records = await getCollectionRecords(AUDIT_COLLECTION).catch(() => [])
  return records
    .map((document) => sanitizeAuditData(document.id, getDocumentData(document)))
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )
    .slice(0, limit)
}

export async function countAuditRecords({ action = null, targetIds = [] } = {}) {
  const records = await getCollectionRecords(AUDIT_COLLECTION).catch(() => [])
  const normalizedTargets = Array.isArray(targetIds)
    ? targetIds.map((value) => String(value || '').trim()).filter(Boolean)
    : []

  return records
    .map((document) => sanitizeAuditData(document.id, getDocumentData(document)))
    .filter((record) => {
      if (action && record.action !== action) {
        return false
      }

      if (normalizedTargets.length > 0) {
        return normalizedTargets.includes(String(record.targetId || '').trim())
      }

      return true
    }).length
}

export async function listNotificationRecords(recipientUid) {
  const normalizedRecipientUid = String(recipientUid || '').trim()
  if (!normalizedRecipientUid) {
    return []
  }

  const records = await getCollectionRecords(NOTIFICATIONS_COLLECTION).catch(() => [])
  return records
    .map((document) => sanitizeNotificationData(document.id, getDocumentData(document)))
    .filter((record) => record.recipientUid === normalizedRecipientUid)
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )
}

export async function countUnreadNotificationRecords(recipientUid) {
  const notifications = await listNotificationRecords(recipientUid)
  return notifications.filter(isUnreadNotification).length
}

export async function markNotificationAsRead({ notificationId, recipientUid }) {
  const normalizedNotificationId = String(notificationId || '').trim()
  const normalizedRecipientUid = String(recipientUid || '').trim()
  if (!normalizedNotificationId || !normalizedRecipientUid) {
    return null
  }

  const record = await firestore.getDoc(`${NOTIFICATIONS_COLLECTION}/${normalizedNotificationId}`)
  if (!record) {
    return null
  }

  const sanitized = sanitizeNotificationData(record.id, getDocumentData(record))
  if (sanitized.recipientUid !== normalizedRecipientUid) {
    return null
  }

  const updated = {
    ...getDocumentData(record),
    readAt: nowIso(),
  }

  await firestore.setDoc(`${NOTIFICATIONS_COLLECTION}/${normalizedNotificationId}`, updated, true)
  return sanitizeNotificationData(normalizedNotificationId, updated)
}

export async function markAllNotificationsAsRead(recipientUid) {
  const notifications = await listNotificationRecords(recipientUid)
  const unreadNotifications = notifications.filter((notification) => !notification.readAt)

  await Promise.all(
    unreadNotifications.map((notification) =>
      firestore.setDoc(
        `${NOTIFICATIONS_COLLECTION}/${notification.id}`,
        {
          ...notification,
          readAt: nowIso(),
        },
        true
      )
    )
  )

  return unreadNotifications.length
}

export async function createNotificationRecordsForResource(resource, facultySession) {
  const students = (await listUserRecords()).filter(
    (entry) => entry.role === 'student' && entry.status === 'active'
  )

  if (students.length === 0) {
    return 0
  }

  const message = `${facultySession.name || facultySession.email || 'A faculty member'} uploaded ${resource.title}.`
  const createdAt = nowIso()

  await Promise.all(
    students.map((student) =>
      firestore.addDoc(NOTIFICATIONS_COLLECTION, {
        recipientUid: student.uid,
        type: 'resource.created',
        resourceId: resource.id,
        resourceTitle: resource.title,
        resourceSubject: resource.subject,
        resourceClass: resource.class,
        facultyName: facultySession.name || facultySession.email || '',
        facultyEmail: facultySession.email || '',
        message,
        readAt: null,
        createdAt,
      })
    )
  )

  return students.length
}
async function listSessionRecords() {
  const records = await getCollectionRecords(SESSIONS_COLLECTION).catch(() => [])
  const sanitized = records.map((document) => sanitizeSessionData(document.id, getDocumentData(document)))
  const activeRecords = sanitized.filter(isActiveSessionRecord)

  const staleRecords = sanitized.filter((record) => !isActiveSessionRecord(record))
  await Promise.all(
    staleRecords.map((record) =>
      firestore.deleteDoc(`${SESSIONS_COLLECTION}/${record.id}`).catch(() => null)
    )
  )

  return activeRecords
}

export async function getSessionRecordById(sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return null
  }

  const record = await firestore.getDoc(`${SESSIONS_COLLECTION}/${sessionId}`)
  if (!record) {
    return null
  }

  const sanitized = sanitizeSessionData(record.id, getDocumentData(record))
  if (!isActiveSessionRecord(sanitized)) {
    await firestore.deleteDoc(`${SESSIONS_COLLECTION}/${record.id}`).catch(() => null)
    return null
  }

  return sanitized
}

export async function listActiveSessionRecordsByUser(uid) {
  const normalizedUid = String(uid || '').trim()
  if (!normalizedUid) {
    return []
  }

  const records = await listSessionRecords()
  return records.filter((record) => String(record.uid || '').trim() === normalizedUid)
}

export async function createSessionRecord({
  sessionId,
  uid,
  role,
  email,
  name,
  authProvider,
  userAgent,
  expiresAt,
}) {
  const normalizedSessionId = String(sessionId || '').trim()
  const normalizedUid = String(uid || '').trim()

  if (!normalizedSessionId || !normalizedUid) {
    throw new Error('Session registration failed.')
  }

  const existing = await getSessionRecordById(normalizedSessionId)
  if (existing) {
    return existing
  }

  const activeSessions = await listActiveSessionRecordsByUser(normalizedUid)
  if (activeSessions.length >= 2) {
    throw new Error('You can only be signed in on 2 devices at a time. Please log out from another device first.')
  }

  const createdAt = nowIso()
  const payload = {
    uid: normalizedUid,
    email: normalizeEmail(email),
    name: String(name || '').trim() || null,
    role: role || null,
    status: 'active',
    authProvider: authProvider || null,
    userAgent: String(userAgent || '').trim() || null,
    createdAt,
    lastSeenAt: createdAt,
    expiresAt: expiresAt || null,
  }

  await firestore.setDoc(`${SESSIONS_COLLECTION}/${normalizedSessionId}`, payload, true)
  return sanitizeSessionData(normalizedSessionId, payload)
}

export async function deleteSessionRecord(sessionId) {
  const normalizedSessionId = String(sessionId || '').trim()
  if (!normalizedSessionId) {
    return false
  }

  await firestore.deleteDoc(`${SESSIONS_COLLECTION}/${normalizedSessionId}`).catch(() => null)
  return true
}

export async function createAuditRecord({
  actorUid,
  actorRole,
  action,
  targetId = null,
  targetRole = null,
  message,
}) {
  try {
    await firestore.addDoc(AUDIT_COLLECTION, {
      actorUid: actorUid || null,
      actorRole: actorRole || null,
      action: action || 'activity',
      targetId,
      targetRole,
      message: message || '',
      createdAt: nowIso(),
    })
  } catch (error) {
    console.warn('Audit log warning:', error?.message || error)
  }
}

async function ensureUniqueLoginId(baseValue) {
  const normalizedBase = createLoginIdBase(baseValue)
  let candidate = normalizedBase
  let suffix = 1

  while (true) {
    const existing = await findUserRecordByLoginId(candidate)
    if (!existing) {
      return candidate
    }

    suffix += 1
    candidate = `${normalizedBase}.${suffix}`
  }
}

export async function touchUserLogin(userId) {
  await firestore.setDoc(`${USERS_COLLECTION}/${userId}`,
    {
      lastLoginAt: nowIso(),
      updatedAt: nowIso(),
    },
    true
  )
}

export async function createManagedUser({ role, email, displayName, actorUid, actorRole }) {
  const normalizedRole = role === 'admin' ? 'admin' : role === 'faculty' ? 'faculty' : 'student'
  const normalizedEmail = normalizeEmail(email)
  const safeDisplayName = String(displayName || '').trim()
  const createdAt = nowIso()

  if (!normalizedEmail) {
    throw new Error('Email is required.')
  }

  const existingByEmail = await findUserRecordByEmail(normalizedEmail)
  if (existingByEmail && existingByEmail.user.role !== normalizedRole) {
    throw new Error('An account with this email already exists under a different role.')
  }

  if (normalizedRole === 'student') {
    const documentId = existingByEmail?.id || buildPendingStudentId(normalizedEmail)
    const payload = {
      uid: existingByEmail?.data?.uid || null,
      displayName:
        safeDisplayName || existingByEmail?.data?.displayName || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      emailLower: normalizedEmail,
      role: 'student',
      status: 'active',
      authProvider: 'google',
      pending: existingByEmail?.data?.uid ? false : true,
      createdAt: existingByEmail?.data?.createdAt || createdAt,
      updatedAt: createdAt,
    }

    await firestore.setDoc(`${USERS_COLLECTION}/${documentId}`, payload, true)
    await createAuditRecord({
      actorUid,
      actorRole,
      action: 'user.student.prepared',
      targetId: documentId,
      targetRole: 'student',
      message: `Prepared Google-only student access for ${normalizedEmail}.`,
    })

    return {
      user: sanitizeUserData(documentId, payload),
      credentials: null,
    }
  }

  if (existingByEmail) {
    throw new Error('An account with this email already exists.')
  }

  const loginId = await ensureUniqueLoginId(
    normalizedEmail.split('@')[0] || safeDisplayName || normalizedRole
  )
  const temporaryPassword = generateTemporaryPassword()
  const authUser = await auth.createUser({
    email: normalizedEmail,
    password: temporaryPassword,
    displayName: safeDisplayName || undefined,
    disabled: false,
  })

  const payload = {
    uid: authUser.uid,
    displayName: safeDisplayName || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    emailLower: normalizedEmail,
    loginId,
    loginIdLower: loginId,
    role: normalizedRole,
    status: 'active',
    authProvider: 'credentials',
    pending: false,
    createdAt,
    updatedAt: createdAt,
    lastLoginAt: null,
  }

  await firestore.setDoc(`${USERS_COLLECTION}/${authUser.uid}`, payload)
  await createAuditRecord({
    actorUid,
    actorRole,
    action: 'user.credentials.created',
    targetId: authUser.uid,
    targetRole: normalizedRole,
    message: `Created ${normalizedRole} account for ${normalizedEmail}.`,
  })

  return {
    user: sanitizeUserData(authUser.uid, payload),
    credentials: {
      loginId,
      temporaryPassword,
    },
  }
}

export async function setManagedUserStatus({ userId, nextStatus, actorUid, actorRole }) {
  const record = await getRawUserRecordById(userId)
  if (!record) {
    throw new Error('User account not found.')
  }

  const normalizedStatus = nextStatus === 'active' ? 'active' : 'disabled'
  if (record.data.role === 'admin' && record.id === actorUid && normalizedStatus !== 'active') {
    throw new Error('You cannot disable your own admin account from this panel.')
  }

  const updated = {
    ...record.data,
    status: normalizedStatus,
    updatedAt: nowIso(),
  }

  await firestore.setDoc(`${USERS_COLLECTION}/${record.id}`, updated, true)

  if (updated.uid) {
    try {
      await auth.updateUser(updated.uid, {
        disabled: normalizedStatus !== 'active',
      })
    } catch (error) {
      console.warn('Firebase Auth status sync warning:', error?.message || error)
    }
  }

  await createAuditRecord({
    actorUid,
    actorRole,
    action: 'user.status.updated',
    targetId: record.id,
    targetRole: updated.role,
    message: `Set ${updated.email || record.id} to ${normalizedStatus}.`,
  })

  return sanitizeUserData(record.id, updated)
}

export async function resetManagedCredentials({ userId, actorUid, actorRole, newPassword }) {
  const record = await getRawUserRecordById(userId)
  if (!record) {
    throw new Error('User account not found.')
  }

  // Ensure the user has a Firebase Auth UID
  if (!record.data.uid) {
    throw new Error('This account has not yet been linked to an authentication provider.')
  }

  const temporaryPassword = newPassword || generateTemporaryPassword()
  let loginId = record.data.loginId
  const normalizedStatus = record.data.status === 'disabled' ? 'disabled' : 'active'

  // If the user doesn't have a Login ID (e.g. Google-only student), generate one
  if (!loginId) {
    loginId = await ensureUniqueLoginId(
      record.data.email?.split('@')[0] || record.data.displayName || record.data.role || 'user'
    )
  }

  await auth.updateUser(record.data.uid, {
    password: temporaryPassword,
    disabled: normalizedStatus !== 'active',
  })

  const updatedData = {
    ...record.data,
    status: normalizedStatus,
    loginId,
    updatedAt: nowIso(),
  }

  // If they were Google-only, we now effectively support credentials too
  if (record.data.authProvider === 'google') {
    updatedData.authProvider = 'credentials'
  }

  await firestore.setDoc(`${USERS_COLLECTION}/${record.id}`, updatedData, true)

  await createAuditRecord({
    actorUid,
    actorRole,
    action: 'user.credentials.reset',
    targetId: record.id,
    targetRole: record.data.role,
    message: `Reset credentials for ${record.data.email || record.id}.`,
  })

  return {
    user: sanitizeUserData(record.id, updatedData),
    credentials: {
      loginId,
      temporaryPassword,
    },
  }
}

export async function resolveStudentGoogleUser(decodedToken) {
  const email = normalizeEmail(decodedToken?.email)
  if (!decodedToken?.uid || !email) {
    throw new Error('A verified Google email is required for student access.')
  }

  // Enforce Gmail restriction for students
  if (!email.endsWith('@gmail.com')) {
    throw new Error('Only Gmail addresses are permitted for student access.')
  }

  const currentRecord = await getRawUserRecordById(decodedToken.uid)
  if (currentRecord) {
    if (currentRecord.data.role !== 'student') {
      throw new Error('This Google account is not assigned to the student portal.')
    }

    const merged = {
      ...currentRecord.data,
      uid: decodedToken.uid,
      email,
      emailLower: email,
      displayName:
        currentRecord.data.displayName ||
        decodedToken.name ||
        email.split('@')[0],
      authProvider: 'google',
      pending: false,
      updatedAt: nowIso(),
      lastLoginAt: nowIso(),
    }

    await firestore.setDoc(`${USERS_COLLECTION}/${decodedToken.uid}`, merged, true)
    return sanitizeUserData(decodedToken.uid, merged)
  }

  const existingByEmail = await findUserRecordByEmail(email)
  if (existingByEmail) {
    if (existingByEmail.user.role !== 'student') {
      throw new Error('This Google account is not assigned to the student portal.')
    }

    const merged = {
      ...existingByEmail.data,
      uid: decodedToken.uid,
      email,
      emailLower: email,
      displayName:
        existingByEmail.data.displayName ||
        decodedToken.name ||
        email.split('@')[0],
      authProvider: 'google',
      pending: false,
      updatedAt: nowIso(),
      lastLoginAt: nowIso(),
    }

    const ops = [
      { type: 'set', path: `${USERS_COLLECTION}/${decodedToken.uid}`, data: merged, merge: true }
    ]
    if (existingByEmail.id !== decodedToken.uid) {
      ops.push({ type: 'delete', path: `${USERS_COLLECTION}/${existingByEmail.id}` })
    }
    await firestore.commit(ops)
    return sanitizeUserData(decodedToken.uid, merged)
  }

  const payload = {
    uid: decodedToken.uid,
    displayName: decodedToken.name || email.split('@')[0],
    email,
    emailLower: email,
    role: 'student',
    status: 'active',
    authProvider: 'google',
    pending: false,
    selfRegistered: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastLoginAt: nowIso(),
  }

  await firestore.setDoc(`${USERS_COLLECTION}/${decodedToken.uid}`, payload)
  await createAuditRecord({
    actorUid: decodedToken.uid,
    actorRole: 'student',
    action: 'user.student.self-registered',
    targetId: decodedToken.uid,
    targetRole: 'student',
    message: `Student access created for ${email}.`,
  })

  return sanitizeUserData(decodedToken.uid, payload)
}

export async function createStudentAccount({ email, password, displayName }) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    throw new Error('Invalid email address.')
  }

  const existingByEmail = await findUserRecordByEmail(normalizedEmail)
  if (existingByEmail) {
    throw new Error('An account with this email already exists.')
  }

  const createdAt = nowIso()
  const authUser = await auth.createUser({
    email: normalizedEmail,
    password,
    displayName: displayName || undefined,
    disabled: false,
  })

  const payload = {
    uid: authUser.uid,
    displayName: displayName || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    emailLower: normalizedEmail,
    role: 'student',
    status: 'active',
    authProvider: 'credentials',
    pending: false,
    selfRegistered: true,
    createdAt,
    updatedAt: createdAt,
    lastLoginAt: null,
  }

  await firestore.setDoc(`${USERS_COLLECTION}/${authUser.uid}`, payload)
  await createAuditRecord({
    actorUid: authUser.uid,
    actorRole: 'student',
    action: 'user.student.self-registered',
    targetId: authUser.uid,
    targetRole: 'student',
    message: `Student account created for ${normalizedEmail}.`,
  })

  return {
    user: sanitizeUserData(authUser.uid, payload),
  }
}

export async function createResourceRecord({ session, payload }) {
  const title = String(payload?.title || '').trim()
  const subject = String(payload?.subject || '').trim()
  const courseClass = String(payload?.class || '').trim()
  const fileUrl = String(payload?.fileUrl || '').trim()
  const summary = String(payload?.summary || '').trim()
  const status = payload?.status === 'draft' ? 'draft' : 'live'
  
  // New metadata fields
  const fileType = String(payload?.fileType || '').trim()
  const fileSize = Number(payload?.fileSize || 0)
  const fileFormat = String(payload?.fileFormat || '').trim()

  if (!title || !subject || !courseClass || !fileUrl) {
    throw new Error('Title, subject, class, and file URL are required.')
  }

  const createdAt = nowIso()
  const docRef = await firestore.addDoc(RESOURCES_COLLECTION, {
    title,
    titleLower: title.toLowerCase(),
    subject,
    class: courseClass,
    fileUrl,
    fileType,
    fileSize,
    fileFormat,
    summary,
    status,
    driveFileId: String(payload?.driveFileId || '').trim(),
    driveFileLink: String(payload?.driveFileLink || '').trim(),
    category: String(payload?.category || '').trim(),
    uploadedBy: session.uid,
    facultyId: session.uid,
    facultyEmail: session.email || '',
    facultyName: session.name || session.email || '',
    createdAt,
    updatedAt: createdAt,
  })

  await createAuditRecord({
    actorUid: session.uid,
    actorRole: session.role,
    action: 'resource.created',
    targetId: docRef.id,
    targetRole: 'resource',
    message: `Created resource "${title}".`,
  })

  try {
    await createNotificationRecordsForResource(
      {
        id: docRef.id,
        title,
        subject,
        class: courseClass,
      },
      session
    )
  } catch (error) {
    console.warn('Notification fan-out warning:', error?.message || error)
  }

  return sanitizeResourceData(docRef.id, {
    title,
    titleLower: title.toLowerCase(),
    subject,
    class: courseClass,
    fileUrl,
    fileType,
    fileSize,
    fileFormat,
    summary,
    status,
    driveFileId: String(payload?.driveFileId || '').trim(),
    driveFileLink: String(payload?.driveFileLink || '').trim(),
    category: String(payload?.category || '').trim(),
    uploadedBy: session.uid,
    facultyId: session.uid,
    facultyEmail: session.email || '',
    facultyName: session.name || session.email || '',
    createdAt,
    updatedAt: createdAt,
  })
}

export async function updateResourceRecord({ resourceId, session, payload }) {
    const current = await firestore.getDoc(`${RESOURCES_COLLECTION}/${resourceId}`)
    if (!current) {
      throw new Error('Resource not found.')
    }
  
    if (!isOwnedBySession(current, session)) {
      throw new Error('You can only manage resources that you uploaded.')
    }
  
    const title = String(payload?.title || '').trim()
    const subject = String(payload?.subject || '').trim()
    const courseClass = String(payload?.class || '').trim()
    const fileUrl = String(payload?.fileUrl || '').trim()
    const summary = String(payload?.summary || '').trim()
    const status = payload?.status === 'draft' ? 'draft' : 'live'

    if (!title || !subject || !courseClass || !fileUrl) {
      throw new Error('Title, subject, class, and file URL are required.')
    }
  
    const updated = {
      ...current,
      title,
      titleLower: title.toLowerCase(),
      subject,
      class: courseClass,
      fileUrl,
      summary,
      status,
      updatedAt: nowIso(),
    }
  
    // Update metadata fields if present in payload
    if (payload?.fileType !== undefined) updated.fileType = String(payload.fileType).trim()
    if (payload?.fileSize !== undefined) updated.fileSize = Number(payload.fileSize)
    if (payload?.fileFormat !== undefined) updated.fileFormat = String(payload.fileFormat).trim()
    if (payload?.driveFileId !== undefined) updated.driveFileId = String(payload.driveFileId).trim()
    if (payload?.driveFileLink !== undefined) updated.driveFileLink = String(payload.driveFileLink).trim()
    if (payload?.category !== undefined) updated.category = String(payload.category).trim()
  
    await firestore.setDoc(`${RESOURCES_COLLECTION}/${resourceId}`, updated, true)
    await createAuditRecord({
      actorUid: session.uid,
      actorRole: session.role,
      action: 'resource.updated',
      targetId: resourceId,
      targetRole: 'resource',
      message: `Updated resource "${title}".`,
    })
  
    return sanitizeResourceData(resourceId, updated)
  }

  export async function updateResourceStatusRecord({ resourceId, session, status }) {
    const current = await firestore.getDoc(`${RESOURCES_COLLECTION}/${resourceId}`)
    if (!current) {
      throw new Error('Resource not found.')
    }

    if (!isOwnedBySession(current, session)) {
      throw new Error('You can only manage resources that you uploaded.')
    }

    const nextStatus = status === 'draft' ? 'draft' : 'live'
    const updated = {
      ...current,
      status: nextStatus,
      updatedAt: nowIso(),
    }

    await firestore.setDoc(`${RESOURCES_COLLECTION}/${resourceId}`, updated, true)
    await createAuditRecord({
      actorUid: session.uid,
      actorRole: session.role,
      action: 'resource.status.updated',
      targetId: resourceId,
      targetRole: 'resource',
      message: `Changed resource status to ${nextStatus.toUpperCase()} for "${updated.title}".`,
    })

    return sanitizeResourceData(resourceId, updated)
  }
  
  export async function deleteResourceRecord({ resourceId, session }) {
    const current = await firestore.getDoc(`${RESOURCES_COLLECTION}/${resourceId}`)
    if (!current) {
      throw new Error('Resource not found.')
    }

    if (!isOwnedBySession(current, session)) {
      throw new Error('You can only manage resources that you uploaded.')
    }

    await firestore.deleteDoc(`${RESOURCES_COLLECTION}/${resourceId}`)
  await createAuditRecord({
    actorUid: session.uid,
    actorRole: session.role,
    action: 'resource.deleted',
    targetId: resourceId,
    targetRole: 'resource',
    message: `Deleted resource "${current.title || resourceId}".`,
  })
}

export async function deleteManagedUser({ userId, actorUid, actorRole }) {
  const record = await getRawUserRecordById(userId)
  if (!record) {
    throw new Error('User account not found.')
  }

  // Prevent admins from deleting their own account
  if (record.data.role === 'admin' && record.id === actorUid) {
    throw new Error('You cannot delete your own admin account.')
  }

  // 1. Delete from Firebase Auth if UID exists
  if (record.data.uid) {
    try {
      await auth.deleteUser(record.data.uid)
    } catch (error) {
      console.warn('Firebase Auth deletion warning:', error?.message || error)
      // We continue even if auth deletion fails (e.g. if user was only in Firestore)
    }
  }

  // 2. Delete from Firestore
  await firestore.deleteDoc(`${USERS_COLLECTION}/${record.id}`)

  // 3. Create Audit Record
  await createAuditRecord({
    actorUid,
    actorRole,
    action: 'user.deleted',
    targetId: record.id,
    targetRole: record.data.role,
    message: `Permanently deleted account ${record.data.email || record.id}.`,
  })

  return { success: true }
}
