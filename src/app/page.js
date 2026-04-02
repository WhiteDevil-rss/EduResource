'use client'
import Link from 'next/link'
import { Search, Shield, Zap, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
  const features = [
    {
      icon: <Zap aria-hidden="true" style={{ color: 'var(--accent-primary)', width: '2rem', height: '2rem' }} />,
      title: 'Fast Discovery',
      desc: 'Locate the exact academic resources you need in seconds with our optimized prefix search.',
    },
    {
      icon: <BookOpen aria-hidden="true" style={{ color: 'var(--accent-primary)', width: '2rem', height: '2rem' }} />,
      title: 'Faculty Curated',
      desc: "Every resource is uploaded and verified by your institution's faculty members.",
    },
    {
      icon: <Shield aria-hidden="true" style={{ color: 'var(--accent-primary)', width: '2rem', height: '2rem' }} />,
      title: 'Secure & Trusted',
      desc: 'Role-based access ensures your identity and academic integrity stay protected.',
    },
  ]

  return (
    <div className="container">
      <section className="hero">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Unlock Your <br /> Academic Potential
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Access a curated library of premium study materials, lecture notes, and research papers, all in one high-performance hub.
        </motion.p>

        <motion.div
          className="search-mockup glass-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', padding: '1rem 2rem', marginBottom: '4rem' }}
        >
          <Search aria-hidden="true" style={{ color: '#aaaab7', marginRight: '1rem' }} />
          <span style={{ color: '#aaaab7' }}>Search for courses, subjects, or topics…</span>
        </motion.div>

        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
          <Link href="/register" className="btn-primary">Get Started</Link>
          <Link href="/login" className="btn-secondary">Institution Login</Link>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '6rem' }}>
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            className="glass-card"
            style={{ padding: '3rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * index }}
          >
            <div style={{ marginBottom: '1.5rem' }}>{feature.icon}</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{feature.title}</h3>
            <p style={{ color: '#aaaab7' }}>{feature.desc}</p>
          </motion.div>
        ))}
      </section>
    </div>
  )
}
