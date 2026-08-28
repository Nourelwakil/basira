/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        basira: {
          primary: '#2563EB',
          'primary-hover': '#1E40AF',
          'primary-light': '#EFF6FF',
          'bg-main': '#FFFFFF',
          'bg-surface': '#F8FAFC',
          'bg-page': '#F1F5F9',
          'text-heading': '#0F172A',
          'text-body': '#334155',
          'text-muted': '#94A3B8',
          'text-hint': '#CBD5E1',
          'border-default': '#E2E8F0',
          'border-subtle': '#F1F5F9',
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
