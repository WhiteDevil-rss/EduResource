import 'server-only'
import { firestore } from '@/lib/firebase-edge'

const ACTIVITY_COLLECTION = 'activity_logs'

/**
 * Log user activity for timeline tracking
 * Simpler than audit logs, designed for Activity Timeline UI
 */
export async function logActivity({
  userId = null,
  userName = null,
  userEmail = null,
  role = null,
  action,
  description,
  metadata = null,
}) {
  if (!action) {

    return null
  }

  try {
    const activityRecord = {
      userId: userId || null,
      userName: userName || null,
      userEmail: userEmail || null,
      role: role || null,
      action,
      description: description || action,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    const docRef = await firestore.addDoc(ACTIVITY_COLLECTION, activityRecord)
    return docRef.id
  } catch (error) {
    console.error('Error logging activity:', error)
    return null
  }
}

/**
 * Get activity logs with optional filtering
 * Used by Activity Timeline API endpoint
 */
export async function getActivityLogs({
  limit: pageLimit = 50,
  userId = null,
  action = null,
  startDate = null,
  endDate = null,
} = {}) {
  try {
    const records = await firestore.listDocs(ACTIVITY_COLLECTION)
    const startTime = startDate ? new Date(startDate).getTime() : null
    const endTime = endDate ? new Date(endDate).getTime() : null

    return records
      .map((record) => ({
        id: record.id,
        ...record,
        timestamp: record.timestamp || record.createdAt || null,
      }))
      .filter((record) => {
        if (userId && record.userId !== userId) {
          return false
        }

        if (action && record.action !== action) {
          return false
        }

        const recordTime = Date.parse(record.timestamp || record.createdAt || '')
        if (startTime && (!Number.isFinite(recordTime) || recordTime < startTime)) {
          return false
        }

        if (endTime && (!Number.isFinite(recordTime) || recordTime > endTime)) {
          return false
        }

        return true
      })
      .sort((left, right) => {
        const leftTime = Date.parse(left.timestamp || left.createdAt || '') || 0
        const rightTime = Date.parse(right.timestamp || right.createdAt || '') || 0
        return rightTime - leftTime
      })
      .slice(0, pageLimit)
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return []
  }
}

/**
 * Get activities for a specific user
 */
export async function getUserActivityLogs({
  userId,
  limit: pageLimit = 100,
} = {}) {
  if (!userId) {
    return []
  }

  return getActivityLogs({
    limit: pageLimit,
    userId,
  })
}
