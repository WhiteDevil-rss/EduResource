'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Download, HardDrive, Clock, FileText, Database, ShieldCheck, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react'
import { StandardCard, StatCard } from '@/components/layout/StandardCards'

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
        body: JSON.stringify({ type: exportType, format: exportFormat }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || 'Export service failure')
      }

      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename="')[1]?.split('"')[0]
        : `platform-report-${exportType}-${new Date().getTime()}.${exportFormat === 'pdf' ? 'txt' : 'csv'}`

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Data exported: ${exportType}`)
    } catch (error) {
      toast.error(error.message || 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardCard title="Data Export" icon={Download} className="h-full border-border/40">
      <div className="space-y-6 py-4">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-primary" />
              <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground">Category</label>
            </div>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border border-border/40 bg-background text-xs font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            >
              <option value="users">Users</option>
              <option value="logs">Audit Logs</option>
              <option value="analytics">Analytics Data</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-primary" />
              <label className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground">Export Format</label>
            </div>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border border-border/40 bg-background text-xs font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            >
              <option value="csv">CSV Spreadsheet</option>
              <option value="pdf">PDF Document</option>
            </select>
          </div>
        </div>

        <div className="pt-6 border-t border-border/10">
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full h-11 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider hover:opacity-90 shadow-md shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download size={14} />
                Generate report
                <ArrowUpRight size={14} className="opacity-40" />
              </>
            )}
          </button>
        </div>
      </div>
    </StandardCard>
  )
}

export function BackupSystemSection() {
  const [loading, setLoading] = useState(false)
  const [lastBackup, setLastBackup] = useState(null)
  const [loadingInfo, setLoadingInfo] = useState(true)

  const loadBackupInfo = useCallback(async () => {
    try {
      setLoadingInfo(true)
      const response = await fetch('/api/admin/backup', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setLastBackup(data)
      }
    } catch (error) {
      console.error('Backup sync error:', error)
    } finally {
      setLoadingInfo(false)
    }
  }, [])

  useEffect(() => {
    loadBackupInfo()
  }, [loadBackupInfo])

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
        throw new Error(payload?.error || 'Backup failure')
      }

      const data = await response.json()
      setLastBackup({
        lastBackupTimestamp: data.timestamp,
        lastBackupDate: new Date(data.timestamp).toLocaleString(),
      })

      toast.success(`Backup created for ${data.userCount} users`)
    } catch (error) {
      toast.error(error.message || 'Backup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Backup Status"
          value={lastBackup ? "Healthy" : "None"}
          description={lastBackup ? "System data is protected" : "No recent backups found"}
          icon={ShieldCheck}
          color={lastBackup ? "success" : "warning"}
        />
        <StatCard
          label="Last Verified"
          value={lastBackup ? new Date(lastBackup.lastBackupTimestamp).toLocaleDateString() : "Never"}
          description="Last successful data snapshot"
          icon={Clock}
          color="primary"
        />
      </div>

      <StandardCard title="Data Redundancy" icon={HardDrive} className="border-border/40">
        <div className="space-y-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-xl border border-border/40 bg-muted/5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Manual Backup</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Create a point-in-time snapshot of the system database and user data to ensure platform availability.
              </p>
            </div>

            <button
              onClick={handleBackup}
              disabled={loading}
              className="h-11 px-8 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider hover:opacity-90 shadow-md shadow-primary/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <HardDrive size={14} />
                  Create Backup
                </>
              )}
            </button>
          </div>

          {!loadingInfo && lastBackup?.lastBackupTimestamp && (
            <div className="group p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4 transition-all hover:bg-emerald-500/10">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                <ShieldCheck size={18} />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-tight text-emerald-600">Success</p>
                <p className="text-xs font-medium text-foreground">Last backup completed: {lastBackup.lastBackupDate}</p>
              </div>
              <button
                onClick={loadBackupInfo}
                className="w-8 h-8 rounded-lg border border-emerald-500/10 flex items-center justify-center text-emerald-500/40 group-hover:text-emerald-600 transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          {!loadingInfo && !lastBackup?.lastBackupTimestamp && (
            <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-600">
                <AlertCircle size={18} />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-tight text-orange-600">No Backup Found</p>
                <p className="text-xs font-medium text-foreground leading-relaxed">System data is at risk. Please create a baseline backup immediately.</p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-border/10">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/40">
            <ShieldCheck size={12} className="text-primary/40" />
            Automatic data protection active
          </div>
        </div>
      </StandardCard>
    </div>
  )
}
