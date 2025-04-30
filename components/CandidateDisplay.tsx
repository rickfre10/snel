// components/CandidateDisplay.tsx
"use client";
import React from 'react';
// Ajuste o caminho se 'types/election' for diferente
import { CandidateVote } from '../types/election';

// Interface estendida que o componente espera receber
interface CandidateVoteProcessed extends CandidateVote {
  percentage: number;
  numericVotes: number;
  // Removido candidate_id daqui, usaremos candidate_name como chave
}

interface CandidateDisplayProps {
  data: CandidateVoteProcessed[];
  leadingId: string | number | null; // ID do líder (será candidate_name)
}

const CandidateDisplay: React.FC<CandidateDisplayProps> = ({ data, leadingId }) => {
  if (!data || data.length === 0) {
    return <p>Sem dados de candidatos para exibir.</p>;
  }

  // Ordena por votos para garantir a ordem visual (opcional, mas útil)
  const sortedData = [...data].sort((a, b) => b.numericVotes - a.numericVotes);

  return (
    // Container geral usando GRID para 2 colunas em telas médias ou maiores
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> {/* gap-3 adiciona espaço */}

      {/* Mapeia os candidatos ordenados */}
      {sortedData.map((candidate) => {
        const idKey = candidate.candidate_name; // Usa o nome como chave única
        const isLeading = idKey === leadingId;

        // Define as classes do container do card
        // Removemos bg-red-50, border-highlight, shadow-md, scale-[1.02] do líder
        // Mantemos um fundo branco padrão e um hover leve para não-líderes
        const containerClasses = `
          flex items-center p-3 rounded-lg border transition-all duration-150 ease-in-out
          ${isLeading ? 'border-gray-300 bg-white' : 'border-gray-200 bg-white hover:bg-gray-50'}
        `;

        // Define as classes para o nome (maior se líder)
        const nameClasses = `font-bold ${isLeading ? 'text-lg' : 'text-base'} text-gray-800`; // Líder text-lg, outros text-base

        // Define as classes para a porcentagem (pode ter destaque sutil se quiser, ex: font-semibold)
        const percentageClasses = `text-sm ${isLeading ? 'font-semibold' : ''} text-gray-600`;

        return (
          // Card individual do candidato
          <div key={idKey} className={containerClasses}>

            {/* Coluna da Foto */}
            <div className="flex-shrink-0 w-16 h-16 mr-4">
              {candidate.candidate_photo ? (
                <><img
                            src={candidate.candidate_photo}
                            alt={candidate.candidate_name}
                            className="w-full h-full rounded-full object-cover border border-gray-300"
                            onError={(e) => {
                                // Placeholder simples em caso de erro na imagem
                                e.currentTarget.style.display = 'none';
                                const placeholder = e.currentTarget.nextElementSibling;
                                if (placeholder) placeholder.classList.remove('hidden');
                            } } />
                            // Adiciona um placeholder oculto que aparece se a imagem falhar
                            <div className="hidden w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-gray-500">?</div></>
              ) : (
                // Placeholder padrão se não houver foto
                <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-gray-500">?</div>
              )}
            </div>

            {/* Coluna das Informações (ESTAVA FALTANDO ESTA PARTE) */}
            <div className="flex-grow">
              <div className={nameClasses}>{candidate.candidate_name}</div>
              <div className={percentageClasses}>
                {/* Garante que percentage é número antes de formatar */}
                {typeof candidate.percentage === 'number' ? candidate.percentage.toFixed(2) : 'N/A'}%
                {' '} {/* Espaçamento */}
                ({typeof candidate.numericVotes === 'number' ? candidate.numericVotes.toLocaleString('pt-BR') : 'N/A'} votos)
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {candidate.party_legend || 'Partido?'} {/* Mostra party_legend */}
                {candidate.parl_front_legend ? ` - ${candidate.parl_front_legend}` : ''} {/* Mostra frente se existir */}
              </div>
            </div>
            {/* Fim da Coluna das Informações */}

          </div> // Fim do Card individual
        );
      })}
    </div> // Fim do Grid
  );
};

export default CandidateDisplay;