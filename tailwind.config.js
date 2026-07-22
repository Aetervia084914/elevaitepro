
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./services/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        vibrant: {
          azure: "#006BDF",
          purple: "#A259FF",
          teal: "#00D1FF",
          amber: "#FFB800",
          coral: "#FF4D4D",
          midnight: "#0F172A",
          cyan: "#22D3EE",
        },
        sr: {
          accent:  '#5b21b6',
          accentV: '#3b82f6',
          sky:     '#a78bfa',
          text:    '#111827',
          text2:   '#374151',
          muted:   '#6b7280',
          chip:    '#5b21b6',
          bgBase:  '#f5f3ff',
          bgMid:   '#ede9fe',
        },
      },
      boxShadow: {
        'azure-glow': '0 4px 20px rgba(0, 107, 223, 0.2)',
        'purple-glow': '0 4px 20px rgba(162, 89, 255, 0.2)',
        'teal-glow': '0 4px 20px rgba(0, 209, 255, 0.2)',
        'amber-glow': '0 4px 20px rgba(255, 184, 0, 0.2)',
        'coral-glow': '0 4px 20px rgba(255, 77, 77, 0.2)',
        'midnight-glow': '0 8px 32px -8px rgba(15, 23, 42, 0.08)',
        'glass': '0 4px 24px rgba(0, 0, 0, 0.06)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.10)',
        'premium': '0 20px 60px -12px rgba(0, 0, 0, 0.12)',
        'sr-xl': '0 32px 80px rgba(80,30,180,0.14),0 2px 12px rgba(80,30,180,0.06)',
        'sr-md': '0 12px 32px rgba(109,40,217,0.12)',
        'sr-sm': '0 4px 14px rgba(109,40,217,0.08)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        inter:       ['var(--font-inter)', 'sans-serif'],
        playfair:    ["'Playfair Display'", 'Georgia', 'serif'],
        plusJakarta: ["'Plus Jakarta Sans'", 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-x': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'srFloatA': { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(-24px,18px) scale(1.06)' } },
        'srFloatB': { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(20px,-14px) scale(0.96)' } },
        'srCardIn': { 'from': { opacity: '0', transform: 'translateY(18px)' }, 'to': { opacity: '1', transform: 'translateY(0)' } },
        'srFillIn': { 'from': { width: '0%' }, 'to': { width: '68%' } },
        'srPulse':  { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '.6', transform: 'scale(1.3)' } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'shine': 'shine 2s ease-in-out',
        'sr-float-a': 'srFloatA 14s ease-in-out infinite',
        'sr-float-b': 'srFloatB 18s ease-in-out infinite',
        'sr-card-in': 'srCardIn 0.7s cubic-bezier(.22,.8,.2,1) both',
        'sr-fill-in': 'srFillIn 1.4s ease-out forwards',
        'sr-pulse':   'srPulse 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
