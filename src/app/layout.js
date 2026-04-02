import './globals.css'
import Navbar from '@/components/Navbar'
import { AuthProvider } from '@/hooks/useAuth'
import ToastProvider from '@/components/ToastProvider'

export const metadata = {
  title: 'EduResource Hub | Modern Academic Resource Platform',
  description: 'A centralized platform for students to access study resources uploaded by faculty.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">Skip to Content</a>
        <AuthProvider>
          <Navbar />
          <main id="main-content">{children}</main>
        </AuthProvider>
        <ToastProvider />
      </body>
    </html>
  )
}
