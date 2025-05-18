// components/SwingAnalysis.tsx
"use client";
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'; // Removido Text do Recharts
import type { CandidateVote } from '@/types/election'; // Ajuste se necessário
import type { PreviousDistrictResult } from '@/lib/previousElectionData'; // Ajuste se necessário

// Interfaces (mantidas como na resposta #126)
interface CandidateVoteProcessed extends CandidateVote {
  percentage: number;
  numericVotes: number;
}
export interface SwingAnalysisData {
  currentWinner: CandidateVoteProcessed | null;
  currentRunnerUp: CandidateVoteProcessed | null;
  previousWinnerInfo: PreviousDistrictResult | null;
  actualSwingValue: number;
  swingValueForGraph: number;
  graphTargetLegend: string | null;
  graphOpponentLegend: string | null;
  contextualSwingText: string;
  contextualSwingColor: string;
}
interface SwingAnalysisProps {
  analysisData: SwingAnalysisData | null;
  colorMap: Record<string, string>;
  districtName: string;
}

// Constantes de cor e helper (mantidos)
const FALLBACK_COLOR_BARS = '#E5E7EB'; // Tailwind gray-200 (um pouco mais claro para barras)
const FALLBACK_COLOR_SWING_GRAPH = '#D1D5DB'; // Tailwind gray-300 (para oponente no gráfico)
const TEXT_COLOR_DARK = '#1F2937'; // Tailwind gray-800
const TEXT_COLOR_LIGHT = '#FFFFFF';

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
    swingValueForGraph, // Capado em +/-10
    graphTargetLegend,
    graphOpponentLegend,
    contextualSwingText,
    contextualSwingColor,
  } = analysisData;

  // --- Coluna 1: Lógica das Barras Simuladas ---
  const leaderPercent = currentWinner.percentage;
  const leaderLegend = currentWinner.parl_front_legend;
  const leaderColor = leaderLegend ? (colorMap[leaderLegend] ?? FALLBACK_COLOR_BARS) : FALLBACK_COLOR_BARS;
  const leaderTextColor = getTextColorForBackground(leaderColor);

  let referencePercent = 0;
  let referenceLegend: string | null = null;
  let referenceColor = FALLBACK_COLOR_BARS;
  let referenceTextColor = TEXT_COLOR_DARK;
  let differenceBlock: React.ReactNode = null;
  let isFlipped = false;

  if (previousWinnerInfo && leaderLegend !== previousWinnerInfo.winner_2018_legend) { // Virada
    isFlipped = true;
    referenceLegend = previousWinnerInfo.winner_2018_legend;
    referencePercent = previousWinnerInfo.winner_2018_percentage;
    referenceColor = referenceLegend ? (colorMap[referenceLegend] ?? FALLBACK_COLOR_BARS) : FALLBACK_COLOR_BARS;
    referenceTextColor = getTextColorForBackground(referenceColor);
  } else if (currentRunnerUp) { // Manteve (ou não há dados anteriores para comparação de virada, usa 2º atual)
    isFlipped = false; // Explicitamente não é virada neste contexto de barra
    referenceLegend = currentRunnerUp.parl_front_legend;
    referencePercent = currentRunnerUp.percentage;
    referenceColor = referenceLegend ? (colorMap[referenceLegend] ?? FALLBACK_COLOR_BARS) : FALLBACK_COLOR_BARS;
    referenceTextColor = getTextColorForBackground(referenceColor);

    // Bloco de diferença só se manteve E HÁ runnerUp
    if (!isFlipped && leaderPercent > referencePercent) { // Garante que a diferença é positiva
        const diffPp = leaderPercent - referencePercent;
        differenceBlock = (
            <div className="w-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold text-xs p-1" style={{height: '25%'}}>
                +{diffPp.toFixed(1)} p.p.
            </div>
        );
    }
  }

  const leaderBarHeightPercent = 100; // Líder sempre 100% da altura do container de barras
  let referenceBarHeightPercent = 0;

  if (isFlipped && leaderPercent > 0) {
      referenceBarHeightPercent = (referencePercent / leaderPercent) * 100;
  } else if (!isFlipped && currentRunnerUp) { // Manteve e tem 2º lugar
      referenceBarHeightPercent = 75; // Fixo em 75% para o segundo, o resto é a diferença
  }
  referenceBarHeightPercent = Math.min(100, Math.max(0, referenceBarHeightPercent)); // Cap entre 0 e 100


  // --- Coluna 2: Lógica do Semicírculo ---
  const targetPieValue = 50 + (swingValueForGraph * 5);
  const opponentPieValue = 100 - targetPieValue;

  const pieData = [
    { name: graphTargetLegend || "Foco", value: Math.max(0, targetPieValue), colorForPie: graphTargetLegend ? (colorMap[graphTargetLegend] ?? FALLBACK_COLOR_SWING_GRAPH) : '#3B82F6' },
    { name: graphOpponentLegend || "Referência", value: Math.max(0, opponentPieValue), colorForPie: graphOpponentLegend ? (colorMap[graphOpponentLegend] ?? FALLBACK_COLOR_SWING_GRAPH) : FALLBACK_COLOR_SWING_GRAPH },
  ];
    // Normalização para garantir que a soma seja 100 se houver problemas com floats
    const sumPieValues = pieData.reduce((s, p) => s + p.value, 0);
    if (sumPieValues > 0 && Math.abs(sumPieValues - 100) > 0.01) {
        const scaleFactor = 100 / sumPieValues;
        pieData.forEach(p => p.value = parseFloat((p.value * scaleFactor).toFixed(4)) ); // Arredonda para evitar problemas de soma
        // Reajuste final para garantir 100 exato se necessário
        let reSum = pieData.reduce((s, p) => s + p.value, 0);
        if (reSum !== 100 && pieData.length > 0) pieData[0].value += (100 - reSum);

    } else if (sumPieValues === 0) {
        pieData[0].value = 50; pieData[1].value = 50;
    }


  const tagTextColor = getTextColorForBackground(contextualSwingColor);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6 items-start"> {/* items-start para alinhar ao topo */}

        {/* === Coluna 1: Comparativo de Votos === */}
        <div className="p-4 bg-gray-50 rounded-lg shadow-sm flex flex-col h-full"> {/* h-full para tentar igualar altura com coluna do gráfico */}
            <div className="flex items-end justify-around flex-grow" style={{ minHeight: '150px' }}> {/* Altura mínima, flex-grow */}
                {/* Barra Líder Atual */}
                {currentWinner && (
                    <div className="flex flex-col items-center w-2/5 h-full"> {/* h-full */}
                        <div className="text-xs text-center text-gray-600 h-8 mb-1 break-words line-clamp-2">{leaderLegend || 'Líder'}</div>
                        <div
                            className="w-full rounded-t-md flex items-center justify-center"
                            style={{ backgroundColor: leaderColor, height: `${leaderBarHeightPercent}%` }} // Altura 100%
                        >
                            <span className="font-bold text-2xl" style={{color: getTextColorForBackground(leaderColor)}}>
                                {leaderPercent.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                )}

                {/* Barra Referência */}
                {(isFlipped || currentRunnerUp) && referenceLegend && ( // Só mostra se houver referência
                     <div className="flex flex-col items-center w-2/5 h-full"> {/* h-full */}
                        <div className="text-xs text-center text-gray-600 h-8 mb-1 break-words line-clamp-2">{referenceLegend}</div>
                         <div className="w-full h-full flex flex-col-reverse rounded-t-md"> {/* Mantém flex-col-reverse para o differenceBlock */}
                            <div
                                className="w-full rounded-t-md flex items-center justify-center"
                                style={{
                                    backgroundColor: referenceColor,
                                    height: `${referenceBarHeightPercent}%` // Altura dinâmica
                                }}
                            >
                                <span className="font-bold text-xl" style={{color: getTextColorForBackground(referenceColor)}}>
                                    {referencePercent.toFixed(1)}%
                                </span>
                            </div>
                            {differenceBlock} {/* Bloco cinza da diferença (só se !isFlipped) */}
                        </div>
                    </div>
                )}
            </div>
            {/* Informação da Eleição Anterior */}
            <div className="mt-3 pt-3 border-t border-gray-200 text-center bg-gray-100 p-2 rounded-b-md">
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
        <div className="flex flex-col items-center p-4"> {/* Removido bg-gray-50 para alinhar com outros pedidos */}
          {/* Semicírculo de Movimentação - Ajuste de tamanho */}
          <div className="w-full max-w-sm h-auto" style={{aspectRatio: '2 / 1.15'}}> {/* Aumentado max-w e ajustado aspect ratio para ser mais alto */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="50%" // Rosca um pouco mais grossa
                  outerRadius="100%"
                  paddingAngle={1}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {pieData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.colorForPie} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Texto Central no Semicírculo (Swing Real) */}
          <div className="relative text-center mt-[-5rem] sm:mt-[-6.5rem] z-10 pointer-events-none"> {/* Ajuste vertical maior */}
            <p className="text-5xl font-bold" style={{color: graphTargetLegend ? colorMap[graphTargetLegend] ?? TEXT_COLOR_DARK : TEXT_COLOR_DARK }}> {/* Fonte muito maior */}
                {actualSwingValue >= 0 ? '+' : ''}{actualSwingValue.toFixed(1)}
            </p>
            <p className="text-lg text-gray-500">p.p.</p> {/* "p.p." maior */}
          </div>
          {/* Frase de Contexto da Movimentação (Tag Colorida) */}
          <div className="mt-4 text-center">
            <span
                className="inline-block px-4 py-2 rounded-full text-base font-semibold shadow-md" // Tag maior
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