'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, UserPlus, GraduationCap, Laptop } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleState, setRoleState] = useState('student')
  const { register, user, role, loading, isAuthenticating } = useAuth()
  const router = useRouter()
  const isSubmitting = isAuthenticating

  useEffect(() => {
    if (!loading && user && role) {
      router.replace(`/dashboard/${role}`)
    }
  }, [user, role, loading, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await register(email, password, roleState)

      toast.success('Successfully registered!')
    } catch (error) {
      toast.error(error.message || 'Failed to register')
    }
  }

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <motion.div 
        className="glass-card" 
        style={{ width: '100%', maxWidth: '480px', padding: '3.5rem' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem' }}>Begin Your Journey</h2>
          <p style={{ color: '#aaaab7' }}>Explore premium academic resources.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <label htmlFor="register-email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email Address</label>
            <Mail aria-hidden="true" style={{ position: 'absolute', left: '1rem', top: 'calc(50% + 0.75rem)', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#aaaab7' }} />
            <input
              id="register-email"
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="name@institution.edu…"
              className="input-glass"
              style={{ width: '100%', paddingLeft: '3.5rem' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label htmlFor="register-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Password</label>
            <Lock aria-hidden="true" style={{ position: 'absolute', left: '1rem', top: 'calc(50% + 0.75rem)', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#aaaab7' }} />
            <input 
              id="register-password"
              type="password" 
              name="password"
              autoComplete="new-password"
              placeholder="Create a strong password…"
              className="input-glass" 
              style={{ width: '100%', paddingLeft: '3.5rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <fieldset style={{ border: 'none', padding: 0, marginTop: '0.5rem' }}>
            <legend style={{ marginBottom: '0.75rem', fontWeight: 600 }}>Account Type</legend>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setRoleState('student')}
              style={{ 
                flex: 1, 
                padding: '1rem', 
                textAlign: 'center', 
                cursor: 'pointer',
                backgroundColor: roleState === 'student' ? 'rgba(182, 160, 255, 0.1)' : 'transparent',
                border: `1px solid ${roleState === 'student' ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                borderRadius: '12px',
                transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                color: 'var(--foreground)'
              }}
            >
              <GraduationCap aria-hidden="true" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem', color: roleState === 'student' ? '#fff' : '#aaaab7' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: roleState === 'student' ? '700' : '400' }}>Student</div>
            </button>
            <button
              type="button"
              onClick={() => setRoleState('faculty')}
              style={{ 
                flex: 1, 
                padding: '1rem', 
                textAlign: 'center', 
                cursor: 'pointer',
                backgroundColor: roleState === 'faculty' ? 'rgba(182, 160, 255, 0.1)' : 'transparent',
                border: `1px solid ${roleState === 'faculty' ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                borderRadius: '12px',
                transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                color: 'var(--foreground)'
              }}
            >
              <Laptop aria-hidden="true" style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem', color: roleState === 'faculty' ? '#fff' : '#aaaab7' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: roleState === 'faculty' ? '700' : '400' }}>Faculty</div>
            </button>
          </div>
          </fieldset>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }} disabled={isSubmitting}>
            <UserPlus aria-hidden="true" className="w-5 h-5 mr-2" />
            {isSubmitting ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.95rem', color: '#aaaab7' }}>
          Already a member? <Link href="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600' }}>Sign in instead</Link>
        </div>
      </motion.div>
    </div>
  )
}
