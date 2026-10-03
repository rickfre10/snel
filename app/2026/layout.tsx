// app/2026/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Eleições 2026 · Haagar',
  description: 'Telão interativo da apuração das eleições 2026 de Haagar',
};

export default function Layout2026({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
