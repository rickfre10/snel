// components/SeatCompositionPanel.tsx
"use client";
import React from 'react';

interface SeatCompositionPanelProps {
  // Objeto onde a chave é a legenda da frente (ex: "TDS") e o valor é o nº de assentos
  seatData: Record<string, number>;
  // Mapa de cores { "TDS": "#cor", ... }
  colorMap: Record<string, string>;
  // Total de assentos sendo disputados/exibidos (para contexto, ex: 120 distritais)
  totalSeats: number;
}

const SeatCompositionPanel: React.FC<SeatCompositionPanelProps> = ({ seatData, colorMap, totalSeats }) => {
  // Ordena as frentes por número de assentos (maior primeiro)
  const sortedEntries = Object.entries(seatData).sort(([, seatsA], [, seatsB]) => seatsB - seatsA);
  const fallbackColor = '#D1D5DB'; // Cinza claro para frentes sem cor definida

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-semibold mb-3 text-gray-700">Composição Distrital (Assentos)</h3>
      <div className="space-y-2">
        {sortedEntries.map(([legend, seats]) => {
          const color = colorMap[legend] ?? fallbackColor;
          const percentage = totalSeats > 0 ? ((seats / totalSeats) * 100).toFixed(1) : 0;

          return (
            <div key={legend} className="flex items-center justify-between text-sm">
              {/* Barra colorida + Nome */}
              <div className="flex items-center flex-grow mr-2">
                 {/* Pequeno quadrado de cor */}
                 <span style={{ backgroundColor: color }} className="w-3 h-3 inline-block mr-2 rounded-sm flex-shrink-0"></span>
                 <span className="text-gray-800 font-medium truncate" title={legend}>{legend}</span>
              </div>
               {/* Número e Percentual */}
               <div className="flex-shrink-0 text-right">
                 <span className="font-semibold text-gray-900">{seats}</span>
                 <span className="text-gray-500 ml-1">({percentage}%)</span>
               </div>

            </div>
          );
        })}
        {/* Linha Total (opcional) */}
        <div className="flex items-center justify-between text-sm font-bold pt-2 border-t mt-2">
            <span>TOTAL</span>
            <span>{totalSeats}</span>
        </div>
      </div>
    </div>
  );
};

export default SeatCompositionPanel;