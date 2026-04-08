'use client'

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react'
import { cn } from '@/lib/cn'
import { Skeleton } from '@/components/ui/skeleton'

function Box({ className = '' }) {
  return <Skeleton className={cn('rounded-xl', className)} />
}

function DashboardShell({ sidebarRows = 4, metricCards = 3, tableRows = 5, footerCards = 2 }) {
  return (
    <div className="min-h-dvh w-full overflow-hidden bg-background">
      <div className="flex min-h-dvh w-full overflow-hidden">
        <aside className="hidden h-dvh w-72 flex-none flex-col border-r border-border/70 bg-card/70 p-4 md:flex">
          <div className="space-y-3 border-b border-border/70 pb-4">
            <Box className="h-10 w-44" />
            <Box className="h-4 w-32" />
          </div>
          <div className="flex flex-1 flex-col gap-3 py-4">
            {Array.from({ length: sidebarRows }).map((_, index) => (
              <Box key={index} className="h-12 w-full" />
            ))}
          </div>
          <div className="space-y-3 border-t border-border/70 pt-4">
            <Box className="h-12 w-full" />
            <Box className="h-12 w-full" />
            <div className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
              <Box className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Box className="h-4 w-40" />
                <Box className="h-3 w-28" />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-col gap-3 border-b border-border/70 bg-background/90 px-4 py-3 md:px-6 md:py-4 lg:flex-row lg:items-center lg:justify-between">
            <Box className="h-12 w-full max-w-3xl rounded-xl" />
            <div className="flex items-center gap-2">
              <Box className="h-10 w-10 rounded-full" />
              <Box className="h-10 w-10 rounded-full" />
              <Box className="h-10 w-10 rounded-full" />
            </div>
          </header>

          <section className="mx-auto w-full max-w-[1400px] px-4 py-4 md:px-6 md:py-6">
            <div className="space-y-3">
              <Box className="h-4 w-32" />
              <Box className="h-9 w-72" />
              <Box className="h-4 w-full max-w-2xl" />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: metricCards }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-5">
                  <Box className="h-4 w-24" />
                  <Box className="mt-4 h-8 w-32" />
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto w-full max-w-[1400px] px-4 py-4 md:px-6 md:py-6">
            <Box className="h-6 w-56" />
            <div className="mt-4 rounded-xl border border-border/70 bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4 md:p-5">
                <Box className="h-4 w-32" />
                <Box className="h-11 w-28 rounded-xl" />
              </div>
              <div className="grid gap-3 p-4 md:p-5">
                {Array.from({ length: tableRows }).map((_, index) => (
                  <Box key={index} className="h-14 w-full" />
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-[1400px] px-4 py-4 md:px-6 md:py-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: footerCards }).map((_, index) => (
                <div key={index} className="min-h-[14rem] rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-5">
                  <Box className="h-4 w-28" />
                  <Box className="mt-4 h-12 w-full" />
                  <Box className="mt-3 h-4 w-5/6" />
                  <Box className="mt-2 h-4 w-3/4" />
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
