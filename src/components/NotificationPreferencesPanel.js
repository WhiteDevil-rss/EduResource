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
      <Card className="border border-border/40 bg-card rounded-xl">
        <CardContent className="p-6 text-center text-xs text-muted-foreground animate-pulse">
          Loading preferences...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border/40 bg-card rounded-xl shadow-sm">
      <CardHeader className="p-5 border-b border-border/10">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell size={16} className="text-primary" />
          Notification Settings
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">Configure how you receive updates and alerts.</CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Alerts</p>
              <p className="text-xs text-muted-foreground">Receive in-app policy notifications</p>
            </div>
            <Button 
              type="button" 
              variant={preferences.alertsEnabled ? 'default' : 'outline'} 
              size="sm"
              disabled={saving} 
              onClick={() => updatePreferences({ alertsEnabled: !preferences.alertsEnabled })}
              className="h-8 rounded-lg text-[11px] font-semibold"
            >
              {preferences.alertsEnabled ? 'Active' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Frequency</p>
              <p className="text-xs text-muted-foreground">How often to receive digests</p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              disabled={saving} 
              onClick={() => updatePreferences({ frequency: preferences.frequency === 'weekly' ? 'daily' : 'weekly' })}
              className="h-8 rounded-lg text-[11px] font-semibold border-border/40"
            >
              {preferences.frequency === 'weekly' ? 'Weekly' : 'Daily'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Channel</p>
              <p className="text-xs text-muted-foreground">Primary delivery method</p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              disabled={saving} 
              onClick={() => updatePreferences({ channel: preferences.channel === 'in-app' ? 'both' : 'in-app' })}
              className="h-8 rounded-lg text-[11px] font-semibold border-border/40"
            >
              {preferences.channel === 'in-app' ? 'In-app' : 'Combined'}
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-border/10">
          <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground/60 mb-3">Subscribed Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {(preferences.categories || []).map((category) => (
              <Badge key={category} variant="secondary" className="text-[10px] font-medium border-border/20 px-2 py-0.5 capitalize">{category}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
