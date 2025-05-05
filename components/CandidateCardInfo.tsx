// components/CandidateCardInfo.tsx
"use client";
import React from 'react';
// Certifique-se que o caminho para 'types/election' está correto
// Se 'types' está na raiz, ao lado de 'app' e 'components', este caminho deve funcionar
import { CandidateVote } from '../types/election'; // Ajustado para subir dois níveis

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

  // Ordena por votos (mantido)
  const sortedData = [...data].sort((a, b) => b.numericVotes - a.numericVotes);

  // Separa o líder e os próximos 3 (para exibir 2º, 3º, 4º)
  const leader = sortedData[0];
  // Pegamos do índice 1 até (mas não incluindo) o 4 -> [1, 2, 3]
  const others = sortedData.slice(1, 4);

  // Calcula diferença para o segundo colocado (mantido)
  const runnerUp = sortedData[1] || null; // Pode ser null se só houver 1 candidato
  const voteDifference = leader && runnerUp ? leader.numericVotes - runnerUp.numericVotes : null;
  const percentageDifference = leader && runnerUp ? leader.percentage - runnerUp.percentage : null;

  // --- Função interna para renderizar o card de UM candidato ---
  const renderCandidateCard = (candidate: CandidateVoteProcessed, isLeader: boolean) => {
    // Usa 'id' se existir, senão combina nome e votos para uma chave mais robusta
    const idKey = candidate.id ? `cand-${candidate.id}` : `${candidate.candidate_name}-${candidate.numericVotes}`;
    const frontLegend = candidate.parl_front_legend;
    const coalitionColor = frontLegend ? (coalitionColorMap[frontLegend] ?? COALITION_FALLBACK_COLOR) : COALITION_FALLBACK_COLOR;
    const tagTextColor = getTextColorForBackground(coalitionColor);

    // Define classes baseadas se é líder ou não
    const photoSize = isLeader ? 'w-32 h-32 md:w-40 md:h-40' : 'w-20 h-20';
    const nameSize = isLeader ? 'text-2xl md:text-3xl' : 'text-lg';
    const infoSize = isLeader ? 'text-lg md:text-xl' : 'text-base'; // %
    const voteSize = isLeader ? 'text-base' : 'text-xs'; // Votos
    const cardPadding = isLeader ? 'p-4 md:p-5' : 'p-3';
    const borderThickness = isLeader ? 'border-b-8' : 'border-b-4';

    const containerClasses = `
      flex items-center ${cardPadding} bg-white rounded-lg border ${borderThickness} shadow-sm transition-all duration-150 ease-in-out
      ${isLeader ? 'border-gray-300' : 'border-gray-200 hover:bg-gray-50'}
      w-full // Garantir que o card ocupe a largura da coluna
    `;

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
                  className="w-full h-full object-cover" // object-cover tenta preencher sem distorcer
                  loading="lazy" // Adiciona lazy loading para imagens não visíveis imediatamente
                  onError={(e) => {
                      // Tenta esconder a imagem quebrada e mostrar o placeholder
                      const imgElement = e.currentTarget;
                      imgElement.style.display = 'none'; // Esconde a imagem
                      const placeholder = imgElement.nextElementSibling as HTMLElement | null; // Pega o próximo elemento (o div placeholder)
                      if (placeholder) {
                          placeholder.classList.remove('hidden'); // Mostra o placeholder
                      }
                      console.error(`Falha ao carregar imagem: ${candidate.candidate_photo}`, e);
                  }}
              />
              {/* Placeholder que SÓ aparece se onError for acionado */}
              <div className={`hidden w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 ${isLeader ? 'text-2xl' : 'text-lg'}`}>?</div>
            </>
          ) : (
            // Se não existe foto na URL, mostra o placeholder padrão
            <div className={`w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 ${isLeader ? 'text-2xl' : 'text-lg'}`}>?</div>
          )}
        </div>
        {/* Fim da Coluna da Foto */}

        {/* Coluna das Informações */}
        <div className="flex-grow">
          <div className={`${nameSize} font-bold text-gray-800`}>{candidate.candidate_name}</div>
          {/* Tag da COALIZÃO (Frente) */}
          {frontLegend && (
            <span
              className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mt-1 mb-1" // Adicionado margin bottom
              style={{ backgroundColor: coalitionColor, color: tagTextColor }}
            >
              {frontLegend}
            </span>
          )}
           {/* Porcentagem com Destaque */}
           <div className={`${infoSize} font-semibold text-gray-700 mt-2`}>
            {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : 'N/A'}%
          </div>
          {/* Votos com Menos Destaque */}
          <div className={`${voteSize} text-gray-500`}>
            ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : 'N/A'} votos)
          </div>
        </div>
      </div>
    );
  };
  // -- Fim da função renderCandidateCard --

  // --- NOVO JSX Principal do Componente (Layout de 2 Colunas) ---
  return (
    // Grid principal: 1 coluna em mobile, 2 colunas em telas médias ou maiores (md:)
    // gap-6 adiciona espaço entre as colunas
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">

      {/* Coluna 1: Líder e Vantagem */}
      <div className="flex flex-col space-y-4"> {/* Empilha o card do líder e a vantagem */}
        {leader && renderCandidateCard(leader, true)}

        {/* Exibição da Vantagem (APENAS se houver runnerUp) */}
        {runnerUp && voteDifference !== null && percentageDifference !== null && (
            <div className="text-center text-base md:text-lg font-semibold text-gray-700 py-3 border-t border-dashed border-gray-300 mt-2">
                Vantagem: {voteDifference.toLocaleString('pt-BR')} votos ({percentageDifference.toFixed(2)} p.p.)
            </div>
        )}
        {/* Se não houver líder (caso extremo), pode adicionar uma mensagem aqui */}
        {!leader && <p className="text-center text-red-600">Não foi possível determinar o líder.</p>}
      </div>

      {/* Coluna 2: Outros Candidatos (2º, 3º, 4º) */}
      <div className="space-y-3"> {/* Empilha os cards dos outros candidatos */}
        {others.length > 0 ? (
          others.map((candidate) => renderCandidateCard(candidate, false))
        ) : (
          // Mensagem se houver líder mas nenhum outro candidato (ou menos de 4)
          leader && <div className="text-gray-500 pt-4 text-center md:text-left h-full flex items-center justify-center">Não há outros candidatos entre os 4 primeiros para exibir aqui.</div>
        )}
        {/* Se não houver líder, talvez não mostrar nada ou outra mensagem */}
      </div>

    </div> // Fim do grid principal
  );
  // --- Fim do NOVO JSX Principal ---
};

export default CandidateCardInfo;