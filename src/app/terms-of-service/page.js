import { PageContainer, ContentSection } from '@/components/layout'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'

export const metadata = {
  title: 'Terms of Service | SPS Educationam',
  description: 'Terms of Service for SPS Educationam student resource platform.',
}

export default function TermsOfService() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <PageContainer>
        <ContentSection title="Terms of Service" subtitle="Last updated: May 2026">
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-4xl mx-auto space-y-8">
            <section>
              <h2 className="text-xl font-bold text-foreground">1. Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using SPS Educationam, you agree to be bound by these Terms of Service. If you do not agree with all of these terms, then you are expressly prohibited from using the platform and must discontinue use immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">2. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed">
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">3. Academic Resources</h2>
              <p className="text-muted-foreground leading-relaxed">
                All resources provided on this platform are for educational purposes only. You may download materials for your personal, non-commercial academic use. Unauthorized redistribution or commercial use of these materials is strictly prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">4. Prohibited Activities</h2>
              <p className="text-muted-foreground leading-relaxed">
                You may not access or use the platform for any purpose other than that for which we make the platform available. Prohibited activities include, but are not limited to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Systematic retrieval of data or other content from the platform.</li>
                <li>Trick, defraud, or mislead us and other users.</li>
                <li>Circumvent, disable, or otherwise interfere with security-related features.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">5. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages arising from your use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">6. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms shall be governed by and defined following the laws of India. SPS Educationam and yourself irrevocably consent that the courts of India shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.
              </p>
            </section>
          </div>
        </ContentSection>
      </PageContainer>
      <PublicFooter />
    </div>
  )
}
