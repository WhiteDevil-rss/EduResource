import { NextResponse } from 'next/server'
import {
  ApiError,
  assertSameOrigin,
  jsonError,
  requireApiSession,
} from '@/lib/api-security'
import { isSuperAdmin } from '@/lib/admin-protection'
import { logAction } from '@/lib/audit-log'
import { logActivity } from '@/lib/activity-log'
import {
  getAllUsersForExport,
  getAuditLogsForExport,
  getAnalyticsSummary,
} from '@/lib/export-service'

/**
 * Generate CSV content
 */
function generateCSV(headers, rows) {
  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  return csvContent
}

/**
 * Generate PDF-like text report
 * For browser compatibility, returns formatted text that can be printed as PDF
 */
function generatePDFText(title, content) {
  const now = new Date()
  const separator = '='.repeat(80)

  let report = `${separator}\n`
  report += `${title.toUpperCase()}\n`
  report += `Generated: ${now.toISOString()}\n`
  report += `${separator}\n\n`

  if (typeof content === 'string') {
    report += content
  } else if (Array.isArray(content)) {
    report += content.join('\n')
  } else if (typeof content === 'object') {
    report += JSON.stringify(content, null, 2)
  }

  return report
}

/**
 * Export users as CSV
 */
async function exportUsersCSV() {
  const users = await getAllUsersForExport()

  const headers = ['ID', 'Email', 'Display Name', 'Role', 'Status', 'Created At']
  const rows = users.map((user) => [
    user.id || '',
    user.email || '',
    user.displayName || '',
    user.role || '',
    user.status || 'active',
    user.createdAt ? new Date(user.createdAt).toISOString() : '',
  ])

  return generateCSV(headers, rows)
}

/**
 * Export users as PDF (text format)
 */
async function exportUsersPDF() {
  const users = await getAllUsersForExport()

  const lines = [
    `Total Users: ${users.length}`,
    `\nUSER DETAILS:\n`,
    ...users.map(
      (u) =>
        `- ${u.displayName || u.email} (${u.role}) [${u.status}]\n  Email: ${u.email}\n  ID: ${u.id}`
    ),
  ]

  return generatePDFText('User Report', lines)
}

/**
 * Export audit logs as CSV
 */
async function exportAuditLogsCSV() {
  const logs = await getAuditLogsForExport({ limit: 1000 })

  const headers = ['User', 'Email', 'Action', 'Module', 'Status', 'Description', 'Timestamp']
  const rows = logs.map((log) => [
    log.userName || 'Unknown',
    log.userEmail || '',
    log.action || '',
    log.module || '',
    log.status || '',
    log.description || '',
    log.timestamp ? new Date(log.timestamp).toISOString() : '',
  ])

  return generateCSV(headers, rows)
}

/**
 * Export audit logs as PDF (text format)
 */
async function exportAuditLogsPDF() {
  const logs = await getAuditLogsForExport({ limit: 1000 })

  const lines = [
    `Total Audit Entries: ${logs.length}`,
    `\nAUDIT LOG ENTRIES:\n`,
    ...logs.map(
      (log) =>
        `[${log.status}] ${log.action} by ${log.userName || log.userEmail}\n  Module: ${log.module}\n  Description: ${log.description}\n  Time: ${
          log.timestamp ? new Date(log.timestamp).toISOString() : 'N/A'
        }`
    ),
  ]

  return generatePDFText('Audit Log Report', lines)
}

/**
 * Export analytics as CSV
 */
async function exportAnalyticsCSV() {
  const analytics = await getAnalyticsSummary()

  const lines = []

  // Summary section
  lines.push(['SUMMARY'])
  lines.push(['Total Users', analytics.summary.totalUsers])
  lines.push(['Total Resources', analytics.summary.totalResources])
  lines.push([''])

  // Users by role
  lines.push(['USERS BY ROLE'])
  lines.push(['Admin', analytics.usersByRole.admin])
  lines.push(['Faculty', analytics.usersByRole.faculty])
  lines.push(['Student', analytics.usersByRole.student])
  lines.push([''])

  // Users by status
  lines.push(['USERS BY STATUS'])
  lines.push(['Active', analytics.usersByStatus.active])
  lines.push(['Disabled', analytics.usersByStatus.disabled])
  lines.push([''])

  // Resources by status
  lines.push(['RESOURCES BY STATUS'])
  lines.push(['Live', analytics.resourcesByStatus.live])
  lines.push(['Draft', analytics.resourcesByStatus.draft])
  lines.push(['Archived', analytics.resourcesByStatus.archived])

  return generateCSV([], lines)
}

/**
 * Export analytics as PDF (text format)
 */
async function exportAnalyticsPDF() {
  const analytics = await getAnalyticsSummary()

  const lines = [
    `ANALYTICS REPORT`,
    `Generated: ${analytics.timestamp.toISOString()}`,
    `\nSUMMARY:`,
    `  Total Users: ${analytics.summary.totalUsers}`,
    `  Total Resources: ${analytics.summary.totalResources}`,
    `\nUSERS BY ROLE:`,
    `  Admin: ${analytics.usersByRole.admin}`,
    `  Faculty: ${analytics.usersByRole.faculty}`,
    `  Student: ${analytics.usersByRole.student}`,
    `\nUSERS BY STATUS:`,
    `  Active: ${analytics.usersByStatus.active}`,
    `  Disabled: ${analytics.usersByStatus.disabled}`,
    `\nRESOURCES BY STATUS:`,
    `  Live: ${analytics.resourcesByStatus.live}`,
    `  Draft: ${analytics.resourcesByStatus.draft}`,
    `  Archived: ${analytics.resourcesByStatus.archived}`,
  ]

  return generatePDFText('Analytics Report', lines)
}

export async function POST(request) {
  try {
    assertSameOrigin(request)
    const session = await requireApiSession(request, ['admin'])

    if (!isSuperAdmin(session)) {
      throw new ApiError(403, 'Export functionality is restricted to super admin only.')
    }

    const body = await request.json().catch(() => ({}))
    const { type, format } = body

    // Validation
    if (!type || !['users', 'logs', 'analytics'].includes(type)) {
      throw new ApiError(400, 'Invalid export type. Must be "users", "logs", or "analytics".')
    }

    if (!format || !['csv', 'pdf'].includes(format)) {
      throw new ApiError(400, 'Invalid export format. Must be "csv" or "pdf".')
    }

    let content = ''
    let filename = `export-${type}-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'txt' : 'csv'}`
    const mimeType = format === 'csv' ? 'text/csv' : 'text/plain'

    // Generate export based on type and format
    if (type === 'users') {
      content = format === 'csv' ? await exportUsersCSV() : await exportUsersPDF()
      filename = `users-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'txt' : 'csv'}`
    } else if (type === 'logs') {
      content = format === 'csv' ? await exportAuditLogsCSV() : await exportAuditLogsPDF()
      filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'txt' : 'csv'}`
    } else if (type === 'analytics') {
      content = format === 'csv' ? await exportAnalyticsCSV() : await exportAnalyticsPDF()
      filename = `analytics-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'txt' : 'csv'}`
    }

    await logAction({
      user: session,
      action: 'EXPORT_REPORT',
      description: `Exported ${type} report in ${format.toUpperCase()} format.`,
      module: 'Reports',
      status: 'SUCCESS',
      request,
      metadata: {
        type,
        format,
      },
    })

    await logActivity({
      userId: session.uid,
      userName: session.displayName || session.name,
      userEmail: session.email,
      role: session.role,
      action: 'DOWNLOAD_RESOURCE',
      description: `Exported ${type} report (${format.toUpperCase()})`,
      metadata: {
        exportType: type,
        exportFormat: format,
      },
    })

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': `${mimeType}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return jsonError(error, 'Could not generate export report.')
  }
}
