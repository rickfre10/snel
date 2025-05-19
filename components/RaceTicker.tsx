// components/RaceTicker.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { TickerEntry } from '../types/election'; // Ajuste o caminho se necessário

interface RaceTickerProps {
  data: TickerEntry[];
  colorMap: Record<string, string>; // Mantido, pois é usado para runnerUpColor
  interval?: number;
}

const FALLBACK_COLOR = '#A9A9A9';
const TEXT_COLOR_DARK = '#1F2937';
const TEXT_COLOR_LIGHT = '#FFFFFF';

function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return TEXT_COLOR_DARK;
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6 && hexcolor.length !== 3) return TEXT_COLOR_DARK; // Adicionada verificação para 3 caracteres hex
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(char => char + char).join('');
    }
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128 || hexcolor.toLowerCase() === 'ffffff' || hexcolor.toLowerCase() === '#ffffff') ? TEXT_COLOR_DARK : TEXT_COLOR_LIGHT;
    } catch (e) {
        return TEXT_COLOR_DARK;
    }
}

const RaceTicker: React.FC<RaceTickerProps> = ({ data, colorMap, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const timerId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % data.length);
    }, interval);
    return () => clearInterval(timerId);
  }, [data, interval]);

  if (!data || data.length === 0 || !data[currentIndex]) {
    return null;
  }

  const currentEntry = data[currentIndex];

  // winnerColor e winnerTagTextColor não são mais necessários para a tag de status principal
  // const winnerColor = currentEntry.winnerLegend ? (colorMap[currentEntry.winnerLegend] ?? FALLBACK_COLOR) : FALLBACK_COLOR;
  // const winnerTagTextColor = getTextColorForBackground(winnerColor);

  // Busca a cor do segundo colocado (mantido, pois é usado)
  const runnerUpColor = currentEntry.runnerUpLegend ? (colorMap[currentEntry.runnerUpLegend] ?? FALLBACK_COLOR) : FALLBACK_COLOR;

  return (
    <div className="bg-[#e0e0e0] text-gray-800 p-3 rounded-md shadow-sm overflow-hidden whitespace-nowrap border border-gray-300">
      <div className="flex items-center space-x-4 sm:space-x-6 text-sm sm:text-base justify-between">

        {/* 1. Localização (UF e Distrito) */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="bg-gray-500 text-white px-2 py-0.5 rounded text-xs font-medium">
            {currentEntry.stateId}
          </span>
          <span className="font-semibold truncate max-w-[100px] sm:max-w-[150px]" title={currentEntry.districtName}>
            {currentEntry.districtName}
          </span>
        </div>

        {/* 2. Status Dinâmico do Distrito (Atualizado) */}
        <div className="flex items-center flex-shrink-0 min-w-0"> {/* Classe condicional removida, pois o statusLabel deve ser informativo */}
        {currentEntry.statusLabel ? (
          <span
            className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" // Adicionado whitespace-nowrap
            style={{ 
              backgroundColor: currentEntry.statusBgColor, 
              color: currentEntry.statusTextColor 
            }}
          >
            {currentEntry.statusLabel}
          </span>
        ) : (
          // Fallback se, por algum motivo, statusLabel não estiver definido (não deveria acontecer com a nova lógica)
          <span className="text-xs italic text-gray-500 whitespace-nowrap">Apurando...</span>
        )}
        </div>

        {/* 3. Vencedor (Nome e %) - Com mais espaço */}
        <div className="flex items-center space-x-1.5 flex-grow min-w-0 justify-end text-right">
          {currentEntry.winnerName ? (
            <>
              <span className="font-bold truncate" title={currentEntry.winnerName}>{currentEntry.winnerName}</span>
              <span className="font-semibold text-xs sm:text-sm flex-shrink-0">({currentEntry.winnerPercentage?.toFixed(1) ?? '--'}%)</span>
            </>
          ) : (
            // Considerar se quer mostrar N/D ou nada se o statusLabel já for "TDS Ganhou", por exemplo.
            // Por enquanto, mantendo a lógica original de fallback N/D.
            <span className="text-gray-500 italic">N/D</span>
          )}
        </div>

        {/* 4. Segundo Colocado (Frente, Nome e %) - Com mais espaço */}
        <div className={`hidden sm:flex items-center space-x-1.5 flex-grow min-w-0 justify-end text-right ${(!currentEntry.runnerUpLegend && !currentEntry.runnerUpName) ? 'invisible' : ''}`}>
           <span className="text-gray-500 text-xs flex-shrink-0">2º:</span>
           {currentEntry.runnerUpLegend && (
             <span className="font-bold text-xs flex-shrink-0" style={{ color: runnerUpColor }}>
               {currentEntry.runnerUpLegend}
             </span>
           )}
           {currentEntry.runnerUpName && (
             <span className="truncate ml-1" title={currentEntry.runnerUpName ?? ''}> {/* Adicionado ?? '' para title */}
               {currentEntry.runnerUpName}
              </span>
           )}
           {/* Mostrar percentual apenas se existir */}
           {(typeof currentEntry.runnerUpPercentage === 'number') && (
             <span className="font-semibold text-xs flex-shrink-0">
               ({currentEntry.runnerUpPercentage.toFixed(1)}%)
             </span>
           )}
           {/* Fallback se não houver runnerUpLegend nem runnerUpName (apenas para ter algo, pode ser removido se 'invisible' for suficiente) */}
           {(!currentEntry.runnerUpLegend && !currentEntry.runnerUpName) && <span className="text-xs italic text-gray-500">N/D</span>}
        </div>

      </div>
    </div>
  );
};

export default RaceTicker;