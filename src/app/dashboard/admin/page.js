'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/AuthGuard'
import { db } from '@/lib/firebase'
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore'
import { Shield, Users, FileText, Ban, CheckCircle, Search } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    } catch (error) {
      console.error("Error fetching users:", error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active'
    await updateDoc(doc(db, 'users', userId), { status: newStatus })
    fetchUsers()
  }

  return (
      <AuthGuard allowedRoles={['admin']}>
        <div className="container">
          <div style={{ marginBottom: '4rem' }}>
            <h1 style={{ fontSize: '3rem', display: 'flex', alignItems: 'center' }}>
              <Shield style={{ width: '3rem', height: '3rem', marginRight: '1rem', color: 'var(--accent-primary)' }} /> Welcome, {user?.email ? user.email.split('@')[0] : 'Admin'}
            </h1>
            <p style={{ color: '#aaaab7' }}>Project governance and user moderation panel.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '4rem' }}>
            {[
              { icon: <Users />, label: 'Total Users', value: users.length, trend: '+5%' },
              { icon: <FileText />, label: 'Total Resources', value: '458', trend: '+12%' },
              { icon: <CheckCircle />, label: 'System Health', value: '99.9%', trend: 'Stable' }
            ].map((stat, i) => (
              <div key={i} className="glass-card" style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div style={{ color: 'var(--accent-primary)' }}>{stat.icon}</div>
                  <span style={{ fontSize: '0.8rem', color: '#22c55e' }}>{stat.trend}</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>{stat.value}</div>
                <div style={{ color: '#aaaab7', fontSize: '0.9rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="glass-card">
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>User Moderation</h3>
              <div style={{ position: 'relative' }}>
                <label htmlFor="user-filter" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#aaaab7' }}>Filter Users</label>
                <Search aria-hidden="true" style={{ position: 'absolute', left: '0.75rem', top: 'calc(50% + 0.7rem)', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#aaaab7' }} />
                <input 
                  id="user-filter"
                  type="text" 
                  name="userFilter"
                  autoComplete="off"
                  placeholder="Filter users by email…" 
                  className="input-glass" 
                  style={{ padding: '0.5rem 1rem 0.5rem 2.5rem', fontSize: '0.9rem' }} 
                />
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', fontSize: '0.9rem', color: '#aaaab7' }}>
                  <th style={{ padding: '1.5rem 2rem' }}>User Email</th>
                  <th style={{ padding: '1.5rem 2rem' }}>Role</th>
                  <th style={{ padding: '1.5rem 2rem' }}>Status</th>
                  <th style={{ padding: '1.5rem 2rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1.5rem 2rem' }}>{u.email}</td>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <span style={{ textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: '600' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '20px',
                        background: u.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: u.status === 'active' ? '#22c55e' : '#ef4444'
                      }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <button 
                        onClick={() => toggleUserStatus(u.id, u.status)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: u.status === 'active' ? '#ef4444' : '#22c55e', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '0.9rem',
                          fontWeight: '600'
                        }}
                      >
                        <Ban aria-hidden="true" className="w-4 h-4 mr-2" />
                        {u.status === 'active' ? 'Ban User' : 'Unban User'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AuthGuard>

  )
}
