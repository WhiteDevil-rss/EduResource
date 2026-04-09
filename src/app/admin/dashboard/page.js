'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ShieldCheck, Users, BookOpen, Inbox, BarChart3, Shield, Lock, ShieldAlert, FileBarChart2, Radar, Activity, HardDrive } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin, getAdminNavAllowedScopes } from '@/lib/admin-protection'
import { ADMIN_NAV_SECTIONS } from '@/components/admin/adminNav'
import { PageContainer, ContentSection, GridContainer } from '@/components/layout'
import { StandardCard } from '@/components/layout/StandardCards'

function dashboardLeadText(isSuperAdminUser) {
  return isSuperAdminUser
    ? 'Full admin access is enabled. Security, monitoring, and system tools are available.'
    : 'Core admin access is enabled. Super admin-only security and system tools are hidden.'
}

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
      <ContentSection
        title="Admin Dashboard"
        subtitle="Shared control center for admin and super admin operations"
        noPaddingBottom
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck size={14} />
            {superAdmin ? 'Super Admin enabled' : 'Admin enabled'}
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {dashboardLeadText(superAdmin)}
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <div className="space-y-6">
          <StandardCard className="border-border/40 bg-card/80 p-6 shadow-lg shadow-black/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                <p className="text-sm text-muted-foreground">
                  Jump into the admin modules you are allowed to manage.
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground">
                {quickLinks.length} visible sections
              </div>
            </div>
          </StandardCard>

          <GridContainer columns={3}>
            {quickLinks.map((item) => {
              const Icon = iconById[item.id] || Shield

              return (
                <Link key={item.id} href={item.href} className="group">
                  <StandardCard className="h-full border-border/40 bg-card/80 p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-primary/5">
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