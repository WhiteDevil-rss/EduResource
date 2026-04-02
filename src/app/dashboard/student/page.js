'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/AuthGuard'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, limit, startAfter, orderBy } from 'firebase/firestore'
import { Search, Download, Book, Filter, Bookmark } from 'lucide-react'
import { motion } from 'framer-motion'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async (isSearch = false) => {
    try {
      setLoading(true)
      let q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'), limit(12))
      
      if (isSearch && searchTerm) {
        const term = searchTerm.toLowerCase()
        q = query(
          collection(db, 'resources'),
          where('titleLower', '>=', term),
          where('titleLower', '<=', term + '\uf8ff'),
          limit(20)
        )
      }

      const snapshot = await getDocs(q)
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setResources(docs)
    } catch (error) {
      console.error("Error fetching resources:", error)
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchResources(true)
  }

  return (
    <AuthGuard allowedRoles={['student']}>
      <div className="container" style={{ display: 'flex', gap: '3rem' }}>
        {/* Sidebar */}
        <aside style={{ width: '280px', flexShrink: 0 }}>
          <div className="glass-card" style={{ padding: '2rem', height: 'fit-content', position: 'sticky', top: '120px' }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(182, 160, 255, 0.1)', color: 'var(--accent-primary)', borderRadius: '12px', fontWeight: '700', display: 'flex', alignItems: 'center' }}>
                <Book className="w-5 h-5 mr-3" /> Library
              </div>
              <div style={{ padding: '0.75rem 1rem', color: '#aaaab7', borderRadius: '12px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <Bookmark className="w-5 h-5 mr-3" /> My Downloads
              </div>
              <div style={{ padding: '0.75rem 1rem', color: '#aaaab7', borderRadius: '12px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <Filter className="w-5 h-5 mr-3" /> Filters
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1 }}>
          <div style={{ marginBottom: '4rem' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Welcome, {user?.email ? user.email.split('@')[0] : 'Student'}</h1>
            <p style={{ color: '#aaaab7', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Resource Library</p>
            <form onSubmit={handleSearch}>
              <label htmlFor="resource-search" style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Search Resources</label>
              <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto 4rem' }}>
                <Search aria-hidden="true" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', width: '1.5rem', height: '1.5rem', color: '#aaaab7' }} />
                <input 
                  id="resource-search"
                  type="text" 
                  name="resourceSearch"
                  autoComplete="off"
                  placeholder="Search resources by title prefix, for example Intro…" 
                  className="input-glass" 
                  style={{ padding: '1.25rem 2rem 1.25rem 3.5rem', width: '100%', fontSize: '1.1rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#aaaab7' }}>Loading resources…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
              {resources.map((res, i) => (
                <motion.div 
                  key={res.id} 
                  className="glass-card" 
                  style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'var(--surface-highest)', borderRadius: '20px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                        {res.subject}
                      </span>
                      <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'var(--surface-highest)', borderRadius: '20px', color: '#aaaab7' }}>
                        {res.class}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>{res.title}</h3>
                  </div>
                  <a 
                    href={res.fileUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn-primary" 
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
                  >
                    <Download aria-hidden="true" className="w-4 h-4 mr-2" /> Download PDF
                  </a>
                </motion.div>
              ))}
            </div>
          )}

          {resources.length === 0 && !loading && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '6rem', color: '#aaaab7' }}>
              <Search aria-hidden="true" className="w-12 h-12 mx-auto mb-4 opacity-20" />
              
              <p>No resources found matching your search.</p>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
