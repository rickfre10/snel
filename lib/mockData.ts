// lib/mockData.ts

// Interface para os dados dos votos de candidatos (baseado nas colunas do CSV)
interface CandidateVote {
  district_id: number;
  candidate_name: string;
  party_legend: string;
  parl_front_legend?: string; // Opcional, se existir
  votes_qtn: number;
  candidate_status?: string | null; // Opcional, pode ser null
  candidate_photo?: string | null; // Opcional
}

// Interface para os dados dos votos proporcionais (baseado nas colunas do CSV)
interface ProportionalVote {
  uf: string;
  parlamentar_front?: string; // Opcional
  parl_front_legend: string;
  proportional_votes_qtn: number;
}

// Objeto com os dados mockados tipados
const mockCandidateVotes: Record<string, CandidateVote[]> = {
  '50': [
    // Use os dados reais ou exemplos mais próximos dos seus CSVs aqui
    { district_id: 101, candidate_name: 'Otávio Menezes', party_legend: 'PDEA', parl_front_legend: 'UNI', votes_qtn: 44353, candidate_status: 'sim' },
    { district_id: 101, candidate_name: 'Pedro Serrano', party_legend: 'PT', parl_front_legend: 'TDS', votes_qtn: 17357, candidate_status: null },
    { district_id: 201, candidate_name: 'Ana Beatriz Campos', party_legend: 'PT', parl_front_legend: 'TDS', votes_qtn: 6511, candidate_status: 'sim' },
    { district_id: 201, candidate_name: 'Luiz Felipe Duarte', party_legend: 'UNIDOS', parl_front_legend: 'UNI', votes_qtn: 38295, candidate_status: null },
  ],
  '100': [
    // Use os dados reais ou exemplos mais próximos dos seus CSVs aqui
    { district_id: 101, candidate_name: 'Otávio Menezes', party_legend: 'PDEA', parl_front_legend: 'UNI', votes_qtn: 98561, candidate_status: 'sim' },
    { district_id: 101, candidate_name: 'Pedro Serrano', party_legend: 'PT', parl_front_legend: 'TDS', votes_qtn: 75464, candidate_status: null },
    { district_id: 101, candidate_name: 'Maria Abulquerque', party_legend: 'PSD', parl_front_legend: 'PSD', votes_qtn: 34698, candidate_status: null },
    { district_id: 201, candidate_name: 'Ana Beatriz Campos', party_legend: 'PT', parl_front_legend: 'TDS', votes_qtn: 13563, candidate_status: 'sim' },
    { district_id: 201, candidate_name: 'Luiz Felipe Duarte', party_legend: 'UNIDOS', parl_front_legend: 'UNI', votes_qtn: 76590, candidate_status: null },
  ],
};

const mockProportionalVotes: Record<string, ProportionalVote[]> = {
  '50': [
     // Use os dados reais ou exemplos mais próximos dos seus CSVs aqui
    { uf: 'TP', parlamentar_front: 'Frente de Todos', parl_front_legend: 'TDS', proportional_votes_qtn: 20471 },
    { uf: 'TP', parlamentar_front: 'Unidos por Haagar', parl_front_legend: 'UNI', proportional_votes_qtn: 15045 },
    { uf: 'MA', parlamentar_front: 'Frente de Todos', parl_front_legend: 'TDS', proportional_votes_qtn: 5000000 },
    { uf: 'MA', parlamentar_front: 'Unidos por Haagar', parl_front_legend: 'UNI', proportional_votes_qtn: 1500000 },
  ],
  '100': [
     // Use os dados reais ou exemplos mais próximos dos seus CSVs aqui
    { uf: 'TP', parlamentar_front: 'Frente de Todos', parl_front_legend: 'TDS', proportional_votes_qtn: 45490 },
    { uf: 'TP', parlamentar_front: 'Unidos por Haagar', parl_front_legend: 'UNI', proportional_votes_qtn: 65409 },
    { uf: 'TP', parlamentar_front: 'Frente Conservadora', parl_front_legend: 'CON', proportional_votes_qtn: 15782 },
    { uf: 'MA', parlamentar_front: 'Frente de Todos', parl_front_legend: 'TDS', proportional_votes_qtn: 10567856 },
    { uf: 'MA', parlamentar_front: 'Unidos por Haagar', parl_front_legend: 'UNI', proportional_votes_qtn: 3057895 },
  ],
};

// Interface para o retorno da função
interface MockResults {
  candidateVotes: CandidateVote[];
  proportionalVotes: ProportionalVote[];
}

// Função tipada para buscar os dados mockados
export function getMockResults(percentage: number): MockResults {
  const time = String(percentage); // Garante que a chave é string '50' ou '100'

  // Retorna os dados para o tempo solicitado ou 100% como fallback
  const candidateVotes = mockCandidateVotes[time] || mockCandidateVotes['100'] || [];
  const proportionalVotes = mockProportionalVotes[time] || mockProportionalVotes['100'] || [];

  return {
    candidateVotes,
    proportionalVotes,
  };
}