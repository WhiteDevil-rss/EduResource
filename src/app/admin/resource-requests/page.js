'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/useAuth'
import { isAdminUser } from '@/lib/admin-protection'
import {
  PageContainer,
  ContentSection,
  GridContainer,
  ResponsiveFilterBar,
} from '@/components/layout'
import { StandardCard, StatCard } from '@/components/layout/StandardCards'
import { SkeletonWrapper } from '@/components/admin/SkeletonWrapper'
import { formatDisplayDate } from '@/lib/demo-content'
import { Inbox, User, Calendar, CheckCircle2, Clock, Truck, RefreshCw, FileSearch } from 'lucide-react'

function requestStatusConfig(status) {
  if (status === 'underreview') return { label: 'In Review', color: 'text-amber-600', bgColor: 'bg-amber-500/5', borderColor: 'border-amber-500/10', icon: FileSearch }
  if (status === 'done') return { label: 'Completed', color: 'text-emerald-600', bgColor: 'bg-emerald-500/5', borderColor: 'border-emerald-500/10', icon: CheckCircle2 }
  return { label: 'Pending', color: 'text-primary', bgColor: 'bg-primary/5', borderColor: 'border-primary/10', icon: Clock }
}

export default function ResourceRequestsPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!isAdminUser(user)) {
      router.replace('/login?reason=unauthorized')
    }
  }, [authLoading, user, role, router])

  const load = useCallback(async () => {
    if (!user || !isAdminUser(user)) return
    try {
      setLoading(true)
      const response = await fetch('/api/admin/resource-requests', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to sync requests.')
      setRequests(Array.isArray(payload?.requests) ? payload.requests : [])
    } catch (error) {
      toast.error(error.message || 'Failed to sync requests.')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [user, role])

  useEffect(() => {
    if (authLoading) return
    load()
  }, [authLoading, load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return requests.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false
      if (!term) return true
      return [entry.titleName, entry.studentName, entry.studentEmail, entry.courseName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [requests, search, statusFilter])

  const changeStatus = async (entry, status) => {
    try {
      setProcessingId(entry.id)
      const response = await fetch(`/api/admin/resource-requests/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to update request.')

      setRequests((current) => current.map((item) => (item.id === entry.id ? payload.request : item)))
      toast.success(`Request marked as ${status}.`)
    } catch (error) {
      toast.error(error.message || 'Update failed.')
    } finally {
      setProcessingId(null)
    }
  }

  const pendingCount = useMemo(() => requests.filter(r => r.status === 'pending' || !r.status).length, [requests])
  const reviewCount = useMemo(() => requests.filter(r => r.status === 'underreview').length, [requests])
  const doneCount = useMemo(() => requests.filter(r => r.status === 'done').length, [requests])

  const filterConfig = useMemo(() => [
    {
      id: 'search',
      type: 'search',
      label: 'Search Requests',
      placeholder: 'Search by title, student, or course...',
      value: search,
    },
    {
      id: 'status',
      type: 'select',
      label: 'Status',
      value: statusFilter,
      options: [
        { label: 'All Statuses', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'In Review', value: 'underreview' },
        { label: 'Completed', value: 'done' },
      ],
    },
  ], [search, statusFilter])

  const handleFilterChange = (id, value) => {
    if (id === 'search') setSearch(value)
    if (id === 'status') setStatusFilter(value)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContentSection
        title="Resource Requests"
        subtitle="Manage and fulfill student requests for academic materials"
        noPaddingBottom
      >
        <ResponsiveFilterBar
          filters={filterConfig}
          onFilterChange={handleFilterChange}
          onReset={() => { setSearch(''); setStatusFilter('all'); }}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
            <Truck size={14} />
            Queue: active
          </div>
        </ResponsiveFilterBar>
      </ContentSection>

      <PageContainer>
        <div className="space-y-8">
          {/* Summary Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Pending"
              value={pendingCount}
              description="Awaiting review"
              icon={Clock}
              color="primary"
            />
            <StatCard
              label="In Review"
              value={reviewCount}
              description="Active processing"
              icon={FileSearch}
              color="warning"
            />
            <StatCard
              label="Completed"
              value={doneCount}
              description="Successfully fulfilled"
              icon={CheckCircle2}
              color="success"
            />
          </div>

          <SkeletonWrapper name="admin-resource-requests-list" loading={loading}>
            {filtered.length === 0 ? (
              <div className="py-32 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center border border-border/40 mx-auto text-muted-foreground/30">
                  <Inbox size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">No requests found</h3>
                  <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                    There are no resource requests matching your current filters.
                  </p>
                </div>
              </div>
            ) : (
              <GridContainer columns={2}>
                {filtered.map((entry) => {
                  const config = requestStatusConfig(entry.status)
                  const StatusIcon = config.icon
                  const isProcessing = processingId === entry.id

                  return (
                    <StandardCard key={entry.id} className="p-0 overflow-hidden border-border/40 hover:border-primary/20 transition-all group hover:shadow-lg hover:shadow-primary/5">
                      <div className="flex flex-col h-full">
                        {/* Status Label & Code */}
                        <div className="p-4 border-b border-border/10 bg-muted/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-background border border-border/40 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary transition-colors">
                              <Truck size={14} />
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">REQ-{entry.id?.slice(-8).toUpperCase()}</span>
                          </div>
                          <div className={cn("px-2.5 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1.5 border transition-colors", config.bgColor, config.borderColor, config.color)}>
                            <StatusIcon size={12} />
                            {config.label}
                          </div>
                        </div>

                        {/* Request Core Content */}
                        <div className="p-5 space-y-5 flex-grow">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                              {entry.titleName || 'Untitled Resource'}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User size={12} className="text-primary/60" />
                              {entry.studentName || entry.studentEmail || 'Anonymous'}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-muted/10 border border-border/5 space-y-1">
                              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-tight">Course</p>
                              <p className="text-xs font-medium text-foreground truncate">{entry.courseName || 'N/A'}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/10 border border-border/5 space-y-1">
                              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-tight">Format</p>
                              <p className="text-xs font-medium text-foreground truncate">{entry.preferredFormat || 'Any'}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border/10">
                            <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground/60">
                              <Calendar size={12} />
                              Received: {formatDisplayDate(entry.createdAt, 'N/A')}
                            </div>
                          </div>
                        </div>

                        {/* Decisioning Surface */}
                        <div className="p-5 border-t border-border/10 bg-muted/5 space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-muted-foreground/60 ml-1 block uppercase tracking-tight">
                              Update Status
                            </label>
                            <div className="relative">
                              <RefreshCw size={12} className={cn("absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 transition-all", isProcessing && "animate-spin text-primary")} />
                              <select
                                className="w-full h-10 px-4 pr-10 rounded-lg border border-border/40 bg-background text-xs font-medium outline-none transition-all focus:ring-2 focus:ring-primary/10 appearance-none disabled:opacity-50"
                                value={entry.status || 'pending'}
                                onChange={(e) => changeStatus(entry, e.target.value)}
                                disabled={isProcessing}
                              >
                                <option value="pending">Pending</option>
                                <option value="underreview">In Review</option>
                                <option value="done">Completed</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </StandardCard>
                  )
                })}
              </GridContainer>
            )}
          </SkeletonWrapper>
        </div>
      </PageContainer>
    </div>
  )
}
