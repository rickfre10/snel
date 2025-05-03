// components/SeatCompositionPanel.tsx
"use client";
import React, { useMemo } from 'react';

// Props esperadas (as mesmas de antes)
interface SeatCompositionPanelProps {
  seatData: Record<string, number>; // { "TDS": 40, "UNI": 55, ... }
  colorMap: Record<string, string>; // { "TDS": "#19cf7d", "UNI": "#f5cf11", ... }
  totalSeats: number; // Total de assentos na câmara/disputa (ex: 120)
}

// Cor fallback e cor para não alocados
const FALLBACK_COLOR = '#D1D5DB'; // Cinza claro (Tailwind gray-300)
const UNFILLED_COLOR = '#E5E7EB'; // Cinza mais claro (Tailwind gray-200)

// Interface para os dados preparados para a barra e legenda
interface SegmentData {
    name: string;
    value: number;
    percentage: string; // Formatado como string 'X.Y'
    color: string;
}

const SeatCompositionPanel: React.FC<SeatCompositionPanelProps> = ({ seatData, colorMap, totalSeats }) => {

  // Prepara os dados, incluindo 'Não Alocado'
  const chartData: SegmentData[] = useMemo(() => {
    let allocatedSeats = 0;
    const allocatedData = Object.entries(seatData)
      .map(([legend, seats]) => {
        allocatedSeats += seats;
        const color = colorMap[legend] ?? FALLBACK_COLOR[Math.floor(Math.random() * FALLBACK_COLOR.length)];
        const percentage = totalSeats > 0 ? ((seats / totalSeats) * 100) : 0;
        return { name: legend, value: seats, percentage: percentage.toFixed(1), color: color };
      })
      .filter(item => item.value > 0) // Garante frentes com assentos
      .sort((a, b) => b.value - a.value); // Ordena

    const unfilledSeats = totalSeats - allocatedSeats;
    const finalData = [...allocatedData];

    if (unfilledSeats > 0) {
      const unfilledPercentage = totalSeats > 0 ? ((unfilledSeats / totalSeats) * 100) : 0;
      finalData.push({
        name: 'Não Alocado',
        value: unfilledSeats,
        percentage: unfilledPercentage.toFixed(1),
        color: UNFILLED_COLOR,
      });
    }
    // Não ordenar novamente para manter 'Não Alocado' no final, se adicionado
    return finalData;
  }, [seatData, colorMap, totalSeats]);

  // Calcula maioria simples
  const majorityThreshold = Math.floor(totalSeats / 2) + 1;

  return (
    // Container principal do painel
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-4 text-center text-gray-700">
        Composição da Câmara (Distrital)
      </h3>

      {/* --- BARRA DE COMPOSIÇÃO --- */}
      <div className="w-full h-8 flex rounded overflow-hidden border border-gray-300 my-2" title={`Total: ${totalSeats} assentos`}>
        {/* Mapeia os dados para criar os segmentos coloridos */}
        {chartData.map((segment) => (
          <div
            key={segment.name}
            className="h-full transition-all duration-300 ease-in-out" // Altura total, transição suave
            style={{
              backgroundColor: segment.color,
              // Largura é a porcentagem de assentos
              width: `${segment.percentage}%`,
            }}
            // Tooltip simples mostrando os detalhes ao passar o mouse
            title={`${segment.name}: ${segment.value} (${segment.percentage}%)`}
          >
            {/* Pode adicionar texto dentro se a fatia for grande o suficiente, mas tooltip é mais seguro */}
            {/* <span className="text-xs text-white">{segment.name}</span> */}
          </div>
        ))}
      </div>
      {/* --- FIM DA BARRA --- */}


      {/* Legenda Detalhada (Mantida abaixo da barra) */}
      <div className="mt-4 space-y-1 text-xs sm:text-sm"> {/* Tamanho de fonte menor para legenda */}
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between">
            <div className="flex items-center">
              <span style={{ backgroundColor: entry.color }} className="w-3 h-3 inline-block mr-2 rounded-sm flex-shrink-0 border border-gray-300"></span>
              <span className="text-gray-800 font-medium">{entry.name}</span>
            </div>
            <div className="text-right">
                 <span className="font-semibold text-gray-900">{entry.value}</span>
                 <span className="text-gray-500 ml-1">({entry.percentage}%)</span>
            </div>
          </div>
        ))}
        {/* Linha Total */}
        <div className="flex items-center justify-between font-bold pt-2 border-t mt-2">
            <span>TOTAL</span>
            <span>{totalSeats}</span>
        </div>
      </div>

       {/* Linha da Maioria (Mantida no final) */}
       <div className="mt-3 pt-2 border-t border-gray-200 text-center text-sm text-gray-600">
        Maioria: {majorityThreshold} assentos
      </div>

    </div>
  );
};

export default SeatCompositionPanel;