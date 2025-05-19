// components/ApuracaoVisao.tsx
"use client";
import React from 'react';

interface ApuracaoVisaoProps {
  isLoadingVotes: boolean;
  // Props para o rótulo de status dinâmico
  statusLabel: string;
  statusLabelColor?: string;
  statusLabelTextColor?: string;
  // Props existentes para a apuração de urnas/votos
  areVotesBeingCounted: boolean;
  apuratedVotesCount: number;
  totalPollsCount: number;
}

const ApuracaoVisao: React.FC<ApuracaoVisaoProps> = ({
  isLoadingVotes,
  statusLabel,
  statusLabelColor,
  statusLabelTextColor,
  areVotesBeingCounted, // Pode ser usado para o display de "Aguardando dados" etc. se statusLabel não for suficiente
  apuratedVotesCount,
  totalPollsCount,
}) => {
  // Lógica interna do ApuracaoVisao para calcular % de urnas etc. (mantida)
  let calculatedUrnasApuradas = 0;
  if (totalPollsCount > 0) {
    if (apuratedVotesCount > 0) {
      const urnasBasePorVotos = Math.floor(apuratedVotesCount / 500); // Regra de 500 votos/urna
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

  return (
    // O div que você forneceu para o status + apuracao está aqui
    // Removido o div duplicado do status, ele agora é integrado aqui
    <div className="flex flex-col items-start md:flex-row md:items-end md:justify-end gap-2 md:gap-4">
      {/* Rótulo de Status Dinâmico */}
      <div className="flex-shrink-0 order-1 md:order-none">
        {isLoadingVotes && !statusLabel ? ( // Mostra "Carregando status..." apenas se statusLabel ainda não foi definido
            <span className="text-xs italic text-gray-500 whitespace-nowrap">Carregando status...</span>
        ) : (
            <span
                className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                style={{ 
                    backgroundColor: statusLabelColor || 'transparent', // Fallback para transparente se não houver cor
                    color: statusLabelTextColor || 'inherit' // Fallback para cor herdada
                }}
            >
                {statusLabel || (areVotesBeingCounted ? 'Processando...' : 'Aguardando dados')}
            </span>
        )}
      </div>

      {/* Parte da Apuração (urnas, percentual) */}
      <div className="text-sm space-y-0.5 text-left md:text-right order-2 md:order-none">
        <div className="text-gray-600">
          {urnasApuradasDisplay} / {urnasTotaisDisplay} urnas
        </div>
        <div className="w-32 sm:w-36 md:w-40 lg:w-48 bg-gray-200 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full"
            style={{ 
                width: `${finalPercentualUrnas.toFixed(2)}%`,
                backgroundColor: '#ff1616' // Cor vermelha fixa para a barra de progresso
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