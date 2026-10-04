/** @type {import('tailwindcss').Config} */
const scale = (c) => ({ ...c, DEFAULT: c[500] });

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary — électrique indigo/violet
        primary: scale({
          50: '#f1f0ff', 100: '#e5e3ff', 200: '#cfcbff', 300: '#b0a8ff', 400: '#8f82ff',
          500: '#7464fb', 600: '#6247f0', 700: '#5437d6', 800: '#452faf', 900: '#3a2b8a', 950: '#231a54',
        }),
        // Accent — cyan/menthe « terminal »
        accent: scale({
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee',
          500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344',
        }),
        success: scale({
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
          500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d',
        }),
        warning: scale({
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
        }),
        error: scale({
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
          500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d',
        }),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: { '2xs': ['0.625rem', { lineHeight: '0.875rem' }] },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(15, 23, 42, 0.10)',
        'glass-lg': '0 24px 64px -16px rgba(15, 23, 42, 0.25)',
        glow: '0 0 60px -12px rgba(116, 100, 251, 0.55)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
        blink: { '0%, 50%': { opacity: '1' }, '51%, 100%': { opacity: '0' } },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
        blink: 'blink 1s steps(1) infinite',
      },
    },
  },
  plugins: [],
};
