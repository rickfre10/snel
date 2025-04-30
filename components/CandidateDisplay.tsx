// components/CandidateDisplay.tsx
"use client";
import React from 'react';
import { CandidateVote } from '../types/election'; // Ajuste o caminho se necessário

// Interface estendida para incluir os dados calculados
interface CandidateVoteProcessed extends CandidateVote {
  percentage: number;
  numericVotes: number;
  candidate_id?: string | number; // Se disponível nos seus dados
}

interface CandidateDisplayProps {
  data: CandidateVoteProcessed[];
  leadingId: string | number | null;
}

const CandidateDisplay: React.FC<CandidateDisplayProps> = ({ data, leadingId }) => {
  if (!data || data.length === 0) {
    return <p>Sem dados de candidatos para exibir.</p>;
  }

  // Ordenar por votos para exibição
  const sortedData = [...data].sort((a, b) => b.numericVotes - a.numericVotes);

  return (
    // Container geral com espaçamento entre os cards
    <div className="space-y-3">
      {sortedData.map((candidate) => {
        const idKey = candidate.candidate_id || candidate.candidate_name; // Chave única
        const isLeading = idKey === leadingId;

        // Classes condicionais para o container do candidato
        const containerClasses = `
          flex items-center p-3 rounded-lg border transition-all duration-200 ease-in-out
          ${isLeading ? 'border-highlight bg-red-50 shadow-md transform scale-[1.02]' : 'border-gray-200 bg-white hover:bg-gray-50'}
        `;
        // Classes condicionais para o nome (maior se líder)
        const nameClasses = `font-bold ${isLeading ? 'text-lg text-highlight' : 'text-base text-gray-800'}`;
        // Classes condicionais para a porcentagem (destaque se líder)
        const percentageClasses = `text-sm ${isLeading ? 'font-semibold text-gray-700' : 'text-gray-600'}`;

        return (
          <div key={idKey} className={containerClasses}>
            {/* Coluna da Foto */}
            <div className="flex-shrink-0 w-16 h-16 mr-4">
              {candidate.candidate_photo ? (
                <img
                  src={candidate.candidate_photo}
                  alt={candidate.candidate_name}
                  className="w-full h-full rounded-full object-cover border border-gray-300"
                  // Adiciona um handler de erro simples para a imagem
                  onError={(e) => {
                    console.error(`Falha ao carregar imagem: ${candidate.candidate_photo}`);
                    // Opcional: esconder a imagem se der erro
                    e.currentTarget.style.display = 'none';
                    // Ou pode mostrar um placeholder alternativo aqui
                    // e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-gray-500">?</div>'; // Exemplo complexo
                }}
            />
        ) : (
            // Placeholder padrão se não houver foto
            <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-gray-500">?</div>
        )}
            </div>
            {/* ... resto ... */}
          </div>
        );
      })}
    </div>
  );
};

export default CandidateDisplay;