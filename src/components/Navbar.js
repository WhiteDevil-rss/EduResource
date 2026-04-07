'use client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { LogOut, User, Bell } from 'lucide-react'

export default function Navbar() {
  const { user, role, logout } = useAuth()
  const dashboardHref = role ? `/dashboard/${role}` : '/login'

  return (
    <nav className="nav">
      <Link href="/" className="logo">
        SPS EDUCATIONAM
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
        {user ? (
          <>
            <Link href={dashboardHref} style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: '600' }}>
              Dashboard
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: '1rem', paddingLeft: '2.5rem', borderLeft: '1px solid var(--glass-border)' }}>
              <button
                type="button"
                aria-label="Notifications"
                style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                <Bell aria-hidden="true" style={{ width: '1.5rem', height: '1.5rem', color: '#aaaab7' }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <div className="glass-card" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: 0 }}>
                  <User aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--accent-primary)' }} />
                </div>
                <span style={{ fontSize: '0.9rem', color: '#aaaab7' }}>{user.email.split('@')[0]}</span>
              </div>
              <button onClick={logout} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                <LogOut aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }} />
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link href="/login" style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: '500' }}>Login</Link>
            <Link href="/register" className="btn-primary">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}
