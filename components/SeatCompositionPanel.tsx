// components/SeatCompositionPanel.tsx
"use client";
import React, { useMemo } from 'react';

// Props esperadas
interface SeatCompositionPanelProps {
  seatData: Record<string, number>; // { "TDS": 40, "UNI": 55, ... }
  colorMap: Record<string, string>; // { "TDS": "#19cf7d", "UNI": "#f5cf11", ... }
  totalSeats: number; // Total de assentos distritais (ex: 120)
}

// Cores
const FALLBACK_COLOR = '#D1D5DB'; // Cinza claro fallback
const UNDECIDED_COLOR = '#9CA3AF'; // Cinza um pouco mais escuro (Tailwind gray-400) para contraste

// Helper para Contraste de Texto (opcional, mas útil)
function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return '#1F2937';
    hexcolor = hexcolor.replace("#", "");
    // Evita erro se hex for inválido
    if (hexcolor.length !== 6) return '#1F2937';
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1F2937' : '#FFFFFF';
    } catch (e) {
        return '#1F2937'; // Cor escura em caso de erro no parse
    }
}

const SeatCompositionPanel: React.FC<SeatCompositionPanelProps> = ({ seatData, colorMap, totalSeats }) => {

  // Prepara dados das frentes E calcula assentos não alocados
  const { sortedEntries, undecidedSeats } = useMemo(() => {
    let allocatedSeats = 0;
    const entries = Object.entries(seatData)
      .filter(([, seats]) => seats > 0) // Filtra frentes sem assentos
      .map(([legend, seats]) => {
        allocatedSeats += seats; // Soma assentos alocados
        return { legend, seats }; // Retorna objeto simples para ordenação
      })
      .sort((a, b) => b.seats - a.seats); // Ordena

    const undecided = totalSeats - allocatedSeats;

    return {
        sortedEntries: entries, // Array de { legend: string, seats: number } ordenado
        undecidedSeats: undecided > 0 ? undecided : 0 // Garante que não seja negativo
    };
  }, [seatData, totalSeats]);

  // Calcula maioria simples
  const majorityThreshold = Math.floor(totalSeats / 2) + 1;

  return (
    // Container principal do painel
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-4 text-center text-gray-700">
      </h3>

      {/* Container Flex para os cards */}
      <div className="flex flex-wrap gap-3 justify-center mb-4">
        {/* Mapeia as frentes com assentos */}
        {sortedEntries.map(({ legend, seats }) => {
          const color = colorMap[legend] ?? FALLBACK_COLOR;
          const textColor = getTextColorForBackground(color); // Calcula cor do texto

          return (
            <div
              key={legend}
              className={`w-32 h-24 p-3 rounded-lg text-center flex flex-col justify-center items-center shadow`}
              style={{ backgroundColor: color, color: textColor }}
            >
              <div className="font-bold text-sm sm:text-base break-words">{legend}</div>
              <div className="text-3xl font-bold mt-1">{seats}</div>
            </div>
          );
        })}

        {/* Card para Assentos "Em Disputa" (se houver) */}
        {undecidedSeats > 0 && (
           <div
              key="undecided"
              className={`w-32 h-24 p-3 rounded-lg text-center flex flex-col justify-center items-center shadow text-white`} // Texto branco no cinza
              style={{ backgroundColor: UNDECIDED_COLOR }}
            >
              <div className="font-bold text-sm sm:text-base break-words">Em Disputa</div>
              <div className="text-3xl font-bold mt-1">{undecidedSeats}</div>
            </div>
        )}
      </div>

      {/* Linha da Maioria */}
      <div className="mt-auto pt-2 border-t border-gray-200 text-center text-sm text-gray-600">
        Maioria: {majorityThreshold} assentos de {totalSeats}
      </div>
    </div>
  );
};

export default SeatCompositionPanel;