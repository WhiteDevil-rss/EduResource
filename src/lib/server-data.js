import 'server-only'
import { auth, firestore } from '@/lib/firebase-edge'
import { isProtectedAdminEmail } from '@/lib/admin-protection'
import { normalizeSessionSettings, SESSION_SETTINGS_DEFAULTS } from '@/lib/session-settings'

const USERS_COLLECTION = 'users'
const RESOURCES_COLLECTION = 'resources'
const RESOURCE_REQUESTS_COLLECTION = 'resource_requests'
const AUDIT_COLLECTION = 'audit_logs'
const RESOURCE_REVIEWS_COLLECTION = 'resource_reviews'
const RESOURCE_COLLECTIONS_COLLECTION = 'resource_collections'
const COLLECTION_SAVES_COLLECTION = 'collection_saves'
const RESOURCE_VERSIONS_COLLECTION = 'resource_versions'
const SAVED_SEARCHES_COLLECTION = 'saved_searches'
const NOTIFICATION_PREFERENCES_COLLECTION = 'notification_preferences'
const RESOURCE_COMMENTS_COLLECTION = 'resource_comments'
const SESSIONS_COLLECTION = 'active_sessions'
const NOTIFICATIONS_COLLECTION = 'notifications'
const APP_CONFIG_COLLECTION = 'app_config'
const SESSION_SETTINGS_DOC_ID = 'session_timeout'
const EXPORT_VERIFICATIONS_COLLECTION = 'admin_export_verifications'
const BLOCKED_IPS_COLLECTION = 'blocked_ips'
const HTML_TAG_REGEX = /<[^>]*>/g

function nowIso() {
  return new Date().toISOString()
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeLoginId(loginId) {
  return String(loginId || '').trim().toLowerCase()
}

function normalizeTextInput(value, { maxLength = 2000, allowEmpty = true, fieldName = 'Value' } = {}) {
  const normalized = String(value ?? '')
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0)
      return (code <= 31 || code === 127) ? ' ' : char
    })
    .join('')
    .replace(HTML_TAG_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!allowEmpty && !normalized) {
    throw new Error(`${fieldName} is required.`)
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`)
  }

  return normalized
}

function normalizeHttpUrl(value, { fieldName = 'URL', allowEmpty = false } = {}) {
  const normalized = normalizeTextInput(value, {
    maxLength: 2048,
    allowEmpty,
    fieldName,
  })

  if (!normalized && allowEmpty) {
    return ''
  }

  let parsed
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error(`${fieldName} is invalid.`)
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${fieldName} must use HTTP or HTTPS.`)
  }

  return parsed.toString()
}

function normalizeIpAddress(ipAddress) {
  return String(ipAddress || '')
    .trim()
    .replace(/^::ffff:/, '')
    .split(',')[0]
    .trim()
}

function encodeIpDocId(ipAddress) {
  return encodeURIComponent(normalizeIpAddress(ipAddress))
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
  const bookmarks = Array.isArray(data.bookmarks)
    ? data.bookmarks.map((value) => String(value || '').trim()).filter(Boolean)
    : []

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
    bookmarks,
    isBlocked: Boolean(data.isBlocked),
    blockedAt: data.blockedAt || null,
    blockedBy: data.blockedBy || null,
    blockedReason: data.blockedReason || '',
    blockedExpiresAt: data.blockedExpiresAt || null,
    isTemporaryBlock: Boolean(data.isBlocked && data.blockedExpiresAt),
  }
}

function sanitizeAuditData(docId, data = {}) {
  return {
    id: docId,
    userId: data.userId || data.actorUid || null,
    userName: data.userName || null,
    userEmail: data.userEmail || null,
    role: data.role || data.actorRole || null,
    action: data.action || 'activity',
    description: data.description || data.message || '',
    module: data.module || 'General',
    timestamp: data.timestamp || data.createdAt || null,
    ipAddress: data.ipAddress || null,
    location: data.location || 'Unknown',
    device: {
      browser: data?.device?.browser || 'Unknown',
      os: data?.device?.os || 'Unknown',
      deviceType: data?.device?.deviceType || 'desktop',
    },
    status: data.status || 'SUCCESS',
    metadata: data.metadata || null,

    // Backward-compatible aliases for existing UI and counters
    message: data.message || data.description || '',
    actorUid: data.actorUid || data.userId || null,
    actorRole: data.actorRole || data.role || null,
    targetId: data.targetId || null,
    targetRole: data.targetRole || null,
    createdAt: data.createdAt || data.timestamp || null,
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

function sanitizeResourceReviewData(docId, data = {}) {
  return {
    id: docId,
    resourceId: data.resourceId || '',
    reviewerUid: data.reviewerUid || null,
    reviewerName: data.reviewerName || null,
    reviewerEmail: data.reviewerEmail || null,
    reviewerRole: data.reviewerRole || 'student',
    rating: Math.max(1, Math.min(5, Number(data.rating) || 5)),
    comment: data.comment || '',
    response: data.response || '',
    status: data.status || 'published',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    respondedAt: data.respondedAt || null,
    respondedBy: data.respondedBy || null,
  }
}

function sanitizeResourceCollectionData(docId, data = {}) {
  const resourceIds = Array.isArray(data.resourceIds)
    ? data.resourceIds.map((value) => String(value || '').trim()).filter(Boolean)
    : []

  return {
    id: docId,
    title: data.title || 'Untitled Collection',
    description: data.description || '',
    ownerUid: data.ownerUid || null,
    ownerName: data.ownerName || null,
    ownerEmail: data.ownerEmail || null,
    ownerRole: data.ownerRole || 'faculty',
    visibility: data.visibility || 'private',
    resourceIds,
    totalResources: resourceIds.length,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}

function sanitizeCollectionSaveData(docId, data = {}) {
  return {
    id: docId,
    collectionId: data.collectionId || '',
    studentUid: data.studentUid || '',
    studentEmail: data.studentEmail || '',
    studentName: data.studentName || '',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}

function sanitizeResourceVersionData(docId, data = {}) {
  return {
    id: docId,
    resourceId: data.resourceId || '',
    versionNumber: Number(data.versionNumber || 1),
    title: data.title || 'Untitled Resource',
    subject: data.subject || 'General',
    class: data.class || 'CORE 101',
    summary: data.summary || '',
    fileUrl: data.fileUrl || '',
    fileType: data.fileType || '',
    fileSize: data.fileSize || 0,
    fileFormat: data.fileFormat || '',
    driveFileId: data.driveFileId || '',
    driveFileLink: data.driveFileLink || '',
    status: data.status || 'live',
    note: data.note || '',
    createdAt: data.createdAt || null,
    createdBy: data.createdBy || null,
    latest: Boolean(data.latest),
  }
}

function sanitizeSavedSearchData(docId, data = {}) {
  return {
    id: docId,
    userUid: data.userUid || '',
    userEmail: data.userEmail || '',
    query: data.query || '',
    subject: data.subject || '',
    classFilter: data.classFilter || '',
    alertsEnabled: data.alertsEnabled !== false,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}

function sanitizeNotificationPreferenceData(docId, data = {}) {
  return {
    id: docId,
    userUid: data.userUid || '',
    userEmail: data.userEmail || '',
    frequency: data.frequency || 'weekly',
    channel: data.channel || 'in-app',
    categories: Array.isArray(data.categories) ? data.categories : ['resources', 'reviews', 'collections'],
    alertsEnabled: data.alertsEnabled !== false,
    updatedAt: data.updatedAt || null,
  }
}

function sanitizeResourceCommentData(docId, data = {}) {
  return {
    id: docId,
    resourceId: data.resourceId || '',
    authorUid: data.authorUid || '',
    authorName: data.authorName || '',
    authorEmail: data.authorEmail || '',
    visibility: data.visibility || 'public',
    parentId: data.parentId || null,
    body: data.body || '',
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

function sanitizeSessionSettingsData(data = {}) {
  const normalized = normalizeSessionSettings(data)
  return {
    inactivityTimeout: normalized.inactivityTimeout,
    warningTimeout: normalized.warningTimeout,
    maxSessionTimeout: normalized.maxSessionTimeout,
    updatedAt: data.updatedAt || null,
    updatedBy: data.updatedBy || null,
  }
}

function sanitizeExportVerificationData(docId, data = {}) {
  return {
    id: docId,
    actorUid: data.actorUid || null,
    actorEmail: data.actorEmail || null,
    createdAt: data.createdAt || null,
    expiresAt: data.expiresAt || null,
    usedAt: data.usedAt || null,
  }
}

function sanitizeBlockedIpData(docId, data = {}) {
  return {
    id: docId,
    ipAddress: data.ipAddress || decodeURIComponent(docId),
    reason: data.reason || '',
    blockedAt: data.blockedAt || null,
    blockedBy: data.blockedBy || '',
    expiresAt: data.expiresAt || null,
    isTemporary: Boolean(data.expiresAt),
    createdAt: data.createdAt || data.blockedAt || null,
    updatedAt: data.updatedAt || data.blockedAt || null,
  }
}

function isExpiredTimestamp(value) {
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) && parsed <= Date.now()
}

async function deleteBlockedIpDoc(docId) {
  await firestore.deleteDoc(`${BLOCKED_IPS_COLLECTION}/${docId}`).catch(() => null)
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

async function getCollectionRecords(collectionName, options = {}) {
  return firestore.listDocs(collectionName, options)
}

async function syncExpiredUserBlock(docId, data) {
  if (!data?.isBlocked) {
    return data
  }

  const blockedExpiresAt = getTimestampValue(data.blockedExpiresAt)
  if (!blockedExpiresAt || Date.now() <= blockedExpiresAt) {
    return data
  }

  const updated = {
    ...data,
    isBlocked: false,
    blockedAt: null,
    blockedBy: null,
    blockedReason: '',
    blockedExpiresAt: null,
    updatedAt: nowIso(),
  }

  await firestore.setDoc(`${USERS_COLLECTION}/${docId}`, updated, true)

  if (updated.uid) {
    try {
      await auth.updateUser(updated.uid, {
        disabled: String(updated.status || '').toLowerCase() === 'disabled',
      })
    } catch (error) {
      console.warn('Firebase Auth block expiry sync warning:', error?.message || error)
    }
  }

  await createAuditRecord({
    actorUid: null,
    actorRole: 'system',
    action: 'security.user.block.expired',
    targetId: docId,
    targetRole: updated.role,
    message: `Temporary block expired for ${updated.email || docId}.`,
    metadata: {
      expiredAt: new Date(blockedExpiresAt).toISOString(),
    },
  }).catch(() => null)

  return updated
}

export async function getUserRecordById(userId) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return null;
  }
  const data = await firestore.getDoc(`${USERS_COLLECTION}/${userId}`)
  if (!data) return null
  const activeData = await syncExpiredUserBlock(data.id, data)
  return sanitizeUserData(data.id, activeData)
}

export async function getBlockedIpRecordByIp(ipAddress) {
  const normalized = normalizeIpAddress(ipAddress)
  if (!normalized) {
    return null
  }

  const docId = encodeIpDocId(normalized)
  const data = await firestore.getDoc(`${BLOCKED_IPS_COLLECTION}/${docId}`).catch(() => null)
  if (!data) {
    return null
  }

  if (data.expiresAt && isExpiredTimestamp(data.expiresAt)) {
    await deleteBlockedIpDoc(docId)
    return null
  }

  return sanitizeBlockedIpData(data.id, data)
}

export async function isBlockedIpAddress(ipAddress) {
  const record = await getBlockedIpRecordByIp(ipAddress)
  return Boolean(record)
}

export async function listBlockedIpRecords() {
  const records = await getCollectionRecords(BLOCKED_IPS_COLLECTION).catch(() => [])
  const activeRecords = []

  for (const document of records) {
    const record = sanitizeBlockedIpData(document.id, getDocumentData(document))
    if (record.expiresAt && isExpiredTimestamp(record.expiresAt)) {
      await deleteBlockedIpDoc(document.id)
      continue
    }

    activeRecords.push(record)
  }

  return activeRecords.sort((left, right) => String(right.blockedAt || '').localeCompare(String(left.blockedAt || '')))
}

export async function blockIpAddress({ ipAddress, reason, actor, expiresAt = null }) {
  const normalized = normalizeIpAddress(ipAddress)
  if (!normalized) {
    throw new Error('A valid IP address is required.')
  }

  const expiresAtValue = getTimestampValue(expiresAt)
  const resolvedExpiresAt = expiresAtValue ? new Date(expiresAtValue).toISOString() : null
  if (resolvedExpiresAt && Date.now() >= expiresAtValue) {
    throw new Error('Block expiry must be in the future.')
  }

  const docId = encodeIpDocId(normalized)
  const existing = await firestore.getDoc(`${BLOCKED_IPS_COLLECTION}/${docId}`).catch(() => null)
  if (existing) {
    throw new Error('This IP address is already blocked.')
  }

  const blockedAt = nowIso()
  const payload = {
    ipAddress: normalized,
    reason: String(reason || '').trim() || 'Blocked by super admin.',
    blockedAt,
    blockedBy: String(actor?.email || actor?.name || actor?.uid || '').trim() || 'super-admin',
    expiresAt: resolvedExpiresAt,
    createdAt: blockedAt,
    updatedAt: blockedAt,
  }

  await firestore.setDoc(`${BLOCKED_IPS_COLLECTION}/${docId}`, payload, true)

  await createAuditRecord({
    actorUid: actor?.uid || null,
    actorRole: actor?.role || null,
    action: 'security.ip.blocked',
    targetId: normalized,
    targetRole: 'ip_address',
    message: `Blocked IP ${normalized}.`,
    metadata: {
      reason: payload.reason,
      blockedBy: payload.blockedBy,
      expiresAt: payload.expiresAt,
    },
  })

  return sanitizeBlockedIpData(docId, payload)
}

export async function unblockIpAddress({ ipAddress, actor }) {
  const normalized = normalizeIpAddress(ipAddress)
  if (!normalized) {
    throw new Error('A valid IP address is required.')
  }

  const docId = encodeIpDocId(normalized)
  const existing = await firestore.getDoc(`${BLOCKED_IPS_COLLECTION}/${docId}`).catch(() => null)
  if (!existing) {
    throw new Error('This IP address is not blocked.')
  }

  await firestore.deleteDoc(`${BLOCKED_IPS_COLLECTION}/${docId}`)

  await createAuditRecord({
    actorUid: actor?.uid || null,
    actorRole: actor?.role || null,
    action: 'security.ip.unblocked',
    targetId: normalized,
    targetRole: 'ip_address',
    message: `Unblocked IP ${normalized}.`,
  })

  return { ipAddress: normalized, removed: true }
}

async function updateUserBlockedState({ userId, isBlocked, actor, reason = '', expiresAt = null }) {
  const record = await getRawUserRecordById(userId)
  if (!record) {
    throw new Error('User account not found.')
  }

  if (isProtectedAdminEmail(record.data.email) && isBlocked) {
    throw new Error('This protected admin account cannot be blocked.')
  }

  if (Boolean(record.data.isBlocked) === Boolean(isBlocked)) {
    throw new Error(isBlocked ? 'This user is already blocked.' : 'This user is not blocked.')
  }

  const expiresAtValue = getTimestampValue(expiresAt)
  const resolvedExpiresAt = isBlocked && expiresAtValue ? new Date(expiresAtValue).toISOString() : null
  if (resolvedExpiresAt && Date.now() >= expiresAtValue) {
    throw new Error('Block expiry must be in the future.')
  }

  const updated = {
    ...record.data,
    isBlocked: Boolean(isBlocked),
    blockedAt: isBlocked ? nowIso() : null,
    blockedBy: isBlocked ? String(actor?.email || actor?.name || actor?.uid || '').trim() || 'super-admin' : null,
    blockedReason: isBlocked ? String(reason || '').trim() : '',
    blockedExpiresAt: resolvedExpiresAt,
    updatedAt: nowIso(),
  }

  await firestore.setDoc(`${USERS_COLLECTION}/${record.id}`, updated, true)

  if (record.data.uid) {
    try {
      await auth.updateUser(record.data.uid, {
        disabled: Boolean(isBlocked) || record.data.status === 'disabled',
      })
    } catch (error) {
      console.warn('Firebase Auth blocked status sync warning:', error?.message || error)
    }
  }

  await createAuditRecord({
    actorUid: actor?.uid || null,
    actorRole: actor?.role || null,
    action: isBlocked ? 'security.user.blocked' : 'security.user.unblocked',
    targetId: record.id,
    targetRole: updated.role,
    message: `${isBlocked ? 'Blocked' : 'Unblocked'} user ${updated.email || record.id}.`,
    metadata: {
      blockedReason: isBlocked ? updated.blockedReason : null,
      blockedExpiresAt: updated.blockedExpiresAt,
    },
  })

  return sanitizeUserData(record.id, updated)
}

export async function blockUserAccount({ userId, actor, reason = '', expiresAt = null }) {
  return updateUserBlockedState({ userId, isBlocked: true, actor, reason, expiresAt })
}

export async function unblockUserAccount({ userId, actor }) {
  return updateUserBlockedState({ userId, isBlocked: false, actor })
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

  const activeData = await syncExpiredUserBlock(match.id, match)

  return {
    id: match.id,
    data: activeData,
    user: sanitizeUserData(match.id, activeData),
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

  const activeData = await syncExpiredUserBlock(match.id, match)

  return {
    id: match.id,
    data: activeData,
    user: sanitizeUserData(match.id, activeData),
  }
}

export async function listUserRecords({ limit = 400 } = {}) {
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 400))
  const records = await getCollectionRecords(USERS_COLLECTION, {
    pageSize: safeLimit,
  })
  const activeRecords = []

  for (const document of records) {
    const data = await syncExpiredUserBlock(document.id, getDocumentData(document))
    activeRecords.push(sanitizeUserData(document.id, data))
  }

  return activeRecords.sort((left, right) =>
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

export async function listResourceRecordsWithLimit({
  limit = 300,
  fieldMask = null,
} = {}) {
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 300))
  const records = await getCollectionRecords(RESOURCES_COLLECTION, {
    pageSize: safeLimit,
    ...(Array.isArray(fieldMask) && fieldMask.length > 0 ? { fieldMask } : {}),
  })

  return records
    .map((document) => sanitizeResourceData(document.id, getDocumentData(document)))
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )
}

export async function listResourceRecordsByOwner(ownerUid, { limit = 300 } = {}) {
  const normalizedOwnerUid = String(ownerUid || '').trim()
  if (!normalizedOwnerUid) {
    return []
  }

  const safeLimit = Math.max(1, Math.min(600, Number(limit) || 300))

  const [uploadedByMatches, facultyIdMatches] = await Promise.all([
    firestore.runQueryMany(RESOURCES_COLLECTION, ['uploadedBy', '==', normalizedOwnerUid], safeLimit).catch(() => []),
    firestore.runQueryMany(RESOURCES_COLLECTION, ['facultyId', '==', normalizedOwnerUid], safeLimit).catch(() => []),
  ])

  const deduped = new Map()
  ;[...uploadedByMatches, ...facultyIdMatches].forEach((entry) => {
    if (entry?.id) {
      deduped.set(entry.id, entry)
    }
  })

  return Array.from(deduped.values())
    .map((entry) => sanitizeResourceData(entry.id, entry))
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )
}

export async function listBookmarkedResourcesByStudent(uid) {
  const user = await getUserRecordById(uid)
  if (!user) {
    throw new Error('User not found.')
  }

  const bookmarkIds = Array.isArray(user.bookmarks) ? user.bookmarks : []
  if (bookmarkIds.length === 0) {
    return []
  }

  const normalizedBookmarkIds = [...new Set(bookmarkIds.map((value) => String(value || '').trim()).filter(Boolean))]
  const resources = await Promise.all(
    normalizedBookmarkIds.map((resourceId) =>
      firestore.getDoc(`${RESOURCES_COLLECTION}/${resourceId}`).catch(() => null)
    )
  )

  return resources
    .filter(Boolean)
    .map((entry) => sanitizeResourceData(entry.id, getDocumentData(entry)))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
}

export async function toggleBookmarkForStudent({ studentUid, resourceId }) {
  const normalizedStudentUid = String(studentUid || '').trim()
  const normalizedResourceId = String(resourceId || '').trim()

  if (!normalizedStudentUid || !normalizedResourceId) {
    throw new Error('Student and resource identifiers are required.')
  }

  const userDocPath = `${USERS_COLLECTION}/${normalizedStudentUid}`
  const userRaw = await firestore.getDoc(userDocPath)
  if (!userRaw) {
    throw new Error('User not found.')
  }

  const resource = await getResourceRecordById(normalizedResourceId)
  if (!resource || String(resource.status || '').toLowerCase() !== 'live') {
    throw new Error('Resource is unavailable for bookmarking.')
  }

  const currentBookmarks = Array.isArray(userRaw.bookmarks)
    ? userRaw.bookmarks.map((value) => String(value || '').trim()).filter(Boolean)
    : []

  const hasBookmark = currentBookmarks.includes(normalizedResourceId)
  const nextBookmarks = hasBookmark
    ? currentBookmarks.filter((value) => value !== normalizedResourceId)
    : [...new Set([...currentBookmarks, normalizedResourceId])]

  await firestore.setDoc(
    userDocPath,
    {
      bookmarks: nextBookmarks,
      updatedAt: nowIso(),
    },
    true
  )

  await createAuditRecord({
    actorUid: normalizedStudentUid,
    actorRole: 'student',
    action: hasBookmark ? 'resource.bookmark.removed' : 'resource.bookmark.added',
    targetId: normalizedResourceId,
    targetRole: 'resource',
    message: `${hasBookmark ? 'Removed bookmark for' : 'Bookmarked'} resource ${normalizedResourceId}.`,
  })

  return {
    bookmarked: !hasBookmark,
    bookmarks: nextBookmarks,
  }
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
  const courseName = normalizeTextInput(payload?.courseName, {
    maxLength: 120,
    allowEmpty: false,
    fieldName: 'Course name',
  })
  const titleName = normalizeTextInput(payload?.titleName, {
    maxLength: 160,
    allowEmpty: false,
    fieldName: 'Title name',
  })
  const preferredFormat = normalizeTextInput(payload?.preferredFormat, {
    maxLength: 40,
    allowEmpty: false,
    fieldName: 'Preferred format',
  })
  const details = normalizeTextInput(payload?.details, {
    maxLength: 2000,
    allowEmpty: true,
    fieldName: 'Details',
  })

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
  limit = 300,
} = {}) {
  const allRecords = await listResourceRecordsWithLimit({ limit })
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

export async function listAuditRecordsWithFilters({
  page = 1,
  limit = 20,
  search = '',
  action = '',
  status = '',
  fromDate = '',
  toDate = '',
} = {}) {
  const records = await getCollectionRecords(AUDIT_COLLECTION).catch(() => [])
  const normalizedSearch = String(search || '').trim().toLowerCase()
  const normalizedAction = String(action || '').trim().toLowerCase()
  const normalizedStatus = String(status || '').trim().toUpperCase()
  const fromTime = fromDate ? Date.parse(String(fromDate)) : null
  const toTime = toDate ? Date.parse(String(toDate)) : null

  const filtered = records
    .map((document) => sanitizeAuditData(document.id, getDocumentData(document)))
    .filter((entry) => {
      const entryTime = getTimestampValue(entry.timestamp || entry.createdAt)

      if (normalizedAction && String(entry.action || '').toLowerCase() !== normalizedAction) {
        return false
      }

      if (normalizedStatus && String(entry.status || '').toUpperCase() !== normalizedStatus) {
        return false
      }

      if (Number.isFinite(fromTime) && (!entryTime || entryTime < fromTime)) {
        return false
      }

      if (Number.isFinite(toTime) && (!entryTime || entryTime > toTime)) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        entry.userName,
        entry.userEmail,
        entry.action,
        entry.description,
        entry.module,
        entry.location,
        entry.device?.browser,
        entry.device?.os,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })
    .sort((left, right) => String(right.timestamp || right.createdAt || '').localeCompare(String(left.timestamp || left.createdAt || '')))

  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const total = filtered.length
  const start = (safePage - 1) * safeLimit
  const entries = filtered.slice(start, start + safeLimit)

  return {
    entries,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  }
}

async function listCollectionReviewRecords({ resourceId = null, includeHidden = false } = {}) {
  const records = await getCollectionRecords(RESOURCE_REVIEWS_COLLECTION).catch(() => [])
  const normalizedResourceId = String(resourceId || '').trim()

  return records
    .map((document) => sanitizeResourceReviewData(document.id, getDocumentData(document)))
    .filter((entry) => {
      if (normalizedResourceId && entry.resourceId !== normalizedResourceId) {
        return false
      }

      if (!includeHidden && entry.status !== 'published' && entry.status !== 'approved') {
        return false
      }

      return true
    })
    .sort((left, right) =>
      String(right.createdAt || right.updatedAt || '').localeCompare(String(left.createdAt || left.updatedAt || ''))
    )
}

async function listCollectionRecordsInternal({ ownerUid = null, visibleOnly = false } = {}) {
  const records = await getCollectionRecords(RESOURCE_COLLECTIONS_COLLECTION).catch(() => [])
  const normalizedOwnerUid = String(ownerUid || '').trim()

  return records
    .map((document) => sanitizeResourceCollectionData(document.id, getDocumentData(document)))
    .filter((entry) => {
      if (normalizedOwnerUid && entry.ownerUid !== normalizedOwnerUid) {
        return false
      }

      if (visibleOnly && entry.visibility !== 'public' && entry.visibility !== 'shared') {
        return false
      }

      return true
    })
    .sort((left, right) =>
      String(right.createdAt || right.updatedAt || '').localeCompare(String(left.createdAt || left.updatedAt || ''))
    )
}

async function listCollectionSaveRecords(studentUid) {
  const normalizedStudentUid = String(studentUid || '').trim()
  if (!normalizedStudentUid) {
    return []
  }

  const records = await getCollectionRecords(COLLECTION_SAVES_COLLECTION).catch(() => [])
  return records
    .map((document) => sanitizeCollectionSaveData(document.id, getDocumentData(document)))
    .filter((entry) => entry.studentUid === normalizedStudentUid)
}

async function listResourceVersionRecords(resourceId) {
  const normalizedResourceId = String(resourceId || '').trim()
  if (!normalizedResourceId) {
    return []
  }

  const records = await getCollectionRecords(RESOURCE_VERSIONS_COLLECTION).catch(() => [])
  return records
    .map((document) => sanitizeResourceVersionData(document.id, getDocumentData(document)))
    .filter((entry) => entry.resourceId === normalizedResourceId)
    .sort((left, right) => Number(left.versionNumber || 0) - Number(right.versionNumber || 0))
}

async function createResourceVersionSnapshot({ resourceId, resource, note = '', createdBy = null, latest = true }) {
  const versions = await listResourceVersionRecords(resourceId)
  const nextVersion = versions.length > 0 ? Math.max(...versions.map((entry) => Number(entry.versionNumber || 0))) + 1 : 1
  const payload = {
    resourceId,
    versionNumber: nextVersion,
    title: resource.title,
    subject: resource.subject,
    class: resource.class,
    summary: resource.summary,
    fileUrl: resource.fileUrl,
    fileType: resource.fileType || '',
    fileSize: resource.fileSize || 0,
    fileFormat: resource.fileFormat || '',
    driveFileId: resource.driveFileId || '',
    driveFileLink: resource.driveFileLink || '',
    status: resource.status || 'live',
    note,
    createdAt: nowIso(),
    createdBy,
    latest,
  }

  if (latest) {
    await Promise.all(
      versions.map((version) =>
        firestore.setDoc(
          `${RESOURCE_VERSIONS_COLLECTION}/${version.id}`,
          { ...getDocumentData(version), latest: false },
          true
        ).catch(() => null)
      )
    )
  }

  const record = await firestore.addDoc(RESOURCE_VERSIONS_COLLECTION, payload)
  return sanitizeResourceVersionData(record.id, payload)
}

async function getSavedSearchRecords(userUid) {
  const normalizedUserUid = String(userUid || '').trim()
  if (!normalizedUserUid) {
    return []
  }

  const records = await getCollectionRecords(SAVED_SEARCHES_COLLECTION).catch(() => [])
  return records
    .map((document) => sanitizeSavedSearchData(document.id, getDocumentData(document)))
    .filter((entry) => entry.userUid === normalizedUserUid)
}

async function getNotificationPreferenceRecord(userUid) {
  const normalizedUserUid = String(userUid || '').trim()
  if (!normalizedUserUid) {
    return null
  }

  const records = await getCollectionRecords(NOTIFICATION_PREFERENCES_COLLECTION).catch(() => [])
  const match = records
    .map((document) => sanitizeNotificationPreferenceData(document.id, getDocumentData(document)))
    .find((entry) => entry.userUid === normalizedUserUid)

  return match || null
}

async function getResourceCommentRecords(resourceId, { includePrivate = false, authorUid = null } = {}) {
  const normalizedResourceId = String(resourceId || '').trim()
  const normalizedAuthorUid = String(authorUid || '').trim()
  if (!normalizedResourceId) {
    return []
  }

  const records = await getCollectionRecords(RESOURCE_COMMENTS_COLLECTION).catch(() => [])
  return records
    .map((document) => sanitizeResourceCommentData(document.id, getDocumentData(document)))
    .filter((entry) => {
      if (entry.resourceId !== normalizedResourceId) {
        return false
      }

      if (entry.visibility === 'private') {
        return includePrivate || (normalizedAuthorUid && entry.authorUid === normalizedAuthorUid)
      }

      return true
    })
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
}

function detectDuplicateResourceCandidates(resource, existingResources = []) {
  const normalizedTitle = String(resource?.title || '').trim().toLowerCase()
  const normalizedSubject = String(resource?.subject || '').trim().toLowerCase()
  const normalizedClass = String(resource?.class || '').trim().toLowerCase()

  return existingResources.filter((entry) => {
    const titleMatch = String(entry.title || '').trim().toLowerCase() === normalizedTitle
    const subjectMatch = String(entry.subject || '').trim().toLowerCase() === normalizedSubject
    const classMatch = String(entry.class || '').trim().toLowerCase() === normalizedClass
    return titleMatch && subjectMatch && classMatch
  })
}

export async function listResourceReviews(resourceId = null, options = {}) {
  return listCollectionReviewRecords({ resourceId, includeHidden: Boolean(options?.includeHidden) })
}

export async function createResourceReview({ resourceId, reviewer, rating, comment }) {
  const normalizedResourceId = String(resourceId || '').trim()
  const normalizedComment = normalizeTextInput(comment, {
    maxLength: 2000,
    allowEmpty: true,
    fieldName: 'Review comment',
  })
  const numericRating = Math.max(1, Math.min(5, Number(rating) || 0))

  if (!normalizedResourceId) {
    throw new Error('Resource ID is required.')
  }

  if (!numericRating) {
    throw new Error('A rating between 1 and 5 is required.')
  }

  const createdAt = nowIso()
  const payload = {
    resourceId: normalizedResourceId,
    reviewerUid: reviewer?.uid || null,
    reviewerName: reviewer?.name || null,
    reviewerEmail: reviewer?.email || null,
    reviewerRole: reviewer?.role || 'student',
    rating: numericRating,
    comment: normalizedComment,
    response: '',
    status: 'published',
    createdAt,
    updatedAt: createdAt,
    respondedAt: null,
    respondedBy: null,
  }

  const record = await firestore.addDoc(RESOURCE_REVIEWS_COLLECTION, payload)

  await createAuditRecord({
    actorUid: reviewer?.uid || null,
    actorRole: reviewer?.role || null,
    action: 'resource.review.created',
    targetId: normalizedResourceId,
    targetRole: 'resource',
    message: `Created a review for resource ${normalizedResourceId}.`,
    metadata: { rating: numericRating },
  })

  return sanitizeResourceReviewData(record.id, payload)
}

export async function respondToResourceReview({ reviewId, responder, response, status = 'published' }) {
  const normalizedReviewId = String(reviewId || '').trim()
  const normalizedResponse = normalizeTextInput(response, {
    maxLength: 2000,
    allowEmpty: true,
    fieldName: 'Review response',
  })
  if (!normalizedReviewId) {
    throw new Error('Review ID is required.')
  }

  const existing = await firestore.getDoc(`${RESOURCE_REVIEWS_COLLECTION}/${normalizedReviewId}`)
  if (!existing) {
    throw new Error('Review not found.')
  }

  const updated = {
    ...existing,
    response: normalizedResponse,
    status: status === 'hidden' ? 'hidden' : 'published',
    respondedAt: nowIso(),
    respondedBy: responder?.email || responder?.uid || null,
    updatedAt: nowIso(),
  }

  await firestore.setDoc(`${RESOURCE_REVIEWS_COLLECTION}/${normalizedReviewId}`, updated, true)

  await createAuditRecord({
    actorUid: responder?.uid || null,
    actorRole: responder?.role || null,
    action: 'resource.review.responded',
    targetId: updated.resourceId || normalizedReviewId,
    targetRole: 'resource_review',
    message: `Responded to review ${normalizedReviewId}.`,
  })

  return sanitizeResourceReviewData(normalizedReviewId, updated)
}

export async function moderateResourceReview({ reviewId, moderator, status = 'hidden' }) {
  const normalizedReviewId = String(reviewId || '').trim()
  if (!normalizedReviewId) {
    throw new Error('Review ID is required.')
  }

  const existing = await firestore.getDoc(`${RESOURCE_REVIEWS_COLLECTION}/${normalizedReviewId}`)
  if (!existing) {
    throw new Error('Review not found.')
  }

  const normalizedStatus = ['published', 'hidden'].includes(String(status || '')) ? String(status) : 'hidden'
  const updated = {
    ...existing,
    status: normalizedStatus,
    updatedAt: nowIso(),
  }

  await firestore.setDoc(`${RESOURCE_REVIEWS_COLLECTION}/${normalizedReviewId}`, updated, true)

  await createAuditRecord({
    actorUid: moderator?.uid || null,
    actorRole: moderator?.role || null,
    action: 'resource.review.moderated',
    targetId: updated.resourceId || normalizedReviewId,
    targetRole: 'resource_review',
    message: `Moderated review ${normalizedReviewId} to ${normalizedStatus}.`,
  })

  return sanitizeResourceReviewData(normalizedReviewId, updated)
}

export async function listResourceCollections({ ownerUid = null, visibleOnly = false } = {}) {
  return listCollectionRecordsInternal({ ownerUid, visibleOnly })
}

export async function listSavedCollections(studentUid) {
  const saveRecords = await listCollectionSaveRecords(studentUid)
  const savedCollectionIds = saveRecords.map((entry) => entry.collectionId)
  const collections = await listCollectionRecordsInternal({ visibleOnly: true })
  return collections.filter((collection) => savedCollectionIds.includes(collection.id))
}

export async function createResourceCollection({ session, payload }) {
  const title = normalizeTextInput(payload?.title, {
    maxLength: 120,
    allowEmpty: false,
    fieldName: 'Collection title',
  })
  const description = normalizeTextInput(payload?.description, {
    maxLength: 1000,
    allowEmpty: true,
    fieldName: 'Collection description',
  })
  const visibility = String(payload?.visibility || 'private').trim() === 'public' ? 'public' : 'private'
  const resourceIds = Array.isArray(payload?.resourceIds)
    ? payload.resourceIds.map((value) => String(value || '').trim()).filter(Boolean)
    : []

  if (!title) {
    throw new Error('Collection title is required.')
  }

  const createdAt = nowIso()
  const record = await firestore.addDoc(RESOURCE_COLLECTIONS_COLLECTION, {
    title,
    description,
    ownerUid: session.uid,
    ownerName: session.name || null,
    ownerEmail: session.email || null,
    ownerRole: session.role || 'faculty',
    visibility,
    resourceIds,
    createdAt,
    updatedAt: createdAt,
  })

  await createAuditRecord({
    actorUid: session.uid,
    actorRole: session.role,
    action: 'resource.collection.created',
    targetId: record.id,
    targetRole: 'resource_collection',
    message: `Created collection "${title}".`,
  })

  return sanitizeResourceCollectionData(record.id, {
    title,
    description,
    ownerUid: session.uid,
    ownerName: session.name || null,
    ownerEmail: session.email || null,
    ownerRole: session.role || 'faculty',
    visibility,
    resourceIds,
    createdAt,
    updatedAt: createdAt,
  })
}

export async function updateResourceCollection({ collectionId, session, payload }) {
  const normalizedCollectionId = String(collectionId || '').trim()
  if (!normalizedCollectionId) {
    throw new Error('Collection ID is required.')
  }

  const current = await firestore.getDoc(`${RESOURCE_COLLECTIONS_COLLECTION}/${normalizedCollectionId}`)
  if (!current) {
    throw new Error('Collection not found.')
  }

  const isOwner = current.ownerUid === session.uid
  const isAdmin = session.role === 'admin' || isProtectedAdminEmail(session.email)
  if (!isOwner && !isAdmin) {
    throw new Error('You can only manage collections you created.')
  }

  const nextResourceIds = Array.isArray(payload?.resourceIds)
    ? payload.resourceIds.map((value) => String(value || '').trim()).filter(Boolean)
    : Array.isArray(current.resourceIds)
      ? current.resourceIds
      : []

  const requestedTitle = payload?.title ?? current.title
  const requestedDescription = payload?.description ?? current.description

  const updated = {
    ...current,
    title: normalizeTextInput(requestedTitle, {
      maxLength: 120,
      allowEmpty: false,
      fieldName: 'Collection title',
    }) || current.title,
    description: normalizeTextInput(requestedDescription, {
      maxLength: 1000,
      allowEmpty: true,
      fieldName: 'Collection description',
    }),
    visibility: String(payload?.visibility || current.visibility || 'private').trim() === 'public' ? 'public' : 'private',
    resourceIds: nextResourceIds,
    updatedAt: nowIso(),
  }

  await firestore.setDoc(`${RESOURCE_COLLECTIONS_COLLECTION}/${normalizedCollectionId}`, updated, true)

  await createAuditRecord({
    actorUid: session.uid,
    actorRole: session.role,
    action: 'resource.collection.updated',
    targetId: normalizedCollectionId,
    targetRole: 'resource_collection',
    message: `Updated collection "${updated.title}".`,
  })

  return sanitizeResourceCollectionData(normalizedCollectionId, updated)
}

export async function deleteResourceCollection({ collectionId, session }) {
  const normalizedCollectionId = String(collectionId || '').trim()
  if (!normalizedCollectionId) {
    throw new Error('Collection ID is required.')
  }

  const current = await firestore.getDoc(`${RESOURCE_COLLECTIONS_COLLECTION}/${normalizedCollectionId}`)
  if (!current) {
    throw new Error('Collection not found.')
  }

  const isOwner = current.ownerUid === session.uid
  const isAdmin = session.role === 'admin' || isProtectedAdminEmail(session.email)
  if (!isOwner && !isAdmin) {
    throw new Error('You can only delete collections you created.')
  }

  await firestore.deleteDoc(`${RESOURCE_COLLECTIONS_COLLECTION}/${normalizedCollectionId}`)
  await createAuditRecord({
    actorUid: session.uid,
    actorRole: session.role,
    action: 'resource.collection.deleted',
    targetId: normalizedCollectionId,
    targetRole: 'resource_collection',
    message: `Deleted collection "${current.title || normalizedCollectionId}".`,
  })

  return { success: true }
}

export async function toggleCollectionSaveForStudent({ student, collectionId }) {
  const studentUid = String(student?.uid || '').trim()
  const normalizedCollectionId = String(collectionId || '').trim()
  if (!studentUid || !normalizedCollectionId) {
    throw new Error('Student and collection IDs are required.')
  }

  const collection = await firestore
    .getDoc(`${RESOURCE_COLLECTIONS_COLLECTION}/${normalizedCollectionId}`)
    .catch(() => null)

  if (!collection) {
    throw new Error('Collection not found.')
  }

  const visibility = String(collection.visibility || 'private').trim().toLowerCase()
  if (!['public', 'shared'].includes(visibility)) {
    throw new Error('Collection is not available to students.')
  }

  const existingSave = await firestore
    .getDoc(`${COLLECTION_SAVES_COLLECTION}/${studentUid}_${normalizedCollectionId}`)
    .catch(() => null)

  if (existingSave) {
    await firestore.deleteDoc(`${COLLECTION_SAVES_COLLECTION}/${studentUid}_${normalizedCollectionId}`)
    await createAuditRecord({
      actorUid: studentUid,
      actorRole: 'student',
      action: 'resource.collection.unsaved',
      targetId: normalizedCollectionId,
      targetRole: 'resource_collection',
      message: `Unsaved collection ${normalizedCollectionId}.`,
    })
    return { saved: false }
  }

  const createdAt = nowIso()
  await firestore.setDoc(
    `${COLLECTION_SAVES_COLLECTION}/${studentUid}_${normalizedCollectionId}`,
    {
      collectionId: normalizedCollectionId,
      studentUid,
      studentEmail: student.email || '',
      studentName: student.name || '',
      createdAt,
      updatedAt: createdAt,
    },
    true
  )

  await createAuditRecord({
    actorUid: studentUid,
    actorRole: 'student',
    action: 'resource.collection.saved',
    targetId: normalizedCollectionId,
    targetRole: 'resource_collection',
    message: `Saved collection ${normalizedCollectionId}.`,
  })

  return { saved: true }
}

export async function getPlatformAnalyticsSummary({ session } = {}) {
  const scope = session?.role === 'faculty' ? 'faculty' : session?.role === 'admin' || isProtectedAdminEmail(session?.email) ? 'admin' : 'student'
  const [users, resources, reviews, collections] = await Promise.all([
    scope === 'student' ? Promise.resolve([]) : getCollectionRecords(USERS_COLLECTION).catch(() => []),
    getCollectionRecords(RESOURCES_COLLECTION).catch(() => []),
    getCollectionRecords(RESOURCE_REVIEWS_COLLECTION).catch(() => []),
    getCollectionRecords(RESOURCE_COLLECTIONS_COLLECTION).catch(() => []),
  ])

  const resourceEntries = resources.map((document) => sanitizeResourceData(document.id, getDocumentData(document)))
  const reviewEntries = reviews.map((document) => sanitizeResourceReviewData(document.id, getDocumentData(document)))
  const collectionEntries = collections.map((document) => sanitizeResourceCollectionData(document.id, getDocumentData(document)))
  const visibleResources = scope === 'faculty'
    ? resourceEntries.filter((entry) => entry.uploadedBy === session?.uid || entry.facultyId === session?.uid)
    : scope === 'student'
      ? resourceEntries.filter((entry) => entry.status === 'live')
      : resourceEntries

  const visibleCollections = scope === 'faculty'
    ? collectionEntries.filter((entry) => entry.ownerUid === session?.uid)
    : scope === 'student'
      ? collectionEntries.filter((entry) => entry.visibility === 'public')
      : collectionEntries

  const visibleReviews = scope === 'faculty'
    ? reviewEntries.filter((entry) => visibleResources.some((resource) => resource.id === entry.resourceId))
    : scope === 'student'
      ? reviewEntries.filter((entry) => entry.reviewerUid === session?.uid && entry.status !== 'hidden')
      : reviewEntries

  const downloadsByResource = await Promise.all(
    visibleResources.slice(0, 15).map(async (entry) => ({
      id: entry.id,
      title: entry.title,
      downloads: await countAuditRecords({ action: 'DOWNLOAD_RESOURCE', targetIds: [entry.id] }),
    }))
  )

  const topResources = downloadsByResource.sort((left, right) => right.downloads - left.downloads).slice(0, 5)

  return {
    scope,
    timestamp: nowIso(),
    summary: {
      totalUsers: scope === 'student' ? 0 : users.length,
      totalResources: visibleResources.length,
      totalReviews: visibleReviews.length,
      totalCollections: visibleCollections.length,
      liveResources: visibleResources.filter((entry) => entry.status === 'live').length,
      draftResources: visibleResources.filter((entry) => entry.status === 'draft').length,
    },
    resourcesByStatus: {
      live: visibleResources.filter((entry) => entry.status === 'live').length,
      draft: visibleResources.filter((entry) => entry.status === 'draft').length,
      archived: visibleResources.filter((entry) => entry.status === 'archived').length,
    },
    reviewsByStatus: {
      published: visibleReviews.filter((entry) => entry.status === 'published').length,
      hidden: visibleReviews.filter((entry) => entry.status === 'hidden').length,
    },
    averageRating: visibleReviews.length
      ? Number((visibleReviews.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) / visibleReviews.length).toFixed(1))
      : 0,
    topResources,
    collections: visibleCollections.slice(0, 5),
    reviews: visibleReviews.slice(0, 10),
  }
}

export async function listResourceVersions(resourceId) {
  return listResourceVersionRecords(resourceId)
}

export async function rollbackResourceVersion({ resourceId, versionId, session, note = 'Rollback to previous version' }) {
  const normalizedResourceId = String(resourceId || '').trim()
  const normalizedVersionId = String(versionId || '').trim()
  if (!normalizedResourceId || !normalizedVersionId) {
    throw new Error('Resource and version IDs are required.')
  }

  const resource = await firestore.getDoc(`${RESOURCES_COLLECTION}/${normalizedResourceId}`)
  const version = await firestore.getDoc(`${RESOURCE_VERSIONS_COLLECTION}/${normalizedVersionId}`)
  if (!resource || !version || String(version.resourceId || '').trim() !== normalizedResourceId) {
    throw new Error('Version not found.')
  }

  const isOwner = resource.uploadedBy === session.uid || resource.facultyId === session.uid
  const isAdmin = session.role === 'admin' || isProtectedAdminEmail(session.email)
  if (!isOwner && !isAdmin) {
    throw new Error('You can only manage resources you uploaded.')
  }

  const restored = {
    ...resource,
    title: version.title,
    titleLower: String(version.title || '').trim().toLowerCase(),
    subject: version.subject,
    class: version.class,
    summary: version.summary,
    fileUrl: version.fileUrl,
    fileType: version.fileType,
    fileSize: version.fileSize,
    fileFormat: version.fileFormat,
    driveFileId: version.driveFileId,
    driveFileLink: version.driveFileLink,
    status: version.status,
    updatedAt: nowIso(),
  }

  await firestore.setDoc(`${RESOURCES_COLLECTION}/${normalizedResourceId}`, restored, true)
  await createResourceVersionSnapshot({
    resourceId: normalizedResourceId,
    resource: restored,
    note,
    createdBy: session.uid,
    latest: true,
  })

  await createAuditRecord({
    actorUid: session.uid,
    actorRole: session.role,
    action: 'resource.version.rollback',
    targetId: normalizedResourceId,
    targetRole: 'resource',
    message: `Rolled back resource ${normalizedResourceId} to a previous version.`,
  })

  return sanitizeResourceData(normalizedResourceId, restored)
}

export async function listSavedSearches(userUid) {
  return getSavedSearchRecords(userUid)
}

export async function createSavedSearch({ user, payload }) {
  const query = normalizeTextInput(payload?.query, {
    maxLength: 160,
    allowEmpty: false,
    fieldName: 'Search query',
  })
  const subject = normalizeTextInput(payload?.subject, {
    maxLength: 80,
    allowEmpty: true,
    fieldName: 'Subject',
  })
  const classFilter = normalizeTextInput(payload?.classFilter, {
    maxLength: 80,
    allowEmpty: true,
    fieldName: 'Class filter',
  })
  if (!query) {
    throw new Error('Search query is required.')
  }

  const createdAt = nowIso()
  const record = await firestore.addDoc(SAVED_SEARCHES_COLLECTION, {
    userUid: user.uid,
    userEmail: user.email || '',
    query,
    subject,
    classFilter,
    alertsEnabled: payload?.alertsEnabled !== false,
    createdAt,
    updatedAt: createdAt,
  })

  await createAuditRecord({
    actorUid: user.uid,
    actorRole: user.role,
    action: 'search.saved',
    targetId: record.id,
    targetRole: 'saved_search',
    message: `Saved search "${query}".`,
  })

  return sanitizeSavedSearchData(record.id, {
    userUid: user.uid,
    userEmail: user.email || '',
    query,
    subject,
    classFilter,
    alertsEnabled: payload?.alertsEnabled !== false,
    createdAt,
    updatedAt: createdAt,
  })
}

export async function deleteSavedSearch({ searchId, user }) {
  const normalizedSearchId = String(searchId || '').trim()
  if (!normalizedSearchId) {
    throw new Error('Search ID is required.')
  }

  const existing = await firestore.getDoc(`${SAVED_SEARCHES_COLLECTION}/${normalizedSearchId}`)
  if (!existing || String(existing.userUid || '').trim() !== String(user.uid || '').trim()) {
    throw new Error('Saved search not found.')
  }

  await firestore.deleteDoc(`${SAVED_SEARCHES_COLLECTION}/${normalizedSearchId}`)
  return { success: true }
}

export async function upsertNotificationPreferences({ user, payload }) {
  const normalizedUserUid = String(user?.uid || '').trim()
  if (!normalizedUserUid) {
    throw new Error('User ID is required.')
  }

  const allowedCategories = new Set(['resources', 'reviews', 'collections'])
  const normalizedCategories = Array.isArray(payload?.categories)
    ? payload.categories
      .map((value) => normalizeTextInput(value, { maxLength: 40, allowEmpty: true, fieldName: 'Category' }).toLowerCase())
      .filter((value) => allowedCategories.has(value))
    : []

  const existing = await getNotificationPreferenceRecord(normalizedUserUid)
  const createdAt = existing?.createdAt || nowIso()
  const updatedAt = nowIso()
  const record = {
    userUid: normalizedUserUid,
    userEmail: user.email || '',
    frequency: ['daily', 'weekly', 'off'].includes(String(payload?.frequency || '')) ? String(payload.frequency) : 'weekly',
    channel: ['in-app', 'email', 'both'].includes(String(payload?.channel || '')) ? String(payload.channel) : 'in-app',
    categories: normalizedCategories.length > 0 ? normalizedCategories : ['resources', 'reviews', 'collections'],
    alertsEnabled: payload?.alertsEnabled !== false,
    createdAt,
    updatedAt,
  }

  await firestore.setDoc(`${NOTIFICATION_PREFERENCES_COLLECTION}/${normalizedUserUid}`, record, true)
  return sanitizeNotificationPreferenceData(normalizedUserUid, record)
}

export async function getNotificationPreferences(userUid) {
  return getNotificationPreferenceRecord(userUid)
}

export async function listResourceComments(resourceId, options = {}) {
  return getResourceCommentRecords(resourceId, options)
}

export async function createResourceComment({ resourceId, author, body, visibility = 'public', parentId = null }) {
  const normalizedResourceId = String(resourceId || '').trim()
  const normalizedBody = normalizeTextInput(body, {
    maxLength: 3000,
    allowEmpty: false,
    fieldName: 'Comment body',
  })
  if (!normalizedResourceId || !normalizedBody) {
    throw new Error('Resource and comment body are required.')
  }

  const createdAt = nowIso()
  const payload = {
    resourceId: normalizedResourceId,
    authorUid: author?.uid || '',
    authorName: author?.name || '',
    authorEmail: author?.email || '',
    visibility: visibility === 'private' ? 'private' : 'public',
    parentId: parentId ? String(parentId).trim() : null,
    body: normalizedBody,
    createdAt,
    updatedAt: createdAt,
  }

  const record = await firestore.addDoc(RESOURCE_COMMENTS_COLLECTION, payload)
  return sanitizeResourceCommentData(record.id, payload)
}

export async function deleteResourceComment({ commentId, actor }) {
  const normalizedCommentId = String(commentId || '').trim()
  if (!normalizedCommentId) {
    throw new Error('Comment ID is required.')
  }

  const existing = await firestore.getDoc(`${RESOURCE_COMMENTS_COLLECTION}/${normalizedCommentId}`)
  if (!existing) {
    throw new Error('Comment not found.')
  }

  const canDelete = existing.authorUid === actor?.uid || actor?.role === 'admin' || isProtectedAdminEmail(actor?.email)
  if (!canDelete) {
    throw new Error('You cannot delete this comment.')
  }

  await firestore.deleteDoc(`${RESOURCE_COMMENTS_COLLECTION}/${normalizedCommentId}`)
  return { success: true }
}

export async function getPersonalizedRecommendations({ user }) {
  const resources = await listResourceRecords().catch(() => [])
  const liveResources = resources.filter((entry) => entry.status === 'live')
  const userRecord = user?.uid ? await getUserRecordById(user.uid).catch(() => null) : null
  const bookmarks = new Set(userRecord?.bookmarks || [])
  const downloads = await getCollectionRecords(AUDIT_COLLECTION).catch(() => [])

  const scored = liveResources.map((resource) => {
    const bookmarked = bookmarks.has(resource.id)
    const matchingDownloads = downloads.filter((entry) => entry.targetId === resource.id && entry.action === 'DOWNLOAD_RESOURCE').length
    const classMatch = userRecord?.class && resource.class === userRecord.class ? 3 : 0
    const subjectMatch = userRecord?.subject && resource.subject === userRecord.subject ? 3 : 0
    const bookmarkScore = bookmarked ? 5 : 0
    const parsedTimestamp = Date.parse(resource.updatedAt || resource.createdAt || '')
    const freshnessScore = Number.isFinite(parsedTimestamp)
      ? Math.max(0, 5 - Math.floor(Math.max(0, Date.now() - parsedTimestamp) / 86400000))
      : 0
    return {
      ...resource,
      score: classMatch + subjectMatch + bookmarkScore + matchingDownloads + freshnessScore,
    }
  })

  return scored.sort((left, right) => right.score - left.score).slice(0, 8)
}

export async function detectDuplicateResourcesForPayload(payload) {
  const resources = await listResourceRecords().catch(() => [])
  return detectDuplicateResourceCandidates(payload, resources)
}

export async function addResourceVersionNote({ resourceId, versionId, session, note }) {
  const normalizedResourceId = String(resourceId || '').trim()
  const normalizedVersionId = String(versionId || '').trim()
  const version = await firestore.getDoc(`${RESOURCE_VERSIONS_COLLECTION}/${normalizedVersionId}`)
  if (!version || String(version.resourceId || '').trim() !== normalizedResourceId) {
    throw new Error('Version not found.')
  }

  const resource = await firestore.getDoc(`${RESOURCES_COLLECTION}/${normalizedResourceId}`)
  if (!resource) {
    throw new Error('Resource not found.')
  }

  const isOwner = resource.uploadedBy === session?.uid || resource.facultyId === session?.uid
  const isAdmin = session?.role === 'admin' || isProtectedAdminEmail(session?.email)
  if (!isOwner && !isAdmin) {
    throw new Error('You can only manage resources you uploaded.')
  }

  const updated = {
    ...version,
    note: normalizeTextInput(note, {
      maxLength: 200,
      allowEmpty: true,
      fieldName: 'Version note',
    }),
    updatedAt: nowIso(),
  }
  await firestore.setDoc(`${RESOURCE_VERSIONS_COLLECTION}/${normalizedVersionId}`, updated, true)
  return sanitizeResourceVersionData(normalizedVersionId, updated)
}

export async function countResourceComments(resourceId) {
  const comments = await listResourceComments(resourceId)
  return comments.length
}

export async function countResourceVersions(resourceId) {
  const versions = await listResourceVersions(resourceId)
  return versions.length
}

export async function getLatestResourceVersion(resourceId) {
  const versions = await listResourceVersions(resourceId)
  return versions.length > 0 ? versions[versions.length - 1] : null
}

export async function getResourceQualitySignals(resourceId) {
  const reviews = await listResourceReviews(resourceId)
  const ratings = reviews.map((review) => Number(review.rating || 0)).filter(Boolean)
  const averageRating = ratings.length > 0 ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)) : 0
  const reviewCount = reviews.length
  const comments = await countResourceComments(resourceId)
  const versions = await countResourceVersions(resourceId)

  return {
    averageRating,
    reviewCount,
    commentCount: comments,
    versionCount: versions,
  }
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

export async function listNotificationRecords(recipientUid, { page = 1, limit = 50 } = {}) {
  const normalizedRecipientUid = String(recipientUid || '').trim()
  if (!normalizedRecipientUid) {
    return []
  }

  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50))
  const offset = (safePage - 1) * safeLimit
  const scanSize = Math.min(500, Math.max(100, offset + safeLimit))

  const records = await firestore
    .runQueryMany(NOTIFICATIONS_COLLECTION, ['recipientUid', '==', normalizedRecipientUid], scanSize)
    .catch(() => [])
  const sorted = records
    .map((document) => sanitizeNotificationData(document.id, getDocumentData(document)))
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    )

  return sorted.slice(offset, offset + safeLimit)
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

  try {
    const records = await firestore.runQueryMany(SESSIONS_COLLECTION, ['uid', '==', normalizedUid], 5)
    const sanitized = records.map((entry) => sanitizeSessionData(entry.id, entry))

    const staleRecords = sanitized.filter((record) => !isActiveSessionRecord(record))
    await Promise.all(
      staleRecords.map((record) =>
        firestore.deleteDoc(`${SESSIONS_COLLECTION}/${record.id}`).catch(() => null)
      )
    )

    return sanitized.filter(isActiveSessionRecord)
  } catch {
    const records = await listSessionRecords()
    return records.filter((record) => String(record.uid || '').trim() === normalizedUid)
  }
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

  // Fast-path guard: check only this user's recent sessions and skip global fallbacks.
  try {
    const records = await firestore.runQueryMany(SESSIONS_COLLECTION, ['uid', '==', normalizedUid], 5)
    const activeSessions = records
      .map((entry) => sanitizeSessionData(entry.id, entry))
      .filter(isActiveSessionRecord)

    if (activeSessions.length >= 2) {
      throw new Error('You can only be signed in on 2 devices at a time. Please log out from another device first.')
    }
  } catch (error) {
    const message = String(error?.message || '')
    if (message.includes('You can only be signed in on 2 devices at a time')) {
      throw error
    }
    // Do not block login when the session directory query is temporarily unavailable.
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
  userId,
  userName,
  userEmail,
  role,
  actorUid,
  actorRole,
  action,
  description,
  module,
  status,
  ipAddress,
  location,
  device,
  targetId = null,
  targetRole = null,
  message,
  metadata = null,
}) {
  try {
    const createdAt = nowIso()
    await firestore.addDoc(AUDIT_COLLECTION, {
      userId: userId || actorUid || null,
      userName: userName || null,
      userEmail: normalizeEmail(userEmail),
      role: role || actorRole || null,
      actorUid: actorUid || userId || null,
      actorRole: actorRole || role || null,
      action: action || 'activity',
      description: description || message || '',
      module: module || 'General',
      status: status || 'SUCCESS',
      timestamp: createdAt,
      ipAddress: ipAddress || null,
      location: location || 'Unknown',
      device: device || { browser: 'Unknown', os: 'Unknown', deviceType: 'desktop' },
      targetId,
      targetRole,
      message: message || '',
      metadata,
      createdAt,
    })
  } catch (error) {
    console.warn('Audit log warning:', error?.message || error)
  }
}

export async function getSessionSettingsRecord() {
  const existing = await firestore
    .getDoc(`${APP_CONFIG_COLLECTION}/${SESSION_SETTINGS_DOC_ID}`)
    .catch(() => null)

  if (!existing) {
    return {
      ...SESSION_SETTINGS_DEFAULTS,
      updatedAt: null,
      updatedBy: null,
    }
  }

  return sanitizeSessionSettingsData(existing)
}

export async function upsertSessionSettingsRecord({ settings, actorUid }) {
  const normalized = normalizeSessionSettings(settings)
  const payload = {
    ...normalized,
    updatedAt: nowIso(),
    updatedBy: String(actorUid || '').trim() || null,
  }

  await firestore.setDoc(`${APP_CONFIG_COLLECTION}/${SESSION_SETTINGS_DOC_ID}`, payload, true)
  return sanitizeSessionSettingsData(payload)
}

export async function createExportVerificationToken({ actorUid, actorEmail, ttlMs = 5 * 60 * 1000 }) {
  const token = crypto.randomUUID()
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + Math.max(60000, Number(ttlMs) || 0)).toISOString()
  const payload = {
    actorUid: String(actorUid || '').trim() || null,
    actorEmail: normalizeEmail(actorEmail),
    createdAt,
    expiresAt,
    usedAt: null,
  }

  await firestore.setDoc(`${EXPORT_VERIFICATIONS_COLLECTION}/${token}`, payload, true)
  return { token, expiresAt }
}

export async function consumeExportVerificationToken({ token, actorUid }) {
  const normalizedToken = String(token || '').trim()
  const normalizedActorUid = String(actorUid || '').trim()
  if (!normalizedToken || !normalizedActorUid) {
    return false
  }

  const existing = await firestore
    .getDoc(`${EXPORT_VERIFICATIONS_COLLECTION}/${normalizedToken}`)
    .catch(() => null)
  if (!existing) {
    return false
  }

  const record = sanitizeExportVerificationData(existing.id, existing)
  const expiresAt = getTimestampValue(record.expiresAt)
  const now = Date.now()

  if (record.actorUid !== normalizedActorUid || record.usedAt || !expiresAt || now > expiresAt) {
    await firestore.deleteDoc(`${EXPORT_VERIFICATIONS_COLLECTION}/${normalizedToken}`).catch(() => null)
    return false
  }

  await firestore.setDoc(
    `${EXPORT_VERIFICATIONS_COLLECTION}/${normalizedToken}`,
    {
      usedAt: nowIso(),
    },
    true
  )

  return true
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
  const safeDisplayName = normalizeTextInput(displayName, {
    maxLength: 100,
    allowEmpty: true,
    fieldName: 'Display name',
  })
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
      isBlocked: Boolean(existingByEmail?.data?.isBlocked),
      blockedAt: existingByEmail?.data?.blockedAt || null,
      blockedBy: existingByEmail?.data?.blockedBy || null,
      blockedReason: existingByEmail?.data?.blockedReason || '',
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
    isBlocked: false,
    blockedAt: null,
    blockedBy: null,
    blockedReason: '',
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
  const record = await getUserRecordById(userId)
  if (!record) {
    throw new Error('User account not found.')
  }

  const normalizedStatus = nextStatus === 'active' ? 'active' : 'disabled'
  if (record.role === 'admin' && record.id === actorUid && normalizedStatus !== 'active') {
    throw new Error('You cannot disable your own admin account from this panel.')
  }

  const updated = {
    ...record,
    status: normalizedStatus,
    updatedAt: nowIso(),
  }

  await firestore.setDoc(`${USERS_COLLECTION}/${record.id}`, updated, true)

  if (updated.uid) {
    try {
      await auth.updateUser(updated.uid, {
        disabled: normalizedStatus !== 'active' || Boolean(record.isBlocked),
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
  const record = await getUserRecordById(userId)
  if (!record) {
    throw new Error('User account not found.')
  }

  // Ensure the user has a Firebase Auth UID
  if (!record.uid) {
    throw new Error('This account has not yet been linked to an authentication provider.')
  }

  const temporaryPassword = newPassword || generateTemporaryPassword()
  let loginId = record.loginId
  const normalizedStatus = record.status === 'disabled' ? 'disabled' : 'active'

  // If the user doesn't have a Login ID (e.g. Google-only student), generate one
  if (!loginId) {
    loginId = await ensureUniqueLoginId(
      record.email?.split('@')[0] || record.displayName || record.role || 'user'
    )
  }

  await auth.updateUser(record.uid, {
    password: temporaryPassword,
    disabled: normalizedStatus !== 'active' || Boolean(record.isBlocked),
  })

  const updatedData = {
    ...record,
    status: normalizedStatus,
    loginId,
    updatedAt: nowIso(),
  }

  // If they were Google-only, we now effectively support credentials too
  if (record.authProvider === 'google') {
    updatedData.authProvider = 'credentials'
  }

  await firestore.setDoc(`${USERS_COLLECTION}/${record.id}`, updatedData, true)

  await createAuditRecord({
    actorUid,
    actorRole,
    action: 'user.credentials.reset',
    targetId: record.id,
    targetRole: record.role,
    message: `Reset credentials for ${record.email || record.id}.`,
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

  const currentRecord = await getUserRecordById(decodedToken.uid)
  if (currentRecord) {
    if (currentRecord.role !== 'student') {
      throw new Error('This Google account is not assigned to the student portal.')
    }

    const merged = {
      ...currentRecord,
      uid: decodedToken.uid,
      email,
      emailLower: email,
      displayName:
        currentRecord.displayName ||
        decodedToken.name ||
        email.split('@')[0],
      authProvider: 'google',
      pending: false,
      updatedAt: nowIso(),
      lastLoginAt: nowIso(),
    }

    if (merged.isBlocked) {
      throw new Error('Your account is blocked.')
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

    if (merged.isBlocked) {
      throw new Error('Your account is blocked.')
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

  if (String(password || '').length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  if (String(password || '').length > 256) {
    throw new Error('Password is too long.')
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
    displayName: normalizeTextInput(displayName || normalizedEmail.split('@')[0], {
      maxLength: 100,
      allowEmpty: false,
      fieldName: 'Display name',
    }),
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
  const title = normalizeTextInput(payload?.title, { maxLength: 160, allowEmpty: false, fieldName: 'Title' })
  const subject = normalizeTextInput(payload?.subject, { maxLength: 80, allowEmpty: false, fieldName: 'Subject' })
  const courseClass = normalizeTextInput(payload?.class, { maxLength: 80, allowEmpty: false, fieldName: 'Class' })
  const fileUrl = normalizeHttpUrl(payload?.fileUrl, { fieldName: 'File URL' })
  const summary = normalizeTextInput(payload?.summary, { maxLength: 2000, allowEmpty: true, fieldName: 'Summary' })
  const status = payload?.status === 'draft' ? 'draft' : 'live'
  
  // New metadata fields
  const fileType = normalizeTextInput(payload?.fileType, { maxLength: 120, allowEmpty: true, fieldName: 'File type' })
  const fileSize = Math.max(0, Number(payload?.fileSize || 0))
  const fileFormat = normalizeTextInput(payload?.fileFormat, { maxLength: 20, allowEmpty: true, fieldName: 'File format' })

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
    driveFileId: normalizeTextInput(payload?.driveFileId, { maxLength: 200, allowEmpty: true, fieldName: 'Drive file ID' }),
    driveFileLink: normalizeHttpUrl(payload?.driveFileLink, { fieldName: 'Drive file link', allowEmpty: true }),
    category: normalizeTextInput(payload?.category, { maxLength: 80, allowEmpty: true, fieldName: 'Category' }),
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

  await createResourceVersionSnapshot({
    resourceId: docRef.id,
    resource: {
      title,
      subject,
      class: courseClass,
      summary,
      fileUrl,
      fileType,
      fileSize,
      fileFormat,
      driveFileId: normalizeTextInput(payload?.driveFileId, { maxLength: 200, allowEmpty: true, fieldName: 'Drive file ID' }),
      driveFileLink: normalizeHttpUrl(payload?.driveFileLink, { fieldName: 'Drive file link', allowEmpty: true }),
      status,
    },
    note: 'Initial version',
    createdBy: session.uid,
    latest: true,
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
    driveFileId: normalizeTextInput(payload?.driveFileId, { maxLength: 200, allowEmpty: true, fieldName: 'Drive file ID' }),
    driveFileLink: normalizeHttpUrl(payload?.driveFileLink, { fieldName: 'Drive file link', allowEmpty: true }),
    category: normalizeTextInput(payload?.category, { maxLength: 80, allowEmpty: true, fieldName: 'Category' }),
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
  
    const title = normalizeTextInput(payload?.title, { maxLength: 160, allowEmpty: false, fieldName: 'Title' })
    const subject = normalizeTextInput(payload?.subject, { maxLength: 80, allowEmpty: false, fieldName: 'Subject' })
    const courseClass = normalizeTextInput(payload?.class, { maxLength: 80, allowEmpty: false, fieldName: 'Class' })
    const fileUrl = normalizeHttpUrl(payload?.fileUrl, { fieldName: 'File URL' })
    const summary = normalizeTextInput(payload?.summary, { maxLength: 2000, allowEmpty: true, fieldName: 'Summary' })
    const status = payload?.status === 'draft' ? 'draft' : 'live'

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
    if (payload?.fileType !== undefined) updated.fileType = normalizeTextInput(payload.fileType, { maxLength: 120, allowEmpty: true, fieldName: 'File type' })
    if (payload?.fileSize !== undefined) updated.fileSize = Math.max(0, Number(payload.fileSize || 0))
    if (payload?.fileFormat !== undefined) updated.fileFormat = normalizeTextInput(payload.fileFormat, { maxLength: 20, allowEmpty: true, fieldName: 'File format' })
    if (payload?.driveFileId !== undefined) updated.driveFileId = normalizeTextInput(payload.driveFileId, { maxLength: 200, allowEmpty: true, fieldName: 'Drive file ID' })
    if (payload?.driveFileLink !== undefined) updated.driveFileLink = normalizeHttpUrl(payload.driveFileLink, { fieldName: 'Drive file link', allowEmpty: true })
    if (payload?.category !== undefined) updated.category = normalizeTextInput(payload.category, { maxLength: 80, allowEmpty: true, fieldName: 'Category' })
  
    await firestore.setDoc(`${RESOURCES_COLLECTION}/${resourceId}`, updated, true)
    await createAuditRecord({
      actorUid: session.uid,
      actorRole: session.role,
      action: 'resource.updated',
      targetId: resourceId,
      targetRole: 'resource',
      message: `Updated resource "${title}".`,
    })

    await createResourceVersionSnapshot({
      resourceId,
      resource: updated,
      note: normalizeTextInput(payload?.versionNote || 'Updated resource', {
        maxLength: 200,
        allowEmpty: false,
        fieldName: 'Version note',
      }),
      createdBy: session.uid,
      latest: true,
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
