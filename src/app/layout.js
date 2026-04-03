import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import ToastProvider from '@/components/ToastProvider'
import { Inter, Manrope } from 'next/font/google'

const bodyFont = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
})

const headlineFont = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
})

export const metadata = {
  title: 'EduResource Hub | The Digital Curator',
  description:
    'A role-based academic resource platform for admins, faculty, and students.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headlineFont.variable}`}>
        <a href="#main-content" className="skip-link">Skip to Content</a>
        <AuthProvider>
          <main id="main-content">{children}</main>
        </AuthProvider>
        <ToastProvider />
      </body>
    </html>
  )
}
