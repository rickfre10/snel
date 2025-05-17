// components/SwingAnalysis.tsx
"use client";
import React from 'react';
// Tipos que podem ser necessários (ajuste o caminho)
import { CandidateVote } from '@/types/election';
import { PreviousDistrictResult } from '@/lib/previousElectionData';

// Tipo para as props do componente
interface SwingAnalysisProps {
  currentResults: (CandidateVote & { numericVotes: number; percentage: number; })[]; // Votos do distrito atual, já processados
  previousResult?: PreviousDistrictResult; // Pode ser undefined se não houver dados de 2018
  colorMap: Record<string, string>;
  districtName: string;
}

const SwingAnalysis: React.FC<SwingAnalysisProps> = ({
  currentResults,
  previousResult,
  colorMap,
  districtName,
}) => {
  const fallbackColor = '#A9A9A9';

  const currentWinner = currentResults.length > 0 ? currentResults[0] : null;
  const currentRunnerUp = currentResults.length > 1 ? currentResults[1] : null;

  let voteDifference: number | null = null;
  let percentageDifference: number | null = null;

  if (currentWinner && currentRunnerUp) {
    voteDifference = currentWinner.numericVotes - currentRunnerUp.numericVotes;
    percentageDifference = currentWinner.percentage - currentRunnerUp.percentage;
  }

  const hasFlipped = previousResult && currentWinner && previousResult.winner_2018_legend !== currentWinner.parl_front_legend;

  // Para o Gauge (Exemplo simplificado - mostra % do vencedor atual)
  // Um gauge real com Recharts pode ser feito com um PieChart com uma só fatia (value) e um total (max)
  // ou um RadialBarChart. Por simplicidade, vamos focar no texto.
  const gaugeValue = currentWinner?.percentage ?? 0;
  const gaugeMax = 100;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-gray-700 mb-2">Resultado Atual (2022) - {districtName}</h4>
        {currentWinner ? (
          <div className="p-3 bg-gray-50 rounded-md border">
            <p>
              <span
                className="font-bold px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: currentWinner.parl_front_legend ? colorMap[currentWinner.parl_front_legend] ?? fallbackColor : fallbackColor,
                  color: currentWinner.parl_front_legend ? getTextColorForBackground(colorMap[currentWinner.parl_front_legend] ?? fallbackColor) : '#000'
                }}
              >
                {currentWinner.parl_front_legend || 'N/D'}
              </span>
              <span className="font-semibold ml-2">{currentWinner.candidate_name}</span>: {currentWinner.percentage?.toFixed(2)}% ({currentWinner.numericVotes?.toLocaleString()} votos)
            </p>
            {currentRunnerUp && voteDifference !== null && percentageDifference !== null && (
              <p className="text-sm text-gray-600 mt-1">
                Vantagem sobre 2º: {voteDifference.toLocaleString()} votos ({percentageDifference.toFixed(2)} p.p.)
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Sem resultados atuais para este distrito.</p>
        )}
      </div>

      <div>
        <h4 className="text-lg font-semibold text-gray-700 mb-2">Resultado Anterior (2018) - {districtName}</h4>
        {previousResult ? (
          <div className="p-3 bg-gray-50 rounded-md border">
            <p>
              <span
                className="font-bold px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: previousResult.winner_2018_legend ? colorMap[previousResult.winner_2018_legend] ?? fallbackColor : fallbackColor,
                  color: previousResult.winner_2018_legend ? getTextColorForBackground(colorMap[previousResult.winner_2018_legend] ?? fallbackColor) : '#000'
                }}
              >
                {previousResult.winner_2018_legend}
              </span>
              : {previousResult.winner_2018_percentage?.toFixed(2)}%
            </p>
          </div>
        ) : (
          <p className="text-gray-500">Sem dados de resultado anterior para este distrito.</p>
        )}
      </div>

      <div>
        <h4 className="text-lg font-semibold text-gray-700 mb-2">Análise de Swing</h4>
        {hasFlipped && currentWinner && previousResult ? (
          <p className="text-lg font-semibold text-red-600">
            VIRADA! O distrito mudou de {previousResult.winner_2018_legend} ({previousResult.winner_2018_percentage.toFixed(2)}%)
            para {currentWinner.parl_front_legend} ({currentWinner.percentage?.toFixed(2)}%).
          </p>
        ) : currentWinner && previousResult && currentWinner.parl_front_legend === previousResult.winner_2018_legend ? (
          <p className="text-lg font-semibold text-green-600">
            MANTEVE! {currentWinner.parl_front_legend} continua liderando.
            <span className="block text-sm font-normal text-gray-700">
              Swing para {currentWinner.parl_front_legend}: {(currentWinner.percentage - previousResult.winner_2018_percentage).toFixed(2)} p.p.
            </span>
          </p>
        ) : currentWinner ? (
             <p className="text-gray-600">O distrito foi para {currentWinner.parl_front_legend}. Não há dados comparáveis diretos para swing com a liderança anterior.</p>
        ) : (
          <p className="text-gray-500">Análise de swing não disponível.</p>
        )}
      </div>

      {/* Placeholder para o Gráfico de Gauge */}
      <div className="mt-4">
        <h4 className="text-lg font-semibold text-gray-700 mb-2">Gauge da Eleição Atual (Exemplo: % do Vencedor)</h4>
        <div className="w-full bg-gray-200 rounded-full h-8 dark:bg-gray-700 relative overflow-hidden">
          <div
            className="bg-blue-600 h-8 rounded-full text-xs font-medium text-blue-100 text-center p-1.5 leading-none"
            style={{ width: `${gaugeValue.toFixed(0)}%` }}
            title={`${currentWinner?.parl_front_legend || ''}: ${gaugeValue.toFixed(2)}%`}
          >
            {currentWinner?.parl_front_legend ? `${currentWinner.parl_front_legend}: ${gaugeValue.toFixed(1)}%` : `${gaugeValue.toFixed(1)}%`}
          </div>
        </div>
        {hasFlipped && currentWinner && previousResult && (
            <p className="text-center text-sm mt-1">
                Mudança de {previousResult.winner_2018_legend} ({previousResult.winner_2018_percentage.toFixed(1)}%) para {currentWinner.parl_front_legend} ({currentWinner.percentage.toFixed(1)}%)
            </p>
        )}
      </div>
    </div>
  );
};

// Helper getTextColorForBackground (pode ser movido para utils)
function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return '#1F2937';
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6) return '#1F2937';
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1F2937' : '#FFFFFF';
    } catch (e) { return '#1F2937'; }
}

export default SwingAnalysis;