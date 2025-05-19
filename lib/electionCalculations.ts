// lib/statusCalculator.ts

export interface CoalitionVoteInfo {
  legend: string;
  votes: number;
  name?: string;
}

export interface DistrictStatusInput {
  isLoading: boolean;
  leadingCoalition?: CoalitionVoteInfo;
  runnerUpCoalition?: CoalitionVoteInfo;
  totalVotesInDistrict: number;
  remainingVotesEstimate: number;
  previousSeatHolderCoalitionLegend?: string | null;
  coalitionColorMap: Record<string, string>;
  fallbackCoalitionColor?: string;
}

export interface DistrictStatusOutput {
  label: string;
  backgroundColor: string;
  textColor: string;
  isFinal: boolean;
  actingCoalitionLegend?: string;
}

// Função getTextColorForBackground (mantenha a sua versão)
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

// Cores para status GENÉRICOS
const GENERIC_STATUS_COLORS = {
  LOADING: { bg: '#E5E7EB', textKey: '#6B7280' },         // gray-200, gray-500
  AWAITING_DATA: { bg: '#E5E7EB', textKey: '#6B7280' },    // gray-200, gray-500
  PROCESSING: { bg: '#E5E7EB', textKey: '#6B7280' },      // gray-200, gray-500
  DISPUTA_ACIRRADA: {bg: '#FBBF24', textKey: getTextColorForBackground('#FBBF24')}, // amber-400
  MUITO_PROXIMO: { bg: '#F59E0B', textKey: getTextColorForBackground('#F59E0B') }, // amber-500
  // Cores para LIDERANDO, GANHOU, MANTEVE, ELEITO serão derivadas da coalizão
};

const DEFAULT_FALLBACK_COALITION_COLOR = '#6B7280'; // Cinza médio (Tailwind gray-500)

export function calculateDistrictDynamicStatus(input: DistrictStatusInput): DistrictStatusOutput {
  const {
    isLoading,
    leadingCoalition,
    runnerUpCoalition,
    totalVotesInDistrict,
    remainingVotesEstimate,
    previousSeatHolderCoalitionLegend,
    coalitionColorMap, // Recebido como input
    fallbackCoalitionColor = DEFAULT_FALLBACK_COALITION_COLOR // Usa o default se não provido
  } = input;

  if (isLoading) {
    return { label: "Carregando...", isFinal: false, backgroundColor: GENERIC_STATUS_COLORS.LOADING.bg, textColor: GENERIC_STATUS_COLORS.LOADING.textKey, actingCoalitionLegend: undefined };
  }

  if (!leadingCoalition || totalVotesInDistrict === 0) {
    return { label: "Aguardando dados", isFinal: false, backgroundColor: GENERIC_STATUS_COLORS.AWAITING_DATA.bg, textColor: GENERIC_STATUS_COLORS.AWAITING_DATA.textKey, actingCoalitionLegend: undefined };
  }

  const leaderLegend = leadingCoalition.legend;
  const leaderVotes = leadingCoalition.votes;
  const leaderColor = coalitionColorMap[leaderLegend] || fallbackCoalitionColor;

  if (!runnerUpCoalition) {
    const isOutcomeCertain = remainingVotesEstimate <= 0;
    if (isOutcomeCertain) {
      const isMaintained = previousSeatHolderCoalitionLegend === leaderLegend;
      if (previousSeatHolderCoalitionLegend) {
        const statusText = isMaintained ? 'manteve' : 'ganhou';
        return {
          label: `${leaderLegend} ${statusText}`,
          isFinal: true,
          backgroundColor: leaderColor, // Cor da coalizão
          textColor: getTextColorForBackground(leaderColor),
          actingCoalitionLegend: leaderLegend
        };
      }
      return { label: `${leaderLegend} eleito`, isFinal: true, backgroundColor: leaderColor, textColor: getTextColorForBackground(leaderColor), actingCoalitionLegend: leaderLegend };
    }
    return { label: `${leaderLegend} liderando`, isFinal: false, backgroundColor: leaderColor, textColor: getTextColorForBackground(leaderColor), actingCoalitionLegend: leaderLegend };
  }

  const runnerUpVotes = runnerUpCoalition.votes;
  const voteDifference = leaderVotes - runnerUpVotes;

  if (voteDifference < 0) {
      if (totalVotesInDistrict > 0 && (Math.abs(voteDifference) / totalVotesInDistrict) * 100 <= 1.0 && remainingVotesEstimate > Math.abs(voteDifference) ) {
          return { label: "Muito próximo", isFinal: false, backgroundColor: GENERIC_STATUS_COLORS.MUITO_PROXIMO.bg, textColor: GENERIC_STATUS_COLORS.MUITO_PROXIMO.textKey, actingCoalitionLegend: leaderLegend };
      }
      return { label: "Disputa acirrada", isFinal: false, backgroundColor: GENERIC_STATUS_COLORS.DISPUTA_ACIRRADA.bg, textColor: GENERIC_STATUS_COLORS.DISPUTA_ACIRRADA.textKey, actingCoalitionLegend: undefined };
  }

  const percentageAdvantage = totalVotesInDistrict > 0 ? (voteDifference / totalVotesInDistrict) * 100 : 100;
  const canOutcomeBeReversed = remainingVotesEstimate >= voteDifference;

  if (canOutcomeBeReversed) {
    if (percentageAdvantage > 1.0) {
      return { label: `${leaderLegend} liderando`, isFinal: false, backgroundColor: leaderColor, textColor: getTextColorForBackground(leaderColor), actingCoalitionLegend: leaderLegend };
    } else {
      return { label: "Muito próximo", isFinal: false, backgroundColor: GENERIC_STATUS_COLORS.MUITO_PROXIMO.bg, textColor: GENERIC_STATUS_COLORS.MUITO_PROXIMO.textKey, actingCoalitionLegend: leaderLegend };
    }
  } else { // Não há votos suficientes para reverter
    const isMaintained = previousSeatHolderCoalitionLegend === leaderLegend;
    if (previousSeatHolderCoalitionLegend) {
      const statusText = isMaintained ? 'manteve' : 'ganhou';
      return {
        label: `${leaderLegend} ${statusText}`,
        isFinal: true,
        backgroundColor: leaderColor, // Cor da coalizão
        textColor: getTextColorForBackground(leaderColor),
        actingCoalitionLegend: leaderLegend
      };
    }
    return { label: `${leaderLegend} eleito`, isFinal: true, backgroundColor: leaderColor, textColor: getTextColorForBackground(leaderColor), actingCoalitionLegend: leaderLegend };
  }
}

// A função getSimplifiedCandidateStatus continua a mesma, pois ela já usa o output de calculateDistrictDynamicStatus
export function getSimplifiedCandidateStatus(
  districtStatus: DistrictStatusOutput,
  candidateCoalitionLegend: string | undefined,
  isCandidateTheLeaderInDistrictCompute: boolean
): "Eleito" | "Liderando" | "Processando" {
  if (districtStatus.label === "Carregando..." || districtStatus.label === "Aguardando dados" || districtStatus.label === "Processando...") {
    return "Processando";
  }
  if (districtStatus.actingCoalitionLegend) {
    if (districtStatus.actingCoalitionLegend === candidateCoalitionLegend) {
      return districtStatus.isFinal ? "Eleito" : "Liderando";
    } else {
      return "Processando";
    }
  }
  if (districtStatus.label === "Muito próximo") {
    return isCandidateTheLeaderInDistrictCompute ? "Liderando" : "Processando";
  }
  return "Processando";
}