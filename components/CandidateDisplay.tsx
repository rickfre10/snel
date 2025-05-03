// components/CandidateDisplay.tsx
"use client";
import React from 'react';
// Ajuste o caminho se 'types/election' for diferente
import { CandidateVote, PartyInfo } from '../types/election'; // Importe PartyInfo também se precisar de mais detalhes

// Interface estendida que o componente espera receber
// Certifique-se que os tipos aqui batem com o que é calculado em page.tsx
interface CandidateVoteProcessed extends CandidateVote {
  percentage: number;
  numericVotes: number;
  // candidate_id não é mais usado como identificador principal aqui
}

// Interface de Props atualizada para incluir colorMap
interface CandidateDisplayProps {
  data: CandidateVoteProcessed[];
  leadingId: string | number | null; // ID do líder (candidate_name)
  colorMap: Record<string, string>; // Mapa de cores { "TDS": "#cor", ... }
}

const CandidateDisplay: React.FC<CandidateDisplayProps> = ({ data, leadingId, colorMap }) => {
  // Verifica se há dados antes de prosseguir
  if (!data || data.length === 0) {
    return <p>Sem dados de candidatos para exibir.</p>;
  }

  // Ordena os dados por votos para exibição visual
  // É importante fazer uma cópia com [...data] para não modificar o array original
  const sortedData = [...data].sort((a, b) => b.numericVotes - a.numericVotes);

  // Separa o líder (primeiro do array ordenado) dos demais
  const leader = sortedData[0];
  const others = sortedData.slice(1);

  // Cor padrão caso a frente/coalizão não seja encontrada no mapa de cores
  const fallbackColor = '#6b7280'; // Um cinza padrão

  // -- Função interna para renderizar o card de UM candidato --
  // Isso ajuda a organizar e reutilizar a lógica de renderização do card
  const renderCandidateCard = (candidate: CandidateVoteProcessed, isLeader: boolean) => {
    // Usa o nome como identificador único para a key do React
    const idKey = candidate.candidate_name;
    // Pega a legenda da frente para buscar a cor
    const frontLegend = candidate.parl_front_legend;
    // Busca a cor no mapa; usa fallback se não encontrar
    const color = frontLegend ? (colorMap[frontLegend] ?? fallbackColor) : fallbackColor;

    // Define classes de tamanho e estilo condicionalmente
    const photoSize = isLeader ? 'w-24 h-24' : 'w-16 h-16'; // Foto maior para o líder
    const nameSize = isLeader ? 'text-2xl' : 'text-lg'; // Nome maior para o líder
    const infoSize = isLeader ? 'text-base' : 'text-sm';
    const cardPadding = isLeader ? 'p-4' : 'p-3';
    const borderThickness = 'border-b-8'; // Espessura da borda inferior

    // Classes do container principal do card
    const containerClasses = `
      flex items-center ${cardPadding} bg-white rounded-lg border ${borderThickness} shadow-sm transition-all duration-150 ease-in-out
      ${isLeader ? 'border-gray-300' : 'border-gray-200 hover:bg-gray-50'}
    `; // Sem cor de fundo/borda especial para o líder, apenas tamanho

    return (
      // Card individual com borda inferior colorida dinamicamente
      <div
        key={idKey}
        className={containerClasses}
        style={{ borderBottomColor: color }} // Aplica a cor dinamicamente
      >
        {/* Coluna da Foto */}
        <div className={`flex-shrink-0 ${photoSize} mr-4 bg-gray-200 border border-gray-300`}> {/* Foto quadrada por padrão se for div, bg p/ placeholder */}
          {candidate.candidate_photo ? (
            <>
              <img
                src={candidate.candidate_photo}
                alt={candidate.candidate_name}
                className="w-full h-full object-cover" // object-cover para preencher
                onError={(e) => {
                  // Esconde a imagem quebrada e mostra o placeholder irmão
                  e.currentTarget.style.display = 'none';
                  const placeholder = e.currentTarget.nextElementSibling;
                  if (placeholder) placeholder.classList.remove('hidden');
                }}
              />
              {/* Placeholder oculto que só aparece se a imagem falhar */}
              <div className={`hidden w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 ${isLeader ? 'text-xl' : 'text-base'}`}>?</div>
            </>
          ) : (
            // Placeholder padrão se não houver foto
            <div className={`w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 ${isLeader ? 'text-xl' : 'text-base'}`}>?</div>
          )}
        </div>

        {/* Coluna das Informações */}
        <div className="flex-grow">
          {/* Nome do Candidato */}
          <div className={`${nameSize} font-bold text-gray-800`}>
            {candidate.candidate_name}
          </div>
          {/* Porcentagem e Votos */}
          <div className={`${infoSize} font-semibold text-gray-700`}>
            {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : 'N/A'}%
            {' '}
            ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : 'N/A'} votos)
          </div>
          {/* Partido e Frente */}
          <div className="text-sm text-gray-500 mt-1">
            {candidate.party_legend || 'Partido?'}
            {frontLegend ? ` - ${frontLegend}` : ''}
          </div>
        </div>
      </div>
    );
  };
  // -- Fim da função renderCandidateCard --

  // --- JSX Principal do Componente ---
  return (
    // Container Geral
    <div className="space-y-4"> {/* Espaçamento entre líder e grid */}

      {/* Renderiza o Líder (se existir) */}
      {leader && renderCandidateCard(leader, true)}

      {/* Renderiza os Outros Candidatos em um Grid (se existirem) */}
      {others.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {/* Mapeia os outros candidatos e chama a função de renderização */}
          {others.map((candidate) => renderCandidateCard(candidate, false))}
        </div>
      )}
    </div>
  );
  // --- Fim do JSX Principal ---
};

export default CandidateDisplay;