// types/election.ts

// Votos de Candidatos (ajuste as propriedades/tipos se necessário)
export interface CandidateVote {
    district_id: number; // Planilha pode retornar como string
    candidate_name: string;
    party_legend?: string;
    parl_front_legend: string | null; // Mudou de ?: string para : string | null
  votes_qtn: number; // Já convertemos para número na API
  candidate_status: string | null; // Mudou de ?: string | null para : string | null
  candidate_photo: string | null;  // Mudou de ?: string | null para : string | null
  status?: string;            // Ex: "Eleito", "Não Eleito", "2º Turno"
  // --------------------------
  [key: string]: any;
}
  // Votos Proporcionais (ajuste as propriedades/tipos se necessário)
  export interface ProportionalVote {
    uf: string;
    parlamentar_front: string | null; // Mudou de ?: string para : string | null
    // --------------------------
    parl_front_legend: string;     // Essencial
    proportional_votes_qtn: number; // Já convertemos para número na API
    [key: string]: any;
  }
  
  // Informações dos Distritos (ajuste as propriedades/tipos se necessário)
  export interface DistrictInfoFromData {
    district_id: number;
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

  export interface PartyInfo { // Certifique-se que 'export' existe e o nome está correto
    party_name: string | null;
    party_legend: string | null;
    party_number: number | null;
    parlamentar_front: string | null;
    parl_front_legend: string | null; // Importante para o colorMap
    party_color: string | null;
    parl_front_color: string | null; // Importante para o colorMap
    [key: string]: any;
  }
  
  export interface DistrictResultInfo {
    winnerLegend: string | null;
    winnerName?: string;
    districtName?: string;
    maxVotes?: number;
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
  export interface TickerEntry {
    district_id: number;
    districtName: string;
    stateId: string; // uf
    stateName: string;
    winnerName: string | null;
    winnerLegend: string | null;
    winnerPercentage: number | null;
    runnerUpLegend: string | null;
    runnerUpPercentage: number | null;
    runnerUpName: string | null; // Nome do segundo colocado
    statusLabel: string;
    statusBgColor: string;
    statusTextColor: string;
  }

  export interface ProportionalSwingEntry {
    legend: string; // parl_front_legend
    currentPercent: number;
    previousPercent: number;
    swing: number; // currentPercent - previousPercent
  }

  export interface DistrictInfoFromData {
    district_id: number;
    district_name: string;
    uf: string;
    uf_name: string;
    voters_qtn: number;
    polls_qtn: number;
  }
  