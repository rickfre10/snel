// app/(2022)/layout.tsx
// Layout do painel 2022 (dados vindos do Google Sheets). Mantém o visual original.
import Header from '@/components/Header';

export default function Layout2022({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-900 font-sans">
      <Header />
      <div className="flex-grow">{children}</div>
    </div>
  );
}
