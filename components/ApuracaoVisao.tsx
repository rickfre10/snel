// components/ApuracaoVisao.tsx
import React from 'react';

interface ApuracaoVisaoProps {
  isLoadingVotes: boolean;
  districtWinnerLegend?: string;
  districtWinnerColor?: string;
  districtWinnerTagTextColor?: string;
  areVotesBeingCounted: boolean;
  apuratedVotesCount: number;
  totalPollsCount: number;
}

const ApuracaoVisao: React.FC<ApuracaoVisaoProps> = ({
  isLoadingVotes,
  districtWinnerLegend,
  districtWinnerColor,
  districtWinnerTagTextColor,
  areVotesBeingCounted,
  apuratedVotesCount,
  totalPollsCount,
}) => {

  let calculatedUrnasApuradas = 0;

  if (totalPollsCount > 0) {
    if (apuratedVotesCount > 0) {
      const urnasBasePorVotos = Math.floor(apuratedVotesCount / 500);
      calculatedUrnasApuradas = urnasBasePorVotos + 1;
    }
    calculatedUrnasApuradas = Math.min(calculatedUrnasApuradas, totalPollsCount);
  }

  const percentualUrnasApuradas = totalPollsCount > 0
    ? (calculatedUrnasApuradas / totalPollsCount) * 100
    : 0;
  
  const finalPercentualUrnas = Math.min(percentualUrnasApuradas, 100);

  const votosApuradosDisplay = apuratedVotesCount.toLocaleString('pt-BR');
  const urnasApuradasDisplay = calculatedUrnasApuradas.toLocaleString('pt-BR');
  const urnasTotaisDisplay = totalPollsCount.toLocaleString('pt-BR');

  const renderStatusTagArea = () => {
    if (isLoadingVotes) {
      return <span className="text-xs italic text-gray-500 whitespace-nowrap">Carregando apuração...</span>;
    }
    if (districtWinnerLegend && districtWinnerColor && districtWinnerTagTextColor) {
      return (
        <span
          className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
          style={{ backgroundColor: districtWinnerColor, color: districtWinnerTagTextColor }}
        >
          {districtWinnerLegend}
        </span>
      );
    }
    return (
      <span className="text-xs italic text-gray-500 whitespace-nowrap">
        {areVotesBeingCounted ? 'Em apuração' : 'Aguardando dados'}
      </span>
    );
  };

  return (
    <div className="flex flex-col items-start md:flex-row md:items-end md:justify-end gap-2 md:gap-4">
      <div className="flex-shrink-0 order-1 md:order-none">
        {renderStatusTagArea()}
      </div>

      <div className="text-sm space-y-0.5 text-left md:text-right order-2 md:order-none">
        <div className="text-gray-600">
          {urnasApuradasDisplay} / {urnasTotaisDisplay} urnas
        </div>
        <div className="w-32 sm:w-36 md:w-40 lg:w-48 bg-gray-200 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full" // Removido bg-blue-600
            style={{ 
              width: `${finalPercentualUrnas.toFixed(2)}%`,
              backgroundColor: '#ff1616' // Cor da barra alterada para vermelho
            }}
            title={`${finalPercentualUrnas.toFixed(2)}% apuradas`}
          ></div>
        </div>
        <div className="text-gray-800">
          <span className="font-bold">{finalPercentualUrnas.toFixed(2)}%</span> apuradas
        </div>
        
        <div className="text-xs text-gray-500 mt-1">
          (Total de votos apurados: {votosApuradosDisplay})
        </div>
      </div>
    </div>
  );
};

export default ApuracaoVisao;