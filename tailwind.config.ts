// tailwind.config.ts
import type { Config } from 'tailwindcss';
// Importa os temas padrão do Tailwind para usar como fallback
const defaultTheme = require('tailwindcss/defaultTheme');

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Define a variável CSS --font-poppins como a fonte principal da família 'sans'
        // Inclui fontes de fallback padrão do sistema
        sans: ['var(--font-poppins)', ...defaultTheme.fontFamily.sans],
        tv: ['var(--tv-font)', ...defaultTheme.fontFamily.sans],
        tvmono: ['var(--tv-mono)', ...defaultTheme.fontFamily.mono],
        // Se você quisesse um nome específico, poderia ser:
        // poppins: ['var(--font-poppins)', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        highlight: '#ff1616',
        // Cores do telão 2026 — definidas por tema de marca em lib/brand.ts
        tv: {
          bg: 'rgb(var(--tv-bg) / <alpha-value>)',
          glow: 'rgb(var(--tv-bg-glow) / <alpha-value>)',
          surface: 'rgb(var(--tv-surface) / <alpha-value>)',
          surface2: 'rgb(var(--tv-surface2) / <alpha-value>)',
          border: 'rgb(var(--tv-border) / <alpha-value>)',
          text: 'rgb(var(--tv-text) / <alpha-value>)',
          muted: 'rgb(var(--tv-muted) / <alpha-value>)',
          accent: 'rgb(var(--tv-accent) / <alpha-value>)',
          'accent-text': 'rgb(var(--tv-accent-text) / <alpha-value>)',
          accent2: 'rgb(var(--tv-accent2) / <alpha-value>)',
          kicker: 'rgb(var(--tv-kicker) / <alpha-value>)',
          tarja: 'rgb(var(--tv-tarja) / <alpha-value>)',
          live: 'rgb(var(--tv-live) / <alpha-value>)',
          paper: 'rgb(var(--tv-paper) / <alpha-value>)',
          ink: 'rgb(var(--tv-ink) / <alpha-value>)',
        },
        // ... outras cores personalizadas ...
      },
      // ... outras extensões ...
    },
  },
  plugins: [],
};
export default config;