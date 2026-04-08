/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--outline)',
        card: 'var(--surface-card)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-strong)',
        primary: 'var(--primary)',
        'primary-strong': 'var(--primary-strong)',
        'primary-foreground': '#ffffff',
        secondary: 'var(--secondary)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        outline: 'var(--outline)',
        'surface-card': 'var(--surface-card)',
        'surface-panel': 'var(--surface-panel)',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
      },
    },
  },
  plugins: [],
}
