'use client'

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react'
import { cn } from '@/lib/cn'
import { Skeleton } from '@/components/ui/skeleton'

function Box({ className = '' }) {
  return <Skeleton className={cn('rounded-2xl bg-muted/20', className)} />
}

function DashboardShell({ sidebarRows = 4, metricCards = 4, tableRows = 5 }) {
  return (
    <div className="min-h-screen w-full overflow-hidden bg-background flex flex-col md:flex-row">
      {/* Sidebar Skeleton */}
      <aside className="hidden h-screen w-72 flex-none flex-col border-r border-border/40 bg-background p-6 md:flex">
        <div className="space-y-4 border-b border-border/40 pb-8 mb-6">
          <div className="flex items-center gap-4">
            <Box className="h-12 w-12 rounded-3xl" />
            <div className="space-y-2">
              <Box className="h-4 w-32" />
              <Box className="h-3 w-20" />
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {Array.from({ length: sidebarRows }).map((_, index) => (
            <Box key={index} className="h-12 w-full rounded-xl" />
          ))}
        </div>
        <div className="border-t border-border/40 pt-6 mt-auto">
          <Box className="h-14 w-full rounded-xl" />
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/40 bg-background px-6 py-6 h-[88px]">
          <Box className="h-10 w-full max-w-xl rounded-xl" />
          <div className="flex items-center gap-3">
            <Box className="h-10 w-10 rounded-xl" />
            <Box className="h-10 w-10 rounded-xl" />
            <Box className="h-10 w-10 rounded-full" />
          </div>
        </header>

        <main className="p-6 md:p-8 lg:p-10 space-y-12">
          <div className="mx-auto w-full max-w-[1400px]">
            {/* Header section */}
            <div className="space-y-4 mb-10">
              <Box className="h-4 w-40" />
              <Box className="h-10 w-96 rounded-2xl" />
              <Box className="h-4 w-full max-w-2xl" />
            </div>

            {/* Metrics Cluster */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: metricCards }).map((_, index) => (
                <div key={index} className="rounded-3xl border border-border/40 bg-muted/5 p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <Box className="h-4 w-32" />
                    <Box className="h-10 w-10 rounded-xl" />
                  </div>
                  <Box className="h-8 w-24" />
                </div>
              ))}
            </div>

            {/* Content Registry */}
            <div className="mt-12 space-y-6">
              <div className="flex items-center justify-between">
                <Box className="h-6 w-64" />
                <Box className="h-11 w-40 rounded-xl" />
              </div>
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: tableRows }).map((_, index) => (
                  <div key={index} className="h-[200px] rounded-3xl border border-border/40 bg-muted/5 p-6 flex flex-col justify-between">
                    <div className="space-y-3">
                      <Box className="h-4 w-3/4" />
                      <Box className="h-4 w-1/2" />
                    </div>
                    <Box className="h-10 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function AdminDashboardSkeleton() {
  return (
    <BoneyardSkeleton name="admin-dashboard-skeleton" loading fallback={<DashboardShell sidebarRows={5} metricCards={4} tableRows={6} footerCards={0} />}>
      <DashboardShell sidebarRows={5} metricCards={4} tableRows={6} footerCards={0} />
    </BoneyardSkeleton>
  )
}

export function FacultyDashboardSkeleton() {
  return (
    <BoneyardSkeleton name="faculty-dashboard-skeleton" loading fallback={<DashboardShell sidebarRows={6} metricCards={4} tableRows={3} footerCards={0} />}>
      <DashboardShell sidebarRows={6} metricCards={4} tableRows={3} footerCards={0} />
    </BoneyardSkeleton>
  )
}

export function StudentDashboardSkeleton() {
  return (
    <BoneyardSkeleton name="student-dashboard-skeleton" loading fallback={<DashboardShell sidebarRows={4} metricCards={3} tableRows={4} footerCards={0} />}>
      <DashboardShell sidebarRows={4} metricCards={3} tableRows={4} footerCards={0} />
    </BoneyardSkeleton>
  )
}

