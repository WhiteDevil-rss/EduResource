import 'server-only'
import { firestore } from '@/lib/firebase-edge'

function sortByTimestampDescending(records) {
  return [...records].sort((left, right) => {
    const leftTime = Date.parse(left.timestamp || left.createdAt || '') || 0
    const rightTime = Date.parse(right.timestamp || right.createdAt || '') || 0
    return rightTime - leftTime
  })
}

/**
 * Fetch all users for export
 */
export async function getAllUsersForExport() {
  try {
    const users = await firestore.listDocs('users', { pageSize: 1000 })
    return users.map((user) => ({
      id: user.id,
      ...user,
    }))
  } catch (error) {
    console.error('Error fetching users for export:', error)
    throw error
  }
}

/**
 * Fetch audit logs for export
 */
export async function getAuditLogsForExport({ limit = 1000 } = {}) {
  try {
    const logs = await firestore.listDocs('audit_logs', { pageSize: 1200 })
    return sortByTimestampDescending(
      logs.map((log) => ({
        id: log.id,
        ...log,
      }))
    ).slice(0, limit)
  } catch (error) {
    console.error('Error fetching audit logs for export:', error)
    throw error
  }
}

/**
 * Fetch activity logs for export
 */
export async function getActivityLogsForExport({ limit = 1000 } = {}) {
  try {
    const logs = await firestore.listDocs('activity_logs', { pageSize: 1200 })
    return sortByTimestampDescending(
      logs.map((log) => ({
        id: log.id,
        ...log,
      }))
    ).slice(0, limit)
  } catch (error) {
    console.error('Error fetching activity logs for export:', error)
    throw error
  }
}

/**
 * Fetch all resources for export
 */
export async function getAllResourcesForExport() {
  try {
    const resources = await firestore.listDocs('resources', { pageSize: 1200 })
    return resources.map((resource) => ({
      id: resource.id,
      ...resource,
    }))
  } catch (error) {
    console.error('Error fetching resources for export:', error)
    throw error
  }
}

/**
 * Generate analytics summary
 */
export async function getAnalyticsSummary() {
  try {
    const [users, resources] = await Promise.all([
      getAllUsersForExport(),
      getAllResourcesForExport(),
    ])

    const usersByRole = {
      admin: users.filter((u) => u.role === 'admin').length,
      faculty: users.filter((u) => u.role === 'faculty').length,
      student: users.filter((u) => u.role === 'student').length,
    }

    const usersByStatus = {
      active: users.filter((u) => u.status === 'active').length,
      disabled: users.filter((u) => u.status === 'disabled').length,
    }

    const resourcesByStatus = {
      live: resources.filter((r) => r.status === 'live').length,
      draft: resources.filter((r) => r.status === 'draft').length,
      archived: resources.filter((r) => r.status === 'archived').length,
    }

    return {
      timestamp: new Date(),
      summary: {
        totalUsers: users.length,
        totalResources: resources.length,
      },
      usersByRole,
      usersByStatus,
      resourcesByStatus,
      detailedUsers: users,
      detailedResources: resources,
    }
  } catch (error) {
    console.error('Error generating analytics:', error)
    throw error
  }
}
