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

const FALLBACK_COLOR = '#D1D5DB';
const COALITION_FALLBACK_COLOR = '#6b7280';

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

const CandidateCardInfo: React.FC<CandidateCardInfoProps> = ({ data, leadingId, coalitionColorMap }) => {
  if (!data || data.length === 0) {
    return <p>Sem dados de candidatos para exibir.</p>;
  }

  const sortedData = [...data].sort((a, b) => b.numericVotes - a.numericVotes);
  const leader = sortedData[0];
  const others = sortedData.slice(1, 4);
  const runnerUp = sortedData[1] || null;
  const voteDifference = leader && runnerUp ? leader.numericVotes - runnerUp.numericVotes : null;
  const percentageDifference = leader && runnerUp ? leader.percentage - runnerUp.percentage : null;

  const aspectRatioPaddingTop = '62.5%'; // 16:10. Ajuste conforme necessário (ex: '56.25%' para 16:9)

  const renderCandidateCard = (
    candidate: CandidateVoteProcessed,
    isLeader: boolean,
    leaderVoteDifference?: number | null,
    leaderPercentageDifference?: number | null
  ) => {
    const idKey = candidate.id ? `cand-${candidate.id}` : `${candidate.candidate_name}-${candidate.numericVotes}`;
    const frontLegend = candidate.parl_front_legend;
    const partyLegendDisplay = candidate.party_legend;

    const baseCoalitionColor = frontLegend ? (coalitionColorMap[frontLegend] ?? COALITION_FALLBACK_COLOR) :
                              partyLegendDisplay && coalitionColorMap[partyLegendDisplay] ? (coalitionColorMap[partyLegendDisplay]) :
                              COALITION_FALLBACK_COLOR;

    const leaderCoalitionColor = baseCoalitionColor;
    const statusTagBgColor = candidate.status ? leaderCoalitionColor : FALLBACK_COLOR; // Usa cor da coalizão para status se houver
    const statusTagTextColor = getTextColorForBackground(statusTagBgColor);
    
    const otherCardBorderColor = baseCoalitionColor;
    const otherPartyTagTextColor = getTextColorForBackground(otherCardBorderColor);
    const otherStatusTagBgColor = candidate.status ? baseCoalitionColor : FALLBACK_COLOR; // Para status em cards "outros"
    const otherStatusTagTextColor = getTextColorForBackground(otherStatusTagBgColor);


    if (isLeader) {
      return (
        <div
          key={idKey}
          className="bg-white rounded-lg shadow-xl overflow-hidden border-2 flex flex-col h-full" // h-full permite que este card defina a altura da linha no grid
          style={{ borderColor: leaderCoalitionColor }}
        >
          <div className="w-full relative" style={{ paddingTop: aspectRatioPaddingTop }}>
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
          
          <div className="p-4 md:p-6 flex-grow flex flex-col justify-between"> {/* Adicionado flex flex-col justify-between aqui */}
            <div className="grid grid-cols-2 gap-x-4"> {/* Removido h-full daqui, pois o pai controla */}
              <div className="flex flex-col justify-start space-y-1"> {/* justify-start para alinhar ao topo */}
                <div>
                  <span className="text-lg md:text-4xl font-bold text-gray-800 block break-words">
                    {candidate.candidate_name}
                  </span>
                </div>
                <div className="flex items-center space-x-2 flex-wrap mt-1"> {/* mt-1 para pequeno espaço */}
                  {frontLegend && (
                     <span
                        className="inline-block px-2 py-0.5 rounded text-xs sm:text-sm font-semibold"
                        style={{ backgroundColor: leaderCoalitionColor, color: getTextColorForBackground(leaderCoalitionColor) }}
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

              <div className="flex flex-col justify-start text-right space-y-1"> {/* justify-start para alinhar ao topo */}
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
                
                <div className="mt-1"> {/* mt-1 para pequeno espaço */}
                  <span
                      className="inline-block px-2 py-0.5 rounded text-xs sm:text-sm font-semibold"
                      style={{ backgroundColor: statusTagBgColor, color: statusTagTextColor }}
                  >
                      {candidate.status || 'Liderando'}
                  </span>
                </div>
              </div>
            </div>
             {/* Div de vantagem permanece no final */}
            {(typeof leaderVoteDifference === 'number' || typeof leaderPercentageDifference === 'number') && (
                <div className="mt-auto pt-3"> {/* mt-auto para empurrar para baixo, pt-3 para espaço */}
                    <div className="p-3 md:p-4 bg-gray-100 -mx-4 -mb-4 md:-mx-6 md:-mb-6 rounded-b-lg"> {/* Ajuste de padding negativo para preencher */}
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
      const photoWidthClass = 'w-1/3 md:w-2/5';

      const containerClasses = `
        bg-white rounded-lg shadow-sm transition-all duration-150 ease-in-out
        hover:bg-gray-50 w-full border-2 flex overflow-hidden h-full 
      `; // h-full para esticar junto com o líder

      return (
        <div
          key={idKey}
          className={containerClasses}
          style={{ borderColor: otherCardBorderColor }}
        >
          {/* Coluna da Imagem */}
          <div className={`flex-shrink-0 ${photoWidthClass}`}> {/* Esta coluna define a largura da imagem */}
            {/* Este div cria a proporção. Sua altura é baseada na largura da coluna acima e no paddingTop. */}
            <div className="relative" style={{ paddingTop: aspectRatioPaddingTop }}> 
              <div className="absolute inset-0 bg-gray-200 overflow-hidden">
                {candidate.candidate_photo ? (
                  <img
                    src={candidate.candidate_photo}
                    alt={candidate.candidate_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { /* ... seu onError ... */ }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">?</div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna de Texto */}
          {/* flex-grow permite que esta coluna ocupe o espaço restante.
              flex-col organiza o conteúdo verticalmente.
              justify-start alinha todo o conteúdo agrupado ao topo.
          */}
          <div className="flex flex-col flex-grow p-3 md:p-4 overflow-hidden justify-start">
            {/* Bloco de informações principal */}
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

            {/* Legendas e Status (se houver) - aparecerão abaixo do bloco principal */}
            <div className="mt-2 flex flex-col items-start"> {/* items-start para alinhar à esquerda */}
              {frontLegend && (
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap mb-0.5" // mb-0.5 para pequeno espaço entre legendas
                  style={{ backgroundColor: otherCardBorderColor, color: otherPartyTagTextColor }}
                >
                  {frontLegend}
                </span>
              )}
              {partyLegendDisplay && (
                <span className={`text-xs text-gray-500 font-medium whitespace-nowrap ${frontLegend ? 'mt-0.5' : ''}`}>
                  {partyLegendDisplay}
                </span>
              )}
              {/* Mostrar status se não houver legendas, ou sempre se desejado */}
              {candidate.status && (!frontLegend && !partyLegendDisplay) && ( 
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap mt-1"
                  style={{ backgroundColor: otherStatusTagBgColor, color: otherStatusTagTextColor }}
                >
                  {candidate.status}
                </span>
              )}
            </div>
            {/* Para garantir que o card estique se o conteúdo for pouco e o card do líder for alto: */}
             <div className="mt-auto"></div> {/* Este div com mt-auto empurrará todo o conteúdo acima para o topo se houver espaço vertical */}

          </div>
        </div>
      );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      <div className="flex flex-col"> 
        {leader && renderCandidateCard(leader, true, voteDifference, percentageDifference)}
        {!leader && <p className="text-center text-red-600">Não foi possível determinar o líder.</p>}
      </div>
      
      {others.length > 0 ? (
        <div className="grid grid-flow-row auto-rows-fr gap-3 h-full"> {/* h-full e auto-rows-fr para igualar alturas */}
          {others.map((candidate) => renderCandidateCard(candidate, false))}
        </div>
      ) : (
        leader && (
          <div className="text-gray-500 pt-4 text-center md:text-left h-full flex items-center justify-center">
            Não há outros candidatos entre os 4 primeiros para exibir aqui.
          </div>
        )
      )}
    </div>
  );
};

export default CandidateCardInfo;