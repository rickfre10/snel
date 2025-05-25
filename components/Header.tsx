// components/Header.tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const Header: React.FC = () => {
  return (
    // Tag <header> para semântica
    // Estilos Tailwind como definidos antes
    <header className="bg-highlight text-white p-3 sm:p-4 rounded-b-lg shadow-md flex items-center justify-between text-sm">
      {/* Lado Esquerdo: Logo */}
      <Link href="/" className="flex items-center space-x-3 cursor-pointer group"> {/* Adicionado cursor-pointer e group para possíveis estilos de hover nos filhos */}
    {/* Logo Atualizado */}
      <Image
      src="/smartv_logo.png"
     alt="Smartv Logo"
      width={120}
      height={30}
      priority
     className="h-6 md:h-8 w-auto"
      />
      <span className="font-bold text-lg text-gray-800 group-hover:text-grey-800 transition-colors"> {/* Exemplo de mudança de cor no hover */}
        Eleições
      </span>
      </Link>

      {/* Lado Direito: Ano da Eleição */}
      <div>
        <span className="font-semibold">2022</span>
      </div>
    </header>
  );
};

export default Header;