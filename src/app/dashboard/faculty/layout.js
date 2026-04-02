import { requireRole } from '@/lib/auth-server'

export default async function FacultyLayout({ children }) {
  await requireRole(['faculty', 'admin'], '/dashboard/faculty')
  return children
}
