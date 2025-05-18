// components/SwingAnalysis.tsx
"use client";
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Text as RechartsText } from 'recharts'; // Renomeado Text para evitar conflito
import type { CandidateVote } from '@/types/election';
import type { PreviousDistrictResult } from '@/lib/previousElectionData'; // Supondo que você exportou isso

// Interface para os dados que este componente espera
// Esta é a mesma SwingAnalysisData que definimos no page.tsx (useMemo)
export interface SwingAnalysisData {
  currentWinner: (CandidateVote & { numericVotes: number; percentage: number; }) | null;
  currentRunnerUp: (CandidateVote & { numericVotes: number; percentage: number; }) | null;
  previousWinnerInfo: PreviousDistrictResult | null;
  actualSwingValue: number;
  swingValueForGraph: number; // Valor de -10 a +10
  graphTargetLegend: string | null;
  graphOpponentLegend: string | null;
  contextualSwingText: string;
  contextualSwingColor: string; // Cor para a tag do contextualSwingText
}

interface SwingAnalysisProps {
  analysisData: SwingAnalysisData | null;
  colorMap: Record<string, string>;
  districtName: string;
}

const FALLBACK_COLOR_BARS = '#D1D5DB'; // Cinza para barras sem cor específica
const FALLBACK_COLOR_SWING_GRAPH = '#A9A9A9'; // Cinza mais escuro para oponente no gráfico de swing
const TEXT_COLOR_DARK = '#1F2937';
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
        return (yiq >= 128 || hexcolor.toLowerCase() === 'ffffff') ? TEXT_COLOR_DARK : TEXT_COLOR_LIGHT;
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

  let referencePercent = 0;
  let referenceLegend: string | null = null;
  let referenceColor = FALLBACK_COLOR_BARS;
  let differenceBlock: React.ReactNode = null;
  const barContainerHeight = "h-40"; // Altura base para as "colunas"

  if (previousWinnerInfo && leaderLegend !== previousWinnerInfo.winner_2018_legend) { // Virada
    referenceLegend = previousWinnerInfo.winner_2018_legend;
    referencePercent = previousWinnerInfo.winner_2018_percentage;
    referenceColor = referenceLegend ? (colorMap[referenceLegend] ?? FALLBACK_COLOR_BARS) : FALLBACK_COLOR_BARS;
  } else if (currentRunnerUp) { // Manteve (ou não há dados anteriores, compara com 2º atual)
    referenceLegend = currentRunnerUp.parl_front_legend;
    referencePercent = currentRunnerUp.percentage;
    referenceColor = referenceLegend ? (colorMap[referenceLegend] ?? FALLBACK_COLOR_BARS) : FALLBACK_COLOR_BARS;

    // Bloco de diferença só se manteve e há runnerUp
    if (leaderLegend === previousWinnerInfo?.winner_2018_legend) {
        const diffPp = leaderPercent - referencePercent;
        differenceBlock = (
            <div className="w-full h-1/4 bg-gray-300 flex items-center justify-center text-gray-700 font-semibold text-sm">
                +{diffPp.toFixed(1)} p.p.
            </div>
        );
    }
  }
  // Ajusta altura da barra de referência
  // Se virou, altura proporcional. Se manteve, 75% (e tem o differenceBlock)
  const referenceBarHeightPercentage = (previousWinnerInfo && leaderLegend !== previousWinnerInfo.winner_2018_legend)
    ? (referencePercent / leaderPercent) * 100 // Proporcional se virada
    : 75; // 75% se manteve (differenceBlock ocupa os outros 25%)
  const cappedReferenceBarHeightPercentage = Math.min(100, Math.max(0, referenceBarHeightPercentage));


  // --- Coluna 2: Lógica do Semicírculo ---
  const targetPieValue = 50 + (swingValueForGraph * 5); // Swing visual de 0% a 100%
  const opponentPieValue = 100 - targetPieValue;

  const pieData = [
    { name: graphTargetLegend || "Foco", value: Math.max(0, targetPieValue), colorForPie: graphTargetLegend ? (colorMap[graphTargetLegend] ?? FALLBACK_COLOR_SWING_GRAPH) : '#3B82F6' },
    { name: graphOpponentLegend || "Referência", value: Math.max(0, opponentPieValue), colorForPie: graphOpponentLegend ? (colorMap[graphOpponentLegend] ?? FALLBACK_COLOR_SWING_GRAPH) : FALLBACK_COLOR_SWING_GRAPH },
  ];
  const sumPieValues = pieData.reduce((s, p) => s + p.value, 0);
  if (sumPieValues > 0 && Math.abs(sumPieValues - 100) > 0.1) { // Pequena tolerância para float
      const scaleFactor = 100 / sumPieValues;
      pieData.forEach(p => p.value *= scaleFactor);
  } else if (sumPieValues === 0) {
      pieData[0].value = 50; pieData[1].value = 50;
  }

  const tagTextColor = getTextColorForBackground(contextualSwingColor);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6 items-stretch"> {/* items-stretch para colunas de mesma altura */}

        {/* === Coluna 1: Comparativo de Votos === */}
        <div className={`p-4 bg-gray-50 rounded-lg shadow-sm flex flex-col justify-between ${barContainerHeight}`}>
            <div className="flex items-end justify-around h-3/4"> {/* Barras ocupam 3/4 da altura */}
                {/* Barra Líder Atual */}
                <div className="flex flex-col items-center w-2/5">
                    <div className="text-xs text-center text-gray-600 h-8 break-words">{leaderLegend || 'Líder'}</div>
                    <div
                        className="w-full rounded-t-md flex items-center justify-center"
                        style={{ backgroundColor: leaderColor, height: '100%' }}
                    >
                        <span className="font-bold text-xl" style={{color: getTextColorForBackground(leaderColor)}}>
                            {leaderPercent.toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* Barra Referência */}
                <div className="flex flex-col items-center w-2/5">
                    <div className="text-xs text-center text-gray-600 h-8 break-words">{referenceLegend || 'Referência'}</div>
                     <div className="w-full h-full flex flex-col-reverse rounded-t-md"> {/* Flex col reverse para o differenceBlock ir para cima */}
                        <div
                            className="w-full rounded-t-md flex items-center justify-center"
                            style={{
                                backgroundColor: referenceColor,
                                height: differenceBlock ? `${cappedReferenceBarHeightPercentage}%` : '100%' // Se não tem differenceBlock, ocupa 100% da altura proporcional
                            }}
                        >
                            <span className="font-bold text-lg" style={{color: getTextColorForBackground(referenceColor)}}>
                                {referencePercent.toFixed(1)}%
                            </span>
                        </div>
                        {differenceBlock} {/* Bloco cinza da diferença, se aplicável */}
                    </div>
                </div>
            </div>
            {/* Informação da Eleição Anterior */}
            <div className="mt-3 pt-3 border-t border-gray-200 text-center bg-gray-100 p-2 rounded-b-md">
                <p className="text-xs text-gray-600">
                    Eleição anterior (2018): {previousWinnerInfo ?
                    `${previousWinnerInfo.winner_2018_legend} com ${previousWinnerInfo.winner_2018_percentage.toFixed(1)}%`
                    : "Dados não disponíveis"}
                </p>
            </div>
        </div>

        {/* === Coluna 2: Gráfico Semicírculo e Contexto === */}
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg shadow-sm">
          {/* Semicírculo de Movimentação - Ajuste de tamanho */}
          <div className="w-full max-w-md h-auto" style={{aspectRatio: '2 / 1'}}> {/* Aumentado max-w e aspect ratio */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}> {/* Removido margin se não necessário */}
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="100%" // Centro para baixo para formar o hemiciclo
                  startAngle={180}
                  endAngle={0}
                  innerRadius="50%" // Ajuste para espessura da rosca
                  outerRadius="100%"
                  paddingAngle={1}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {pieData.map((entry) => ( // Removido index não utilizado
                    <Cell key={`cell-${entry.name}`} fill={entry.colorForPie} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                {/* Tooltip Removido conforme solicitado */}
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Texto Central no Semicírculo (Swing Real) */}
          <div className="relative text-center mt-[-4rem] sm:mt-[-5.5rem] z-10 pointer-events-none"> {/* Ajuste vertical negativo maior */}
            <p className="text-4xl font-bold" style={{color: graphTargetLegend ? colorMap[graphTargetLegend] : TEXT_COLOR_DARK }}> {/* Fonte maior */}
                {actualSwingValue >= 0 ? '+' : ''}{actualSwingValue.toFixed(1)}
            </p>
            <p className="text-md text-gray-500">p.p.</p> {/* Tamanho 'md' para 'p.p.' */}
          </div>
          {/* Frase de Contexto da Movimentação (Tag Colorida) */}
          <div className="mt-4 text-center">
            <span
                className="inline-block px-3 py-1.5 rounded-full text-sm font-semibold shadow"
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