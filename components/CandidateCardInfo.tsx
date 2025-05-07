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

const FALLBACK_COLOR = '#D1D5DB'; // Cinza claro fallback (usado para status Liderando)
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
    // Cor da coalizão para a borda do líder e tags de frente
    const leaderCoalitionColor = frontLegend ? (coalitionColorMap[frontLegend] ?? COALITION_FALLBACK_COLOR) : COALITION_FALLBACK_COLOR;
    // Cor para a tag de status: usa a cor da coalizão se houver status, senão um cinza para "Liderando"
    const statusTagBgColor = candidate.status ? leaderCoalitionColor : FALLBACK_COLOR;
    const statusTagTextColor = getTextColorForBackground(statusTagBgColor);
    // Cor para a tag de frente/partido dos não-líderes
    const otherPartyTagBgColor = frontLegend ? (coalitionColorMap[frontLegend] ?? COALITION_FALLBACK_COLOR) : COALITION_FALLBACK_COLOR;
    const otherPartyTagTextColor = getTextColorForBackground(otherPartyTagBgColor);


    if (isLeader) {
      return (
        <div
          key={idKey}
          className="bg-white rounded-lg shadow-xl overflow-hidden border-2 flex flex-col h-full" // Ajuste: border-2, flex flex-col h-full
          style={{ borderColor: leaderCoalitionColor }}
        >
          {/* Seção da Foto */}
          <div className="w-full h-48 md:h-64 bg-gray-200"> {/* Ajuste: altura da foto */}
            {candidate.candidate_photo ? (
              <img src={candidate.candidate_photo} alt={candidate.candidate_name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-3xl">?</div>
            )}
          </div>

          {/* Seção de Informações Principal */}
          <div className="p-4 md:p-6 flex-grow"> {/* flex-grow para ocupar espaço se necessário */}
            <div className="grid grid-cols-2 gap-x-4">
              {/* Coluna Esquerda */}
              <div className="space-y-2">
                <div>
                  <span className="text-lg md:text-4xl font-bold text-gray-800 block">{candidate.candidate_name}</span>
                </div>
                {/* Frente e Legenda do Partido na mesma linha */}
                <div className="flex items-center space-x-2 flex-wrap">
                  {frontLegend && (
                     <span
                        className="inline-block px-2 py-0.5 rounded text-xs sm:text-sm font-semibold" // text-xs sm:text-sm para melhor responsividade
                        style={{ backgroundColor: leaderCoalitionColor, color: getTextColorForBackground(leaderCoalitionColor) }}
                    >
                        {frontLegend}
                    </span>
                  )}
                  {partyLegendDisplay && (
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">{partyLegendDisplay}</span>
                  )}
                   {(!frontLegend && !partyLegendDisplay) && <span className="text-xs sm:text-sm text-gray-500">-</span>}
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-2 text-right">
                <div>
                  <span className="text-lg md:text-4xl font-bold" style={{color: leaderCoalitionColor || COALITION_FALLBACK_COLOR}}>
                    {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : '0'}%
                  </span>
                </div>
                <div>
                  {/* Votos com parênteses */}
                  <span className="text-sm text-gray-700">
                    ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : '0'} votos)
                  </span>
                </div>
                <div>
                  {/* Status com fallback "Liderando" */}
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

          {/* Nova Seção de Vantagem */}
          {(typeof leaderVoteDifference === 'number' || typeof leaderPercentageDifference === 'number') && ( // Só mostra se houver alguma vantagem
            <div className="p-3 md:p-4 bg-gray-100 mt-auto"> {/* mt-auto para empurrar para baixo se houver espaço flex */}
              <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
                <span className="font-semibold text-gray-700 mb-1 sm:mb-0">Vantagem:</span>
                <div className="text-left sm:text-right space-x-0 sm:space-x-2 flex flex-col sm:flex-row"> {/* Ajustes para mobile */}
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
      // ---- LAYOUT PARA OS OUTROS CANDIDATOS ----
      const photoSize = 'w-16 h-16 md:w-20 md:h-20'; // Ligeiramente menor para caber mais
      const nameSize = 'text-base md:text-lg';
      const infoSize = 'text-sm md:text-base';
      const voteSize = 'text-xs md:text-sm';
      const cardPadding = 'p-3 md:p-4';
      const borderThickness = 'border-b-4';

      // Ajuste: Adicionado h-full e flex flex-col para que o card tente ocupar altura
      const containerClasses = `
        flex items-center ${cardPadding} bg-white rounded-lg border ${borderThickness} shadow-sm 
        transition-all duration-150 ease-in-out border-gray-200 hover:bg-gray-50 w-full h-full flex flex-col justify-center
      `; // Adicionado h-full, flex, flex-col, justify-center

      return (
        <div
          key={idKey}
          className={containerClasses} // h-full aqui para que o card individual preencha o espaço dado pelo grid pai
          style={{ borderBottomColor: otherPartyTagBgColor }}
        >
           {/* Conteúdo do card (foto e infos) */}
          <div className="flex items-center w-full">
            <div className={`flex-shrink-0 ${photoSize} mr-3 bg-gray-200 border border-gray-300 overflow-hidden rounded`}>
              {candidate.candidate_photo ? (
                <>
                  <img src={candidate.candidate_photo} alt={candidate.candidate_name} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; const placeholder = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null; if (placeholder) placeholder.classList.remove('hidden');}} />
                  <div className={`hidden w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-lg`}>?</div>
                </>
              ) : (
                <div className={`w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-lg`}>?</div>
              )}
            </div>
            <div className="flex-grow">
              <div className={`${nameSize} font-bold text-gray-800`}>{candidate.candidate_name}</div>
              {frontLegend && (
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mt-1 mb-0.5" // mb-0.5
                  style={{ backgroundColor: otherPartyTagBgColor, color: otherPartyTagTextColor }}
                >
                  {frontLegend}
                </span>
              )}
              {partyLegendDisplay && !frontLegend && ( // Mostrar sigla do partido se não houver frente
                 <span className="inline-block text-xs text-gray-500 font-medium mt-1 mb-0.5">{partyLegendDisplay}</span>
              )}
               <div className={`${infoSize} font-semibold text-gray-700 mt-1`}> {/* mt-1 */}
                {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : 'N/A'}%
              </div>
              {/* Votos com parênteses */}
              <div className={`${voteSize} text-gray-500`}>
                ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : 'N/A'} votos)
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    // O grid principal (md:grid-cols-2) já faz com que as colunas tenham a mesma altura.
    // A coluna do líder define a altura.
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      {/* Coluna 1: Líder */}
      <div className="flex flex-col"> {/* Este flex-col é para o caso de haver algo abaixo do card do líder no futuro */}
        {leader && renderCandidateCard(leader, true, voteDifference, percentageDifference)}
        {!leader && <p className="text-center text-red-600">Não foi possível determinar o líder.</p>}
      </div>

      {/* Coluna 2: Outros Candidatos */}
      {/* Ajuste: Usando grid aqui com auto-rows-fr para que os cards internos dividam a altura */}
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