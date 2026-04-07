'use client'

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react'
import { Skeleton } from '@/components/ui/skeleton'

function Box({ width, height, style = {} }) {
  return <Skeleton style={{ width, height, ...style }} />
}

function DashboardShell({ sidebarRows = 4, metricCards = 3, tableRows = 5, footerCards = 2 }) {
  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar glass">
          <div className="dashboard-sidebar__brand">
            <Box width="13rem" height="2.5rem" />
            <Box width="8rem" height="0.9rem" style={{ marginTop: '0.75rem' }} />
          </div>
          <div className="dashboard-nav" style={{ gap: '0.75rem' }}>
            {Array.from({ length: sidebarRows }).map((_, index) => (
              <Box key={index} width="100%" height="3rem" style={{ borderRadius: '1rem' }} />
            ))}
          </div>
          <div className="dashboard-sidebar__footer">
            <Box width="100%" height="3rem" style={{ borderRadius: '1rem' }} />
            <Box width="100%" height="3rem" style={{ borderRadius: '1rem' }} />
            <div className="dashboard-profile" style={{ alignItems: 'center' }}>
              <Box width="3rem" height="3rem" style={{ borderRadius: '999px' }} />
              <div style={{ flex: 1 }}>
                <Box width="10rem" height="0.9rem" style={{ marginBottom: '0.5rem' }} />
                <Box width="7rem" height="0.75rem" />
              </div>
            </div>
          </div>
        </aside>

        <div className="dashboard-content">
          <header className="dashboard-topbar glass">
            <Box width="min(100%, 34rem)" height="3rem" style={{ borderRadius: '1rem' }} />
            <div className="dashboard-topbar__actions">
              <Box width="2.5rem" height="2.5rem" style={{ borderRadius: '999px' }} />
              <Box width="2.5rem" height="2.5rem" style={{ borderRadius: '999px' }} />
              <Box width="2.5rem" height="2.5rem" style={{ borderRadius: '999px' }} />
            </div>
          </header>

          <section className="dashboard-section">
            <Box width="10rem" height="0.9rem" style={{ marginBottom: '0.85rem' }} />
            <Box width="24rem" height="2.5rem" style={{ marginBottom: '0.85rem' }} />
            <Box width="min(100%, 42rem)" height="1rem" style={{ marginBottom: '1.75rem' }} />
            <div className="metric-grid">
              {Array.from({ length: metricCards }).map((_, index) => (
                <div key={index} className="metric-card glass">
                  <Box width="40%" height="0.85rem" style={{ marginBottom: '0.9rem' }} />
                  <Box width="60%" height="2rem" />
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-section">
            <Box width="14rem" height="1.5rem" style={{ marginBottom: '1rem' }} />
            <div className="table-shell glass">
              <div className="table-shell__header">
                <Box width="10rem" height="1rem" />
                <Box width="7rem" height="2.5rem" style={{ borderRadius: '1rem' }} />
              </div>
              <div className="space-y-3 p-6" style={{ display: 'grid', gap: '0.75rem', padding: '1.5rem' }}>
                {Array.from({ length: tableRows }).map((_, index) => (
                  <Box key={index} width="100%" height="3.6rem" style={{ borderRadius: '1rem' }} />
                ))}
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="support-grid">
              {Array.from({ length: footerCards }).map((_, index) => (
                <div key={index} className="support-card glass" style={{ minHeight: '14rem' }}>
                  <Box width="7rem" height="0.85rem" style={{ marginBottom: '1rem' }} />
                  <Box width="100%" height="3rem" style={{ marginBottom: '0.75rem' }} />
                  <Box width="85%" height="0.9rem" style={{ marginBottom: '0.5rem' }} />
                  <Box width="70%" height="0.9rem" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export function AdminDashboardSkeleton() {
  return (
    <BoneyardSkeleton name="admin-dashboard-skeleton" loading fallback={<DashboardShell sidebarRows={5} metricCards={3} tableRows={6} footerCards={2} />}>
      <DashboardShell sidebarRows={5} metricCards={3} tableRows={6} footerCards={2} />
    </BoneyardSkeleton>
  )
}

export function FacultyDashboardSkeleton() {
  return (
    <BoneyardSkeleton name="faculty-dashboard-skeleton" loading fallback={<DashboardShell sidebarRows={4} metricCards={3} tableRows={5} footerCards={2} />}>
      <DashboardShell sidebarRows={4} metricCards={3} tableRows={5} footerCards={2} />
    </BoneyardSkeleton>
  )
}

export function StudentDashboardSkeleton() {
  return (
    <BoneyardSkeleton name="student-dashboard-skeleton" loading fallback={<DashboardShell sidebarRows={3} metricCards={3} tableRows={4} footerCards={2} />}>
      <DashboardShell sidebarRows={3} metricCards={3} tableRows={4} footerCards={2} />
    </BoneyardSkeleton>
  )
}
