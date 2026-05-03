import Link from 'next/link'

export const metadata = {
  title: 'Under Maintenance',
  description: 'We are currently performing scheduled maintenance to improve our platform.',
}

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Branding */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <svg 
              className="w-10 h-10 text-primary" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            SPS EDUCATIONAM
          </h1>
        </div>

        {/* Status Message */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Site Under Maintenance
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            We're currently fine-tuning things to bring you a better experience. 
            We'll be back online shortly. Thank you for your patience!
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border w-full max-w-[100px] mx-auto" />

        {/* Action Button */}
        <div className="pt-4 flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Authorized personnel?
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Log in to Dashboard
          </Link>
        </div>

        {/* Footer info */}
        <p className="text-xs text-muted-foreground pt-8">
          &copy; {new Date().getFullYear()} SPS Educationam. All rights reserved.
        </p>
      </div>
    </div>
  )
}
