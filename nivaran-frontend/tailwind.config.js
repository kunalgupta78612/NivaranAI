/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#F0F4FF',
          800: '#FFFFFF',
          700: '#E8EDF6',
          600: '#D6DEF0',
          500: '#B8C4DB'
        },
        line: 'rgba(148, 163, 184, 0.25)',
        glass: {
          bg: 'rgba(255, 255, 255, 0.55)',
          card: 'rgba(255, 255, 255, 0.65)',
          border: 'rgba(255, 255, 255, 0.7)',
          highlight: 'rgba(255, 255, 255, 0.92)',
          frost: 'rgba(255, 255, 255, 0.42)'
        },
        cyanic: '#0284C7',
        crit: '#DC2626',
        high: '#EA580C',
        med: '#D97706',
        low: '#059669',
        chain: '#7C3AED',
        accent: {
          blue: '#3B82F6',
          indigo: '#6366F1',
          violet: '#8B5CF6',
          purple: '#A855F7',
          pink: '#EC4899',
          rose: '#F43F5E',
          emerald: '#10B981',
          teal: '#14B8A6',
          cyan: '#06B6D4',
          sky: '#0EA5E9',
          amber: '#F59E0B',
          orange: '#F97316'
        }
      },
      boxShadow: {
        'glass-xs': '0 2px 8px -1px rgba(99, 102, 241, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        'glass-sm': '0 4px 16px -3px rgba(99, 102, 241, 0.06), 0 1px 4px rgba(99, 102, 241, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        'glass-md': '0 8px 28px -6px rgba(99, 102, 241, 0.09), 0 4px 12px -2px rgba(99, 102, 241, 0.04), inset 0 1.5px 0 rgba(255, 255, 255, 1)',
        'glass-lg': '0 16px 48px -12px rgba(99, 102, 241, 0.12), 0 6px 20px -4px rgba(99, 102, 241, 0.06), inset 0 2px 0 rgba(255, 255, 255, 1)',
        'glass-xl': '0 24px 64px -16px rgba(99, 102, 241, 0.16), 0 10px 28px -6px rgba(99, 102, 241, 0.08), inset 0 2px 0 rgba(255, 255, 255, 1)',
        '3d-sm': '0 2px 6px -1px rgba(30, 41, 59, 0.04), 0 6px 16px -4px rgba(99, 102, 241, 0.06), 0 -1px 0 rgba(30, 41, 59, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        '3d-card': '0 4px 12px -2px rgba(30, 41, 59, 0.05), 0 12px 32px -8px rgba(99, 102, 241, 0.08), 0 -2px 0 rgba(30, 41, 59, 0.02), inset 0 1.5px 0 rgba(255, 255, 255, 1)',
        '3d-float': '0 8px 20px -4px rgba(30, 41, 59, 0.06), 0 20px 48px -12px rgba(99, 102, 241, 0.12), 0 -3px 0 rgba(30, 41, 59, 0.03), inset 0 2px 0 rgba(255, 255, 255, 1)',
        '3d-btn': '0 3px 10px -2px rgba(99, 102, 241, 0.3), 0 6px 20px -4px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        '3d-btn-hover': '0 6px 18px -3px rgba(99, 102, 241, 0.4), 0 10px 28px -6px rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        'glow-blue': '0 0 30px rgba(59, 130, 246, 0.25), 0 0 60px rgba(99, 102, 241, 0.1)',
        'glow-emerald': '0 0 30px rgba(16, 185, 129, 0.25), 0 0 60px rgba(16, 185, 129, 0.1)',
        'glow-rose': '0 0 30px rgba(244, 63, 94, 0.25), 0 0 60px rgba(244, 63, 94, 0.1)',
        'glow-violet': '0 0 30px rgba(139, 92, 246, 0.25), 0 0 60px rgba(139, 92, 246, 0.1)',
        'inner-glow': 'inset 0 0 20px rgba(99, 102, 241, 0.05), inset 0 0 40px rgba(99, 102, 241, 0.03)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.75rem',
        '5xl': '2.25rem'
      },
      keyframes: {
        pulseRing: {
          '0%':   { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2.4)', opacity: '0' }
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' }
        },
        fadeScale: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(1deg)' }
        },
        aurora: {
          '0%': { transform: 'translate(0%, 0%) rotate(0deg) scale(1)' },
          '33%': { transform: 'translate(5%, 8%) rotate(120deg) scale(1.1)' },
          '66%': { transform: 'translate(-3%, 4%) rotate(240deg) scale(0.95)' },
          '100%': { transform: 'translate(0%, 0%) rotate(360deg) scale(1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        breathe: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' }
        },
        orbitSlow: {
          '0%': { transform: 'rotate(0deg) translateX(40px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(40px) rotate(-360deg)' }
        }
      },
      animation: {
        pulseRing: 'pulseRing 2s ease-out infinite',
        slideUp: 'slideUp .4s cubic-bezier(0.16, 1, 0.3, 1) both',
        slideDown: 'slideDown .3s cubic-bezier(0.16, 1, 0.3, 1) both',
        fadeScale: 'fadeScale .35s cubic-bezier(0.16, 1, 0.3, 1) both',
        float: 'float 5s ease-in-out infinite',
        floatSlow: 'floatSlow 8s ease-in-out infinite',
        aurora: 'aurora 20s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        breathe: 'breathe 4s ease-in-out infinite',
        orbitSlow: 'orbitSlow 12s linear infinite'
      },
      backgroundImage: {
        'gradient-mesh': 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(6, 182, 212, 0.12) 0px, transparent 50%), radial-gradient(at 80% 100%, rgba(236, 72, 153, 0.1) 0px, transparent 50%), radial-gradient(at 0% 80%, rgba(16, 185, 129, 0.1) 0px, transparent 50%)',
      }
    }
  },
  plugins: []
}
