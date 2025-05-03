// app/layout.tsx
import type { Metadata } from 'next';
// 1. Importa Poppins de next/font/google
import { Poppins } from 'next/font/google';
import './globals.css'; // Mantém a importação do CSS global

// 2. Configura a fonte Poppins
const poppins = Poppins({
  subsets: ['latin'], // Subconjuntos de caracteres (latin é o mais comum)
  // Especifique os pesos (font-weights) que você realmente vai usar
  // Ex: 400=regular, 600=semibold, 700=bold, 900=black/extrabold
  weight: ['400', '600', '700', '900'],
  display: 'swap', // Estratégia de exibição (swap é bom para performance)
  variable: '--font-poppins', // Define uma variável CSS para a fonte (opcional, mas útil)
});

// Metadata (pode já existir no seu arquivo)
export const metadata: Metadata = {
  title: 'Painel Apuração Haagar', // Ajuste se necessário
  description: 'Simulador de apuração eleitoral Haagar',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // 3. Aplica a variável da fonte na tag <html> ou <body>
    // Adiciona também 'font-sans' para que Tailwind use a variável como padrão sans-serif (ver passo 2)
    <html lang="pt-BR" className={`${poppins.variable} font-sans`}>
      {/* Ou aplique diretamente no body se preferir: <body className={poppins.className}> */}
      {/* Usar a variável é mais flexível com Tailwind */}
      <body>
        {children}
      </body>
    </html>
  );
}