// components/CandidateDisplay.tsx
"use client";
import React from 'react';
// Ajuste o caminho se 'types/election' for diferente
import { CandidateVote } from '../types/election';

// Interface estendida que o componente espera receber
interface CandidateVoteProcessed extends CandidateVote {
  percentage: number;
  numericVotes: number;
}

// Interface de Props SEM partyColorMap
interface CandidateDisplayProps {
  data: CandidateVoteProcessed[];
  leadingId: string | number | null;
  coalitionColorMap: Record<string, string>; // Para a borda inferior E agora para a tag
}

// Cor fallback e helper de contraste (mantidos)
const FALLBACK_COLOR = '#D1D5DB'; // Cinza claro fallback
const COALITION_FALLBACK_COLOR = '#6b7280'; // Para borda
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

const CandidateDisplay: React.FC<CandidateDisplayProps> = ({ data, leadingId, coalitionColorMap }) => {
  if (!data || data.length === 0) {
    return <p>Sem dados de candidatos para exibir.</p>;
  }

  // Ordena por votos
  const sortedData = [...data].sort((a, b) => b.numericVotes - a.numericVotes);

  // Separa o líder e os próximos 4 (totalizando 5)
  const leader = sortedData[0];
  const others = sortedData.slice(1, 5); // Pega do índice 1 até (mas não incluindo) o 5

  // Calcula diferença para o segundo colocado (se existir nos dados originais)
  const runnerUp = sortedData[1] || null;
  const voteDifference = runnerUp ? leader.numericVotes - runnerUp.numericVotes : null;
  const percentageDifference = runnerUp ? leader.percentage - runnerUp.percentage : null;

  // --- Função interna para renderizar o card de UM candidato ---
  const renderCandidateCard = (candidate: CandidateVoteProcessed, isLeader: boolean) => {
    const idKey = candidate.candidate_name;
    const frontLegend = candidate.parl_front_legend;
    // Cor da COALIZÃO usada para borda E tag agora
    const coalitionColor = frontLegend ? (coalitionColorMap[frontLegend] ?? COALITION_FALLBACK_COLOR) : COALITION_FALLBACK_COLOR;
    // Cor do texto da TAG baseado na cor da COALIZÃO
    const tagTextColor = getTextColorForBackground(coalitionColor);

    // Define classes baseadas se é líder ou não
    const photoSize = isLeader ? 'w-32 h-32' : 'w-20 h-20'; // Líder maior
    const nameSize = isLeader ? 'text-3xl' : 'text-lg'; // Líder maior
    const infoSize = isLeader ? 'text-xl' : 'text-base'; // % do líder maior
    const voteSize = isLeader ? 'text-base' : 'text-xs'; // Votos do líder maior
    const cardPadding = isLeader ? 'p-4' : 'p-3';
    const borderThickness = isLeader ? 'border-b-8' : 'border-b-4'; // Borda do líder mais grossa

    const containerClasses = `
      flex items-center ${cardPadding} bg-white rounded-lg border ${borderThickness} shadow-sm transition-all duration-150 ease-in-out
      ${isLeader ? 'border-gray-300' : 'border-gray-200 hover:bg-gray-50'}
    `;

    return (
      <div
        key={idKey}
        className={containerClasses}
        style={{ borderBottomColor: coalitionColor }} // Borda inferior com cor da COALIZÃO
      >
         {/* Coluna da Foto - CORRIGIDO */}
      <div className={`flex-shrink-0 ${photoSize} mr-3 sm:mr-4 bg-gray-200 border border-gray-300 overflow-hidden`}> {/* Adicionado overflow-hidden */}
        {/* Verifica APENAS UMA VEZ se a foto existe */}
        {candidate.candidate_photo ? (
          // Se existe, tenta mostrar a imagem
          // Usamos um Fragment <> para agrupar img e placeholder de erro
          <>
            <img
                src={candidate.candidate_photo}
                alt={candidate.candidate_name}
                className="w-full h-full object-cover" // object-cover tenta preencher
                onError={(e) => {
                    console.error(`Falha ao carregar imagem: ${candidate.candidate_photo}`, e);
                    // Esconde a imagem quebrada
                    e.currentTarget.style.display = 'none';
                    // Tenta mostrar o placeholder que é irmão (sibling)
                    const placeholder = e.currentTarget.nextElementSibling;
                    if (placeholder) placeholder.classList.remove('hidden');
                }}
            />
            {/* Placeholder que SÓ aparece se onError for acionado */}
            <div className={`hidden w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 ${isLeader ? 'text-2xl' : 'text-lg'}`}>?</div>
          </>
        ) : (
          // Se não existe foto, mostra o placeholder padrão
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
              className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mt-1"
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

  // --- JSX Principal do Componente ---
  return (
    <div className="space-y-4">
      {/* Renderiza o Líder */}
      {leader && renderCandidateCard(leader, true)}

      {/* Exibição da Vantagem (se houver runnerUp) */}
      {runnerUp && voteDifference !== null && percentageDifference !== null && (
          <div className="text-center text-lg font-semibold text-gray-700 py-3 border-y border-dashed border-gray-300">
              Vantagem: {voteDifference.toLocaleString('pt-BR')} votos ({percentageDifference.toFixed(2)} p.p.)
          </div>
      )}

      {/* Container para os Outros Candidatos (agora coluna única) */}
      {others.length > 0 && (
        // Removemos o grid, usamos space-y para espaçamento vertical
        <div className="space-y-3 mt-4">
          {/* Mapeia apenas os próximos 4 (slice(1, 5) já fez isso) */}
          {others.map((candidate) => renderCandidateCard(candidate, false))}
        </div>
      )}
    </div>
  );
  // --- Fim do JSX Principal ---
};

export default CandidateDisplay;