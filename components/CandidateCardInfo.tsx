// components/CandidateCardInfo.tsx
"use client";
import React from 'react';
// Certifique-se que o caminho para 'types/election' está correto
// Se 'types' está na raiz, ao lado de 'app' e 'components', este caminho deve funcionar
import { CandidateVote } from '../types/election'; // Seu caminho original mantido

// Interface estendida que o componente espera receber
interface CandidateVoteProcessed extends CandidateVote {
  percentage: number;
  numericVotes: number;
}

// Interface de Props COM coalitionColorMap
export interface CandidateCardInfoProps { // Exportar a interface pode ser útil
  data: CandidateVoteProcessed[];
  leadingId: string | number | null;
  coalitionColorMap: Record<string, string>;
}

// Cor fallback e helper de contraste (mantidos)
const FALLBACK_COLOR = '#D1D5DB'; // Cinza claro fallback
const COALITION_FALLBACK_COLOR = '#6b7280'; // Para borda
function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return '#1F2937'; // Dark Gray
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6) return '#1F2937';
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1F2937' : '#FFFFFF'; // Dark Gray or White
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

  // --- Função interna para renderizar o card de UM candidato ---
  // ADICIONADO leaderVoteDifference e leaderPercentageDifference como parâmetros opcionais
  const renderCandidateCard = (
    candidate: CandidateVoteProcessed,
    isLeader: boolean,
    leaderVoteDifference?: number | null, // Apenas para o líder
    leaderPercentageDifference?: number | null // Apenas para o líder
  ) => {
    const idKey = candidate.id ? `cand-${candidate.id}` : `${candidate.candidate_name}-${candidate.numericVotes}`;
    const frontLegend = candidate.parl_front_legend; // Usado para Frente/Coligação
    const partyLegendDisplay = candidate.party_legend; // Novo: Legenda do Partido
    const coalitionColor = frontLegend ? (coalitionColorMap[frontLegend] ?? COALITION_FALLBACK_COLOR) : COALITION_FALLBACK_COLOR;
    const tagTextColor = getTextColorForBackground(coalitionColor);

    // ---- NOVO LAYOUT PARA O LÍDER ----
    if (isLeader) {
      return (
        <div
          key={idKey}
          className="bg-white rounded-lg shadow-xl overflow-hidden border-4"
          style={{ borderColor: coalitionColor }}
        >
          {/* Seção da Foto - Topo, Largura Total */}
          <div className="w-full h-53 md:h-78 bg-gray-200">
            {candidate.candidate_photo ? (
              <img
                src={candidate.candidate_photo}
                alt={candidate.candidate_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 text-3xl">?</div>
            )}
          </div>

          {/* Seção de Informações - Abaixo da Foto, com Padding */}
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:text-base">
              {/* Coluna Esquerda */}
              <div className="space-y-2">
                <div>
                  <span className="text-lg md:text-4xl font-bold text-gray-800">{candidate.candidate_name}</span>
                </div>
                <div>
                  {frontLegend ? (
                     <span
                        className="inline-block px-2 py-0.5 rounded text-sm font-semibold"
                        style={{ backgroundColor: coalitionColor, color: tagTextColor }}
                    >
                        {frontLegend}
                    </span>
                  ) : <span className="text-gray-700">-</span>}
                </div>
                <div>
                  <span className=" text-sm text-gray-700">{partyLegendDisplay || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-gray-700">
                  <span className="text-sm font-semibold text-gray-600 block">Vantagem:</span>
                  {typeof leaderVoteDifference === 'number' ? `${leaderVoteDifference.toLocaleString('pt-BR')} votos` : '-'}
                  </span>
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-2">
                <div>
                  <span className="text-lg md:text-4xl font-bold" style={{color: coalitionColor || COALITION_FALLBACK_COLOR}}>
                    {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : '0'}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-700">{typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : '0'} votos </span>
                </div>
                <div>
                  {candidate.status ? (
                     <span
                        className="inline-block px-2 py-0.5 rounded text-sm font-semibold"
                        style={{ backgroundColor: coalitionColor, color: tagTextColor }}
                    >
                        {candidate.status || 'Liderando'}
                    </span>
                  ) : <span className="text-gray-700">-</span>}
                </div>              
                <div>
                  <br></br>
                  <span className="text-gray-700">
                  {typeof leaderPercentageDifference === 'number' ? `${leaderPercentageDifference.toFixed(2)} p.p.` : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // ---- LAYOUT EXISTENTE PARA OS OUTROS CANDIDATOS (CÓDIGO ORIGINAL FORNECIDO POR VOCÊ) ----
      // Define classes baseadas se é líder ou não (aqui isLeader será sempre false)
      const photoSize = 'w-20 h-20'; // Ajustado para não-líder
      const nameSize = 'text-lg';     // Ajustado para não-líder
      const infoSize = 'text-base';   // % Ajustado para não-líder
      const voteSize = 'text-xs';   // Votos Ajustado para não-líder
      const cardPadding = 'p-3';      // Ajustado para não-líder
      const borderThickness = 'border-b-4'; // Ajustado para não-líder

      const containerClasses = `
        flex items-center ${cardPadding} bg-white rounded-lg border ${borderThickness} shadow-sm transition-all duration-150 ease-in-out
        border-gray-200 hover:bg-gray-50 w-full
      `; // Removida lógica condicional de isLeader daqui, pois é o bloco 'else'

      return (
        <div
          key={idKey}
          className={containerClasses}
          style={{ borderBottomColor: coalitionColor }}
        >
           {/* Coluna da Foto */}
          <div className={`flex-shrink-0 ${photoSize} mr-3 sm:mr-4 bg-gray-200 border border-gray-300 overflow-hidden rounded`}>
            {candidate.candidate_photo ? (
              <>
                <img
                    src={candidate.candidate_photo}
                    alt={candidate.candidate_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                        const imgElement = e.currentTarget;
                        imgElement.style.display = 'none';
                        const placeholder = imgElement.nextElementSibling as HTMLElement | null;
                        if (placeholder) {
                            placeholder.classList.remove('hidden');
                        }
                        console.error(`Falha ao carregar imagem: ${candidate.candidate_photo}`, e);
                    }}
                />
                <div className={`hidden w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-lg`}>?</div>
              </>
            ) : (
              <div className={`w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-lg`}>?</div>
            )}
          </div>
          {/* Fim da Coluna da Foto */}

          {/* Coluna das Informações */}
          <div className="flex-grow">
            <div className={`${nameSize} font-bold text-gray-800`}>{candidate.candidate_name}</div>
            {frontLegend && (
              <span
                className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mt-1 mb-1"
                style={{ backgroundColor: coalitionColor, color: tagTextColor }}
              >
                {frontLegend}
              </span>
            )}
             <div className={`${infoSize} font-semibold text-gray-700 mt-2`}>
              {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : 'N/A'}%
            </div>
            <div className={`${voteSize} text-gray-500`}>
              ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : 'N/A'} votos)
            </div>
          </div>
        </div>
      );
    }
  };
  // -- Fim da função renderCandidateCard --

  // --- JSX Principal do Componente (Layout de 2 Colunas Externo) ---
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      {/* Coluna 1: Líder */}
      {/* MODIFICADO: Removido space-y-4 pois a vantagem agora está DENTRO do card do líder */}
      <div className="flex flex-col">
        {/* MODIFICADO: Passando voteDifference e percentageDifference para o card do líder */}
        {leader && renderCandidateCard(leader, true, voteDifference, percentageDifference)}

        {/* REMOVIDO: Bloco de exibição da Vantagem que ficava aqui, pois foi movido para dentro do card do líder */}

        {!leader && <p className="text-center text-red-600">Não foi possível determinar o líder.</p>}
      </div>

      {/* Coluna 2: Outros Candidatos (sem alterações aqui) */}
      <div className="space-y-3">
        {others.length > 0 ? (
          others.map((candidate) => renderCandidateCard(candidate, false)) // Não passa as props de vantagem
        ) : (
          leader && <div className="text-gray-500 pt-4 text-center md:text-left h-full flex items-center justify-center">Não há outros candidatos entre os 4 primeiros para exibir aqui.</div>
        )}
      </div>
    </div>
  );
};

export default CandidateCardInfo;