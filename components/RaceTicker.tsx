// components/RaceTicker.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { TickerEntry } from '../types/election'

interface RaceTickerProps {
  data: TickerEntry[]; // Agora o tipo TickerEntry será encontrado
  colorMap: Record<string, string>;
  interval?: number;
}

interface RaceTickerProps {
  data: TickerEntry[];
  colorMap: Record<string, string>;
  interval?: number;
}

const RaceTicker: React.FC<RaceTickerProps> = ({ data, colorMap, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fallbackColor = '#A9A9A9'; // Cinza mais escuro para fallback de cor
  const textColor = '#1F2937'; // Cor de texto escura padrão (Tailwind gray-800)
  const separatorColor = '#9CA3AF'; // Cor do separador (Tailwind gray-400)

  // Efeito para ciclar (sem mudanças)
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
  const winnerColor = currentEntry.winnerLegend ? (colorMap[currentEntry.winnerLegend] ?? fallbackColor) : fallbackColor;
  const runnerUpColor = currentEntry.runnerUpLegend ? (colorMap[currentEntry.runnerUpLegend] ?? fallbackColor) : fallbackColor;

  return (
    // Container do Ticker: Fundo claro, texto escuro
    <div className="bg-[#CFCFCF] text-gray-800 p-3 rounded-md shadow overflow-hidden whitespace-nowrap">
      {/* Usamos flex para alinhar os itens horizontalmente */}
      <div className="flex items-center space-x-3 sm:space-x-4 text-sm sm:text-base justify-between">

        {/* Parte Esquerda: Localização */}
        <div className="flex items-center space-x-2 flex-shrink-0 min-w-0">
          {/* Label UF */}
          <span className="bg-gray-500 text-white px-2 py-0.5 rounded text-xs font-medium">{currentEntry.stateId}</span>
          {/* Nome Distrito (com largura mínima e truncado) */}
          <span className="font-semibold truncate min-w-[100px] sm:min-w-[150px]" title={currentEntry.districtName}>
            {currentEntry.districtName}
          </span>
        </div>

        {/* Separador */}
        <span className="text-gray-600 hidden md:inline">|</span>

        {/* Parte Central: Frente Liderando */}
        <div className={`flex items-center space-x-1.5 flex-shrink-0 min-w-0 ${!currentEntry.winnerLegend ? 'italic text-gray-500' : ''}`}>
          {currentEntry.winnerLegend ? (
            <>
              <span style={{ backgroundColor: winnerColor }} className="w-3 h-3 inline-block rounded-sm flex-shrink-0 border border-gray-400"></span>
              <span className="font-semibold text-xs uppercase">FRENTE Liderando:</span>
              <span className="font-bold" style={{ color: winnerColor }}>{currentEntry.winnerLegend}</span>
            </>
          ) : (
            <span>Sem Vencedor</span>
          )}
        </div>

        {/* Separador */}
        <span className="text-gray-600 hidden lg:inline">|</span>

        {/* Parte Direita: Detalhes Vencedor e 2º Colocado */}
        <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Info Vencedor */}
            {currentEntry.winnerLegend ? (
            <div className="flex items-center space-x-1 min-w-0">
                <span className="font-bold truncate" title={currentEntry.winnerName ?? ''}>{currentEntry.winnerName || 'N/D'}</span>
                <span className="font-semibold text-xs sm:text-sm">({currentEntry.winnerPercentage?.toFixed(1) ?? '--'}%)</span>
            </div>
            ) : (
             '' // Não mostra nada se não houver vencedor
            )}

            {/* Info Segundo Colocado (sempre ocupa espaço para estabilidade) */}
            <div className={`hidden sm:flex items-center space-x-1 flex-shrink-0 min-w-0 ${!currentEntry.runnerUpLegend ? 'invisible' : ''}`}> {/* Usa invisible para manter espaço */}
                <span className="text-gray-500 text-xs">2º:</span>
                <span className="font-bold text-xs" style={{ color: runnerUpColor }}>({currentEntry.runnerUpLegend || 'N/D'})</span>
                <span className="font-semibold text-xs">({currentEntry.runnerUpPercentage?.toFixed(1) ?? '--'}%)</span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default RaceTicker;