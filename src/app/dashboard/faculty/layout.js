export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireRole } from '@/lib/auth-server'

export default async function FacultyLayout({ children }) {
  await requireRole(['faculty'], '/dashboard/faculty')
  return children
}
