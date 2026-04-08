'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  Calendar,
  Download,
  LogIn,
  LogOut,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function getActionBadgeConfig(action) {
  const configs = {
    LOGIN: { label: 'Login', color: 'bg-green-500/20 text-green-400', icon: LogIn },
    LOGOUT: { label: 'Logout', color: 'bg-blue-500/20 text-blue-400', icon: LogOut },
    DOWNLOAD_RESOURCE: { label: 'Download', color: 'bg-cyan-500/20 text-cyan-400', icon: Download },
    UPLOAD_RESOURCE: { label: 'Upload', color: 'bg-purple-500/20 text-purple-400', icon: Upload },
    CREATE_USER: { label: 'Create User', color: 'bg-green-500/20 text-green-400', icon: Plus },
    UPDATE_USER: { label: 'Update User', color: 'bg-yellow-500/20 text-yellow-400', icon: Users },
    DELETE_USER: { label: 'Delete User', color: 'bg-red-500/20 text-red-400', icon: Trash2 },
    DELETE_RESOURCE: { label: 'Delete Resource', color: 'bg-red-500/20 text-red-400', icon: Trash2 },
  }

  return configs[action] || { label: action, color: 'bg-gray-500/20 text-gray-400', icon: AlertCircle }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown'

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  if (activityDate.getTime() === today.getTime()) {
    return `Today at ${timeStr}`
  }
  if (activityDate.getTime() === yesterday.getTime()) {
    return `Yesterday at ${timeStr}`
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ` at ${timeStr}`
}

function groupActivitiesByDate(activities) {
  const groups = {}

  activities.forEach((activity) => {
    const date = activity.timestamp instanceof Date ? activity.timestamp : new Date(activity.timestamp)
    const dateKey = date.toISOString().split('T')[0]

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(activity)
  })

  return Object.entries(groups)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .map(([dateKey, items]) => ({
      date: dateKey,
      displayDate: new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
      activities: items,
    }))
}

export function ActivityTimeline() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [filteredActivities, setFilteredActivities] = useState([])

  const loadActivities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })

      if (searchEmail.trim()) {
        params.set('userEmail', searchEmail.trim().toLowerCase())
      }

      if (actionFilter) {
        params.set('action', actionFilter)
      }

      const response = await fetch(`/api/admin/activity-timeline?${params.toString()}`, {
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load activity timeline.')
      }

      setActivities(Array.isArray(payload?.activities) ? payload.activities : [])
    } catch (error) {
      toast.error(error.message || 'Failed to load activity timeline.')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [searchEmail, actionFilter])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  useEffect(() => {
    // Client-side filtering
    let filtered = activities

    if (searchEmail.trim()) {
      const searchLower = searchEmail.trim().toLowerCase()
      filtered = filtered.filter(
        (a) =>
          (a.userEmail?.toLowerCase() || '').includes(searchLower) ||
          (a.userName?.toLowerCase() || '').includes(searchLower)
      )
    }

    if (actionFilter) {
      filtered = filtered.filter((a) => a.action === actionFilter)
    }

    setFilteredActivities(filtered)
  }, [activities, searchEmail, actionFilter])

  const grouped = groupActivitiesByDate(filteredActivities)

  return (
    <div className="activity-timeline">
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Track user activities, logins, resource uploads/downloads, and user management actions.</CardDescription>
        </CardHeader>
        <CardContent className="activity-timeline__filters">
          <div className="activity-timeline__search">
            <Input
              placeholder="Search by email or name"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
          <select
            className="admin-tool-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="DOWNLOAD_RESOURCE">Download</option>
            <option value="UPLOAD_RESOURCE">Upload</option>
            <option value="CREATE_USER">Create User</option>
            <option value="UPDATE_USER">Update User</option>
            <option value="DELETE_USER">Delete User</option>
            <option value="DELETE_RESOURCE">Delete Resource</option>
          </select>
          <Button type="button" variant="outline" onClick={loadActivities} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="activity-timeline__state">
            <p>Loading activities...</p>
          </CardContent>
        </Card>
      ) : filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="activity-timeline__empty">
            <AlertCircle size={32} />
            <p>No activities found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="activity-timeline__scroll custom-scrollbar">
          {grouped.map((group) => (
            <div key={group.date} className="activity-timeline__group">
              <div className="activity-timeline__group-header">
                <Calendar size={16} />
                <h3>{group.displayDate}</h3>
                <span>({group.activities.length})</span>
              </div>

              <div className="activity-timeline__list">
                {group.activities.map((activity) => {
                  const config = getActionBadgeConfig(activity.action)
                  const ActionIcon = config.icon

                  return (
                    <Card key={activity.id} className="activity-timeline__card">
                      <CardContent className="activity-timeline__entry">
                        <div className="activity-timeline__icon">
                          <ActionIcon size={18} />
                        </div>

                        <div className="activity-timeline__body">
                          <div className="activity-timeline__meta">
                            <Badge className={config.color}>{config.label}</Badge>
                            <span className="activity-timeline__timestamp">{formatTimestamp(activity.timestamp)}</span>
                          </div>

                          <p className="activity-timeline__description">{activity.description}</p>

                          {activity.userName && (
                            <div className="activity-timeline__user-row">
                              <span>{activity.userName}</span>
                              <span className="activity-timeline__user">{activity.userEmail}</span>
                              {activity.role && <Badge variant="outline">{activity.role}</Badge>}
                            </div>
                          )}

                          {activity.metadata?.resourceName && (
                            <p className="activity-timeline__detail">
                              Resource: <code className="activity-timeline__code">{activity.metadata.resourceName}</code>
                            </p>
                          )}

                          {activity.metadata?.targetUserEmail && (
                            <p className="activity-timeline__detail">
                              Target: <code className="activity-timeline__code">{activity.metadata.targetUserEmail}</code>
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
