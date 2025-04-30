// types/election.ts

// Votos de Candidatos (ajuste as propriedades/tipos se necessário)
export interface CandidateVote {
    district_id: string | number; // Planilha pode retornar como string
    candidate_name: string;
    party_legend?: string;
    parl_front_legend?: string;
    votes_qtn: string | number; // Planilha pode retornar como string
    candidate_status?: string | null;
    candidate_photo?: string | null;
    [key: string]: any; // Permite outras colunas
  }
  
  // Votos Proporcionais (ajuste as propriedades/tipos se necessário)
  export interface ProportionalVote {
    uf: string;
    parlamentar_front?: string;
    parl_front_legend: string;
    proportional_votes_qtn: string | number; // Planilha pode retornar como string
    [key: string]: any; // Permite outras colunas
  }
  
  // Informações dos Distritos (ajuste as propriedades/tipos se necessário)
  export interface DistrictInfoFromData {
    district_id: string | number;
    district_name: string;
    uf: string;
    uf_name: string;
    [key: string]: any;
  }
  
  // Estrutura completa dos dados retornados pela API
  export interface ApiResultData {
    time: number;
    candidateVotes: CandidateVote[];
    proportionalVotes: ProportionalVote[];
    districtsData: DistrictInfoFromData[];
  }
  
  // Tipos para as opções dos seletores
  export interface StateOption {
    id: string; // uf
    name: string; // uf_name
  }
  export interface DistrictOption {
    id: number; // district_id (convertido)
    name: string; // district_name
  }