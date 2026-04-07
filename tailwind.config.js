/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Brand palette
        ink: '#1D1836',
        orange: '#FF6A00',
        yellow: '#FFD84D',
        blue: '#63C7FF',
        pink: '#FF6FB5',
        cream: '#FFF8F1',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    'bg-blue-50', 'bg-yellow-50', 'bg-green-50', 'bg-red-50', 'bg-orange-50', 'bg-purple-50',
    'border-blue-200', 'border-yellow-200', 'border-green-200', 'border-red-200',
    'border-blue-300', 'border-yellow-300', 'border-orange-300',
    'text-blue-700', 'text-yellow-700', 'text-green-700', 'text-red-700',
    'text-blue-600', 'text-orange-600', 'text-yellow-600',
    'bg-blue-100', 'bg-orange-100', 'bg-yellow-100', 'bg-red-100', 'bg-purple-100', 'bg-gray-100',
    'text-blue-700', 'text-orange-700', 'text-yellow-700', 'text-red-700', 'text-purple-700', 'text-gray-600',
    'border-blue-200', 'border-orange-200', 'border-yellow-200',
    'bg-ink', 'text-ink', 'border-ink',
    'bg-orange', 'text-orange', 'border-orange',
    'bg-yellow', 'text-yellow', 'border-yellow',
    'bg-blue', 'text-blue', 'border-blue',
    'bg-pink', 'text-pink', 'border-pink',
    'bg-cream', 'text-cream',
  ]
}