// components/SwingAnalysis.tsx
"use client";
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Text } from 'recharts';
// Importe os tipos que ele vai receber (CandidateVote pode não ser necessário aqui se não for usado diretamente)
import type { CandidateVote } from '@/types/election';
import type { PreviousDistrictResult } from '@/lib/previousElectionData';

// Tipagem para os dados processados que o componente CandidateVote espera
interface CandidateVoteProcessed extends CandidateVote {
  percentage: number;
  numericVotes: number;
}

// Interface para os dados que este componente recebe
// Garanta que esta interface bata com o que é produzido em page.tsx
export interface SwingAnalysisData {
  currentWinner: CandidateVoteProcessed | null;
  currentRunnerUp: CandidateVoteProcessed | null;
  previousWinnerInfo: PreviousDistrictResult | null;
  actualSwingValue: number;
  swingValueForGraph: number; // Valor de -10 a +10
  graphTargetLegend: string | null;
  graphOpponentLegend: string | null;
  contextualSwingText: string; // <-- NOME CORRETO DA PROPRIEDADE
  contextualSwingColor: string;
}

interface SwingAnalysisProps {
  analysisData: SwingAnalysisData | null;
  colorMap: Record<string, string>;
  districtName: string;
}

const FALLBACK_COLOR_SWING = '#E0E0E0'; // Cor neutra para oponente no gráfico de swing ou fallback geral
const TEXT_COLOR_DARK = '#1F2937';
const TEXT_COLOR_LIGHT = '#FFFFFF';

function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return TEXT_COLOR_DARK;
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6) return TEXT_COLOR_DARK;
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? TEXT_COLOR_DARK : TEXT_COLOR_LIGHT;
    } catch (e) { return TEXT_COLOR_DARK; }
}

const SwingAnalysis: React.FC<SwingAnalysisProps> = ({ analysisData, colorMap, districtName }) => {
  if (!analysisData || !analysisData.currentWinner) {
    return <p className="text-center text-gray-500 py-10">{analysisData?.contextualSwingText || "Dados insuficientes para análise de movimentação."}</p>;
  }

  // Desestruturando as propriedades corretas
  const {
    currentWinner,
    currentRunnerUp,
    previousWinnerInfo, // Renomeado de previousResult para corresponder ao useMemo
    actualSwingValue,
    swingValueForGraph,
    graphTargetLegend,
    graphOpponentLegend,
    contextualSwingText, // <-- USA O NOME CORRETO
    contextualSwingColor,
  } = analysisData;

  // Dados para o gráfico de semicírculo
  const targetPieValue = 50 + (swingValueForGraph * 2.5); // Era 5 na resposta anterior, 2.5 para range -10 a 10 dar -25 a +25, resultando em 25% a 75% visual. Se quiser 0-100% visual para -10 a 10, então * 5
  // Para 50 + (S_capado * 5) -> S de -10 a 10 -> 0 a 100 visual
  // const targetPieValue = 50 + (swingValueForGraph * 5); // Mantendo a lógica de 1pp = 5% visual
  const opponentPieValue = 100 - targetPieValue;


  const pieData = [
    { name: graphTargetLegend || "Foco", value: Math.max(0, targetPieValue), color: graphTargetLegend ? (colorMap[graphTargetLegend] ?? FALLBACK_COLOR_SWING) : '#3B82F6' },
    { name: graphOpponentLegend || "Referência", value: Math.max(0, opponentPieValue), color: graphOpponentLegend ? (colorMap[graphOpponentLegend] ?? FALLBACK_COLOR_SWING) : FALLBACK_COLOR_SWING },
  ];
  const sumPieValues = pieData.reduce((s, p) => s + p.value, 0);
  if (sumPieValues > 0 && sumPieValues !== 100) {
      const scaleFactor = 100 / sumPieValues;
      pieData.forEach(p => p.value *= scaleFactor);
  } else if (sumPieValues === 0) {
      pieData[0].value = 50; pieData[1].value = 50;
  }

  const currentMarginVotes = currentRunnerUp ? currentWinner.numericVotes - currentRunnerUp.numericVotes : currentWinner.numericVotes;
  const currentMarginPercent = currentRunnerUp ? currentWinner.percentage - currentRunnerUp.percentage : currentWinner.percentage;

  // Usa COALITION_FALLBACK_COLOR ou FALLBACK_COLOR_SWING (defina uma e use consistentemente)
  const defaultCoalitionColor = '#6b7280'; // Definindo aqui para substituir COALITION_FALLBACK_COLOR

  return (
    <div className="space-y-6">
      {/* Remover o título h3 daqui, já que você pediu para tirar títulos */}
      {/* <h3 className="text-xl font-semibold text-gray-800 mb-4">Análise de Movimentação: {districtName}</h3> */}

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Coluna 1: Informações Textuais */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Resultado Atual (2022)</p>
            {currentWinner && (
              <div className="mt-1">
                <span
                  className="font-bold px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: currentWinner.parl_front_legend ? colorMap[currentWinner.parl_front_legend] ?? defaultCoalitionColor : defaultCoalitionColor,
                    color: getTextColorForBackground(currentWinner.parl_front_legend ? colorMap[currentWinner.parl_front_legend] ?? defaultCoalitionColor : defaultCoalitionColor)
                  }}
                >
                  {currentWinner.parl_front_legend || 'N/D'}
                </span>
                <span className="ml-2 font-semibold text-gray-800">{currentWinner.candidate_name}</span>
                <p className="text-xl font-bold text-gray-900">{currentWinner.percentage.toFixed(2)}%</p>
                <p className="text-xs text-gray-500">({currentWinner.numericVotes.toLocaleString('pt-BR')} votos)</p>
              </div>
            )}
            {currentRunnerUp && (
               <p className="text-sm text-gray-600 mt-1">
                 Vantagem sobre 2º ({currentRunnerUp.candidate_name || 'N/D'} - {currentRunnerUp.parl_front_legend || 'N/D'}):
                 <span className="font-semibold"> {currentMarginVotes.toLocaleString('pt-BR')} votos ({currentMarginPercent.toFixed(2)} p.p.)</span>
               </p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Referência (Eleição Anterior 2018)</p>
            {previousWinnerInfo ? ( // Mudado de previousResult para previousWinnerInfo
              <div className="mt-1">
                <span
                  className="font-bold px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: previousWinnerInfo.winner_2018_legend ? colorMap[previousWinnerInfo.winner_2018_legend] ?? FALLBACK_COLOR_SWING : FALLBACK_COLOR_SWING,
                    color: getTextColorForBackground(previousWinnerInfo.winner_2018_legend ? colorMap[previousWinnerInfo.winner_2018_legend] ?? FALLBACK_COLOR_SWING : FALLBACK_COLOR_SWING)
                  }}
                >
                  {previousWinnerInfo.winner_2018_legend}
                </span>
                <span className="ml-2 font-semibold text-gray-800">{previousWinnerInfo.winner_2018_percentage?.toFixed(2)}%</span>
              </div>
            ) : (
              <p className="text-gray-500 italic mt-1">Sem dados de 2018 para este distrito.</p>
            )}
          </div>
        </div>

        {/* Coluna 2: Gráfico Semicírculo */}
        <div className="flex flex-col items-center p-4">
           {/* Removido o título h4 daqui */}
          <p className="text-xs text-gray-500 mb-2 text-center">
            {graphTargetLegend || 'Frente A'} vs {graphOpponentLegend || 'Frente B'}
          </p>
          <div className="w-full max-w-xs h-auto" style={{aspectRatio: '2 / 1'}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="100%" startAngle={180} endAngle={0}
                  innerRadius="55%" outerRadius="100%"
                  paddingAngle={1} dataKey="value" nameKey="name"
                  isAnimationActive={true} animationDuration={800} animationEasing="ease-out"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2}/>
                  ))}
                </Pie>
                {/* Tooltip removido */}
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="relative text-center mt-[-3.5rem] sm:mt-[-4.5rem] z-10 pointer-events-none">
            <p className="text-3xl font-bold" style={{color: graphTargetLegend ? colorMap[graphTargetLegend] : TEXT_COLOR_DARK }}>
                {actualSwingValue >= 0 ? '+' : ''}{actualSwingValue.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500">p.p.</p>
          </div>
          {/* Frase de Contexto da Movimentação */}
          <p className="mt-3 text-sm font-semibold text-center" style={{color: contextualSwingColor}}>
              {contextualSwingText} {/* Usa a propriedade correta */}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SwingAnalysis;