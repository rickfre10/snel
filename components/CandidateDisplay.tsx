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

// Interface de Props atualizada para incluir colorMap
interface CandidateDisplayProps {
  data: CandidateVoteProcessed[];
  leadingId: string | number | null;
  colorMap: Record<string, string>; // Recebe o mapa de cores
}

const CandidateDisplay: React.FC<CandidateDisplayProps> = ({ data, leadingId, colorMap }) => {
  if (!data || data.length === 0) {
    return <p>Sem dados de candidatos para exibir.</p>;
  }

  // Ordenar por votos
  const sortedData = [...data].sort((a, b) => b.numericVotes - a.numericVotes);

  // Separar o líder dos demais
  const leader = sortedData[0];
  const others = sortedData.slice(1);

  const fallbackColor = '#6b7280'; // Cinza como cor padrão se não achar no mapa

  // Função para renderizar um card de candidato (reutilizável para líder e outros)
  const renderCandidateCard = (candidate: CandidateVoteProcessed, isLeader: boolean) => {
    const idKey = candidate.candidate_name; // Usa nome como key/ID para comparação
    const frontLegend = candidate.parl_front_legend;
    const color = frontLegend ? colorMap[frontLegend] ?? fallbackColor : fallbackColor;

    // Define classes baseadas se é líder ou não
    const photoSize = isLeader ? 'w-24 h-24' : 'w-16 h-16'; // Foto maior para o líder
    const nameSize = isLeader ? 'text-2xl' : 'text-lg'; // Nome maior para o líder
    const infoSize = isLeader ? 'text-base' : 'text-sm';
    const cardPadding = isLeader ? 'p-4' : 'p-3';
    const borderThickness = 'border-b-8'; // Linha grossa embaixo

    return (
      // Card individual com borda inferior colorida
      <div
        key={idKey}
        className={`flex items-center ${cardPadding} bg-white rounded-lg border ${borderThickness} shadow-sm`}
        style={{ borderBottomColor: color }} // Aplica a cor da frente na borda inferior
      >
        {/* Coluna da Foto */}
        <div className={`flex-shrink-0 ${photoSize} mr-4`}>
          {candidate.candidate_photo ? (
            <>
              <img
                src={candidate.candidate_photo}
                alt={candidate.candidate_name}
                // Foto quadrada: remove rounded-full, object-cover pode ajudar
                className="w-full h-full object-cover border border-gray-300 bg-gray-100" // Adiciona bg para erro
                onError={(e) => {
                  e.currentTarget.style.display = 'none'; // Esconde imagem quebrada
                  const placeholder = e.currentTarget.nextElementSibling;
                  if (placeholder) placeholder.classList.remove('hidden'); // Mostra placeholder
                }}
              />
              {/* Placeholder oculto */}
              <div className={`hidden w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 ${isLeader ? 'text-xl' : 'text-base'}`}>?</div>
            </>
          ) : (
            // Placeholder padrão
            <div className={`w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 ${isLeader ? 'text-xl' : 'text-base'}`}>?</div>
          )}
        </div>

        {/* Coluna das Informações */}
        <div className="flex-grow">
          <div className={`${nameSize} font-bold text-gray-800`}>{candidate.candidate_name}</div>
          <div className={`${infoSize} font-semibold text-gray-700`}>
            {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : 'N/A'}%
            {' '}
            ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : 'N/A'} votos)
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {candidate.party_legend || 'Partido?'}
            {frontLegend ? ` - ${frontLegend}` : ''}
          </div>
        </div>
      </div>
    );
  };

  return (
    // Container Geral
    <div className="space-y-4"> {/* Espaço entre o líder e o grid dos outros */}
      {/* Renderiza o Líder (se existir) */}
      {leader && renderCandidateCard(leader, true)}

      {/* Renderiza os Outros Candidatos em um Grid (se existirem) */}
      {others.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"> {/* Grid para 2º em diante */}
          {others.map((candidate) => renderCandidateCard(candidate, false))}
        </div>
      )}
    </div>
  );
};

export default CandidateDisplay;