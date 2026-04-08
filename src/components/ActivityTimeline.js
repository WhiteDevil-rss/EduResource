'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  Calendar,
  Download,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  Upload,
  Users,
  ShieldCheck,
  History
} from 'lucide-react'
import {
  PageContainer,
  ContentSection,
  ResponsiveFilterBar,
} from '@/components/layout'
import { LogCard } from '@/components/layout/StandardCards'

function getActionConfig(action) {
  const configs = {
    LOGIN: { label: 'Session Started', variant: 'success', icon: LogIn },
    LOGOUT: { label: 'Session Ended', variant: 'default', icon: LogOut },
    DOWNLOAD_RESOURCE: { label: 'Resource Downloaded', variant: 'info', icon: Download },
    UPLOAD_RESOURCE: { label: 'Resource Uploaded', variant: 'success', icon: Upload },
    CREATE_USER: { label: 'User Created', variant: 'success', icon: Plus },
    UPDATE_USER: { label: 'User Updated', variant: 'warning', icon: Users },
    DELETE_USER: { label: 'User Deleted', variant: 'error', icon: Trash2 },
    DELETE_RESOURCE: { label: 'Resource Deleted', variant: 'error', icon: Trash2 },
  }

  return configs[action] || { label: action, variant: 'default', icon: AlertCircle }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown Time'
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

function groupActivitiesByDate(activities) {
  const groups = {}
  activities.forEach((activity) => {
    const date = activity.timestamp instanceof Date ? activity.timestamp : new Date(activity.timestamp)
    const dateKey = date.toISOString().split('T')[0]
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(activity)
  })

  return Object.entries(groups)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .map(([dateKey, items]) => ({
      date: dateKey,
      displayDate: new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      activities: items,
    }))
}

const ACTION_OPTIONS = [
  { label: 'All Operations', value: 'all' },
  { label: 'Sign In Events', value: 'LOGIN' },
  { label: 'Sign Out Events', value: 'LOGOUT' },
  { label: 'Downloads', value: 'DOWNLOAD_RESOURCE' },
  { label: 'Uploads', value: 'UPLOAD_RESOURCE' },
  { label: 'User Provisioning', value: 'CREATE_USER' },
  { label: 'User Updates', value: 'UPDATE_USER' },
  { label: 'User Deletions', value: 'DELETE_USER' },
  { label: 'Resource Cleanup', value: 'DELETE_RESOURCE' },
]

export function ActivityTimeline() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [filteredActivities, setFilteredActivities] = useState([])

  const loadActivities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (searchInput.trim()) params.set('userEmail', searchInput.trim().toLowerCase())
      if (actionFilter !== 'all') params.set('action', actionFilter)

      const response = await fetch(`/api/admin/activity-timeline?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to sync activity logs.')
      setActivities(Array.isArray(payload?.activities) ? payload.activities : [])
    } catch (error) {
      toast.error(error.message || 'Timeline sync failed.')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [searchInput, actionFilter])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  useEffect(() => {
    let filtered = activities
    if (searchInput.trim()) {
      const searchLower = searchInput.trim().toLowerCase()
      filtered = filtered.filter(
        (a) =>
          (a.userEmail?.toLowerCase() || '').includes(searchLower) ||
          (a.userName?.toLowerCase() || '').includes(searchLower)
      )
    }
    if (actionFilter !== 'all') {
      filtered = filtered.filter((a) => a.action === actionFilter)
    }
    setFilteredActivities(filtered)
  }, [activities, searchInput, actionFilter])

  const grouped = groupActivitiesByDate(filteredActivities)

  const filterConfig = useMemo(() => [
    {
      id: 'search',
      type: 'search',
      label: 'Search',
      placeholder: 'Search email or name...',
      value: searchInput,
    },
    {
      id: 'action',
      type: 'select',
      label: 'Action',
      value: actionFilter,
      options: ACTION_OPTIONS,
    },
  ], [searchInput, actionFilter])

  const handleFilterChange = (id, value) => {
    if (id === 'search') setSearchInput(value)
    if (id === 'action') setActionFilter(value)
  }

  const handleReset = () => {
    setSearchInput('')
    setActionFilter('all')
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContentSection
        title="Activity Stream"
        subtitle="Real-time chronological log of system activity and user actions"
        noPaddingBottom
      >
        <ResponsiveFilterBar
          filters={filterConfig}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck size={12} />
            Secure Logging
          </div>
        </ResponsiveFilterBar>
      </ContentSection>

      <PageContainer>
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl border border-border/40 bg-muted/5 animate-pulse" />
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-32 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center border border-border/40 mx-auto text-muted-foreground/30">
              <History size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">No activity found</h3>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                We couldn't find any recorded actions matching your current filters.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 h-9 rounded-lg border border-border/40 text-xs font-medium hover:bg-muted/10 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-16 pb-20">
            {grouped.map((group) => (
              <div key={group.date} className="relative">
                {/* Date Header */}
                <div className="sticky top-20 z-10 py-4 bg-background/80 backdrop-blur-md mb-6 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Calendar size={14} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{group.displayDate}</h3>
                        <p className="text-[10px] font-medium text-muted-foreground/60">{group.activities.length} Recorded Events</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pl-0 md:pl-4 border-l-0 md:border-l border-border/20">
                  {group.activities.map((activity) => {
                    const config = getActionConfig(activity.action)
                    return (
                      <LogCard
                        key={activity.id}
                        user={activity.userName || activity.userEmail || 'System User'}
                        action={config.label}
                        actionVariant={config.variant}
                        timestamp={formatTimestamp(activity.timestamp)}
                        details={activity.description}
                        icon={config.icon}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  )
}
