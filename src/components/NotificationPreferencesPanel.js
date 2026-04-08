'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const DEFAULT_PREFERENCES = {
  alertsEnabled: true,
  frequency: 'weekly',
  channel: 'in-app',
  categories: ['resources', 'reviews', 'collections'],
}

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new globalThis.AbortController()
    let isActive = true

    const loadPreferences = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/notification-preferences', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load preferences.')
        }
        if (isActive) {
          setPreferences(payload?.preferences || DEFAULT_PREFERENCES)
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        if (isActive) {
          setPreferences(DEFAULT_PREFERENCES)
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadPreferences()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  const updatePreferences = async (patch) => {
    const previous = preferences
    const next = { ...preferences, ...patch }
    setPreferences(next)
    setSaving(true)
    try {
      const response = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update preferences.')
      }
      setPreferences(payload?.preferences || next)
    } catch {
      setPreferences(previous)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>Loading notification preferences...</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Delivery and alert routing</CardDescription>
        <CardTitle className="flex items-center gap-2">
          <Bell size={18} />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={preferences.alertsEnabled ? 'default' : 'outline'} disabled={saving} onClick={() => updatePreferences({ alertsEnabled: !preferences.alertsEnabled })}>
            {preferences.alertsEnabled ? 'Alerts enabled' : 'Alerts disabled'}
          </Button>
          <Button type="button" variant={preferences.frequency === 'weekly' ? 'default' : 'outline'} disabled={saving} onClick={() => updatePreferences({ frequency: preferences.frequency === 'weekly' ? 'daily' : 'weekly' })}>
            {preferences.frequency === 'weekly' ? 'Weekly' : 'Daily'}
          </Button>
          <Button type="button" variant={preferences.channel === 'in-app' ? 'default' : 'outline'} disabled={saving} onClick={() => updatePreferences({ channel: preferences.channel === 'in-app' ? 'both' : 'in-app' })}>
            {preferences.channel === 'in-app' ? 'In-app' : 'Email + in-app'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(preferences.categories || []).map((category) => (
            <Badge key={category} variant="outline">{category}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
