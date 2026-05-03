import { PageContainer, ContentSection } from '@/components/layout'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'

export const metadata = {
  title: 'Privacy Policy | SPS Educationam',
  description: 'Privacy Policy for SPS Educationam student resource platform. Learn how we handle your data.',
}

export default function PrivacyPolicy() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <PageContainer>
        <ContentSection title="Privacy Policy" subtitle="Last updated: May 2026">
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-4xl mx-auto space-y-8">
            <section>
              <h2 className="text-xl font-bold text-foreground">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to SPS Educationam. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our student resource platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">2. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                We collect personal information that you voluntarily provide to us when you register on the platform, such as:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Name and Contact Data (Email address, phone number)</li>
                <li>Academic Information (Class, subjects)</li>
                <li>Credentials (Passwords and similar security information)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Facilitate account creation and logon process.</li>
                <li>Provide you with academic resources and personalized insights.</li>
                <li>Send administrative information to you.</li>
                <li>Improve our platform and student experience.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">4. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">5. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions or comments about this policy, you may email us at: <a href="mailto:info@zembaa.com" className="text-primary hover:underline">info@zembaa.com</a>.
              </p>
            </section>
          </div>
        </ContentSection>
      </PageContainer>
      <PublicFooter />
    </div>
  )
}
