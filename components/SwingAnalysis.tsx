// components/SwingAnalysis.tsx
"use client";
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
// Importe os tipos que ele vai receber
import type { CandidateVote } from '@/types/election'; // Para currentWinner/RunnerUp
import type { PreviousDistrictResult } from '@/lib/previousElectionData';

interface CandidateVoteProcessed extends CandidateVote {
    percentage: number;
    numericVotes: number;
}

interface SwingAnalysisData {
    currentWinner: CandidateVoteProcessed | null;
    currentRunnerUp: CandidateVoteProcessed | null;
    previousWinnerLegend: string | null;
    previousWinnerPercentage: number | null;
    swingText: string;
    swingValueForGraph: number; // Valor de -10 a +10
    graphTargetLegend: string | null;
    graphOpponentLegend: string | null;
}

interface SwingAnalysisProps {
  analysisData: SwingAnalysisData;
  colorMap: Record<string, string>;
  districtName: string;
}

const FALLBACK_COLOR = '#B0B0B0'; // Um cinza neutro para "Outros" ou oponentes

const SwingAnalysis: React.FC<SwingAnalysisProps> = ({ analysisData, colorMap, districtName }) => {
  if (!analysisData || !analysisData.currentWinner) {
    return <p className="text-gray-500">Dados insuficientes para análise de movimentação neste distrito.</p>;
  }

  const {
    currentWinner,
    currentRunnerUp,
    previousWinnerLegend,
    previousWinnerPercentage,
    swingText,
    swingValueForGraph, // Já está capado entre -10 e 10
    graphTargetLegend,
    graphOpponentLegend
  } = analysisData;

  // Para o gráfico de Semicírculo
  // Valor de 0 a 100 para a "Frente em Foco" no gráfico
  const targetDisplayPercentage = 50 + (swingValueForGraph * 2.5); // Mapeia +/-10pp para +/-25% visual do centro
  const opponentDisplayPercentage = 100 - targetDisplayPercentage;

  const pieData = [
    { name: graphTargetLegend || "Foco", value: targetDisplayPercentage, color: graphTargetLegend ? (colorMap[graphTargetLegend] ?? FALLBACK_COLOR) : '#007bff' },
    { name: graphOpponentLegend || "Referência", value: opponentDisplayPercentage, color: graphOpponentLegend ? (colorMap[graphOpponentLegend] ?? FALLBACK_COLOR) : '#ffc107' },
  ];
  // Garante que valores negativos (raro, mas possível com float) não quebrem o Pie
  pieData.forEach(p => { if (p.value < 0) p.value = 0; });
  const sumValues = pieData.reduce((s, p) => s + p.value, 0);
  if (sumValues === 0) { // Evita Pie vazio
      pieData[0].value = 50;
      pieData[1].value = 50;
  }


  const currentMarginVotes = currentRunnerUp ? currentWinner.numericVotes - currentRunnerUp.numericVotes : currentWinner.numericVotes;
  const currentMarginPercent = currentRunnerUp ? currentWinner.percentage - currentRunnerUp.percentage : currentWinner.percentage;

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Análise de Movimentação: {districtName}</h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Coluna 1: Informações Textuais */}
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-gray-700">Resultado Atual (2022)</h4>
            {currentWinner && (
              <p>
                <span style={{color: currentWinner.parl_front_legend ? colorMap[currentWinner.parl_front_legend] : undefined }} className="font-bold">{currentWinner.parl_front_legend}</span>
                : {currentWinner.candidate_name} - <strong>{currentWinner.percentage.toFixed(2)}%</strong> ({currentWinner.numericVotes.toLocaleString('pt-BR')} votos)
              </p>
            )}
            {currentRunnerUp && (
               <p className="text-sm text-gray-600">
                 Vantagem sobre 2º ({currentRunnerUp.candidate_name} - {currentRunnerUp.parl_front_legend}): {currentMarginVotes.toLocaleString('pt-BR')} votos ({currentMarginPercent.toFixed(2)} p.p.)
               </p>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">Resultado Anterior (2018)</h4>
            {previousWinnerLegend ? (
              <p>
                <span style={{color: colorMap[previousWinnerLegend] ?? FALLBACK_COLOR }} className="font-bold">{previousWinnerLegend}</span>
                : {previousWinnerPercentage?.toFixed(2)}%
              </p>
            ) : (
              <p className="text-gray-500">Sem dados de 2018.</p>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-gray-700">Movimentação</h4>
            <p className="text-md">{swingText}</p>
          </div>
        </div>

        {/* Coluna 2: Gráfico Semicírculo */}
        <div className="flex flex-col items-center">
          <h4 className="font-semibold text-gray-700 mb-1">Balança de Movimentação (2018 &rarr; 2022)</h4>
          <p className="text-xs text-gray-500 mb-2 text-center">
            {graphTargetLegend || 'Frente A'} vs {graphOpponentLegend || 'Frente B'}
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="95%" // Empurra para baixo para formar o hemiciclo
                startAngle={180}
                endAngle={0}
                innerRadius="60%" // Cria o efeito de rosca
                outerRadius="100%"
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                isAnimationActive={true}
                animationDuration={800}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color}/>
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${name}: ${value.toFixed(1)}% (Balança)`, null]} />
            </PieChart>
          </ResponsiveContainer>
           <div className="text-center mt-[-40px] relative z-10"> {/* Ajuste o mt para o texto central */}
                <p className="text-2xl font-bold" style={{color: graphTargetLegend ? colorMap[graphTargetLegend] : FALLBACK_COLOR}}>
                    {swingValueForGraph > 0 ? '+' : ''}{swingValueForGraph.toFixed(1)} p.p.
                </p>
                <p className="text-xs text-gray-600">para {graphTargetLegend}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

// Helper getTextColorForBackground (pode ser movido para utils se usado em mais lugares)
// function getTextColorForBackground(hexcolor: string): string { ... }

export default SwingAnalysis;