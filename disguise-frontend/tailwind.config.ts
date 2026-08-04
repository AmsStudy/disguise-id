import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-void': '#060D14',
        'bg-deep': '#0D1B2A',
        'bg-surface': '#112236',
        'bg-elevated': '#1A3350',
        teal: {
          900: '#003847',
          700: '#005F7A',
          500: '#0097B2',
          400: '#00B4D8',
          300: '#00CFE8',
        },
        cyan: {
          glow: '#00E5FF',
        },
        fox: {
          orange: '#FF6B35',
          warm: '#FF8C5A',
        },
        status: {
          critical: '#FF3D3D',
          high: '#FF6B35',
          medium: '#FFD600',
          low: '#00E676',
          online: '#00E676',
          offline: '#FF3D3D',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px',
        xl: '32px',
        pill: '999px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '40px',
        '2xl': '64px',
        '3xl': '96px',
      },
      animation: {
        'ring-cw': 'spin 8s linear infinite',
        'ring-ccw': 'spin 5s linear infinite reverse',
        'scan-beam': 'scanBeam 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'particle-drift': 'particleDrift 20s linear infinite',
        'glitch': 'glitch 10s infinite',
        'border-flow': 'borderFlow 3s linear infinite',
      },
      keyframes: {
        scanBeam: {
          '0%, 100%': { top: '5%', opacity: '0' },
          '50%': { top: '90%', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', boxShadow: '0 0 20px rgba(0, 151, 178, 0.4)' },
          '50%': { opacity: '1', boxShadow: '0 0 40px rgba(0, 229, 255, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        particleDrift: {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '50%': { transform: 'translateX(30px) translateY(-20px)' },
          '100%': { transform: 'translateX(0) translateY(0)' },
        },
        glitch: {
          '0%, 90%, 100%': { transform: 'translateX(0)', filter: 'none' },
          '92%': { transform: 'translateX(-2px)', filter: 'drop-shadow(2px 0 #00E5FF)' },
          '94%': { transform: 'translateX(2px)', filter: 'drop-shadow(-2px 0 #FF6B35)' },
          '96%': { transform: 'translateX(-1px)', filter: 'none' },
          '98%': { transform: 'translateX(0)', filter: 'none' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
      boxShadow: {
        'glow-teal': '0 0 20px rgba(0, 151, 178, 0.4), 0 0 60px rgba(0, 151, 178, 0.15)',
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.5), 0 0 80px rgba(0, 229, 255, 0.2)',
        'glow-orange': '0 0 20px rgba(255, 107, 53, 0.4), 0 0 60px rgba(255, 107, 53, 0.15)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(0, 151, 178, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 151, 178, 0.1) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-40': '40px 40px',
      },
    },
  },
  plugins: [],
};

export default config;
