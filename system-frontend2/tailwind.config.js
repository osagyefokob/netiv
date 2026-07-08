/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'dark-base': '#091413',
        'deep-green': '#285A48',
        'medium-green': '#408A71',
        mint: '#B0E4CC',
        'light-bg': '#F4F9F7',
        'brand-navy': '#0A1628',
        'brand-blue': '#2D5BE3',
        'brand-blue-light': '#EEF2FF',
        surface: '#F4F6F9',
        card: '#FFFFFF',
        border: '#E2E8F0',
        'border-subtle': '#F1F5F9',
        muted: '#64748B',
        'muted-light': '#94A3B8',
        success: '#16A34A',
        'success-tint': '#F0FDF4',
        warning: '#D97706',
        'warning-tint': '#FFFBEB',
        danger: '#DC2626',
        'danger-tint': '#FEF2F2',
        info: '#2563EB',
        'info-tint': '#EFF6FF',
        purple: '#7C3AED',
        'purple-tint': '#F5F3FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
}
