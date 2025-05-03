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
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-grow content-start">
            {sortedEntries.map(([legend, seats]) => {
                const color = colorMap[legend] ?? FALLBACK_COLOR;
                // const textColor = getTextColorForBackground(color); // LINHA REMOVIDA

                return (
                    <div
                        key={legend}
                        // Adiciona text-white ou text-gray-100 aqui
                        // text-shadow pode ajudar na legibilidade em fundos claros
                        className="p-4 rounded-lg text-center flex flex-col justify-center items-center shadow text-white"
                        style={{
                            backgroundColor: color,
                            // Removemos 'color: textColor'
                            minHeight: '80px',
                            // Exemplo de text-shadow (opcional, ajuste a cor/desfoque se necessário):
                            // textShadow: '1px 1px 2px rgba(0, 0, 0, 0.6)'
                        }}
                    >
                        {/* Nome da Frente */}
                        <div className="font-bold text-sm sm:text-base break-words">{legend}</div>
                        {/* Número de Assentos - Ajustado */}
                        <div className="text-3xl font-bold mt-1">{seats}</div> {/* Mudado de text-2xl font-black */}
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