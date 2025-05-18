// components/SwingAnalysis.tsx
"use client";
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { CandidateVote } from '@/types/election'; // Ajuste se necessário
import type { PreviousDistrictResult } from '@/lib/previousElectionData'; // Ajuste se necessário

// Interface estendida que o componente CandidateVote espera
interface CandidateVoteProcessed extends CandidateVote {
  percentage: number;
  numericVotes: number;
}

// Interface para os dados que este componente espera (vinda de page.tsx)
export interface SwingAnalysisData {
  currentWinner: CandidateVoteProcessed | null;
  currentRunnerUp: CandidateVoteProcessed | null;
  previousWinnerInfo: PreviousDistrictResult | null;
  actualSwingValue: number;
  swingValueForGraph: number; // Valor de -10 a +10 para o gráfico
  graphTargetLegend: string | null;
  graphOpponentLegend: string | null;
  contextualSwingText: string;
  contextualSwingColor: string;
}

// Props do componente SwingAnalysis
interface SwingAnalysisProps {
  analysisData: SwingAnalysisData | null;
  colorMap: Record<string, string>;
  districtName: string; // Mantido para uso no título geral da seção (em page.tsx)
}

const FALLBACK_COLOR_BARS = '#E5E7EB';
const FALLBACK_COLOR_SWING_GRAPH = '#D1D5DB';
const TEXT_COLOR_DARK = '#1F2937';
const TEXT_COLOR_LIGHT = '#FFFFFF';
const SWING_VALUE_TEXT_COLOR = '#374151';

function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return TEXT_COLOR_DARK;
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6 && hexcolor.length !== 3) return TEXT_COLOR_DARK;
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(char => char + char).join('');
    }
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128 || hexcolor.toLowerCase() === 'ffffff' || hexcolor.toLowerCase() === '#ffffff') ? TEXT_COLOR_DARK : TEXT_COLOR_LIGHT;
    } catch (e) { return TEXT_COLOR_DARK; }
}

const SwingAnalysis: React.FC<SwingAnalysisProps> = ({ analysisData, colorMap }) => {
  if (!analysisData || !analysisData.currentWinner) {
    return <p className="text-center text-gray-500 py-10">{analysisData?.contextualSwingText || "Dados insuficientes para análise de movimentação."}</p>;
  }

  const {
    currentWinner,
    currentRunnerUp,
    previousWinnerInfo,
    actualSwingValue,
    swingValueForGraph,
    graphTargetLegend,
    graphOpponentLegend,
    contextualSwingText,
    contextualSwingColor,
  } = analysisData;


  // --- Coluna 1: Lógica das Barras Simuladas (COMO ANTES) ---
  const leaderPercent = currentWinner.percentage;
  const leaderLegend = currentWinner.parl_front_legend;
  const leaderColor = leaderLegend ? (colorMap[leaderLegend] ?? FALLBACK_COLOR_BARS) : FALLBACK_COLOR_BARS;

  let referencePercent = 0;
  let referenceLegend: string | null = null;
  let referenceColor = FALLBACK_COLOR_BARS;
  let differenceBlock: React.ReactNode = null;
  let isFlipped = false;

  if (previousWinnerInfo && leaderLegend !== previousWinnerInfo.winner_2018_legend) {
    isFlipped = true;
    referenceLegend = previousWinnerInfo.winner_2018_legend;
    referencePercent = previousWinnerInfo.winner_2018_percentage;
    referenceColor = referenceLegend ? (colorMap[referenceLegend] ?? FALLBACK_COLOR_BARS) : FALLBACK_COLOR_BARS;
  } else if (currentRunnerUp) {
    isFlipped = false;
    referenceLegend = currentRunnerUp.parl_front_legend;
    referencePercent = currentRunnerUp.percentage;
    referenceColor = referenceLegend ? (colorMap[referenceLegend] ?? FALLBACK_COLOR_BARS) : FALLBACK_COLOR_BARS;
    if (!isFlipped && leaderPercent > referencePercent) {
        const diffPp = leaderPercent - referencePercent;
        differenceBlock = ( <div className="w-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold text-xs p-1" style={{height: '25%'}}> +{diffPp.toFixed(1)} p.p. </div> );
    }
  }
  const leaderBarHeightPercent = 100;
  let referenceBarHeightPercent = 0;
  if (isFlipped && leaderPercent > 0 && referencePercent > 0) {
      referenceBarHeightPercent = (referencePercent / leaderPercent) * 100;
  } else if (!isFlipped && currentRunnerUp) {
      referenceBarHeightPercent = 75;
  }
  referenceBarHeightPercent = Math.min(100, Math.max(0, referenceBarHeightPercent));
  // --- FIM DA LÓGICA DA COLUNA 1 ---


  // --- Coluna 2: Lógica do Semicírculo (SEM MUDANÇAS NA LÓGICA DE DADOS) ---
  const targetPieValue = 50 + (swingValueForGraph * 5);
  const opponentPieValue = 100 - targetPieValue;

  const pieData = [
    { name: graphTargetLegend || "Foco", value: Math.max(0, targetPieValue), colorForPie: graphTargetLegend ? (colorMap[graphTargetLegend] ?? FALLBACK_COLOR_SWING_GRAPH) : '#3B82F6' },
    { name: graphOpponentLegend || "Referência", value: Math.max(0, opponentPieValue), colorForPie: graphOpponentLegend ? (colorMap[graphOpponentLegend] ?? FALLBACK_COLOR_SWING_GRAPH) : FALLBACK_COLOR_SWING_GRAPH },
  ];
    const sumPieValues = pieData.reduce((s, p) => s + p.value, 0);
    if (sumPieValues > 0 && Math.abs(sumPieValues - 100) > 0.01) {
        const scaleFactor = 100 / sumPieValues;
        pieData.forEach(p => p.value = parseFloat((p.value * scaleFactor).toFixed(4)) );
        let reSum = pieData.reduce((s, p) => s + p.value, 0);
        if (Math.abs(reSum - 100) > 0.001 && pieData.length > 0) pieData[0].value += (100 - reSum);
    } else if (sumPieValues === 0) {
        pieData[0].value = 50; pieData[1].value = 50;
    }

  const tagTextColor = getTextColorForBackground(contextualSwingColor);
  const currentMarginVotes = currentRunnerUp ? currentWinner.numericVotes - currentRunnerUp.numericVotes : currentWinner.numericVotes;
  const currentMarginPercent = currentRunnerUp ? currentWinner.percentage - currentRunnerUp.percentage : currentWinner.percentage;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6 items-start min-h-[380px]"> {/* Aumentada altura mínima geral */}

        {/* === Coluna 1: Comparativo de Votos (COMO ANTES) === */}
        <div className={`p-4 bg-gray-50 rounded-lg shadow-sm flex flex-col justify-between h-full`}>
            <div className="flex items-end justify-around flex-grow" style={{ minHeight: '180px' }}>
                {currentWinner && (
                    <div className="flex flex-col items-center w-2/5 h-full">
                        <div className="text-sm text-center text-gray-700 h-10 mb-1 break-words line-clamp-2 font-semibold">{leaderLegend || 'Líder Atual'}</div>
                        <div
                            className="w-full rounded-t-lg flex items-center justify-center relative"
                            style={{ backgroundColor: leaderColor, height: `${leaderBarHeightPercent}%` }}
                        >
                            <span className="font-bold text-3xl z-10" style={{color: getTextColorForBackground(leaderColor)}}>
                                {leaderPercent.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                )}
                {(isFlipped || currentRunnerUp) && referenceLegend && (
                     <div className="flex flex-col items-center w-2/5 h-full">
                        <div className="text-sm text-center text-gray-700 h-10 mb-1 break-words line-clamp-2 font-semibold">{referenceLegend}</div>
                         <div className="w-full h-full flex flex-col-reverse rounded-t-lg">
                            <div
                                className="w-full rounded-t-lg flex items-center justify-center relative"
                                style={{ backgroundColor: referenceColor, height: `${referenceBarHeightPercent}%` }}
                            >
                                <span className="font-bold text-2xl z-10" style={{color: getTextColorForBackground(referenceColor)}}>
                                    {referencePercent.toFixed(1)}%
                                </span>
                            </div>
                            {differenceBlock}
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 text-center bg-gray-100 p-2 rounded-b-lg">
                <p className="text-sm text-gray-600">
                    Eleição anterior (2018): {previousWinnerInfo ?
                    <span className="font-semibold" style={{color: colorMap[previousWinnerInfo.winner_2018_legend] ?? TEXT_COLOR_DARK }}>
                        {previousWinnerInfo.winner_2018_legend} com {previousWinnerInfo.winner_2018_percentage.toFixed(1)}%
                    </span>
                    : "Dados não disponíveis"}
                </p>
            </div>
        </div>

       {/* === Coluna 2: Gráfico Semicírculo e Contexto === */}
       <div className="flex flex-col items-center p-4 h-full justify-center">
          {/* Semicírculo de Movimentação */}
          <div className="w-full max-w-lg h-auto" style={{aspectRatio: '2 / 1.2'}}>
            {/* ... (PieChart, Pie, Cell - como antes) ... */}
          </div>

          {/* Texto do Swing (REAL) e "p.p." - ABAIXO do gráfico */}
          <div className="text-center mt-4">
            {/* Cor do texto do swing AGORA É PADRÃO */}
            <span className="text-4xl font-extrabold" style={{ color: SWING_VALUE_TEXT_COLOR }}>
                {actualSwingValue >= 0 ? '+' : ''}{actualSwingValue.toFixed(1)}
            </span>
            <span className="text-xl text-gray-500 ml-1">
                p.p.
            </span>
          </div>

          {/* Frase de Contexto da Movimentação (Tag Colorida) */}
          <div className="mt-3 text-center">
            <span
                className="inline-block px-3 py-1.5 rounded-full text-base font-semibold shadow-sm"
                // Cor de fundo da tag vem de contextualSwingColor, cor do texto é calculada
                style={{ backgroundColor: contextualSwingColor, color: tagTextColor }}
            >
              {contextualSwingText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwingAnalysis;