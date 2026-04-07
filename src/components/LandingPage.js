'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers3,
  Shield,
  Sparkles,
} from 'lucide-react'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import TeamCard from '@/components/TeamCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { getPublicHeaderContent } from '@/lib/public-nav'
import { TEAM_MEMBERS } from '@/lib/team'

export default function LandingPage() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)
  const [resourceCount, setResourceCount] = useState(null)
  const [teamSectionActive, setTeamSectionActive] = useState(false)
  const teamSectionRef = useRef(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  useEffect(() => {
    let active = true
    let intervalId = null

    const loadResourceCount = async () => {
      try {
        const response = await fetch('/api/public/resource-count', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load resource count.')
        }

        if (active) {
          setResourceCount(Number(payload?.publishedResourceCount || 0))
        }
      } catch {
        if (active) {
          setResourceCount(0)
        }
      }
    }

    loadResourceCount()
    intervalId = setInterval(loadResourceCount, 30000)

    return () => {
      active = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [])

  const handleMeetTeamScroll = () => {
    if (!teamSectionRef.current) {
      return
    }

    const headerOffset = 96
    const start = window.pageYOffset
    const target =
      teamSectionRef.current.getBoundingClientRect().top + window.pageYOffset - headerOffset
    const distance = target - start
    const duration = 700
    let startTime = null

    const easeInOutCubic = (progress) =>
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

    const animateScroll = (timestamp) => {
      if (!startTime) {
        startTime = timestamp
      }

      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeInOutCubic(progress)
      window.scrollTo(0, start + distance * eased)

      if (progress < 1) {
        window.requestAnimationFrame(animateScroll)
      }
    }

    window.requestAnimationFrame(animateScroll)
    setTeamSectionActive(true)
    setTimeout(() => setTeamSectionActive(false), 900)
  }

  const { links: navLinks, actions: navActions } = getPublicHeaderContent(pathname)

  const featureCards = [
    {
      title: 'Curated academic resources',
      description:
        'Faculty-approved study content organized by subject, course, and format so learners find relevant material faster.',
      icon: FileText,
    },
    {
      title: 'Secure role-based access control',
      description:
        'Dedicated student, faculty, and admin experiences with protected routes and server-validated permissions.',
      icon: Shield,
    },
    {
      title: 'End-to-end operational visibility',
      description:
        'Track uploads, requests, and moderation activity in one centralized operational dashboard.',
      icon: Layers3,
    },
  ]

  const metrics = [
    {
      value:
        resourceCount === null
          ? '...'
          : new Intl.NumberFormat('en-US').format(resourceCount),
      label: 'Structured resources',
    },
    { value: '24/7', label: 'Availability' },
    { value: '3 roles', label: 'Protected experiences' },
    { value: '0 clutter', label: 'Focused interface' },
  ]

  return (
    <div className="public-page">
      <PublicHeader brand="SPS EDUCATIONAM" links={navLinks} actions={navActions} />

      <main className="landing-main">
        <section className={`page-shell landing-hero ${isVisible ? 'landing-hero--visible' : ''}`}>
          <div className="landing-hero__grid">
            <div className="landing-hero__copy">
              <Badge className="landing-hero__badge" variant="outline">
                <Sparkles size={14} />
                Trusted academic workspace for students, faculty, and admins
              </Badge>

              <h1>Academic Resource Platform for Students, Faculty, and Administrators.</h1>
              <p className="landing-hero__lead">
                SPS EDUCATIONAM helps students discover quality study material, enables faculty to publish resources quickly, and gives administrators secure control over academic operations.
              </p>

              <div className="landing-hero__actions">
                <Button asChild>
                  <Link href="/register">
                    Create your free account <ArrowRight size={16} />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/login">Sign in to dashboard</Link>
                </Button>
              </div>
            </div>

            <Card className="landing-hero__panel">
              <CardHeader>
                <Badge variant="outline">Platform overview</Badge>
                <CardTitle>What users can do from day one</CardTitle>
                <CardDescription>
                  Streamlined navigation, secure role-based access, publication tracking, and a resource-first workflow built for daily academic use.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="landing-hero__preview-list">
                  <article>
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>Student resource library</strong>
                      <span>Search, filter, and access notes, files, and course content in seconds.</span>
                    </div>
                  </article>
                  <article>
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>Faculty publishing workflow</strong>
                      <span>Upload educational resources with progress visibility and clean metadata.</span>
                    </div>
                  </article>
                  <article>
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>Administrative governance</strong>
                      <span>User management, moderation, and sensitive actions are permission-protected.</span>
                    </div>
                  </article>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="button" variant="secondary" onClick={handleMeetTeamScroll}>
                  Meet the team
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="landing-hero__metrics">
            {metrics.map((metric) => (
              <Card key={metric.label} className="landing-metric-card">
                <CardContent>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="features" className="page-shell landing-section">
          <div className="landing-section__heading">
            <Badge variant="outline">Why SPS EDUCATIONAM</Badge>
            <h2>Built as a practical academic system, not a brochure.</h2>
            <p>
              Every workflow is designed to reduce friction between users and their academic goals, from finding learning resources to publishing and governance.
            </p>
          </div>

          <div className="landing-feature-grid">
            {featureCards.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="landing-feature-card">
                  <CardHeader>
                    <div className="landing-feature-card__icon">
                      <Icon size={18} />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </section>

        <section id="workflow" className="page-shell landing-section landing-section--split">
          <Card className="landing-workflow-card">
            <CardHeader>
              <Badge variant="outline">Academic workflow</Badge>
              <CardTitle>How the platform manages daily operations</CardTitle>
              <CardDescription>
                Everyone works in one unified platform, while each role receives tools tailored to their responsibilities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="landing-workflow-list">
                <article>
                  <span>01</span>
                  <div>
                    <strong>Students explore the resource catalog</strong>
                    <p>Structured metadata and fast access paths make study material easy to discover.</p>
                  </div>
                </article>
                <article>
                  <span>02</span>
                  <div>
                    <strong>Faculty publish educational content</strong>
                    <p>Secure uploads with progress tracking and clear publishing controls.</p>
                  </div>
                </article>
                <article>
                  <span>03</span>
                  <div>
                    <strong>Administrators maintain quality and security</strong>
                    <p>Role checks, moderated actions, and confirmation steps protect system integrity.</p>
                  </div>
                </article>
              </div>
            </CardContent>
          </Card>

          <Card className="landing-quote-card">
            <CardHeader>
              <Badge variant="outline">Results</Badge>
              <CardTitle>Clear workflows deliver better academic outcomes</CardTitle>
              <CardDescription>
                Users should focus on learning and publishing, not on decoding a complex interface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Our product direction is simple: make academic operations trustworthy, fast, and predictable so people can complete meaningful work with confidence.
              </p>
            </CardContent>
          </Card>
        </section>

        <section
          id="team"
          ref={teamSectionRef}
          className={`page-shell landing-section ${teamSectionActive ? 'landing-section--spotlight' : ''}`}
        >
          <div className="landing-section__heading landing-section__heading--center">
            <Badge variant="outline">Leadership team</Badge>
            <h2>Meet the team building SPS EDUCATIONAM</h2>
            <p>
              Educators, operators, and developers collaborating to deliver a reliable academic resource ecosystem.
            </p>
          </div>

          <div className="landing-team-grid">
            {TEAM_MEMBERS.map((member) => (
              <TeamCard key={member.name} {...member} />
            ))}
          </div>
        </section>

        <section className="page-shell landing-section landing-cta-shell">
          <Card className="landing-cta-card">
            <CardHeader>
              <Badge variant="outline">Get started</Badge>
              <CardTitle>Launch a better academic resource experience today.</CardTitle>
              <CardDescription>
                Join SPS EDUCATIONAM to streamline learning access, faculty publishing, and secure academic administration.
              </CardDescription>
            </CardHeader>
            <CardContent className="landing-cta-card__actions">
              <Button asChild>
                <Link href="/register">
                  Create free account <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/login">Access your account</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
