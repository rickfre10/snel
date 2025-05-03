// components/SeatCompositionPanel.tsx
"use client";
import React, { useMemo } from 'react';

// Props esperadas pelo componente (as mesmas de antes)
interface SeatCompositionPanelProps {
  seatData: Record<string, number>; // { "TDS": 40, "UNI": 55, ... }
  colorMap: Record<string, string>; // { "TDS": "#19cf7d", "UNI": "#f5cf11", ... }
  totalSeats: number; // Total de assentos na câmara/disputa (ex: 120)
}

// Cor fallback caso uma frente não tenha cor no colorMap
const FALLBACK_COLOR = '#D1D5DB'; // Cinza claro (Tailwind gray-300)

// --- Helper para Contraste de Texto ---
// Retorna 'black' ou 'white' dependendo do brilho da cor de fundo (hex)
function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return '#111827'; // Retorna cor escura se não houver cor de fundo
    // Remove o '#' se presente
    hexcolor = hexcolor.replace("#", "");
    // Converte hex para RGB
    const r = parseInt(hexcolor.substring(0, 2), 16);
    const g = parseInt(hexcolor.substring(2, 4), 16);
    const b = parseInt(hexcolor.substring(4, 6), 16);
    // Fórmula YIQ para brilho percebido
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    // Retorna preto para fundos claros (YIQ >= 128) e branco para fundos escuros
    return (yiq >= 128) ? '#1F2937' : '#FFFFFF'; // Cores Tailwind gray-800 e white
}
// -----------------------------------

const SeatCompositionPanel: React.FC<SeatCompositionPanelProps> = ({ seatData, colorMap, totalSeats }) => {

  // Prepara e ordena os dados (maior número de assentos primeiro)
  const sortedEntries = useMemo(() => {
    return Object.entries(seatData)
      .filter(([, seats]) => seats > 0) // Filtra frentes sem assentos
      .sort(([, seatsA], [, seatsB]) => seatsB - seatsA); // Ordena
  }, [seatData]);

  // Calcula maioria simples
  const majorityThreshold = Math.floor(totalSeats / 2) + 1;

  return (
    // Container principal do painel
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-4 text-center text-gray-700">
        Composição da Câmara (Distrital)
      </h3>

      {/* Grid para os cards das frentes */}
      {/* Ajuste grid-cols-* para o número de colunas desejado em diferentes tamanhos de tela */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-grow content-start">
        {sortedEntries.map(([legend, seats]) => {
          const color = colorMap[legend] ?? FALLBACK_COLOR;
          const textColor = getTextColorForBackground(color); // Calcula cor do texto para contraste

          return (
            // Card individual da frente/coalizão
            <div
              key={legend}
              className="p-4 rounded-lg text-center flex flex-col justify-center items-center shadow"
              style={{ backgroundColor: color, color: textColor, minHeight: '80px' }} // Define cor de fundo, cor do texto e altura mínima
            >
              {/* Nome da Frente/Coalizão */}
              <div className="font-bold text-sm sm:text-base break-words">{legend}</div>
              {/* Número de Assentos */}
              <div className="text-2xl font-black mt-1">{seats}</div>
            </div>
          );
        })}
      </div>

      {/* Linha da Maioria */}
      <div className="mt-4 pt-2 border-t border-gray-200 text-center text-sm text-gray-600">
        Maioria: {majorityThreshold} assentos
      </div>
    </div>
  );
};

export default SeatCompositionPanel;