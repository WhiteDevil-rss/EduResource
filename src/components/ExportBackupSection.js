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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Export Type
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            >
              <option value="users">Users</option>
              <option value="logs">Audit Logs</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF (Text)</option>
            </select>
          </div>
        </div>

        <Button type="button" onClick={handleExport} disabled={loading} style={{ width: '100%' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Button type="button" onClick={handleBackup} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Running Backup...' : 'Run Backup Now'}
          </Button>

          {!loadingInfo && lastBackup?.lastBackupTimestamp && (
            <div
              style={{
                padding: '1rem',
                borderRadius: '0.375rem',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Clock size={18} style={{ color: '#22c55e' }} />
              <div style={{ fontSize: '0.875rem' }}>
                <p style={{ fontWeight: '600', color: '#22c55e' }}>
                  Last Backup: {lastBackup.lastBackupDate}
                </p>
              </div>
            </div>
          )}

          {!loadingInfo && !lastBackup?.lastBackupTimestamp && (
            <div
              style={{
                padding: '1rem',
                borderRadius: '0.375rem',
                backgroundColor: 'rgba(107, 114, 128, 0.1)',
                border: '1px solid rgba(107, 114, 128, 0.3)',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              No backup yet. Click "Run Backup Now" to create the first backup.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
