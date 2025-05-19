// lib/statusCalculator.ts

// Tipos de Input e Output já definidos anteriormente
export interface CoalitionVoteInfo {
    legend: string;
    votes: number;
    name?: string; // Nome do candidato líder da coalizão, se aplicável
  }
  
  export interface DistrictStatusInput {
    isLoading: boolean;
    leadingCoalition?: CoalitionVoteInfo;
    runnerUpCoalition?: CoalitionVoteInfo;
    totalVotesInDistrict: number;
    remainingVotesEstimate: number;
    previousSeatHolderCoalitionLegend?: string | null;
  }
  
  export interface DistrictStatusOutput {
    label: string;
    backgroundColor: string;
    textColor: string;
    isFinal: boolean;
    actingCoalitionLegend?: string;
  }
  
  // Função auxiliar para contraste de texto (similar à que você já tem)
  function getTextColorForBackground(hexcolor: string): string {
      if (!hexcolor) return '#1F2937';
      hexcolor = hexcolor.replace("#", "");
      if (hexcolor.length !== 6 && hexcolor.length !== 3) return '#1F2937';
      if (hexcolor.length === 3) {
          hexcolor = hexcolor.split('').map(char => char + char).join('');
      }
      try {
          const r = parseInt(hexcolor.substring(0, 2), 16);
          const g = parseInt(hexcolor.substring(2, 4), 16);
          const b = parseInt(hexcolor.substring(4, 6), 16);
          const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
          return (yiq >= 128 || hexcolor.toLowerCase() === 'ffffff' || hexcolor.toLowerCase() === '#ffffff') ? '#1F2937' : '#FFFFFF';
      } catch (e) { return '#1F2937'; }
  }
  
  // Cores padrão (podem ser personalizadas ou passadas como parâmetro se necessário)
  const STATUS_COLORS = {
    LOADING: { bg: '#E5E7EB', textKey: '#6B7280' }, // gray-200, gray-500
    AWAITING_DATA: { bg: '#E5E7EB', textKey: '#6B7280' },
    PROCESSING: { bg: '#E5E7EB', textKey: '#6B7280' },
    DISPUTA_ACIRRADA: {bg: '#FBBF24', textKey: getTextColorForBackground('#FBBF24')}, // amber-400
    MUITO_PROXIMO: { bg: '#F59E0B', textKey: getTextColorForBackground('#F59E0B') }, // amber-500
    LIDERANDO: { bg: '#3B82F6', textKey: getTextColorForBackground('#3B82F6') },   // blue-500
    GANHOU: { bg: '#10B981', textKey: getTextColorForBackground('#10B981') },     // green-500
    MANTEVE: { bg: '#14B8A6', textKey: getTextColorForBackground('#14B8A6') },   // teal-500
    ELEITO: { bg: '#10B981', textKey: getTextColorForBackground('#10B981') }      // green-500 (para genérico)
  };
  
  
  export function calculateDistrictDynamicStatus(input: DistrictStatusInput): DistrictStatusOutput {
    const {
      isLoading,
      leadingCoalition,
      runnerUpCoalition,
      totalVotesInDistrict,
      remainingVotesEstimate,
      previousSeatHolderCoalitionLegend,
    } = input;
  
    if (isLoading) {
      return { label: "Carregando...", isFinal: false, backgroundColor: STATUS_COLORS.LOADING.bg, textColor: STATUS_COLORS.LOADING.textKey, actingCoalitionLegend: undefined };
    }
  
    if (!leadingCoalition || totalVotesInDistrict === 0) {
      return { label: "Aguardando dados", isFinal: false, backgroundColor: STATUS_COLORS.AWAITING_DATA.bg, textColor: STATUS_COLORS.AWAITING_DATA.textKey, actingCoalitionLegend: undefined };
    }
  
    const leaderLegend = leadingCoalition.legend;
    const leaderVotes = leadingCoalition.votes;
  
    if (!runnerUpCoalition) { // Apenas um candidato com votos ou sem vice claro
      const isOutcomeCertain = remainingVotesEstimate <= 0; // Ajuste: <=0 pois se for 0, não há mais votos
      if (isOutcomeCertain) {
        const isMaintained = previousSeatHolderCoalitionLegend === leaderLegend;
        if (previousSeatHolderCoalitionLegend) {
          const statusKey = isMaintained ? "MANTEVE" : "GANHOU";
          return {
            label: `${leaderLegend} ${isMaintained ? 'manteve' : 'ganhou'}`,
            isFinal: true,
            backgroundColor: STATUS_COLORS[statusKey].bg,
            textColor: STATUS_COLORS[statusKey].textKey,
            actingCoalitionLegend: leaderLegend
          };
        }
        return { label: `${leaderLegend} eleito`, isFinal: true, backgroundColor: STATUS_COLORS.ELEITO.bg, textColor: STATUS_COLORS.ELEITO.textKey, actingCoalitionLegend: leaderLegend };
      }
      return { label: `${leaderLegend} liderando`, isFinal: false, backgroundColor: STATUS_COLORS.LIDERANDO.bg, textColor: STATUS_COLORS.LIDERANDO.textKey, actingCoalitionLegend: leaderLegend };
    }
  
    const runnerUpVotes = runnerUpCoalition.votes;
    const voteDifference = leaderVotes - runnerUpVotes;
  
    // Se, por alguma inconsistência, o "líder" estiver atrás, tratamos como "Disputa acirrada" ou "Muito Próximo"
    if (voteDifference < 0) {
        // Se a diferença absoluta for pequena e ainda houver votos, pode ser "Muito Próximo"
        if (totalVotesInDistrict > 0 && (Math.abs(voteDifference) / totalVotesInDistrict) * 100 <= 1.0 && remainingVotesEstimate > Math.abs(voteDifference) ) {
            return { label: "Muito próximo", isFinal: false, backgroundColor: STATUS_COLORS.MUITO_PROXIMO.bg, textColor: STATUS_COLORS.MUITO_PROXIMO.textKey, actingCoalitionLegend: leaderLegend }; // ou indefinido
        }
        // Caso contrário, é uma disputa acirrada ou dados inconsistentes
        return { label: "Disputa acirrada", isFinal: false, backgroundColor: STATUS_COLORS.DISPUTA_ACIRRADA.bg, textColor: STATUS_COLORS.DISPUTA_ACIRRADA.textKey, actingCoalitionLegend: undefined };
    }
  
  
    const percentageAdvantage = totalVotesInDistrict > 0 ? (voteDifference / totalVotesInDistrict) * 100 : 100;
    const canOutcomeBeReversed = remainingVotesEstimate >= voteDifference;
  
    if (canOutcomeBeReversed) {
      if (percentageAdvantage > 1.0) {
        return { label: `${leaderLegend} liderando`, isFinal: false, backgroundColor: STATUS_COLORS.LIDERANDO.bg, textColor: STATUS_COLORS.LIDERANDO.textKey, actingCoalitionLegend: leaderLegend };
      } else { // Vantagem <= 1% (inclui empate se voteDifference for 0)
        return { label: "Muito próximo", isFinal: false, backgroundColor: STATUS_COLORS.MUITO_PROXIMO.bg, textColor: STATUS_COLORS.MUITO_PROXIMO.textKey, actingCoalitionLegend: leaderLegend }; // ou indefinido
      }
    } else { // Não há votos suficientes para reverter
      const isMaintained = previousSeatHolderCoalitionLegend === leaderLegend;
      if (previousSeatHolderCoalitionLegend) {
        const statusKey = isMaintained ? "MANTEVE" : "GANHOU";
        return {
          label: `${leaderLegend} ${isMaintained ? 'manteve' : 'ganhou'}`,
          isFinal: true,
          backgroundColor: STATUS_COLORS[statusKey].bg,
          textColor: STATUS_COLORS[statusKey].textKey,
          actingCoalitionLegend: leaderLegend
        };
      }
      return { label: `${leaderLegend} eleito`, isFinal: true, backgroundColor: STATUS_COLORS.ELEITO.bg, textColor: STATUS_COLORS.ELEITO.textKey, actingCoalitionLegend: leaderLegend };
    }
  }
  
  // Função para simplificar o status para os cards de candidato
  export function getSimplifiedCandidateStatus(
    districtStatus: DistrictStatusOutput,
    candidateCoalitionLegend: string | undefined, // Legenda da coalizão do candidato
    isCandidateTheLeaderInDistrictCompute: boolean // Este candidato é o líder no cômputo geral do distrito?
  ): "Eleito" | "Liderando" | "Processando" {
    if (districtStatus.label === "Carregando..." || districtStatus.label === "Aguardando dados" || districtStatus.label === "Processando...") {
      return "Processando";
    }
  
    // Se o status do distrito se refere a uma coalizão específica (actingCoalitionLegend existe)
    if (districtStatus.actingCoalitionLegend) {
      if (districtStatus.actingCoalitionLegend === candidateCoalitionLegend) {
        return districtStatus.isFinal ? "Eleito" : "Liderando";
      } else {
        // Se o status é final e não é sobre este candidato, ele não é o foco.
        // Se não é final, e não é sobre este candidato, ele também não é o foco principal do status.
        return "Processando"; // Ou um status que indique que ele não é o foco (ex: "Em disputa")
      }
    }
  
    // Se o status do distrito for genérico como "Muito próximo"
    if (districtStatus.label === "Muito próximo") {
      // Apenas o candidato que está liderando (mesmo que por pouco) nesse cenário de "Muito Próximo" deve ser "Liderando"
      return isCandidateTheLeaderInDistrictCompute ? "Liderando" : "Processando";
    }
    
    // Fallback geral
    return "Processando";
  }