// app/layout.tsx
import type { Metadata } from 'next';
// 1. Importa Poppins de next/font/google
import { Poppins } from 'next/font/google';
import './globals.css'; // Mantém a importação do CSS global
import Header from '../components/Header';

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
  <html lang="pt-BR" className={`${poppins.variable} font-sans`}>
    {/* O body agora tem flex-col para o header ficar em cima e o main ocupar o resto */}
    <body className="flex flex-col min-h-screen bg-gray-100 text-gray-900">
      <Header /> {/* <-- 2. Adicione o Header aqui */}

      {/* Adiciona flex-grow para que o main ocupe o espaço restante */}
      <div className="flex-grow">
         {children} {/* O conteúdo da página (page.tsx) será renderizado aqui */}
      </div>

      {/* Você poderia adicionar um Footer aqui também, se quisesse */}
      {/* <Footer /> */}
    </body>
  </html>
  );
}