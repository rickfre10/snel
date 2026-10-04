// app/layout.tsx
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Fontes salvas no projeto (app/fonts) — o build não depende do Google Fonts.

// Fonte do painel 2022
const poppins = localFont({
  src: [
    { path: './fonts/poppins-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/poppins-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/poppins-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/poppins-latin-900-normal.woff2', weight: '900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-poppins',
});

// Fontes disponíveis para os temas de marca do painel 2026 (ver lib/brand.ts)
const outfit = localFont({
  src: [
    { path: './fonts/outfit-latin-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/outfit-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/outfit-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/outfit-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/outfit-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/outfit-latin-800-normal.woff2', weight: '800', style: 'normal' },
    { path: './fonts/outfit-latin-900-normal.woff2', weight: '900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-outfit',
});
const jetbrainsMono = localFont({
  src: [
    { path: './fonts/jetbrains-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/jetbrains-mono-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Smartv Eleições · Haagar',
  description: 'Painéis de apuração eleitoral de Haagar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
