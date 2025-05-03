// components/RaceTicker.tsx
"use client";
import React, { useState, useEffect } from 'react';
// Importa o tipo TickerEntry do local correto (ajuste o caminho se necessário)
import { TickerEntry } from '../types/election';

// Interface de Props que o componente recebe
interface RaceTickerProps {
  data: TickerEntry[];
  colorMap: Record<string, string>; // Mapa de cores { "TDS": "#cor", ... }
  interval?: number; // Intervalo em milissegundos
}

// Cor fallback caso uma frente não tenha cor no colorMap
const FALLBACK_COLOR = '#A9A9A9'; // Cinza para fallback de cor
const TEXT_COLOR_DARK = '#1F2937'; // Cor de texto escura padrão (Tailwind gray-800)
const TEXT_COLOR_LIGHT = '#FFFFFF'; // Cor de texto clara padrão (white)

// --- Helper para Contraste de Texto ---
// Retorna uma cor de texto (escura ou clara) legível sobre a cor de fundo hex
function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return TEXT_COLOR_DARK;
    hexcolor = hexcolor.replace("#", "");
    // Evita erro se hex for inválido
    if (hexcolor.length !== 6) return TEXT_COLOR_DARK;
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        // Fórmula YIQ simples para brilho
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        // Retorna cor escura para fundos claros (YIQ >= 128) e clara para fundos escuros
        return (yiq >= 128) ? TEXT_COLOR_DARK : TEXT_COLOR_LIGHT;
    } catch (e) {
        return TEXT_COLOR_DARK; // Cor escura em caso de erro
    }
}
// -----------------------------------

const RaceTicker: React.FC<RaceTickerProps> = ({ data, colorMap, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Efeito para ciclar o índice
  useEffect(() => {
    if (!data || data.length === 0) return;
    const timerId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % data.length);
    }, interval);
    return () => clearInterval(timerId); // Limpa o timer ao desmontar
  }, [data, interval]);

  // Se não houver dados, retorna nulo para não renderizar nada
  if (!data || data.length === 0 || !data[currentIndex]) {
    return null;
  }

  // Pega os dados do distrito atual
  const currentEntry = data[currentIndex];

  // Busca as cores e calcula contraste para a tag da frente líder
  const winnerColor = currentEntry.winnerLegend ? (colorMap[currentEntry.winnerLegend] ?? FALLBACK_COLOR) : FALLBACK_COLOR;
  const winnerTagTextColor = getTextColorForBackground(winnerColor);

  // Busca a cor do segundo colocado (sem cálculo de contraste necessário aqui)
  const runnerUpColor = currentEntry.runnerUpLegend ? (colorMap[currentEntry.runnerUpLegend] ?? FALLBACK_COLOR) : FALLBACK_COLOR;

  return (
    // Container do Ticker: Fundo #e0e0e0, texto escuro padrão
    <div className="bg-[#e0e0e0] text-gray-800 p-3 rounded-md shadow-sm overflow-hidden whitespace-nowrap border border-gray-300">
      {/* Flex container principal */}
      <div className="flex items-center space-x-4 sm:space-x-6 text-sm sm:text-base justify-between">

        {/* 1. Localização (UF e Distrito) */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Tag UF */}
          <span className="bg-gray-500 text-white px-2 py-0.5 rounded text-xs font-medium">
            {currentEntry.stateId}
          </span>
          {/* Nome Distrito */}
          <span className="font-semibold truncate max-w-[100px] sm:max-w-[150px]" title={currentEntry.districtName}>
            {currentEntry.districtName}
          </span>
        </div>

        {/* 2. Frente Liderando (Estilo Tag) */}
        <div className={`flex items-center flex-shrink-0 min-w-0 ${!currentEntry.winnerLegend ? 'italic text-gray-500' : ''}`}>
          {currentEntry.winnerLegend ? (
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: winnerColor, color: winnerTagTextColor }} // Cor de fundo e texto dinâmicos
            >
              {currentEntry.winnerLegend} liderando
            </span>
          ) : (
            <span>Sem Vencedor</span>
          )}
        </div>

        {/* 3. Vencedor (Nome e %) - Com mais espaço */}
        <div className="flex items-center space-x-1.5 flex-grow min-w-0 justify-end text-right"> {/* flex-grow e justify-end */}
          {currentEntry.winnerName ? (
            <>
              <span className="font-bold truncate" title={currentEntry.winnerName}>{currentEntry.winnerName}</span>
              <span className="font-semibold text-xs sm:text-sm flex-shrink-0">({currentEntry.winnerPercentage?.toFixed(1) ?? '--'}%)</span>
            </>
          ) : (
            <span className="text-gray-500 italic">N/D</span>
          )}
        </div>

        {/* 4. Segundo Colocado (Frente, Nome e %) - Com mais espaço */}
        <div className={`hidden sm:flex items-center space-x-1.5 flex-grow min-w-0 justify-end text-right ${!currentEntry.runnerUpLegend ? 'invisible' : ''}`}> {/* flex-grow e justify-end */}
           <span className="text-gray-500 text-xs flex-shrink-0">2º:</span>
           {/* Frente do 2º (sem parênteses, cor aplicada) */}
           <span className="font-bold text-xs flex-shrink-0" style={{ color: runnerUpColor }}>
             {currentEntry.runnerUpLegend || 'N/D'}
           </span>
           {/* Nome do 2º (com truncate) */}
           <span className="truncate ml-1" title={currentEntry.runnerUpName ?? ''}>
             {currentEntry.runnerUpName || 'N/D'}
            </span>
           {/* % do 2º */}
           <span className="font-semibold text-xs flex-shrink-0">
             ({currentEntry.runnerUpPercentage?.toFixed(1) ?? '--'}%)
           </span>
        </div>

      </div>
    </div>
  );
};

export default RaceTicker;