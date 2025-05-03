// components/RaceTicker.tsx
"use client";
import React, { useState, useEffect } from 'react';

// Interface para os dados que este componente espera para cada "slide"
// Certifique-se que as propriedades aqui batem com o que é gerado no useMemo em page.tsx
export interface TickerEntry {
  districtId: number;
  districtName: string;
  stateId: string;
  stateName: string;
  winnerName: string | null;
  winnerLegend: string | null;
  winnerPercentage: number | null;
  runnerUpLegend: string | null;
  runnerUpPercentage: number | null;
}

interface RaceTickerProps {
  data: TickerEntry[];
  colorMap: Record<string, string>; // Mapa de cores { "TDS": "#cor", ... }
  interval?: number; // Intervalo em milissegundos
}

const RaceTicker: React.FC<RaceTickerProps> = ({ data, colorMap, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fallbackColor = '#6B7280'; // Cinza para legendas sem cor

  // Efeito para ciclar o índice
  useEffect(() => {
    if (!data || data.length === 0) return;

    const timerId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % data.length);
    }, interval);

    return () => clearInterval(timerId); // Limpa o timer ao desmontar
  }, [data, interval]);

  if (!data || data.length === 0 || !data[currentIndex]) {
    return null; // Não renderiza nada se não houver dados
  }

  const currentEntry = data[currentIndex];
  const winnerColor = currentEntry.winnerLegend ? (colorMap[currentEntry.winnerLegend] ?? fallbackColor) : fallbackColor;
  const runnerUpColor = currentEntry.runnerUpLegend ? (colorMap[currentEntry.runnerUpLegend] ?? fallbackColor) : fallbackColor;

  return (
    <div className="bg-gray-800 text-white p-3 rounded-md shadow overflow-hidden whitespace-nowrap">
      {/* Animação simples de slide/fade pode ser adicionada com CSS ou libs, mas mantendo simples por enquanto */}
      <div className="flex items-center space-x-3 sm:space-x-4 text-sm sm:text-base">
        {/* Info Localização */}
        <div className="font-semibold flex-shrink-0 min-w-0"> {/* min-w-0 ajuda no truncate */}
          <span className="bg-gray-600 px-2 py-0.5 rounded text-xs mr-1">{currentEntry.stateId}</span>
          <span className="truncate inline-block align-middle" title={currentEntry.districtName}>
            {currentEntry.districtName.length > 20 ? `${currentEntry.districtName.substring(0, 18)}...` : currentEntry.districtName}
          </span>
        </div>

        {/* Separador */}
        <span className="text-gray-500">|</span>

        {/* Info Vencedor */}
        {currentEntry.winnerLegend ? (
          <div className="flex items-center space-x-2 min-w-0">
            <span className="font-bold flex-shrink-0" style={{ color: winnerColor }}>({currentEntry.winnerLegend})</span>
            <span className="truncate" title={currentEntry.winnerName ?? ''}>{currentEntry.winnerName || 'N/D'}</span>
            <span className="font-semibold flex-shrink-0">{currentEntry.winnerPercentage?.toFixed(1) ?? '--'}%</span>
          </div>
        ) : (
            <span className="text-gray-400 italic flex-shrink-0">Sem Vencedor</span>
        )}

        {/* Info Segundo Colocado */}
        {currentEntry.runnerUpLegend && (
          <>
            <span className="text-gray-500 hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center space-x-2 flex-shrink-0 min-w-0">
                <span className="font-bold flex-shrink-0" style={{ color: runnerUpColor }}>({currentEntry.runnerUpLegend})</span>
                <span className="font-semibold flex-shrink-0">{currentEntry.runnerUpPercentage?.toFixed(1) ?? '--'}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RaceTicker; // Garante que o componente é exportado por padrão