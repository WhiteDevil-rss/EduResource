'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/AuthGuard'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { Plus, Trash2, FileText, Upload, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function FacultyDashboard() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ title: '', class: '', subject: '', fileUrl: '' })

  useEffect(() => {
    if (user) fetchMyResources()
  }, [user])

  const fetchMyResources = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, 'resources'), where('facultyId', '==', user.uid))
      const snapshot = await getDocs(q)
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    } catch (error) {
      console.error("Error fetching my resources:", error)
      toast.error("Failed to load your publications")
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    try {
      await addDoc(collection(db, 'resources'), {
        ...formData,
        titleLower: formData.title.toLowerCase(),
        facultyId: user.uid,
        facultyEmail: user.email,
        createdAt: serverTimestamp()
      })
      setShowModal(false)
      setFormData({ title: '', class: '', subject: '', fileUrl: '' })
      fetchMyResources()
      toast.success('Resource uploaded successfully!')
    } catch (error) {
      toast.error(error.message || 'Failed to upload resource')
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this resource?')) {
      await deleteDoc(doc(db, 'resources', id))
      fetchMyResources()
    }
  }

  return (
      <AuthGuard allowedRoles={['faculty', 'admin']}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem' }}>
            <div>
              <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Faculty Hub</h1>
              <p style={{ color: '#aaaab7' }}>Manage your academic publications and lecture materials.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '1rem 2rem' }}>
              <Plus aria-hidden="true" className="w-5 h-5 mr-2" /> Upload New Resource
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '4rem' }}>
            {[
              { label: 'Total Publications', value: resources.length },
              { label: 'Total Downloads', value: '1.2k' },
              { label: 'Active Courses', value: new Set(resources.map(r => r.class)).size },
              { label: 'Monthly Growth', value: '+12%' }
            ].map((stat, i) => (
              <div key={i} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ color: '#aaaab7', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{stat.label}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--accent-primary)' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Your Publications</h3>
              <button onClick={fetchMyResources} className="btn-secondary" style={{ padding: '0.5rem' }} aria-label="Refresh publications">
                <RefreshCw aria-hidden="true" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', fontSize: '0.9rem', color: '#aaaab7' }}>
                  <th style={{ padding: '1.5rem 2rem' }}>Title</th>
                  <th style={{ padding: '1.5rem 2rem' }}>Class</th>
                  <th style={{ padding: '1.5rem 2rem' }}>Subject</th>
                  <th style={{ padding: '1.5rem 2rem' }}>Status</th>
                  <th style={{ padding: '1.5rem 2rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map(res => (
                  <tr key={res.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FileText aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.75rem', color: '#aaaab7' }} />
                        <span style={{ fontWeight: '600' }}>{res.title}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.5rem 2rem' }}>{res.class}</td>
                    <td style={{ padding: '1.5rem 2rem' }}>{res.subject}</td>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '20px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', marginRight: '0.5rem' }} />
                        Live
                      </span>
                    </td>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <button onClick={() => handleDelete(res.id)} style={{ background: 'none', border: 'none', color: '#ff6e84', cursor: 'pointer' }} aria-label={`Delete ${res.title}`}>
                        <Trash2 aria-hidden="true" className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resources.length === 0 && !loading && (
              <div style={{ padding: '6rem', textAlign: 'center', color: '#aaaab7' }}>
                No publications yet. Start by uploading your first resource!
              </div>
            )}
          </div>

          {showModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card" 
                style={{ width: '100%', maxWidth: '500px', padding: '3rem' }}
              >
                <h2 style={{ marginBottom: '2rem' }}>Upload Resource</h2>
                <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <input 
                    className="input-glass" 
                    placeholder="Resource Title (e.g. Advanced Thermodynamics)" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required
                  />
                  <input 
                    className="input-glass" 
                    placeholder="Class (e.g. MECH 301)" 
                    value={formData.class}
                    onChange={e => setFormData({...formData, class: e.target.value})}
                    required
                  />
                  <input 
                    className="input-glass" 
                    placeholder="Subject (e.g. Physics)" 
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    required
                  />
                  <div className="glass-card" style={{ padding: '2rem', borderStyle: 'dashed', textAlign: 'center', color: '#aaaab7' }}>
                    <Upload aria-hidden="true" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p style={{ fontSize: '0.9rem' }}>Drop your PDF here or click to browse</p>
                    <input 
                      type="text" 
                      className="input-glass" 
                      placeholder="Paste Cloudinary URL (Placeholder)" 
                      style={{ marginTop: '1rem', width: '100%' }}
                      value={formData.fileUrl}
                      onChange={e => setFormData({...formData, fileUrl: e.target.value})}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>Publish</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      </AuthGuard>

  )
}
