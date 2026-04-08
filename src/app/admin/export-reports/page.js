'use client'

import { ExportReportsSection } from '@/components/ExportBackupSection'
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper'

export default function ExportReportsPage() {
  return (
    <AdminPageWrapper
      title="Export Reports"
      description="Download users, logs, or analytics in CSV or PDF format."
    >
      <ExportReportsSection />
    </AdminPageWrapper>
  )
}
