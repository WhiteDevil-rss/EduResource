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
import { cn } from '@/lib/cn'

export default function LandingPage() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)
  const [resourceCount, setResourceCount] = useState(null)
  const [teamSectionActive, setTeamSectionActive] = useState(false)
  const teamSectionRef = useRef(null)
  const spotlightTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setIsVisible(true)
  }, [])

  useEffect(() => {
    let active = true
    let intervalId = null

    const loadResourceCount = async () => {
      try {
        const response = await fetch('/api/public/resource-count', {
          cache: 'force-cache',
          next: { revalidate: 120 },
        })
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
    intervalId = setInterval(loadResourceCount, 120000)

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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      teamSectionRef.current.scrollIntoView({ block: 'start' })
      setTeamSectionActive(true)
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current)
      }
      spotlightTimeoutRef.current = setTimeout(() => setTeamSectionActive(false), 900)
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
    if (spotlightTimeoutRef.current) {
      clearTimeout(spotlightTimeoutRef.current)
    }
    spotlightTimeoutRef.current = setTimeout(() => setTeamSectionActive(false), 900)
  }

  const { links: navLinks, actions: navActions } = getPublicHeaderContent(pathname)

  const featureCards = [
    {
      title: 'Curated Academic Resources',
      description:
        'Faculty-approved study content organized by subject, course, and format so learners find relevant material faster.',
      icon: FileText,
    },
    {
      title: 'Secure Role-Based Access',
      description:
        'Dedicated student, faculty, and admin experiences with protected routes and server-validated permissions.',
      icon: Shield,
    },
    {
      title: 'Operational Visibility',
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
      label: 'Academic Resources',
    },
    { value: '24/7', label: 'Availability' },
    { value: '3 roles', label: 'Protected Access' },
    { value: '0 clutter', label: 'SaaS Precision' },
  ]

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground flex flex-col">
      <PublicHeader brand="SPS EDUCATIONAM" links={navLinks} actions={navActions} showUtilityIcons />

      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {/* Hero Section */}
        <section className={cn(
          "w-full max-w-full lg:max-w-[1400px] mx-auto px-4 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center transition-all duration-700",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="space-y-8 min-w-0">
            <Badge variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20 text-primary-foreground flex items-center gap-2 w-fit">
              <Sparkles className="w-4 h-4 text-primary" />
              Trusted academic workspace for education experts
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] break-words">
              The Modern Foundation for <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60">Academic Excellence</span>.
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl break-words">
              SPS EDUCATIONAM streamlines how students discover resources, faculty publishes content, and administrators govern academic operations—all in one high-performance SaaS platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="h-12 w-full sm:w-auto px-8 rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                <Link href="/register">
                  Get Started <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 w-full sm:w-auto px-8 rounded-full border-border/40 hover:bg-accent transition-all">
                <Link href="/login">Dashboard Access</Link>
              </Button>
            </div>

            {/* Metrics Row */}
            <div className="grid w-full max-w-full grid-cols-2 md:grid-cols-4 gap-6 pt-12 border-t border-border/40">
              {metrics.map((metric) => (
                <div key={metric.label} className="space-y-1 min-w-0">
                  <p className="text-2xl font-bold tracking-tight">{metric.value}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider break-words">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="relative w-full max-w-full min-w-0 overflow-hidden rounded-3xl border-border/40 bg-card shadow-2xl transition-all duration-500 hover:shadow-primary/5 lg:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader className="p-8 pb-4">
              <Badge variant="outline" className="w-fit mb-4">Platform Intelligence</Badge>
              <CardTitle className="text-2xl font-bold break-words">What users can do from day one</CardTitle>
              <CardDescription className="text-base break-words">
                A streamlined, secure workflow built for the future of academic resource management and collaboration.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-6">
              {[
                { title: 'Resource Library', desc: 'Powerful search and filtering for notes, assignments, and course materials.', color: 'text-primary' },
                { title: 'Faculty Workflow', desc: 'Secure publishing tools with real-time status and metadata controls.', color: 'text-primary' },
                { title: 'Unified Governance', desc: 'Administrative oversight with deep role-based protection and audit logs.', color: 'text-primary' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="mt-1 shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-base break-words">{item.title}</h4>
                    <p className="text-sm text-muted-foreground leading-snug break-words">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="p-8 pt-0">
              <Button type="button" variant="ghost" className="w-full justify-between h-12 rounded-xl group hover:bg-primary/5" onClick={handleMeetTeamScroll}>
                <span>Meet the Builders</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full max-w-full bg-accent/30 py-24 overflow-x-hidden">
          <div className="w-full max-w-full lg:max-w-[1400px] mx-auto px-4">
            <div className="max-w-3xl mb-16 space-y-4">
              <Badge variant="outline" className="font-semibold px-4 py-1">Why Choose Us</Badge>
              <h2 className="text-3xl md:text-4xl font-bold break-words">Built for real-world academic scale.</h2>
              <p className="text-lg text-muted-foreground break-words">
                We've eliminated the friction in academic resource management, allowing educators and students to focus on what matters most: learning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featureCards.map((feature) => {
                const Icon = feature.icon
                return (
                  <Card key={feature.title} className="w-full max-w-full min-w-0 p-8 border-border/40 bg-card rounded-2xl shadow-sm transition-all hover:shadow-md hover:border-primary/20 group">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary mb-6 transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 break-words">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed break-words">{feature.description}</p>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="w-full max-w-full lg:max-w-[1400px] mx-auto px-4 py-24 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-x-hidden">
          <Card className="lg:col-span-2 w-full max-w-full min-w-0 p-8 md:p-12 border-border/40 bg-card rounded-3xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none transition-opacity group-hover:opacity-100" />
            <div className="relative space-y-12">
              <div className="space-y-4">
                <Badge variant="outline">Strategic Workflow</Badge>
                <h2 className="text-3xl font-bold tracking-tight break-words">How the platform enables daily success</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {[
                  { step: '01', title: 'Exploration', desc: 'Students traverse a rich catalog of verified materials.' },
                  { step: '02', title: 'Publishing', desc: 'Faculty upload and manage resources with ease.' },
                  { step: '03', title: 'Governance', desc: 'Admins maintain the ecosystem integrity and security.' }
                ].map((item) => (
                  <div key={item.step} className="space-y-4 min-w-0">
                    <span className="text-4xl font-black text-primary/10 tracking-tighter">{item.step}</span>
                    <h4 className="font-bold text-lg break-words">{item.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed break-words">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="w-full max-w-full min-w-0 p-8 md:p-12 border-none bg-gradient-to-br from-primary to-primary-foreground/90 text-primary-foreground rounded-3xl flex flex-col justify-center gap-8 shadow-xl shadow-primary/20">
            <div className="space-y-4">
              <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/20 px-3 py-1">Philosophy</Badge>
              <h3 className="text-2xl font-bold leading-tight break-words">Driven by Practical Outcomes.</h3>
            </div>
            <p className="text-lg text-primary-foreground/80 leading-relaxed italic break-words">
              "We believe that educational tools should be invisible. The technology should handle the complexity so teachers can teach and students can learn."
            </p>
            <div className="pt-4 border-t border-white/10">
              <p className="font-bold">Education Engineering Team</p>
              <p className="text-sm opacity-60">SPS EDUCATIONAM</p>
            </div>
          </Card>
        </section>

        {/* Team Section */}
        <section
          id="team"
          ref={teamSectionRef}
          className={cn(
            "bg-accent/30 py-24 transition-all duration-1000",
            teamSectionActive ? "bg-accent/40 md:scale-[1.01]" : ""
          )}
        >
          <div className="w-full max-w-full lg:max-w-[1400px] mx-auto px-4 overflow-x-hidden">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <Badge variant="outline" className="px-4 py-1">Our Leadership</Badge>
              <h2 className="text-3xl md:text-4xl font-bold break-words">The minds behind EDUCATIONAM</h2>
              <p className="text-lg text-muted-foreground break-words">
                A multidisciplinary team of educators, engineers, and visionaries dedicated to academic resource excellence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {TEAM_MEMBERS.map((member) => (
                <TeamCard key={member.name} {...member} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full max-w-full lg:max-w-[1400px] mx-auto px-4 py-24 overflow-x-hidden">
          <Card className="w-full max-w-full min-w-0 p-8 md:p-16 border-border/40 bg-card rounded-[2.5rem] text-center space-y-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50 pointer-events-none" />
            <div className="max-w-2xl mx-auto space-y-6 relative">
              <Badge variant="outline" className="px-4 py-1 mx-auto">Instant Deployment</Badge>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight break-words">Ready to elevate your academic experience?</h2>
              <p className="text-lg text-muted-foreground break-words">
                Join our ecosystem today and transition from manual resource management to high-fidelity academic operations.
              </p>
              <div className="flex flex-wrap flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button asChild size="lg" className="h-12 w-full sm:w-auto px-8 sm:px-10 rounded-xl">
                  <Link href="/register">Create Account <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="h-12 w-full sm:w-auto px-8 sm:px-10 rounded-xl">
                  <Link href="/login">Portal Login</Link>
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
