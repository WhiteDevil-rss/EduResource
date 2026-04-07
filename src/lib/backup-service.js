import 'server-only'
import { getAllUsersForExport, getAllResourcesForExport } from './export-service'

// In-memory storage for last backup timestamp (could be persisted to Firestore)
let lastBackupTimestamp = null

/**
 * Create a backup of users and resources
 * Returns backup metadata
 */
export async function performBackup() {
  try {
    const [users, resources] = await Promise.all([
      getAllUsersForExport(),
      getAllResourcesForExport(),
    ])

    const backupTimestamp = new Date().toISOString()
    const backupFileName = `backup-${new Date().toISOString().split('T')[0]}.json`

    const backup = {
      timestamp: backupTimestamp,
      metadata: {
        fileName: backupFileName,
        users: {
          count: users.length,
          records: users,
        },
        resources: {
          count: resources.length,
          records: resources,
        },
      },
    }

    // Update last backup timestamp
    lastBackupTimestamp = backupTimestamp

    return {
      success: true,
      timestamp: backupTimestamp,
      fileName: backupFileName,
      userCount: users.length,
      resourceCount: resources.length,
      data: backup,
    }
  } catch (error) {
    console.error('Error performing backup:', error)
    throw error
  }
}

/**
 * Get last backup timestamp
 */
export function getLastBackupTimestamp() {
  return lastBackupTimestamp
}

/**
 * Schedule automatic backups (to be called by cron job or scheduler)
 * This would typically be called by a serverless function or cron service
 */
export async function scheduleAutomaticBackup() {
  return performBackup()
}
