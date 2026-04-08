'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { isAbortError, useCancelableFetch } from '@/hooks/useCancelableFetch'
import { Download, RefreshCcw, Search, Fingerprint, MapPin, Monitor, Clock, ShieldCheck, ArrowUpRight, Activity, ShieldAlert, Cpu } from 'lucide-react'
import { StandardCard, StatCard } from '@/components/layout/StandardCards'
import { cn } from '@/lib/cn'

function formatTime(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function SuspiciousActivityPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [activities, setActivities] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 })
  const [filters, setFilters] = useState({
    search: '',
    severity: '',
    user: '',
    from: '',
    to: '',
  })
  const { execute, cancel } = useCancelableFetch()
  const debouncedSearch = useDebouncedSearch(filters.search, 400)
  const debouncedUser = useDebouncedSearch(filters.user, 400)

  const loadActivities = useCallback(async (nextPage = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(pagination.limit),
      })

      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (debouncedUser.trim()) params.set('user', debouncedUser.trim())
      if (filters.severity) params.set('severity', filters.severity)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)

      const response = await execute(`/api/admin/suspicious-activities?${params.toString()}`, {
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not load suspicious activity logs.')

      setActivities(Array.isArray(payload?.activities) ? payload.activities : [])
      setPagination(payload?.pagination || { page: 1, limit: 20, total: 0, pages: 1 })
    } catch (error) {
      if (isAbortError(error)) return
      toast.error(error.message || 'HEURISTIC_SYNC_FAILURE')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, debouncedUser, execute, filters.from, filters.severity, filters.to, pagination.limit])

  useEffect(() => {
    loadActivities(1)
    return () => cancel()
  }, [cancel, loadActivities])

  const markReviewed = async (activityId) => {
    if (!activityId || saving) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/suspicious-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Audit update failed.')

      setActivities((current) =>
        current.map((entry) =>
          entry.id === activityId
            ? { ...entry, reviewed: true, reviewedAt: new Date().toISOString() }
            : entry
        )
      )
      toast.success('Event audited.')
    } catch (error) {
      toast.error(error.message || 'Audit failed.')
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = async () => {
    if (exportingCsv) return
    setExportingCsv(true)
    try {
      const params = new URLSearchParams({ format: 'csv' })
      if (filters.search.trim()) params.set('search', filters.search.trim())
      if (filters.user.trim()) params.set('user', filters.user.trim())
      if (filters.severity) params.set('severity', filters.severity)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)

      const response = await fetch(`/api/admin/suspicious-activities?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Export service unavailable.')

      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename="')[1]?.split('"')[0]
        : `telemetry-export-${new Date().getTime()}.csv`

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(anchor)
      toast.success('Telemetry export complete.')
    } catch (error) {
      toast.error(error.message || 'Export failure.')
    } finally {
      setExportingCsv(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Events"
          value={activities.length}
          description="Monitored in last 24h"
          icon={Activity}
          color="primary"
        />
        <StatCard
          label="High Risk"
          value={activities.filter(a => a.severity === 'high').length}
          description="Critical anomalies detected"
          icon={ShieldAlert}
          color="destructive"
        />
        <StatCard
          label="Risk Level"
          value={activities.filter(a => a.severity === 'high').length > 5 ? "Critical" : "Stable"}
          description="Calculated threat vector"
          icon={Cpu}
          color={activities.filter(a => a.severity === 'high').length > 5 ? "destructive" : "success"}
        />
      </div>

      <StandardCard className="p-0 overflow-hidden border-border/40 bg-background/50 backdrop-blur-md">
        <div className="p-6 border-b border-border/40 bg-muted/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-4 flex-1 min-w-[300px]">
            <div className="relative group flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={14} />
              <input
                className="w-full h-10 pl-11 pr-4 rounded-xl border border-border/40 bg-background font-medium text-xs focus:ring-2 focus:ring-primary/20 transition-all"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Filter by event, IP, or user..."
              />
            </div>
            <select
              className="h-10 px-4 rounded-xl border border-border/40 bg-background font-medium text-xs focus:ring-2 focus:ring-primary/20 transition-all"
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
            >
              <option value="">Severity: All</option>
              <option value="high">Critical Only</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={exportingCsv}
              className="h-10 px-4 rounded-xl border border-border/40 hover:bg-muted/10 font-semibold text-xs flex items-center gap-2 transition-all"
            >
              <Download size={14} />
              {exportingCsv ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => loadActivities(1)}
              className="w-10 h-10 rounded-xl border border-border/40 hover:bg-muted/10 flex items-center justify-center transition-all"
            >
              <RefreshCcw size={16} className={cn(loading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="p-2 min-h-[400px]">
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-xs font-medium text-muted-foreground/60">Analyzing security logs...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-20 text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-muted/20 flex items-center justify-center border border-border/40 mx-auto text-muted-foreground/40">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Security Events</h3>
                <p className="text-[10px] font-medium text-muted-foreground">No anomalous behavior detected within current telemetry window.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              {activities.map((entry) => {
                const isHigh = String(entry?.severity || '').toUpperCase() === 'HIGH'
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "group relative p-4 rounded-xl border border-border/40 transition-all flex flex-col md:flex-row gap-4 md:items-center justify-between",
                      isHigh ? "bg-destructive/5 hover:bg-destructive/10 border-destructive/20" : "bg-muted/5 hover:bg-muted/10 hover:border-primary/20",
                      entry.reviewed && "opacity-60 saturate-0"
                    )}
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-full",
                          isHigh ? "bg-destructive text-white" : "bg-primary/10 text-primary"
                        )}>
                          {entry.severity}
                        </span>
                        <span className="text-xs font-semibold truncate max-w-[200px]">
                          {entry.userName || entry.userEmail || 'Anonymous'}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground/40 flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{entry.action}</p>
                        <p className="text-[10px] font-medium text-muted-foreground/70 line-clamp-1">{entry.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 pt-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-medium text-muted-foreground/60 tracking-tight">
                          <Fingerprint size={12} className="text-primary/50" />
                          {entry.ipAddress || '0.0.0.0'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-medium text-muted-foreground/60 tracking-tight">
                          <MapPin size={12} className="text-primary/50" />
                          {entry?.location?.city || 'Unknown'}, {entry?.location?.country || 'NA'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-medium text-muted-foreground/60 tracking-tight truncate max-w-[200px]">
                          <Monitor size={12} className="text-primary/50" />
                          {entry?.device?.browser || 'Unidentified'} / {entry?.device?.os || 'UA'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      {entry.reviewed ? (
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                          <ShieldCheck size={12} />
                          Audited
                        </div>
                      ) : (
                        <button
                          onClick={() => markReviewed(entry.id)}
                          disabled={saving}
                          className={cn(
                            "h-9 px-4 rounded-xl font-semibold text-[10px] transition-all flex items-center gap-2",
                            isHigh ? "bg-destructive text-white hover:bg-destructive/80" : "bg-primary text-white hover:bg-primary-strong shadow-lg shadow-primary/20"
                          )}
                        >
                          {saving ? 'Processing...' : 'Audit Event'}
                          <ArrowUpRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/40 flex items-center justify-between">
          <div className="text-[11px] font-medium text-muted-foreground">
            Page {pagination.page} / {pagination.pages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadActivities(Math.max(1, pagination.page - 1))}
              disabled={loading || pagination.page <= 1}
              className="h-9 px-4 rounded-xl border border-border/40 font-semibold text-[10px] hover:bg-muted/10 transition-all disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => loadActivities(Math.min(pagination.pages, pagination.page + 1))}
              disabled={loading || pagination.page >= pagination.pages}
              className="h-9 px-4 rounded-xl border border-border/40 font-semibold text-[10px] hover:bg-muted/10 transition-all disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </StandardCard>
    </div>
  )
}
