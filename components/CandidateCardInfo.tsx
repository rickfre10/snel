// components/CandidateCardInfo.tsx
"use client";
import React from 'react';
import { CandidateVote } from '../types/election';

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
                              partyLegendDisplay ? (coalitionColorMap[partyLegendDisplay] ?? COALITION_FALLBACK_COLOR) :
                              COALITION_FALLBACK_COLOR;

    const leaderCoalitionColor = baseCoalitionColor;
    const statusTagBgColor = candidate.status ? leaderCoalitionColor : FALLBACK_COLOR;
    const statusTagTextColor = getTextColorForBackground(statusTagBgColor);
    
    const otherCardBorderColor = baseCoalitionColor;
    const otherPartyTagTextColor = getTextColorForBackground(otherCardBorderColor);


    if (isLeader) {
      return (
        <div
          key={idKey}
          className="bg-white rounded-lg shadow-xl overflow-hidden border-2 flex flex-col h-full"
          style={{ borderColor: leaderCoalitionColor }}
        >
          <div className="w-full h-48 md:h-64 bg-gray-200">
            {candidate.candidate_photo ? (
              <img src={candidate.candidate_photo} alt={candidate.candidate_name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-3xl">?</div>
            )}
          </div>
          <div className="p-4 md:p-6 flex-grow">
            <div className="grid grid-cols-2 gap-x-4">
              <div className="space-y-2">
                <div>
                  <span className="text-lg md:text-4xl font-bold text-gray-800 block">{candidate.candidate_name}</span>
                </div>
                <div className="flex items-center space-x-2 flex-wrap">
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
              <div className="space-y-2 text-right">
                <div>
                  <span className="text-lg md:text-4xl font-bold" style={{color: leaderCoalitionColor }}>
                    {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : '0'}%
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-700">
                    ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : '0'} votos)
                  </span>
                </div>
                <div>
                  <span
                      className="inline-block px-2 py-0.5 rounded text-xs sm:text-sm font-semibold"
                      style={{ backgroundColor: statusTagBgColor, color: statusTagTextColor }}
                  >
                      {candidate.status || 'Liderando'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {(typeof leaderVoteDifference === 'number' || typeof leaderPercentageDifference === 'number') && (
            <div className="p-3 md:p-4 bg-gray-100 mt-auto">
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
          )}
        </div>
      );
    } else {
      // ---- NOVO LAYOUT PARA OS OUTROS CANDIDATOS (3 COLUNAS) ----
      const photoWidthClass = 'w-16 md:w-20'; // Apenas largura para a foto
      const cardPadding = 'p-3 md:p-4';

      const containerClasses = `
        bg-white rounded-lg shadow-sm transition-all duration-150 ease-in-out 
        hover:bg-gray-50 w-full h-full border-2 flex flex-col ${cardPadding} 
      `;

      return (
        <div
          key={idKey}
          className={containerClasses}
          style={{ borderColor: otherCardBorderColor }}
        >
          {/* Layout interno de 3 colunas */}
          {/* AJUSTE: removido items-start para usar o padrão items-stretch */}
          <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 md:gap-x-4 flex-grow w-full">
            {/* Coluna 1: Foto - agora ocupa toda a altura da célula do grid */}
            {/* AJUSTE: removida altura fixa, usa photoWidthClass para largura */}
            <div className={`flex-shrink-0 ${photoWidthClass} bg-gray-200 border border-gray-300 overflow-hidden rounded`}>
              {candidate.candidate_photo ? (
                <>
                  <img src={candidate.candidate_photo} alt={candidate.candidate_name} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; const placeholder = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null; if (placeholder) placeholder.classList.remove('hidden');}} />
                  <div className={`hidden w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-lg`}>?</div>
                </>
              ) : (
                <div className={`w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-lg`}>?</div>
              )}
            </div>

            {/* Coluna 2: Informações (Nome, Frente/Legenda) */}
            {/* O conteúdo aqui se alinhará ao topo da célula esticada */}
            <div className="space-y-1 md:space-y-1.5 py-1"> {/* Adicionado py-1 para um pequeno respiro vertical se necessário */}
              <div className="text-base md:text-lg font-bold text-gray-800 break-words">
                {candidate.candidate_name}
              </div>
              <div className="flex items-center space-x-2 flex-wrap">
                {frontLegend && (
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                    style={{ backgroundColor: otherCardBorderColor, color: otherPartyTagTextColor }}
                  >
                    {frontLegend}
                  </span>
                )}
                {partyLegendDisplay && (
                  <span className={`text-xs text-gray-500 font-medium ${frontLegend ? 'ml-2' : ''}`}>
                    {partyLegendDisplay}
                  </span>
                )}
                {(!frontLegend && !partyLegendDisplay) && <span className="text-xs text-gray-500">-</span>}
              </div>
            </div>

            {/* Coluna 3: Informações (Percentual, Votos) */}
            {/* O conteúdo aqui se alinhará ao topo da célula esticada */}
            <div className="space-y-1 md:space-y-1.5 text-right py-1"> {/* Adicionado py-1 */}
              <div className="text-sm md:text-base font-bold" style={{ color: otherCardBorderColor }}>
                {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : 'N/A'}%
              </div>
              <div className="text-xs md:text-sm text-gray-500">
                ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : 'N/A'} votos)
              </div>
            </div>
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
        <div className="grid grid-flow-row auto-rows-fr gap-3 h-full">
          {others.map((candidate) => renderCandidateCard(candidate, false))}
        </div>
      ) : (
        leader && <div className="text-gray-500 pt-4 text-center md:text-left h-full flex items-center justify-center">Não há outros candidatos entre os 4 primeiros para exibir aqui.</div>
      )}
    </div>
  );
};

export default CandidateCardInfo;