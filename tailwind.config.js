/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glow-cyan': 'radial-gradient(circle at 50% 50%, rgba(79, 175, 254, 0.3), transparent 60%)',
        'glow-fuchsia': 'radial-gradient(circle at 50% 50%, rgba(255, 107, 107, 0.3), transparent 60%)',
        'glass-panel': 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(79, 175, 254, 0.3)',
        'glow-red': '0 0 20px rgba(255, 107, 107, 0.3)',
        'glow-green': '0 0 20px rgba(132, 255, 176, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(79, 175, 254, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(79, 175, 254, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
