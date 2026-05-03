import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth-server'
import { getPostLoginRedirectPath } from '@/lib/admin-protection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Smart Dashboard Index
 * 
 * This page serves as a unified entry point for the /dashboard route.
 * It automatically redirects users to their role-specific dashboard
 * (Student, Faculty, or Admin) based on their active session.
 */
export default async function DashboardIndexPage() {
  const { user, role } = await getSessionUser()



  if (!user || !role) {

    redirect('/login')
  }

  const redirectPath = getPostLoginRedirectPath(user, role)


  // Prevent self-referencing loops
  if (!redirectPath || redirectPath === '/dashboard') {
    const fallback = role === 'student' ? '/dashboard/student' : 
                     role === 'admin' ? '/admin/dashboard' : '/dashboard/faculty';

    redirect(fallback)
  }

  redirect(redirectPath)
}
