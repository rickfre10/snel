// app/layout.tsx
import type { Metadata } from 'next';
import { Poppins, Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';

// Fonte do painel 2022
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  display: 'swap',
  variable: '--font-poppins',
});

// Fontes disponíveis para os temas de marca do painel 2026 (ver lib/brand.ts)
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-outfit',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
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
