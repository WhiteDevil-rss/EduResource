'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/admin-protection'
import {
  PageContainer,
  ContentSection,
  ResponsiveFilterBar,
  GridContainer,
} from '@/components/layout'
import { LogCard } from '@/components/layout/StandardCards'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { PaginationControls } from '@/components/ui/layout'
import { AlertCircle, Terminal, Search, Calendar, ShieldCheck, FilterX } from 'lucide-react'

const INITIAL_FILTERS = { search: '', action: '', status: '', fromDate: '', toDate: '' }

export default function AdminAuditLogsPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (role !== 'admin' || !isSuperAdmin(user)) {
      router.replace('/dashboard/admin')
    }
  }, [authLoading, user, role, router])

  const load = useCallback(async (page = 1, nextFilters = INITIAL_FILTERS) => {
    if (!user || role !== 'admin' || !isSuperAdmin(user)) return
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        search: nextFilters.search,
        action: nextFilters.action,
        status: nextFilters.status,
        fromDate: nextFilters.fromDate,
        toDate: nextFilters.toDate,
      })

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not load audit logs.')

      setLogs(Array.isArray(payload?.logs) ? payload.logs : [])
      setPagination(payload?.pagination || { page: 1, pages: 1, total: 0 })
    } catch (loadError) {
      setError(loadError.message || 'Failed to sync logs.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [user, role])

  useEffect(() => {
    if (authLoading) return
    load(1, INITIAL_FILTERS)
  }, [authLoading, load])

  const handleApplyFilters = () => load(1, filters)
  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS)
    load(1, INITIAL_FILTERS)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContentSection
        title="Audit Logs"
        subtitle="Track platform activity and administrative actions for security and compliance"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
            <ShieldCheck size={14} />
            Integrity: Verified
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <div className="space-y-6">
          <ResponsiveFilterBar onReset={handleResetFilters}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={14} />
                <input
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-border/40 bg-background text-xs font-medium focus:ring-2 focus:ring-primary/10 transition-all"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="User identity or action..."
                />
              </div>
              <div className="relative group">
                <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={14} />
                <input
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-border/40 bg-background text-xs font-medium focus:ring-2 focus:ring-primary/10 transition-all"
                  value={filters.action}
                  onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                  placeholder="Module e.g. AUTH"
                />
              </div>
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={14} />
                <input
                  type="date"
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-border/40 bg-background text-[10px] font-semibold uppercase tracking-wider focus:ring-2 focus:ring-primary/10 transition-all"
                  value={filters.fromDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 h-10 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:opacity-90 transition-all shadow-sm shadow-primary/20"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </ResponsiveFilterBar>

          <SkeletonWrapper name="admin-audit-logs" loading={loading}>
            {error ? (
              <div className="p-12 rounded-2xl border border-dashed border-destructive/20 bg-destructive/5 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-destructive">Synchronization Error</h3>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center border border-border/40 mx-auto text-muted-foreground/30">
                  <FilterX size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">No records found</h3>
                  <p className="text-xs text-muted-foreground max-w-[240px] mx-auto mt-1">
                    No log events match your current filter criteria.
                  </p>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="px-6 h-9 border border-border/40 rounded-lg text-xs font-semibold hover:bg-muted/10 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <GridContainer>
                  {logs.map((log) => (
                    <LogCard
                      key={log.id}
                      log={{
                        ...log,
                        displayName: log.userName || log.userEmail || 'System Agent',
                        action: log.action,
                        description: log.description || log.module || 'System Event',
                        timestamp: log.timestamp || log.createdAt
                      }}
                    />
                  ))}
                </GridContainer>

                <div className="flex justify-center pt-8 border-t border-border/10">
                  <PaginationControls
                    page={pagination.page}
                    pages={pagination.pages}
                    total={pagination.total}
                    loading={loading}
                    onPrevious={() => load(Math.max(1, pagination.page - 1), filters)}
                    onNext={() => load(Math.min(pagination.pages, pagination.page + 1), filters)}
                  />
                </div>
              </div>
            )}
          </SkeletonWrapper>
        </div>
      </PageContainer>
    </div>
  )
}
