'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { AlertCircle, Shield, ShieldCheck, Lock, Bell, ShieldAlert, KeyRound, Save, Clock } from 'lucide-react'
import { StandardCard, StatCard } from '@/components/layout/StandardCards'
import { cn } from '@/lib/cn'

const DEFAULTS = {
  enable2FA: false,
  twoFAMethod: 'email',
  maxLoginAttempts: 5,
  lockDurationMinutes: 15,
  enableAlerts: true,
  maintenanceMode: false,
  maintenanceWhitelist: [],
}

export function SecurityAdvancedSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const weakConfigWarning = useMemo(() => {
    if (settings.maxLoginAttempts > 8) {
      return 'High threshold weakens brute-force resistance.'
    }
    if (!settings.enable2FA) {
      return 'Critical: Multi-factor authentication is inactive.'
    }
    return ''
  }, [settings.enable2FA, settings.maxLoginAttempts])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/security-controls', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Registry sync failure.')
      setSettings((current) => ({ ...current, ...(payload?.settings || {}) }))
    } catch (error) {
      toast.error(error.message || 'HEURISTIC_LOAD_ERROR')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/security-controls', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Registry update failed.')

      setSettings((current) => ({ ...current, ...(payload?.settings || {}) }))
      toast.success('Security settings updated.')
    } catch (error) {
      toast.error(error.message || 'Failed to update settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto" />
        <p className="text-xs font-medium text-muted-foreground/60">Loading security settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Risk Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="2FA Status"
          value={settings.enable2FA ? "Active" : "Disabled"}
          description={settings.enable2FA ? "Global protection enabled" : "Vulnerable to impersonation"}
          icon={ShieldCheck}
          color={settings.enable2FA ? "success" : "destructive"}
        />
        <StatCard
          label="Brute-Force Threshold"
          value={settings.maxLoginAttempts}
          description="Max failed attempts"
          icon={ShieldAlert}
          color={settings.maxLoginAttempts > 8 ? "warning" : "primary"}
        />
        <StatCard
          label="Lockout Buffer"
          value={`${settings.lockDurationMinutes}m`}
          description="Duration of system suspension"
          icon={Clock}
          color="primary"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Settings Form */}
        <div className="lg:col-span-8 space-y-6">
          <StandardCard title="Authentication Policy" icon={Shield}>
            <div className="space-y-8 py-4">
              {/* 2FA Toggle */}
              <div className="flex items-start justify-between p-4 rounded-2xl border border-border/40 bg-muted/5 hover:bg-muted/10 transition-colors group">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <KeyRound size={20} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Multi-Factor Authentication</h3>
                    <p className="text-xs text-muted-foreground">Enforce secondary verification for all administrative accounts</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, enable2FA: !s.enable2FA }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                    settings.enable2FA ? "bg-emerald-500" : "bg-muted-foreground/20"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    settings.enable2FA ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              {/* Thresholds */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={14} className="text-primary" />
                    <label className="text-xs font-medium text-muted-foreground">Retry Limit</label>
                  </div>
                  <input
                    type="number"
                    className="w-full h-11 px-4 rounded-xl border border-border/40 bg-background font-medium text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => setSettings(s => ({ ...s, maxLoginAttempts: parseInt(e.target.value) }))}
                    min={3}
                    max={15}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-primary" />
                    <label className="text-xs font-medium text-muted-foreground">Lockout Duration (Min)</label>
                  </div>
                  <input
                    type="number"
                    className="w-full h-11 px-4 rounded-xl border border-border/40 bg-background font-medium text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    value={settings.lockDurationMinutes}
                    onChange={(e) => setSettings(s => ({ ...s, lockDurationMinutes: parseInt(e.target.value) }))}
                    min={5}
                    max={1440}
                  />
                </div>
              </div>

              {/* Notification Toggle */}
              <div className="flex items-start justify-between p-4 rounded-2xl border border-border/40 bg-muted/5 hover:bg-muted/10 transition-colors group">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                    <Bell size={20} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Security Notifications</h3>
                    <p className="text-xs text-muted-foreground">Get instant alerts for failed logins and security events</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, enableAlerts: !s.enableAlerts }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none items-center",
                    settings.enableAlerts ? "bg-orange-500" : "bg-muted-foreground/20"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    settings.enableAlerts ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-border/40 flex justify-end gap-3">
              <button
                onClick={load}
                className="h-10 px-5 rounded-lg border border-border/40 hover:bg-muted/10 font-medium text-xs transition-all"
              >
                Reset
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="h-10 px-6 rounded-lg bg-primary text-white font-semibold text-xs hover:bg-primary-strong shadow-lg shadow-primary/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </StandardCard>

          {/* Maintenance Mode Card */}
          <StandardCard title="Infrastructure Control" icon={Hammer}>
            <div className="space-y-8 py-4">
              <div className="flex items-start justify-between p-4 rounded-2xl border border-border/40 bg-muted/5 hover:bg-muted/10 transition-colors group">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-amber-600">Maintenance Mode</h3>
                    <p className="text-xs text-muted-foreground">Suspend public access and only allow authorized personnel</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none items-center",
                    settings.maintenanceMode ? "bg-amber-500" : "bg-muted-foreground/20"
                  )}
                >
                  <span className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    settings.maintenanceMode ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  <label className="text-xs font-medium text-muted-foreground">Bypass Whitelist (One email per line)</label>
                </div>
                <textarea
                  className="w-full min-h-[120px] p-4 rounded-xl border border-border/40 bg-background font-mono text-xs focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
                  placeholder="admin@example.com&#10;developer@zembaa.com"
                  value={settings.maintenanceWhitelist.join('\n')}
                  onChange={(e) => setSettings(s => ({ ...s, maintenanceWhitelist: e.target.value.split('\n') }))}
                />
                <p className="text-[10px] text-muted-foreground italic">Superadmins are automatically whitelisted and do not need to be added here.</p>
              </div>
            </div>

            <div className="pt-6 border-t border-border/40 flex justify-end gap-3">
              <button
                onClick={save}
                disabled={saving}
                className={cn(
                  "h-10 px-6 rounded-lg font-semibold text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50",
                  settings.maintenanceMode ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20" : "bg-primary text-white hover:bg-primary-strong shadow-primary/20"
                )}
              >
                <Save size={14} />
                {saving ? "Updating..." : "Update Infrastructure"}
              </button>
            </div>
          </StandardCard>
        </div>

        {/* Intelligence Side Pane */}
        <div className="lg:col-span-4 space-y-6">
          {weakConfigWarning && (
            <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle size={16} />
                <h4 className="text-xs font-semibold">Security Advice</h4>
              </div>
              <p className="text-xs text-destructive/80 leading-relaxed font-medium">{weakConfigWarning}</p>
            </div>
          )}

          <StandardCard title="Audit Summary" icon={Clock} className="bg-muted/5">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/20">
                <span className="text-xs font-medium text-muted-foreground">Version</span>
                <span className="text-xs font-semibold text-foreground">2.4.0</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/20">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <span className="text-xs font-bold text-emerald-500">Active</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-medium text-muted-foreground">Auth Method</span>
                <span className="text-xs font-semibold text-foreground">{settings.twoFAMethod.toUpperCase()}</span>
              </div>
            </div>
          </StandardCard>

          <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Shield size={16} />
              <h4 className="text-xs font-semibold">Platform Security</h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Security settings are synchronized across the global infrastructure. Changes are logged and audited in the system ledger.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
