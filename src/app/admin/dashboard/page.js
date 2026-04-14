'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ShieldCheck, Users, BookOpen, Inbox, BarChart3, Shield, Lock, ShieldAlert, FileBarChart2, Radar, Activity, HardDrive } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin, getAdminNavAllowedScopes } from '@/lib/admin-protection'
import { ADMIN_NAV_SECTIONS } from '@/components/admin/adminNav'
import { PageContainer, ContentSection, GridContainer } from '@/components/layout'
import { StandardCard } from '@/components/layout/StandardCards'

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const superAdmin = isSuperAdmin(user)

  const quickLinks = useMemo(() => {
    return ADMIN_NAV_SECTIONS.flatMap((section) => section.items)
      .filter((item) => {
        const allowedScopes = item.allowedScopes || getAdminNavAllowedScopes(item.id)
        return superAdmin ? true : allowedScopes.includes('admin')
      })
      .slice(0, 8)
  }, [superAdmin])

  const iconById = {
    'user-management': Users,
    resources: BookOpen,
    'resource-requests': Inbox,
    analytics: BarChart3,
    moderation: Shield,
    'security-settings': Shield,
    'advanced-security': Lock,
    'ip-management': ShieldAlert,
    'audit-logs': FileBarChart2,
    'suspicious-activity': Radar,
    'activity-timeline': Activity,
    'export-reports': FileBarChart2,
    'backup-system': HardDrive,
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageContainer>
        <div className="space-y-6">
          <StandardCard className="overflow-hidden bg-gradient-to-br from-primary/10 via-card/80 to-secondary/10 p-0">
            <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-8">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Admin console
                </p>
                <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
                  Centralized oversight for users, resources, security, and system activity.
                </h2>
                <p className="text-sm text-muted-foreground">
                  The admin workspace is now organized as a cleaner operations surface with role-aware navigation
                  and faster entry points into each control area.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  <ShieldCheck size={14} />
                  {superAdmin ? 'Super Admin enabled' : 'Admin enabled'}
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-600">
                  {quickLinks.length} visible sections
                </div>
              </div>
            </div>
          </StandardCard>

          <ContentSection
            title="Quick Actions"
            subtitle="Jump into the admin modules you are allowed to manage."
            noPaddingBottom
          />

          <GridContainer columns={3}>
            {quickLinks.map((item) => {
              const Icon = iconById[item.id] || Shield

              return (
                <Link key={item.id} href={item.href} className="group">
                  <StandardCard className="h-full p-5">
                    <div className="space-y-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                        <Icon size={22} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Open this module in the shared admin workspace.
                        </p>
                      </div>
                    </div>
                  </StandardCard>
                </Link>
              )
            })}
          </GridContainer>
        </div>
      </PageContainer>
    </div>
  )
}
