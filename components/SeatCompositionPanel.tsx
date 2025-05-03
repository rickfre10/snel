// components/SeatCompositionPanel.tsx
"use client";
import React, { useMemo } from 'react';

// Props (sem mudanças)
interface SeatCompositionPanelProps {
  seatData: Record<string, number>;
  colorMap: Record<string, string>;
  totalSeats: number;
}

// Cores (sem mudanças)
const FALLBACK_COLOR = '#D1D5DB';
const UNDECIDED_COLOR = '#9CA3AF';



const SeatCompositionPanel: React.FC<SeatCompositionPanelProps> = ({ seatData, colorMap, totalSeats }) => {

  // Preparo dos dados (sem mudanças)
  const { sortedEntries, undecidedSeats } = useMemo(() => {
    // ... (código do useMemo como antes) ...
     let allocatedSeats = 0;
    const entries = Object.entries(seatData)
      .filter(([, seats]) => seats > 0)
      .map(([legend, seats]) => { allocatedSeats += seats; return { legend, seats }; })
      .sort((a, b) => b.seats - a.seats);
    const undecided = totalSeats - allocatedSeats;
    return { sortedEntries: entries, undecidedSeats: undecided > 0 ? undecided : 0 };
  }, [seatData, totalSeats]);

  // Cálculo da maioria (sem mudanças)
  const majorityThreshold = Math.floor(totalSeats / 2) + 1;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">

      {/* Container dos Cards: Flexbox com Wrap e Gap (removido justify-center) */}
      <div className="flex flex-wrap gap-3 mb-4"> {/* Alterado de grid para flex */}
        {/* Mapeia as frentes com assentos */}
        {sortedEntries.map(({ legend, seats }) => {
          const color = colorMap[legend] ?? FALLBACK_COLOR;

          return (
            // Card individual: REMOVIDO w-32, ADICIONADO flex-1
            <div
              key={legend}
              className={`flex-1 h-24 p-3 rounded-lg text-center flex flex-col justify-center items-center shadow text-white`}
              style={{ backgroundColor: color, minWidth: '100px' }} // minWidth evita que fiquem muito estreitos
            >
              <div className="font-bold text-sm sm:text-base break-words">{legend}</div>
              <div className="text-3xl font-bold mt-1">{seats}</div>
            </div>
          );
        })}

        {/* Card para Assentos "Em Disputa": REMOVIDO w-32, ADICIONADO flex-1 */}
        {undecidedSeats > 0 && (
           <div
              key="undecided"
              className={`flex-1 h-24 p-3 rounded-lg text-center flex flex-col justify-center items-center shadow text-white`} // Texto branco no cinza
              style={{ backgroundColor: UNDECIDED_COLOR, minWidth: '100px' }} // minWidth evita que fiquem muito estreitos
            >
              <div className="font-bold text-sm sm:text-base break-words">Em Disputa</div>
              <div className="text-3xl font-bold mt-1">{undecidedSeats}</div>
            </div>
        )}
      </div>

      {/* Linha da Maioria (sem mudanças) */}
      <div className="mt-auto pt-2 border-t border-gray-200 text-center text-sm text-gray-600">
        Maioria: {majorityThreshold} assentos de {totalSeats}
      </div>
    </div>
  );
};

export default SeatCompositionPanel;