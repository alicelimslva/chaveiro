import animate from 'tailwindcss-animate';

// Cores do shadcn/ui: lidas das variáveis CSS em src/index.css (formato HSL do Tailwind v3).
const v = (name) => `hsl(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        // brand alinhado ao amarelo-ouro do tema (--primary).
        brand: { 50: '#2a2410', 100: '#3d3312', 400: '#ffb800', 500: '#ffc933', 600: '#e0a200', 700: '#b88500' },
        'card-hover': v('card-hover'),
        field: v('field'),
        ink: v('ink'),
        text: { strong: v('text-strong'), soft: v('text-soft'), faint: v('text-faint') },
        state: { late: v('state-late'), today: v('state-today'), tomorrow: v('state-tomorrow'), ready: v('state-ready') },
        whatsapp: v('whatsapp'),
        background: v('background'),
        foreground: v('foreground'),
        card: { DEFAULT: v('card'), foreground: v('card-foreground') },
        popover: { DEFAULT: v('popover'), foreground: v('popover-foreground') },
        primary: { DEFAULT: v('primary'), foreground: v('primary-foreground') },
        secondary: { DEFAULT: v('secondary'), foreground: v('secondary-foreground') },
        muted: { DEFAULT: v('muted'), foreground: v('muted-foreground') },
        accent: { DEFAULT: v('accent'), foreground: v('accent-foreground') },
        destructive: { DEFAULT: v('destructive'), foreground: v('destructive-foreground') },
        border: v('border'),
        input: v('input'),
        ring: v('ring'),
        chart: { 1: v('chart-1'), 2: v('chart-2'), 3: v('chart-3'), 4: v('chart-4'), 5: v('chart-5') },
        sidebar: {
          DEFAULT: v('sidebar'),
          foreground: v('sidebar-foreground'),
          primary: v('sidebar-primary'),
          'primary-foreground': v('sidebar-primary-foreground'),
          accent: v('sidebar-accent'),
          'accent-foreground': v('sidebar-accent-foreground'),
          border: v('sidebar-border'),
          ring: v('sidebar-ring'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        card: '1.125rem',
        control: '0.875rem',
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px -12px rgba(0,0,0,0.6)',
        glow: '0 8px 24px -8px rgba(255,184,0,0.45)',
        'glow-lg': '0 10px 30px -8px rgba(255,184,0,0.6)',
      },
    },
  },
  plugins: [animate],
};
