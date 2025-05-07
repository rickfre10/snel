"use client";
import React from 'react';
import { CandidateVote } from '../types/election'; // Ajuste o caminho se necessário

interface CandidateVoteProcessed extends CandidateVote {
  percentage: number;
  numericVotes: number;
}

export interface CandidateCardInfoProps {
  data: CandidateVoteProcessed[];
  leadingId: string | number | null;
  coalitionColorMap: Record<string, string>;
}

const FALLBACK_COLOR = '#D1D5DB'; // Cinza claro para status não definido ou fallback
const COALITION_FALLBACK_COLOR = '#6B7280'; // Cinza médio para coligação não mapeada

// Função para determinar a cor do texto com base na cor de fundo para melhor contraste
function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return '#1F2937'; // Cor escura padrão se hexcolor for nulo/undefined
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6) return '#1F2937'; // Retorna cor escura se o formato for inválido

    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        // Fórmula YIQ para luminosidade percebida
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1F2937' : '#FFFFFF'; // Texto escuro para fundos claros, texto claro para fundos escuros
    } catch (e) {
        console.error("Erro ao converter hex para RGB:", e);
        return '#1F2937'; // Fallback em caso de erro
    }
}


const CandidateCardInfo: React.FC<CandidateCardInfoProps> = ({ data, leadingId, coalitionColorMap }) => {
  if (!data || data.length === 0) {
    return <p>Sem dados de candidatos para exibir.</p>;
  }

  const sortedData = [...data].sort((a, b) => b.numericVotes - a.numericVotes);
  const leader = sortedData[0];
  const others = sortedData.slice(1, 4); // Pegar os próximos 3, se existirem
  const runnerUp = sortedData[1] || null; // Segundo colocado

  // Diferenças para o card do líder
  const voteDifference = leader && runnerUp ? leader.numericVotes - runnerUp.numericVotes : null;
  const percentageDifference = leader && runnerUp ? leader.percentage - runnerUp.percentage : null;

  // Proporção da imagem (3:2), paddingTop = (2/3)*100 ≈ 66.67%
  const imageAspectRatioPaddingTop = '66.67%';

  const renderCandidateCard = (
    candidate: CandidateVoteProcessed,
    isLeader: boolean,
    leaderVoteDifference?: number | null, // Apenas para o líder
    leaderPercentageDifference?: number | null // Apenas para o líder
  ) => {
    const idKey = candidate.id ? `cand-${candidate.id}` : `${candidate.candidate_name}-${candidate.numericVotes}`;
    const frontLegend = candidate.parl_front_legend;
    const partyLegendDisplay = candidate.party_legend; // Usar party_legend para exibição

    // Determinar a cor base da coligação/partido
    const baseCoalitionColor = frontLegend ? (coalitionColorMap[frontLegend] ?? COALITION_FALLBACK_COLOR) :
                              partyLegendDisplay && coalitionColorMap[partyLegendDisplay] ? (coalitionColorMap[partyLegendDisplay]) : // Usa party_legend se front não existir
                              COALITION_FALLBACK_COLOR;

    // Cores para o card do líder
    const leaderCoalitionColor = baseCoalitionColor;
    const statusTagBgColor = candidate.status ? leaderCoalitionColor : FALLBACK_COLOR; // Usa cor da coligação para status se houver status
    const statusTagTextColor = getTextColorForBackground(statusTagBgColor);
    
    // Cores para cards "outros" (podem ser iguais ou diferentes se necessário)
    const otherCardBorderColor = baseCoalitionColor;
    const otherPartyTagTextColor = getTextColorForBackground(otherCardBorderColor); // Para a tag de coligação/partido
    const otherStatusTagBgColor = candidate.status ? baseCoalitionColor : FALLBACK_COLOR; // Para a tag de status, se houver
    const otherStatusTagTextColor = getTextColorForBackground(otherStatusTagBgColor);


    if (isLeader) {
      // Card do Líder
      return (
        <div
          key={idKey}
          className="bg-white rounded-lg shadow-xl overflow-hidden border-2 flex flex-col" // Altura determinada pelo conteúdo
          style={{ borderColor: leaderCoalitionColor }}
        >
          {/* Coluna da Imagem do Líder */}
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
          
          {/* Conteúdo de Texto do Líder */}
          <div className="p-4 md:p-6 flex-grow flex flex-col justify-between">
            {/* Nome, Partido/Coligação, Percentual, Votos */}
            <div className="grid grid-cols-2 gap-x-4">
              {/* Coluna Esquerda: Nome, Partido/Coligação */}
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
                        style={{ backgroundColor: leaderCoalitionColor, color: getTextColorForBackground(leaderCoalitionColor) }}
                    >
                        {frontLegend}
                    </span>
                  )}
                  {partyLegendDisplay && ( // Exibe party_legend se existir
                    <span className={`text-xs sm:text-sm text-gray-600 font-medium ${frontLegend ? 'ml-2' : ''}`}>{partyLegendDisplay}</span>
                  )}
                   {(!frontLegend && !partyLegendDisplay) && <span className="text-xs sm:text-sm text-gray-500">-</span>}
                </div>
              </div>

              {/* Coluna Direita: Percentual, Votos, Status */}
              <div className="flex flex-col justify-start text-right space-y-1">
                <div>
                  <div>
                    <span className="text-lg md:text-4xl font-bold block" style={{color: leaderCoalitionColor }}>
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
                      style={{ backgroundColor: statusTagBgColor, color: statusTagTextColor }}
                  >
                      {candidate.status || 'Liderando'} {/* Fallback para 'Liderando' se status for nulo */}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco de Vantagem (apenas para o líder) */}
            {(typeof leaderVoteDifference === 'number' || typeof leaderPercentageDifference === 'number') && (
                <div className="mt-auto pt-3"> {/* mt-auto empurra para baixo, pt-3 dá espaço */}
                    <div className="p-3 md:p-4 bg-gray-100 -mx-4 -mb-4 md:-mx-6 md:-mb-6 rounded-b-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
                            <span className="font-semibold text-gray-700 mb-1 sm:mb-0">Vantagem:</span>
                            <div className="text-left sm:text-right space-x-0 sm:space-x-2 flex flex-col sm:flex-row">
                            <span className="text-gray-800 font-medium">
                                {typeof leaderVoteDifference === 'number' ? `${leaderVoteDifference.toLocaleString('pt-BR')} votos` : '-'}
                            </span>
                            <span className="text-gray-600">
                            ({typeof leaderPercentageDifference === 'number' ? `${leaderPercentageDifference.toFixed(2)} p.p.` : '-'})
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
      // Largura da coluna da foto: 40% (2/5) da largura do card
      const photoColumnWidthClass = 'w-2/5';

      const containerClasses = `
        bg-white rounded-lg shadow-sm transition-all duration-150 ease-in-out
        hover:bg-gray-50 w-full border-2 flex overflow-hidden 
      `; // Altura é livre, determinada pelo conteúdo

      return (
        <div
          key={idKey}
          className={containerClasses}
          style={{ borderColor: otherCardBorderColor }}
        >
          {/* Coluna da Imagem */}
          <div className={`flex-shrink-0 ${photoColumnWidthClass}`}>
            <div className="relative" style={{ paddingTop: imageAspectRatioPaddingTop }}> 
              <div className="absolute inset-0 bg-gray-200 overflow-hidden">
                {candidate.candidate_photo ? (
                  <img
                    src={candidate.candidate_photo}
                    alt={candidate.candidate_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; /* Opcional: Ocultar se erro */ }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">?</div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna de Texto */}
          <div className="flex flex-col flex-grow p-3 md:p-4 overflow-hidden justify-start">
            {/* Nome, Percentual, Votos */}
            <div>
              <span className="block text-xl md:text-2xl font-bold text-gray-800 break-words leading-tight truncate">
                {candidate.candidate_name}
              </span>
              <span className="block text-3xl md:text-4xl font-bold leading-none mt-1" style={{ color: otherCardBorderColor }}>
                {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : '0'}%
              </span>
              <span className="block text-xs md:text-sm text-gray-500 whitespace-nowrap mt-1">
                ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : '0'} votos)
              </span>
            </div>

            {/* Legenda Coligação/Partido e Status */}
            <div className="mt-2 flex flex-col items-start"> {/* Ajustado para empilhar verticalmente */}
              {frontLegend && (
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap mb-0.5" // mb-0.5 para espaço se ambos existirem
                  style={{ backgroundColor: otherCardBorderColor, color: otherPartyTagTextColor }}
                >
                  {frontLegend}
                </span>
              )}
              {partyLegendDisplay && ( // Exibe party_legend se existir
                <span className={`text-xs text-gray-500 font-medium whitespace-nowrap ${frontLegend ? 'mt-0.5' : ''}`}> {/* mt-0.5 se frontLegend também estiver lá */}
                  {partyLegendDisplay}
                </span>
              )}
              {/* Tag de Status (apenas se houver status e não houver legenda de coligação/partido para não poluir) */}
              {/* Ou, se quiser sempre mostrar o status, remova a condição de !frontLegend && !partyLegendDisplay */}
              {candidate.status &&  ( 
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap mt-1" // mt-1 para dar espaço
                  style={{ backgroundColor: otherStatusTagBgColor, color: otherStatusTagTextColor }}
                >
                  {candidate.status}
                </span>
              )}
            </div>
            <div className="mt-auto"></div> {/* Garante que o conteúdo acima seja empurrado para o topo */}
          </div>
        </div>
      );
    }
  };

  return (
    // Grid Principal: 1 coluna em mobile, 2 colunas em 'md' e acima.
    // items-start garante que as colunas não se estiquem para igualar altura,
    // mantendo suas alturas naturais baseadas no conteúdo.
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 md:items-start">
      {/* Coluna do Líder */}
      <div className="flex flex-col"> {/* Wrapper para o card do líder */}
        {leader && renderCandidateCard(leader, true, voteDifference, percentageDifference)}
        {!leader && <p className="text-center text-red-600">Não foi possível determinar o líder.</p>}
      </div>
      
      {/* Coluna dos "Outros" Candidatos */}
      {others.length > 0 ? (
        <div className="grid grid-flow-row gap-3"> {/* Grid para os cards "outros" */}
          {others.map((candidate) => renderCandidateCard(candidate, false))}
        </div>
      ) : (
        // Fallback se não houver "outros" mas houver líder (para manter o layout de 2 colunas)
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