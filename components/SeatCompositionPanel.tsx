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

// Helper para Contraste de Texto (Mantido caso queira reativar ou para referência)
function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return '#1F2937';
    hexcolor = hexcolor.replace("#", "");
    const r = parseInt(hexcolor.substring(0, 2), 16);
    const g = parseInt(hexcolor.substring(2, 4), 16);
    const b = parseInt(hexcolor.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1F2937' : '#FFFFFF';
}

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

      {/* Container dos Cards: Usa Flexbox com Wrap e Gap */}
      {/* flex-wrap permite que os itens quebrem para a próxima linha se não couberem */}
      {/* gap-3 adiciona espaço entre os cards */}
      <div className="flex flex-wrap gap-3 justify-center mb-4"> {/* mb-4 para espaço antes da linha da maioria */}
        {sortedEntries.map(([legend, seats]) => {
          const color = colorMap[legend] ?? FALLBACK_COLOR;
          // Forçando texto branco como solicitado antes (removido cálculo de contraste)
          const textColor = 'text-white';

          return (
            // Card individual da frente/coalizão
            <div
              key={legend}
              // Tamanho Fixo + Estilos: Ajuste w- e h- conforme necessário
              className={`w-32 h-24 ${textColor} p-3 rounded-lg text-center flex flex-col justify-center items-center shadow`}
              style={{ backgroundColor: color }}
            >
              {/* Nome da Frente */}
              <div className="font-bold text-sm break-words">{legend}</div>
              {/* Número de Assentos - Ajustado */}
              <div className="text-3xl font-bold mt-1">{seats}</div>
            </div>
          );
        })}
      </div>

      {/* Linha da Maioria */}
      <div className="mt-auto pt-2 border-t border-gray-200 text-center text-sm text-gray-600"> {/* mt-auto empurra para baixo se houver espaço extra */}
        Maioria: {majorityThreshold} assentos
      </div>
    </div>
  );
};

export default SeatCompositionPanel;