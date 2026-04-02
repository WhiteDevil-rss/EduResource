'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, LogIn } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, user, role, loading, isAuthenticating } = useAuth()
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
      await login(email, password)
      toast.success('Successfully logged in!')
    } catch (error) {
      toast.error(error.message || 'Failed to login')
    }
  }

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <motion.div 
        className="glass-card" 
        style={{ width: '100%', maxWidth: '450px', padding: '3rem' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem' }}>Welcome Back</h2>
          <p style={{ color: '#aaaab7' }}>Continue your academic journey.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <label htmlFor="login-email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email Address</label>
            <Mail aria-hidden="true" style={{ position: 'absolute', left: '1rem', top: 'calc(50% + 0.75rem)', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#aaaab7' }} />
            <input
              id="login-email"
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
            <label htmlFor="login-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Password</label>
            <Lock aria-hidden="true" style={{ position: 'absolute', left: '1rem', top: 'calc(50% + 0.75rem)', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#aaaab7' }} />
            <input 
              id="login-password"
              type="password" 
              name="password"
              autoComplete="current-password"
              className="input-glass" 
              placeholder="Enter your password…"
              style={{ width: '100%', paddingLeft: '3.5rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.9rem', color: '#aaaab7' }}>
              Contact an administrator if you need help resetting your password.
            </span>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={isSubmitting}>
            <LogIn aria-hidden="true" className="w-5 h-5 mr-2" />
            {isSubmitting ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.95rem', color: '#aaaab7' }}>
          New here? <Link href="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600' }}>Create an account</Link>
        </div>
      </motion.div>
    </div>
  )
}
