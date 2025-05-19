"use client";
import React from 'react';
import { CandidateVote } from '../types/election'; // Ajuste o caminho se necessário

interface CandidateVoteProcessed extends CandidateVote {
  percentage: number;
  numericVotes: number;
  status?: string; // <--- ADICIONADO: para receber o status pré-processado ("Eleito", "Liderando", "Processando")
}

export interface CandidateCardInfoProps {
  data: CandidateVoteProcessed[];
  leadingId: string | number | null; // ID do candidato líder para possível destaque (não usado diretamente no status visual aqui)
  coalitionColorMap: Record<string, string>;
}

const FALLBACK_COLOR = '#D1D5DB'; // Cinza claro para status não definido ou fallback
const COALITION_FALLBACK_COLOR = '#6B7280'; // Cinza médio para coligação não mapeada

// Função para determinar a cor do texto com base na cor de fundo para melhor contraste
function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return '#1F2937';
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6 && hexcolor.length !== 3) return '#1F2937';
     if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(char => char + char).join('');
    }
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128 || hexcolor.toLowerCase() === 'ffffff' || hexcolor.toLowerCase() === '#ffffff') ? '#1F2937' : '#FFFFFF';
    } catch (e) {
        console.error("Erro ao converter hex para RGB:", e);
        return '#1F2937';
    }
}


const CandidateCardInfo: React.FC<CandidateCardInfoProps> = ({ data, leadingId, coalitionColorMap }) => {
  if (!data || data.length === 0) {
    return <p>Sem dados de candidatos para exibir.</p>;
  }

  // O 'data' já deve vir ordenado ou a lógica de ordenação e identificação de líder/vice
  // é melhor tratada no componente pai que prepara os dados, incluindo o 'status'.
  // Para este componente, vamos assumir que 'data' é a lista a ser renderizada
  // e o 'status' em cada candidato já está definido.
  const sortedData = [...data].sort((a, b) => b.numericVotes - a.numericVotes); // Mantido para consistência de exibição
  const leader = sortedData[0]; // Usado para passar dados específicos do líder para renderCandidateCard
  const others = sortedData.slice(1, 4);
  const runnerUp = sortedData[1] || null; // Usado para calcular a diferença para o líder

  // Diferenças para o card do líder
  const voteDifference = leader && runnerUp ? leader.numericVotes - runnerUp.numericVotes : null;
  const percentageDifference = leader && runnerUp ? leader.percentage - runnerUp.percentage : null;

  const imageAspectRatioPaddingTop = '66.67%';

  const renderCandidateCard = (
    candidate: CandidateVoteProcessed,
    isLeader: boolean,
    // Apenas para o líder, para exibir a vantagem
    leaderVoteDifferenceParam?: number | null,
    leaderPercentageDifferenceParam?: number | null
  ) => {
    const idKey = candidate.candidate_id ? `cand-${candidate.candidate_id}` : `${candidate.candidate_name}-${candidate.numericVotes}`; // Usar candidate_id se disponível
    const frontLegend = candidate.parl_front_legend;
    const partyLegendDisplay = candidate.party_legend;

    const baseCoalitionColor = frontLegend ? (coalitionColorMap[frontLegend] ?? COALITION_FALLBACK_COLOR) :
                              partyLegendDisplay && coalitionColorMap[partyLegendDisplay] ? (coalitionColorMap[partyLegendDisplay]) :
                              COALITION_FALLBACK_COLOR;

    // Lógica para o status visual do candidato
    const candidateDisplayStatus = candidate.status || "Processando"; // Usa o status vindo da prop, com fallback

    let actualStatusTagBgColor = FALLBACK_COLOR; // Cor de fundo padrão para a tag de status
    let actualStatusTagTextColor = getTextColorForBackground(actualStatusTagBgColor);

    if (candidateDisplayStatus === "Eleito" || candidateDisplayStatus === "Liderando") {
        actualStatusTagBgColor = baseCoalitionColor; // Usa a cor da coalizão para status "Eleito" ou "Liderando"
        actualStatusTagTextColor = getTextColorForBackground(actualStatusTagBgColor);
    }
    // Para "Processando" ou outros status, usará FALLBACK_COLOR.


    if (isLeader) {
      // Card do Líder
      return (
        <div
          key={idKey}
          className="bg-white rounded-lg shadow-xl overflow-hidden border-2 flex flex-col"
          style={{ borderColor: baseCoalitionColor }} // Cor da borda do líder é a da coalizão
        >
          <div className="w-full relative" style={{ paddingTop: imageAspectRatioPaddingTop }}>
            <div className="absolute inset-0 bg-gray-200 overflow-hidden">
              {candidate.candidate_photo ? (
                <img 
                  src={candidate.candidate_photo} 
                  alt={candidate.candidate_name} 
                  className="w-full h-full object-cover" 
                  loading="lazy" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl">?</div>
              )}
            </div>
          </div>
          
          <div className="p-4 md:p-6 flex-grow flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-x-4">
              <div className="flex flex-col justify-start space-y-1">
                <div>
                  <span className="text-lg md:text-4xl font-bold text-gray-800 block break-words">
                    {candidate.candidate_name}
                  </span>
                </div>
                <div className="flex items-center space-x-2 flex-wrap mt-1">
                  {frontLegend && (
                     <span
                        className="inline-block px-2 py-0.5 rounded text-xs sm:text-sm font-semibold"
                        style={{ backgroundColor: baseCoalitionColor, color: getTextColorForBackground(baseCoalitionColor) }}
                    >
                        {frontLegend}
                    </span>
                  )}
                  {partyLegendDisplay && (
                    <span className={`text-xs sm:text-sm text-gray-600 font-medium ${frontLegend ? 'ml-2' : ''}`}>{partyLegendDisplay}</span>
                  )}
                   {(!frontLegend && !partyLegendDisplay) && <span className="text-xs sm:text-sm text-gray-500">-</span>}
                </div>
              </div>

              <div className="flex flex-col justify-start text-right space-y-1">
                <div>
                  <div>
                    <span className="text-lg md:text-4xl font-bold block" style={{color: baseCoalitionColor }}>
                      {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : '0'}%
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-700 block">
                      ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : '0'} votos)
                    </span>
                  </div>
                </div>
                
                <div className="mt-1">
                  <span
                      className="inline-block px-2 py-0.5 rounded text-xs sm:text-sm font-semibold"
                      style={{ backgroundColor: actualStatusTagBgColor, color: actualStatusTagTextColor }} // Usando as cores de status calculadas
                  >
                      {candidateDisplayStatus} {/* USANDO A VARIÁVEL CORRIGIDA */}
                  </span>
                </div>
              </div>
            </div>

            {(typeof leaderVoteDifferenceParam === 'number' || typeof leaderPercentageDifferenceParam === 'number') && (
                <div className="mt-auto pt-3">
                    <div className="p-3 md:p-4 bg-gray-100 -mx-4 -mb-4 md:-mx-6 md:-mb-6 rounded-b-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
                            <span className="font-semibold text-gray-700 mb-1 sm:mb-0">Vantagem:</span>
                            <div className="text-left sm:text-right space-x-0 sm:space-x-2 flex flex-col sm:flex-row">
                            <span className="text-gray-800 font-medium">
                                {typeof leaderVoteDifferenceParam === 'number' ? `${leaderVoteDifferenceParam.toLocaleString('pt-BR')} votos` : '-'}
                            </span>
                            <span className="text-gray-600">
                            ({typeof leaderPercentageDifferenceParam === 'number' ? `${leaderPercentageDifferenceParam.toFixed(2)} p.p.` : '-'})
                            </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      );
    } else { // Cards dos "Outros" Candidatos
      const photoColumnWidthClass = 'w-2/5';
      const containerClasses = `bg-white rounded-lg shadow-sm transition-all duration-150 ease-in-out hover:bg-gray-50 w-full border-2 flex overflow-hidden`;

      return (
        <div
          key={idKey}
          className={containerClasses}
          style={{ borderColor: baseCoalitionColor }} // Cor da borda é a da coalizão
        >
          <div className={`flex-shrink-0 ${photoColumnWidthClass}`}>
            <div className="relative" style={{ paddingTop: imageAspectRatioPaddingTop }}> 
              <div className="absolute inset-0 bg-gray-200 overflow-hidden">
                {candidate.candidate_photo ? (
                  <img
                    src={candidate.candidate_photo}
                    alt={candidate.candidate_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">?</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col flex-grow p-3 md:p-4 overflow-hidden justify-start">
            <div>
              <span className="block text-xl md:text-2xl font-bold text-gray-800 break-words leading-tight truncate">
                {candidate.candidate_name}
              </span>
              <span className="block text-3xl md:text-4xl font-bold leading-none mt-1" style={{ color: baseCoalitionColor }}>
                {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : '0'}%
              </span>
              <span className="block text-xs md:text-sm text-gray-500 whitespace-nowrap mt-1">
                ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : '0'} votos)
              </span>
            </div>

            <div className="mt-2 flex flex-col items-start">
              {frontLegend && (
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap mb-0.5"
                  style={{ backgroundColor: baseCoalitionColor, color: getTextColorForBackground(baseCoalitionColor) }}
                >
                  {frontLegend}
                </span>
              )}
              {partyLegendDisplay && (
                <span className={`text-xs text-gray-500 font-medium whitespace-nowrap ${frontLegend ? 'mt-0.5' : ''}`}>
                  {partyLegendDisplay}
                </span>
              )}
              {/* Tag de Status para "outros" candidatos */}
              <span
                className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap mt-1"
                style={{ backgroundColor: actualStatusTagBgColor, color: actualStatusTagTextColor }} // Usando as cores de status calculadas
              >
                {candidateDisplayStatus} {/* USANDO A VARIÁVEL CORRIGIDA */}
              </span>
            </div>
            <div className="mt-auto"></div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 md:items-start">
      <div className="flex flex-col">
        {leader && renderCandidateCard(leader, true, voteDifference, percentageDifference)}
        {!leader && <p className="text-center text-red-600">Não foi possível determinar o líder.</p>}
      </div>
      
      {others.length > 0 ? (
        <div className="grid grid-flow-row gap-3">
          {others.map((candidate) => renderCandidateCard(candidate, false))}
        </div>
      ) : (
        leader && (
          <div className="text-gray-500 pt-4 text-center md:text-left flex items-center justify-center">
            Não há outros candidatos entre os 4 primeiros para exibir aqui.
          </div>
        )
      )}
    </div>
  );
};

export default CandidateCardInfo;