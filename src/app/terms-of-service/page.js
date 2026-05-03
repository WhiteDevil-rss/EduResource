import { PageContainer, ContentSection } from '@/components/layout'
import { FileText, Users, GraduationCap, Ban, AlertTriangle, Scale, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Terms of Service | SPS Educationam',
  description: 'Terms of Service for SPS Educationam student resource platform.',
}

export default function TermsOfService() {
  const sections = [
    {
      id: 'agreement',
      title: '1. Agreement to Terms',
      icon: Scale,
      content: 'By accessing or using SPS Educationam, you agree to be bound by these Terms of Service. If you do not agree with all of these terms, then you are expressly prohibited from using the platform and must discontinue use immediately.'
    },
    {
      id: 'accounts',
      title: '2. User Accounts',
      icon: Users,
      content: 'When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service.'
    },
    {
      id: 'resources',
      title: '3. Academic Resources',
      icon: GraduationCap,
      content: 'All resources provided on this platform are for educational purposes only. You may download materials for your personal, non-commercial academic use. Unauthorized redistribution or commercial use of these materials is strictly prohibited.'
    },
    {
      id: 'prohibited',
      title: '4. Prohibited Activities',
      icon: Ban,
      content: 'You may not access or use the platform for any purpose other than that for which we make the platform available. Prohibited activities include, but are not limited to:',
      list: [
        'Systematic retrieval of data or other content from the platform.',
        'Trick, defraud, or mislead us and other users.',
        'Circumvent, disable, or otherwise interfere with security-related features.'
      ]
    },
    {
      id: 'liability',
      title: '5. Limitation of Liability',
      icon: AlertTriangle,
      content: 'In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages arising from your use of the platform.'
    },
    {
      id: 'governing-law',
      title: '6. Governing Law',
      icon: FileText,
      content: 'These terms shall be governed by and defined following the laws of India. SPS Educationam and yourself irrevocably consent that the courts of India shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.'
    }
  ]

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[15%] top-[10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[130px]" />
        <div className="absolute left-[15%] bottom-[10%] h-[500px] w-[500px] rounded-full bg-secondary/5 blur-[110px]" />
      </div>

      <PageContainer>
        <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
          <header className="mb-16 space-y-6 text-center">
            <Badge variant="outline" className="rounded-full border-primary/20 px-4 py-1.5 uppercase tracking-widest text-[10px] font-bold text-primary">
              Terms & Conditions
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              Terms of Service
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Last updated: May 2026. Please read these terms carefully before using our platform.
            </p>
          </header>

          <div className="grid gap-8">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <section key={section.id} className="group relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/50 p-8 md:p-12 transition-all hover:bg-card/80">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary transition-transform group-hover:scale-110">
                      <Icon size={28} />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-foreground transition-colors group-hover:text-primary">
                        {section.title}
                      </h2>
                      <p className="text-base leading-relaxed text-muted-foreground">
                        {section.content}
                      </p>
                      {section.list && (
                        <ul className="grid gap-3 pl-2">
                          {section.list.map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-muted-foreground">
                              <div className="size-1.5 rounded-full bg-secondary/40" />
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

            <section className="mt-8 rounded-[2rem] bg-secondary/5 p-8 text-center md:p-12">
              <div className="mx-auto max-w-2xl space-y-6">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                  <Mail size={24} />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Need Clarification?</h2>
                <p className="text-muted-foreground">
                  If you have any questions regarding these terms, please contact our support team for assistance.
                </p>
                <a 
                  href="mailto:info@zembaa.com" 
                  className="inline-block text-xl font-semibold text-secondary hover:underline"
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
