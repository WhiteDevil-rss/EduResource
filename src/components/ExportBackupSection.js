'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, HardDrive, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ExportReportsSection() {
  const [loading, setLoading] = useState(false)
  const [exportType, setExportType] = useState('users')
  const [exportFormat, setExportFormat] = useState('csv')

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exportType,
          format: exportFormat,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Export failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename="')[1]?.split('"')[0]
        : `export-${exportType}.${exportFormat === 'pdf' ? 'txt' : 'csv'}`

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Exported ${exportType} as ${exportFormat.toUpperCase()}`)
    } catch (error) {
      toast.error(error.message || 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download size={20} />
          Export Reports
        </CardTitle>
        <CardDescription>Download users, logs, or analytics in CSV or PDF format</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="admin-tool-grid">
          <div className="admin-tool-field">
            <label className="admin-tool-label">Export Type</label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="admin-tool-select"
            >
              <option value="users">Users</option>
              <option value="logs">Audit Logs</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>

          <div className="admin-tool-field">
            <label className="admin-tool-label">Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="admin-tool-select"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF (Text)</option>
            </select>
          </div>
        </div>

        <Button type="button" onClick={handleExport} disabled={loading} className="button-block">
          {loading ? 'Exporting...' : 'Export Report'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function BackupSystemSection() {
  const [loading, setLoading] = useState(false)
  const [lastBackup, setLastBackup] = useState(null)
  const [loadingInfo, setLoadingInfo] = useState(true)

  // Load backup info on mount
  useEffect(() => {
    loadBackupInfo()
  }, [])

  const loadBackupInfo = async () => {
    setLoadingInfo(true)
    try {
      const response = await fetch('/api/admin/backup', {
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
        setLastBackup(data)
      }
    } catch (error) {
      console.error('Error loading backup info:', error)
    } finally {
      setLoadingInfo(false)
    }
  }

  const handleBackup = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Backup failed')
      }

      const data = await response.json()
      setLastBackup({
        lastBackupTimestamp: data.timestamp,
        lastBackupDate: new Date(data.timestamp).toLocaleString(),
      })

      toast.success(`Backup completed (Users: ${data.userCount}, Resources: ${data.resourceCount})`)
    } catch (error) {
      toast.error(error.message || 'Backup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive size={20} />
          Backup System
        </CardTitle>
        <CardDescription>Backup users and resources data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="admin-tool-stack">
          <Button type="button" onClick={handleBackup} disabled={loading} className="button-block">
            {loading ? 'Running Backup...' : 'Run Backup Now'}
          </Button>

          {!loadingInfo && lastBackup?.lastBackupTimestamp && (
            <div className="admin-tool-notice admin-tool-notice--success">
              <Clock size={18} />
              <div className="admin-tool-notice__content">
                <p>Last Backup: {lastBackup.lastBackupDate}</p>
              </div>
            </div>
          )}

          {!loadingInfo && !lastBackup?.lastBackupTimestamp && (
            <div className="admin-tool-notice admin-tool-notice--muted">
              No backup yet. Click "Run Backup Now" to create the first backup.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
