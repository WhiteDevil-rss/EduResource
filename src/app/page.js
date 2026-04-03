import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Rocket,
  School,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import PublicFooter from '@/components/PublicFooter'
import PublicHeader from '@/components/PublicHeader'

const footerLinks = [
  { label: 'Resources', href: '/#curriculum' },
  { label: 'About', href: '/#scholarships' },
  { label: 'Contact', href: '/#archive' },
  { label: 'Privacy', href: '/login' },
  { label: 'Terms', href: '/register' },
]

export default function Home() {
  return (
    <div className="public-page">
      <PublicHeader
        links={[
          { label: 'Curriculum', href: '/#curriculum', current: true },
          { label: 'Scholarships', href: '/#scholarships' },
          { label: 'Research', href: '/#research' },
          { label: 'Archive', href: '/#archive' },
        ]}
        actions={[
          { label: 'Login', href: '/login', variant: 'ghost' },
          { label: 'Get Started', href: '/register', variant: 'primary' },
        ]}
      />

      <main className="landing-main">
        <div className="page-shell">
          <section className="landing-hero">
            <div className="landing-hero__content">
              <span className="pill-label">
                <Sparkles size={14} />
                Now Curating 2024 Archives
              </span>
              <h1>
                Unlock Your{' '}
                <span className="landing-hero__gradient">Academic Potential</span>
              </h1>
              <p>
                Experience the future of knowledge curation. Access a world-class
                repository of research, curricula, and scholarships through a
                precision-engineered digital gallery.
              </p>

              <div className="landing-search" aria-label="Academic search preview">
                <div className="landing-search__glow" />
                <div className="landing-search__inner">
                  <Search size={18} color="var(--muted-strong)" />
                  <input
                    type="text"
                    readOnly
                    value="Search research, courses, or scholars..."
                    aria-label="Search preview"
                  />
                  <span className="button-secondary">Cmd + K</span>
                </div>
              </div>

              <div className="landing-trending">
                <span>Trending:</span>
                <a href="#research">Quantum Ethics</a>
                <a href="#scholarships">Sustainable Urbanism</a>
                <a href="#archive">AI Governance</a>
              </div>
            </div>
          </section>

          <section id="curriculum" className="landing-grid">
            <article className="landing-card landing-card--wide glass-panel">
              <div>
                <div className="metric-card__icon" style={{ background: 'rgba(182, 160, 255, 0.18)', color: 'var(--primary)' }}>
                  <Rocket size={28} />
                </div>
                <h3>Fast Discovery</h3>
                <p>
                  Our neural-indexing engine processes millions of academic papers
                  to deliver the most relevant citations in milliseconds.
                </p>
              </div>
              <div className="landing-avatar-row">
                <div className="landing-avatar-row__group">
                  <span />
                  <span />
                  <span />
                </div>
                <span>Joined by 12k+ researchers</span>
              </div>
            </article>

            <article className="landing-card landing-card--tall surface-card">
              <div className="metric-card__icon" style={{ background: 'rgba(0, 175, 254, 0.16)', color: 'var(--secondary)' }}>
                <BookOpen size={28} />
              </div>
              <h3>Faculty Curated</h3>
              <p>
                Every resource in our hub is vetted by active faculty members from
                top-tier global institutions.
              </p>
              <div className="landing-card__image">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdyRqePBej6cnmHtGxRRBdCvx7bYfP6DYy2gwWRuW45QwCuaDoI3Z-Zm9qNW_3HPPMWXbJPfaz69UYU1sKfKZDvVN2_UGaRZ2biYw4QNMJEbwGWrMtr-_rocXmsrIDOiZKqUS3MQJYeajxBCGCeKnIwp7LI1pHid9_FAJLPlBF7oi9AKrLjgU15kt-H8Q4wX5hAk4OMAAVdxICYEhOSG9CG-soy2sf_0wOA8W-dCDlW3Jce1rHpBu1uiNEMeU8MMQR6yGAEQ-T92OB"
                  alt="Faculty-curated library interior"
                />
              </div>
            </article>

            <article className="landing-card landing-card--compact surface-card" id="scholarships">
              <div className="metric-card__icon" style={{ background: 'rgba(255, 108, 149, 0.14)', color: 'var(--tertiary)' }}>
                <ShieldCheck size={28} />
              </div>
              <h3>Secure & Trusted</h3>
              <p>
                Your intellectual property and search history are protected by a
                role-aware experience designed for academic integrity.
              </p>
            </article>

            <article className="landing-card landing-card--stats surface-card">
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <div>
                  <span className="metric-card__value" style={{ color: 'var(--primary)', fontSize: '2.3rem' }}>98%</span>
                  <span className="metric-card__label">Accuracy Rate</span>
                </div>
                <div>
                  <span className="metric-card__value" style={{ color: 'var(--secondary)', fontSize: '2.3rem' }}>2.4M</span>
                  <span className="metric-card__label">Resources</span>
                </div>
              </div>
              <Link href="/register" className="button-secondary" aria-label="Get started">
                <ArrowUpRight size={22} />
              </Link>
            </article>
          </section>

          <section id="research" className="landing-mastery">
            <div>
              <h2>
                A Smarter Way to <span>Track Mastery</span>
              </h2>
              <div className="landing-progress">
                <div className="landing-progress__top">
                  <span className="landing-progress__label">Advanced Research Analytics</span>
                  <span className="landing-progress__badge">Level 04</span>
                </div>
                <div className="landing-progress__track">
                  <div className="landing-progress__fill" />
                </div>
              </div>
              <p>
                Our proprietary algorithm maps your learning trajectory and
                recommends adjacent fields of study to ensure a comprehensive
                academic profile.
              </p>
              <Link href="/register" className="button-ghost" style={{ marginTop: '1.5rem', width: 'fit-content' }}>
                Explore Curriculum Engine
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="landing-visual">
              <div className="landing-visual__frame">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLC-xtTQKdG_Jf0EQ-8er791w2IYlwE0Jv7OOat-ZzFWMUjYhzxjGGNQE0tL5QU7KCQSCDvh7r6TbEjqtfZnGyhMle6gKpJXZEGAEPxmb6u7Gnsd1lhoxkhOhrhPFtKQiVSewWKoY5nk3RYMoLDE3VlWo1U1YfBrjiwzF7ZK7BJ9dnWF2OXBQFzvaDkZO3SWaXpHtrcTy7GeiIkg2YhkqugHvrnPcMUrtzNXuGZ2vf_QtkOyo7Jdz_SrX3NsThQd1e41rGutVmmuwP"
                  alt="Desk with book and tablet"
                />
                <div className="landing-visual__badge">
                  <div className="landing-visual__icon">
                    <School size={18} />
                  </div>
                  <div>
                    <strong>New Module Unlocked</strong>
                    <p>Applied Astrophysics II</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="archive" className="landing-bottom">
            <div className="banner-note">
              <Sparkles size={16} color="var(--secondary)" />
              <span>
                Continue with the full platform flow: create an account, sign in,
                and jump directly into the Admin, Faculty, or Student workspace.
              </span>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter links={footerLinks} />
    </div>
  )
}
