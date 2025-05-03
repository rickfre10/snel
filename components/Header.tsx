// components/Header.tsx
import React from 'react';
import Image from 'next/image'; // Importa o componente otimizado de imagem do Next.js

const Header: React.FC = () => {
  return (
    // Tag <header> para semântica
    // Estilos Tailwind como definidos antes
    <header className="bg-highlight text-white p-3 sm:p-4 rounded-b-lg shadow-md flex items-center justify-between text-sm">
      {/* Lado Esquerdo: Logo */}
      <div className="flex items-center space-x-3">
        {/* Logo Atualizado */}
        <Image
          src="/smartv_logo.png" // <-- ATUALIZADO com seu arquivo
          alt="Smartv Logo"     // <-- ATUALIZADO com seu alt text
          width={120}           // <-- AJUSTE para LARGURA real da imagem (em pixels)
          height={30}           // <-- AJUSTE para ALTURA real da imagem (em pixels)
          priority
          className="h-6 md:h-8 w-auto" // Controla o tamanho exibido na tela
        />
        <span className="font-bold text-lg">Eleições</span>
      </div>

      {/* Lado Direito: Ano da Eleição */}
      <div>
        <span className="font-semibold">2022</span>
      </div>
    </header>
  );
};

export default Header;