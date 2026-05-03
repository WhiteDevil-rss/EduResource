export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireRole } from '@/lib/auth-server'

export default async function StudentLayout({ children }) {
  await requireRole(['student'], '/dashboard/student')
  return children
}
