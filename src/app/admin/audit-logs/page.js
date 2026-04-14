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
import { LogCard, StandardCard } from '@/components/layout/StandardCards'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { PaginationControls } from '@/components/ui/layout'
import { AlertCircle, Calendar, ShieldCheck, FilterX } from 'lucide-react'

const INITIAL_FILTERS = { search: '', action: '', status: '', fromDate: '', toDate: '' }

export default function AdminAuditLogsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
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
    if (!isSuperAdmin(user)) {
      router.replace('/login?reason=unauthorized')
    }
  }, [authLoading, user, router])

  const load = useCallback(async (page = 1, nextFilters = INITIAL_FILTERS) => {
    if (!user || !isSuperAdmin(user)) return
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
  }, [user])

  useEffect(() => {
    if (authLoading) return
    load(1, INITIAL_FILTERS)
  }, [authLoading, load])

  const handleApplyFilters = () => load(1, filters)
  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS)
    load(1, INITIAL_FILTERS)
  }

  const filterConfig = [
    {
      id: 'search',
      type: 'search',
      label: 'Search Logs',
      placeholder: 'User, event, or module...',
      value: filters.search,
    },
    {
      id: 'action',
      type: 'search',
      label: 'Module / Action',
      placeholder: 'AUTH, USERS, SECURITY...',
      value: filters.action,
    },
    {
      id: 'status',
      type: 'select',
      label: 'Status',
      value: filters.status || 'all',
      options: [
        { label: 'All Statuses', value: 'all' },
        { label: 'Success', value: 'success' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' },
      ],
    },
  ]

  const handleFilterChange = (id, value) => {
    if (id === 'search') setFilters((prev) => ({ ...prev, search: value }))
    if (id === 'action') setFilters((prev) => ({ ...prev, action: value }))
    if (id === 'status') setFilters((prev) => ({ ...prev, status: value === 'all' ? '' : value }))
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <StandardCard className="overflow-hidden bg-gradient-to-br from-primary/10 via-card/80 to-secondary/10 p-0">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-8">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Compliance stream
            </p>
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
              Inspect admin and platform events with clearer audit visibility.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              The logs interface now follows the same card/filter architecture used across the admin redesign.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[280px]">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Events</p>
              <p className="mt-2 text-2xl font-semibold">{pagination.total}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Page</p>
              <p className="mt-2 text-2xl font-semibold">{pagination.page}/{pagination.pages}</p>
            </div>
          </div>
        </div>
      </StandardCard>

      <ContentSection
        title="Audit Logs"
        subtitle="Filter by actor, module, status, and date range for investigation"
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
          <ResponsiveFilterBar
            filters={filterConfig}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={14} />
              <input
                type="date"
                className="h-11 w-full rounded-xl border border-border/60 bg-background/80 pl-10 pr-4 text-xs font-medium transition-all focus:ring-2 focus:ring-primary/10"
                value={filters.fromDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
                aria-label="From date"
              />
            </div>
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={14} />
              <input
                type="date"
                className="h-11 w-full rounded-xl border border-border/60 bg-background/80 pl-10 pr-4 text-xs font-medium transition-all focus:ring-2 focus:ring-primary/10"
                value={filters.toDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
                aria-label="To date"
              />
            </div>
            <button
              onClick={handleApplyFilters}
              className="h-11 rounded-xl bg-primary px-5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:opacity-90"
            >
              Apply
            </button>
          </div>

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
