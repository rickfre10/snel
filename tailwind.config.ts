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
        // Se você quisesse um nome específico, poderia ser:
        // poppins: ['var(--font-poppins)', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        highlight: '#ff1616',
        // ... outras cores personalizadas ...
      },
      // ... outras extensões ...
    },
  },
  plugins: [],
};
export default config;