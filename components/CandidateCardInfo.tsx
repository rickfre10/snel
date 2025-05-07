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

const FALLBACK_COLOR = '#D1D5DB'; // Cinza claro
const COALITION_FALLBACK_COLOR = '#6b7280'; // Cinza médio

// Função para determinar a cor do texto com base na cor de fundo
function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return '#1F2937'; // Cor escura padrão (ex: text-gray-800)
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6) return '#1F2937'; 
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1F2937' : '#FFFFFF'; // Retorna branco para fundos escuros, escuro para fundos claros
    } catch (e) { return '#1F2937'; }
}

const CandidateCardInfo: React.FC<CandidateCardInfoProps> = ({ data, leadingId, coalitionColorMap }) => {
  if (!data || data.length === 0) {
    return <p>Sem dados de candidatos para exibir.</p>;
  }

  // Ordena os dados e define líder e outros
  const sortedData = [...data].sort((a, b) => b.numericVotes - a.numericVotes);
  const leader = sortedData[0];
  const others = sortedData.slice(1, 4); // Pega os próximos 3, se existirem
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

    // Determina a cor base da coalizão/partido
    const baseCoalitionColor = frontLegend ? (coalitionColorMap[frontLegend] ?? COALITION_FALLBACK_COLOR) :
                              partyLegendDisplay && coalitionColorMap[partyLegendDisplay] ? (coalitionColorMap[partyLegendDisplay]) :
                              COALITION_FALLBACK_COLOR;

    const leaderCoalitionColor = baseCoalitionColor;
    const statusTagBgColor = candidate.status ? leaderCoalitionColor : FALLBACK_COLOR; // Usa cor da coalizão para status se houver status, senão fallback
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
          {/* Contêiner da Foto do Líder com proporção 4:3 */}
          <div className="w-full bg-gray-200 aspect-w-4 aspect-h-3"> {/* Proporção 4:3 */}
            {candidate.candidate_photo ? (
              <img 
                src={candidate.candidate_photo} 
                alt={candidate.candidate_name} 
                className="w-full h-full object-cover" /* object-cover faz o corte/preenchimento */
                loading="lazy" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-3xl">?</div>
            )}
          </div>
          
          <div className="p-4 md:p-6 flex-grow">
            <div className="grid grid-cols-2 gap-x-4 h-full"> {/* Usando grid para dividir em duas colunas */}
              {/* Coluna da Esquerda: Nome e Partido/Frente */}
              <div className="flex flex-col justify-between space-y-1">
                <div>
                  <span className="text-lg md:text-4xl font-bold text-gray-800 block break-words">
                    {candidate.candidate_name}
                  </span>
                </div>
                <div className="flex items-center space-x-2 flex-wrap"> {/* flex-wrap para legandas */}
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

              {/* Coluna da Direita: Porcentagem, Votos e Status */}
              <div className="flex flex-col justify-between text-right space-y-1">
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
                
                <div>
                  <span
                      className="inline-block px-2 py-0.5 rounded text-xs sm:text-sm font-semibold"
                      style={{ backgroundColor: statusTagBgColor, color: statusTagTextColor }}
                  >
                      {candidate.status || 'Liderando'} {/* Fallback para 'Liderando' se status não definido */}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Seção de Vantagem (se aplicável) */}
          {(typeof leaderVoteDifference === 'number' || typeof leaderPercentageDifference === 'number') && (
            <div className="p-3 md:p-4 bg-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
                <span className="font-semibold text-gray-700 mb-1 sm:mb-0">Vantagem:</span>
                <div className="text-left sm:text-right space-x-0 sm:space-x-2 flex flex-col sm:flex-row"> {/* Ajustado para melhor responsividade */}
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
      // Layout para os outros candidatos
      const photoWidthClass = 'w-1/3 md:w-2/5'; // Largura da coluna da foto. Ajuste conforme necessário.

      const containerClasses = `
        bg-white rounded-lg shadow-sm transition-all duration-150 ease-in-out
        hover:bg-gray-50 w-full border-2 flex overflow-hidden h-full 
      `; 
      // h-full aqui ajuda a alinhar com o grid auto-rows-fr do pai

      return (
        <div
          key={idKey}
          className={containerClasses}
          style={{ borderColor: otherCardBorderColor }}
        >
          {/* Contêiner da Foto do "Outro" Candidato com proporção 4:3 */}
          <div className={`flex-shrink-0 ${photoWidthClass} bg-gray-200 aspect-w-4 aspect-h-3`}> {/* Proporção 4:3 */}
            {candidate.candidate_photo ? (
              <img
                src={candidate.candidate_photo}
                alt={candidate.candidate_name}
                className="w-full h-full object-cover" /* object-cover faz o corte/preenchimento */
                loading="lazy"
                onError={(e) => {
                  const imgElement = e.currentTarget as HTMLImageElement;
                  imgElement.style.display = 'none'; // Esconde imagem quebrada
                  const parent = imgElement.parentNode as HTMLElement | null;
                  if (parent && !parent.querySelector('.placeholder-img')) { // Evita múltiplos placeholders
                    const placeholder = document.createElement('div');
                    placeholder.className = "placeholder-img w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-xl";
                    placeholder.textContent = "?";
                    parent.appendChild(placeholder);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-xl">?</div>
            )}
          </div>

          {/* Seção das Informações (Direita) */}
          <div className="flex flex-col flex-grow justify-between p-3 md:p-4 overflow-hidden">
            {/* Bloco Superior: Nome e Porcentagem */}
            <div>
              <span className="block text-xl md:text-2xl font-bold text-gray-800 break-words leading-tight truncate">
                {candidate.candidate_name}
              </span>
              <span className="block text-3xl md:text-4xl font-bold leading-none mt-1" style={{ color: otherCardBorderColor }}>
                {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : '0'}%
              </span>
            </div>

            {/* Bloco Inferior: Frente/Partido e Votos */}
            <div className="text-right mt-2"> {/* Alinha este bloco à direita e adiciona margem superior */}
              <div className="flex flex-col items-end space-y-0.5">
                {frontLegend && (
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                    style={{ backgroundColor: otherCardBorderColor, color: otherPartyTagTextColor }}
                  >
                    {frontLegend}
                  </span>
                )}
                {partyLegendDisplay && (
                  <span className={`text-xs text-gray-500 font-medium ${frontLegend ? 'mt-0.5' : ''} whitespace-nowrap`}>
                    {partyLegendDisplay}
                  </span>
                )}
                {(!frontLegend && !partyLegendDisplay) && <span className="text-xs text-gray-500">-</span>}
              </div>
              <span className="block text-xs md:text-sm text-gray-500 whitespace-nowrap mt-1">
                ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : '0'} votos)
              </span>
            </div>
          </div>
        </div>
      );
    }
  };

  // Renderização principal do componente
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      {/* Coluna do Líder */}
      <div className="flex flex-col"> 
        {leader && renderCandidateCard(leader, true, voteDifference, percentageDifference)}
        {!leader && <p className="text-center text-red-600">Não foi possível determinar o líder.</p>}
      </div>
      
      {/* Coluna dos Outros Candidatos */}
      {/* Usamos h-full aqui para que o grid preencha a altura disponível se a coluna do líder for mais alta,
          e auto-rows-fr para que os cards dentro deste grid dividam essa altura. */}
      {others.length > 0 ? (
        <div className="grid grid-flow-row auto-rows-fr gap-3 h-full">
          {others.map((candidate) => renderCandidateCard(candidate, false))}
        </div>
      ) : (
        // Mensagem se não houver outros candidatos, mas houver um líder
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