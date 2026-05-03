import { PageContainer, ContentSection } from '@/components/layout'
import { Shield, Lock, Eye, Server, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Privacy Policy | SPS Educationam',
  description: 'Privacy Policy for SPS Educationam student resource platform. Learn how we handle your data.',
}

export default function PrivacyPolicy() {
  const sections = [
    {
      id: 'introduction',
      title: '1. Introduction',
      icon: Shield,
      content: 'Welcome to SPS Educationam. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our student resource platform.'
    },
    {
      id: 'collection',
      title: '2. Information We Collect',
      icon: Eye,
      content: 'We collect personal information that you voluntarily provide to us when you register on the platform, such as:',
      list: [
        'Name and Contact Data (Email address, phone number)',
        'Academic Information (Class, subjects)',
        'Credentials (Passwords and similar security information)'
      ]
    },
    {
      id: 'usage',
      title: '3. How We Use Your Information',
      icon: Lock,
      content: 'We use the information we collect to:',
      list: [
        'Facilitate account creation and logon process.',
        'Provide you with academic resources and personalized insights.',
        'Send administrative information to you.',
        'Improve our platform and student experience.'
      ]
    },
    {
      id: 'security',
      title: '4. Data Security',
      icon: Server,
      content: 'We use appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.'
    }
  ]

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute right-[10%] bottom-[10%] h-[400px] w-[400px] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      <PageContainer>
        <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
          <header className="mb-16 space-y-6 text-center">
            <Badge variant="outline" className="rounded-full border-primary/20 px-4 py-1.5 uppercase tracking-widest text-[10px] font-bold text-primary">
              Legal Documentation
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              Privacy Policy
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Last updated: May 2026. This policy outlines our commitment to your privacy and how we manage your data.
            </p>
          </header>

          <div className="grid gap-8">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <section key={section.id} className="group relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/50 p-8 md:p-12 transition-all hover:bg-card/80">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                      <Icon size={28} />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-foreground">
                        {section.title}
                      </h2>
                      <p className="text-base leading-relaxed text-muted-foreground">
                        {section.content}
                      </p>
                      {section.list && (
                        <ul className="grid gap-3 pl-2">
                          {section.list.map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-muted-foreground">
                              <div className="size-1.5 rounded-full bg-primary/40" />
                              <span className="text-sm md:text-base">{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              )
            })}

            <section className="mt-8 rounded-[2rem] bg-primary/5 p-8 text-center md:p-12">
              <div className="mx-auto max-w-2xl space-y-6">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail size={24} />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Questions or Concerns?</h2>
                <p className="text-muted-foreground">
                  If you have any questions or comments about this policy, please do not hesitate to contact our data protection team.
                </p>
                <a 
                  href="mailto:info@zembaa.com" 
                  className="inline-block text-xl font-semibold text-primary hover:underline"
                >
                  info@zembaa.com
                </a>
              </div>
            </section>
          </div>
        </div>
      </PageContainer>
    </div>
  )
}
