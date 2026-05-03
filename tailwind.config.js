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
      borderRadius: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      backgroundImage: {
        'gradient-rainbow': 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 25%, #8b5cf6 50%, #16a34a 75%, #d97706 100%)',
        'gradient-vibrant': 'linear-gradient(135deg, #1d4ed8 0%, #8b5cf6 50%, #0ea5e9 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #1d4ed8 0%, #d97706 50%, #db2777 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #0ea5e9 0%, #2dd4bf 50%, #16a34a 100%)',
        'gradient-neon': 'linear-gradient(135deg, #db2777 0%, #0ea5e9 25%, #16a34a 50%, #d97706 100%)',
      },
    },
  },
  plugins: [],
}
