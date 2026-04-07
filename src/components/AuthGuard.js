'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthGuard({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user || !role) {
        router.replace('/login')
      } else if (allowedRoles && !allowedRoles.includes(role)) {
        router.replace('/login?reason=unauthorized')
      }
    }
  }, [user, role, loading, router, allowedRoles])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#aaaab7' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-border)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          Verifying your secure SPS EDUCATIONAM session and preparing your personalized dashboard...
        </div>
      </div>
    )
  }

  if (!user || !role) return null
  if (allowedRoles && !allowedRoles.includes(role)) return null

  return children
}
