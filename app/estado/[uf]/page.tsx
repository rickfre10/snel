// app/estado/[uf]/page.tsx
"use client";

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import React, { useMemo, useState, useEffect } from 'react';

// Funções e dados estáticos
import { calculateProportionalSeats, ProportionalVotesInput } from '@/lib/electionCalculations';
import { partyData, districtsData } from '@/lib/staticData';
import { haagarDistrictLayout } from '@/lib/mapLayout'; 
import {
    previousStateProportionalPercentagesData,
    PreviousStateProportionalPercentage,
    previousStateProportionalSeatsData,
    PreviousStateProportionalSeats,
    previousDistrictResultsData 
} from '@/lib/previousElectionData';

// Tipos
import type {
    ProportionalVote,
    CandidateVote,
    TickerEntry,
    DistrictInfoFromData,
    DistrictResultInfo as BaseDistrictResultInfo, // Renomeado para evitar conflito com o tipo local
    ProportionalSwingEntry
} from '@/types/election';

// Componentes
import SeatCompositionPanel from '@/components/SeatCompositionPanel';
import RaceTicker from '@/components/RaceTicker';
import ProportionalSeatAllocationDetails from '@/components/ProportionalSeatAllocationDetails';
import ProportionalBarChart from '@/components/ProportionalBarChart';
import InteractiveMap from '@/components/InteractiveMap';
import StateProportionalSwing from '@/components/StateProportionalSwing';
import ApuracaoVisao from '@/components/ApuracaoVisao';

// Lógica de Status Dinâmico
import {
  calculateDistrictDynamicStatus,
  DistrictStatusInput,
  CoalitionVoteInfo
  // checkIfStatusIsFinal // Definida localmente abaixo
} from '@/lib/statusCalculator';

// Configuração de assentos
const totalProportionalSeatsByState: Record<string, number> = { "TP": 1, "MA": 40, "MP": 23, "BA": 16, "PB": 9, "PN": 4 };
const COALITION_FALLBACK_COLOR = '#6B7280';

// Helper checkIfStatusIsFinal (definido localmente para resolver o erro de importação)
const checkIfStatusIsFinal = (statusLabel: string | null | undefined): boolean => {
  if (!statusLabel) return false;
  const lowerLabel = statusLabel.toLowerCase();
  const finalKeywords = ["ganhou", "manteve", "eleito", "definido", "conquistou"]; 
  return finalKeywords.some(keyword => lowerLabel.includes(keyword));
};

const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedStr = String(value).replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

interface ApiVotesData { time: number; candidateVotes: CandidateVote[]; proportionalVotes: ProportionalVote[]; }

type StateViewMode = 'visaoGeral' | 'votacaoProporcional' | 'movimentacao';

// Tipo para o sumário de resultados de distrito enriquecido, usado internamente nesta página
// Estende o BaseDistrictResultInfo para incluir os campos adicionais.
interface EnrichedDistrictResultInfo extends BaseDistrictResultInfo {
    isFinal: boolean; 
    totalVotesInDistrict: number; 
    statusLabel: string | null; 
}


export default function StatePage() {
  const params = useParams();
  const searchParamsHook = useSearchParams();
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState<number>(100);
  const [pageData, setPageData] = useState<ApiVotesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<StateViewMode>('visaoGeral');
  const [hoveredDistrictInfo, setHoveredDistrictInfo] = useState<string | null>(null);

  const stateId = useMemo(() => (params.uf as string)?.toUpperCase(), [params.uf]);
  const initialTimeFromQuery = useMemo(() => searchParamsHook.get('time') ? parseInt(searchParamsHook.get('time')!, 10) : 100, [searchParamsHook]);

  useEffect(() => {
    setCurrentTime(initialTimeFromQuery);
  }, [initialTimeFromQuery]);

  const stateInfo = useMemo(() => {
    if (!stateId) return null;
    return districtsData.find((d: DistrictInfoFromData) => d.uf === stateId);
  }, [stateId]);

  const totalPRSeatsForThisState = useMemo(() => {
    if (!stateId) return 0;
    return totalProportionalSeatsByState[stateId] || 0;
  }, [stateId]);

  const coalitionColorMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    partyData.forEach(party => {
      if (party.parl_front_legend && party.parl_front_color) {
        map[party.parl_front_legend] = party.parl_front_color;
      }
      if (party.party_legend && party.party_color && !map[party.party_legend]) {
        map[party.party_legend] = party.party_color;
      }
    });
    return map;
  }, []);

  const allPossibleStates = useMemo(() => {
    const uniqueStates = new Map<string, string>();
    districtsData.forEach((district: DistrictInfoFromData) => {
        if (district.uf && district.uf_name) uniqueStates.set(district.uf, district.uf_name);
    });
    return Array.from(uniqueStates, ([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name));
  }, []);

  useEffect(() => {
    if (!stateId || !stateInfo) {
      setIsLoading(false);
      if (!stateId) setError("ID do Estado não fornecido na URL.");
      else if (!stateInfo) setError(`Informações para o estado ${stateId} não encontradas.`);
      return;
    }
    const loadData = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch(`/api/results?time=${currentTime}`); 
        if (!response.ok) throw new Error((await response.json()).error || 'Falha ao buscar dados de votos');
        const allVoteData: ApiVotesData = await response.json();
        setPageData(allVoteData);
      } catch (e) { console.error("Erro ao carregar dados do estado via API:", e); setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally { setIsLoading(false); }
    };
    loadData();
  }, [stateId, currentTime, stateInfo]);

  const candidateVotesInState = useMemo(() => {
    if (!pageData?.candidateVotes || !stateId) return [];
    const districtIdsInThisStateSet = new Set(districtsData.filter(d => d.uf === stateId).map(d => d.district_id));
    return pageData.candidateVotes.filter(vote =>
        districtIdsInThisStateSet.has(parseNumber(vote.district_id))
    );
  }, [pageData?.candidateVotes, stateId]);

  const detailedDistrictResultsInState = useMemo((): Record<string, EnrichedDistrictResultInfo> => {
    const summary: Record<string, EnrichedDistrictResultInfo> = {};
    if (!candidateVotesInState || !districtsData || !stateId || !coalitionColorMap || !previousDistrictResultsData) {
        districtsData.filter(d => d.uf === stateId).forEach(district => {
            summary[String(district.district_id)] = {
                districtName: district.district_name,
                winnerLegend: null, maxVotes: 0, totalVotesInDistrict: 0,
                isFinal: false, statusLabel: "Aguardando dados..."
            };
        });
        return summary;
    }

    const districtsInThisState = districtsData.filter(d => d.uf === stateId);

    districtsInThisState.forEach(district => {
        const districtIdStr = String(district.district_id);
        const votesInCurrentDistrict = candidateVotesInState.filter(
            vote => parseNumber(vote.district_id) === district.district_id
        );

        const votesWithNumeric = votesInCurrentDistrict.map(v => ({ ...v, numericVotes: parseNumber(v.votes_qtn) }));
        const totalVotesInDistrict = votesWithNumeric.reduce((sum, current) => sum + current.numericVotes, 0);
        const sortedVotes = [...votesWithNumeric].sort((a, b) => b.numericVotes - a.numericVotes);

        const leadingCandidateData = sortedVotes[0] || null;
        const runnerUpCandidateData = sortedVotes[1] || null;

        let leadingCoalition: CoalitionVoteInfo | undefined = undefined;
        if (leadingCandidateData) {
            leadingCoalition = {
                legend: leadingCandidateData.parl_front_legend || leadingCandidateData.party_legend || "N/D",
                votes: leadingCandidateData.numericVotes, name: leadingCandidateData.candidate_name
            };
        }
        let runnerUpCoalition: CoalitionVoteInfo | undefined = undefined;
        if (runnerUpCandidateData) {
            runnerUpCoalition = {
                legend: runnerUpCandidateData.parl_front_legend || runnerUpCandidateData.party_legend || "N/D",
                votes: runnerUpCandidateData.numericVotes, name: runnerUpCandidateData.candidate_name
            };
        }

        const previousResult = previousDistrictResultsData.find(d => d.district_id === district.district_id);
        const previousSeatHolderCoalitionLegend = previousResult?.winner_2018_legend || null;

        let remainingVotesEstimate = 0;
        if (district.voters_qtn && totalVotesInDistrict >= 0) {
            remainingVotesEstimate = district.voters_qtn - totalVotesInDistrict;
            if (remainingVotesEstimate < 0) remainingVotesEstimate = 0;
        }

        const statusInput: DistrictStatusInput = {
            isLoading: isLoading, leadingCoalition: leadingCoalition, runnerUpCoalition: runnerUpCoalition,
            totalVotesInDistrict: totalVotesInDistrict, remainingVotesEstimate: remainingVotesEstimate,
            previousSeatHolderCoalitionLegend: previousSeatHolderCoalitionLegend,
            coalitionColorMap: coalitionColorMap, fallbackCoalitionColor: COALITION_FALLBACK_COLOR
        };
        const detailedStatus = calculateDistrictDynamicStatus(statusInput);
        const isFinalStatus = checkIfStatusIsFinal(detailedStatus.label);

        summary[districtIdStr] = {
            winnerLegend: leadingCandidateData?.parl_front_legend ?? null,
            winnerName: leadingCandidateData?.candidate_name,
            districtName: district.district_name,
            maxVotes: leadingCandidateData?.numericVotes || 0,
            isFinal: isFinalStatus,
            totalVotesInDistrict: totalVotesInDistrict,
            statusLabel: detailedStatus.label,
        };
    });
    return summary;
  }, [candidateVotesInState, stateId, isLoading, coalitionColorMap]); 

  const districtSeatsByFrontInState: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!detailedDistrictResultsInState) return counts;

    Object.values(detailedDistrictResultsInState).forEach(result => {
      if (result.isFinal && result.winnerLegend) {
        counts[result.winnerLegend] = (counts[result.winnerLegend] || 0) + 1;
      }
    });
    return counts;
  }, [detailedDistrictResultsInState]);

  const proportionalSeatsByFront = useMemo(() => {
    if (totalPRSeatsForThisState === 0 || !pageData?.proportionalVotes || !stateId) return {};

    const allProportionalVotesInStateForUF = pageData.proportionalVotes.filter(vote => vote.uf === stateId);
    const voteThreshold = stateId === "TP" ? 40000 : 250000;
    const eligibleVotesInState = allProportionalVotesInStateForUF.filter(vote => {
        const numericVotes = parseNumber(vote.proportional_votes_qtn);
        return numericVotes > voteThreshold; 
    });
    const currentProportionalVotesInput: ProportionalVotesInput[] = eligibleVotesInState
      .filter(vote => vote.parl_front_legend)
      .map(vote => ({
        legend: vote.parl_front_legend!,
        votes: parseNumber(vote.proportional_votes_qtn),
      }));

    if (currentProportionalVotesInput.length === 0) return {}; 

    return calculateProportionalSeats( currentProportionalVotesInput, totalPRSeatsForThisState, 5 );
  }, [pageData?.proportionalVotes, stateId, totalPRSeatsForThisState]);
  
  const totalSeatsByFrontForState: Record<string, number> = useMemo(() => {
    const combined: Record<string, number> = {};
    const allFronts = new Set<string>();
    Object.keys(districtSeatsByFrontInState).forEach(f => f && f !== "null" && f !== "undefined" && allFronts.add(f));
    Object.keys(proportionalSeatsByFront).forEach(f => f && f !== "null" && f !== "undefined" && allFronts.add(f));
    allFronts.forEach((front: string) => {
      combined[front] = (districtSeatsByFrontInState[front] || 0) + (proportionalSeatsByFront[front] || 0);
    });
    return combined;
  }, [districtSeatsByFrontInState, proportionalSeatsByFront]);

  const districtResultsForTicker: TickerEntry[] = useMemo(() => {
    if (isLoading || !detailedDistrictResultsInState || !stateInfo || !coalitionColorMap) {
      return [];
    }
    const tickerEntries: TickerEntry[] = [];
    
    Object.entries(detailedDistrictResultsInState).forEach(([districtId, result]) => {
        const districtNum = parseInt(districtId,10);
        const votesInCurrentDistrictRaw = candidateVotesInState.filter(
            vote => parseNumber(vote.district_id) === districtNum
        );
        const votesWithNumeric = votesInCurrentDistrictRaw.map(v => ({...v, numericVotes: parseNumber(v.votes_qtn)}));
        const sortedVotes = [...votesWithNumeric].sort((a,b) => b.numericVotes - a.numericVotes);
        const leadingCandidateRaw = sortedVotes[0] || null;
        const runnerUpCandidateRaw = sortedVotes[1] || null;

        const winnerPercentage = leadingCandidateRaw && result.totalVotesInDistrict > 0 ? (leadingCandidateRaw.numericVotes / result.totalVotesInDistrict) * 100 : null;
        const runnerUpPercentage = runnerUpCandidateRaw && result.totalVotesInDistrict > 0 ? (runnerUpCandidateRaw.numericVotes / result.totalVotesInDistrict) * 100 : null;
        
        const statusInputForTickerItem: DistrictStatusInput = {
            isLoading: isLoading,
            leadingCoalition: leadingCandidateRaw ? { legend: leadingCandidateRaw.parl_front_legend || "N/D", votes: leadingCandidateRaw.numericVotes, name: leadingCandidateRaw.candidate_name } : undefined,
            runnerUpCoalition: runnerUpCandidateRaw ? { legend: runnerUpCandidateRaw.parl_front_legend || "N/D", votes: runnerUpCandidateRaw.numericVotes, name: runnerUpCandidateRaw.candidate_name } : undefined,
            totalVotesInDistrict: result.totalVotesInDistrict,
            remainingVotesEstimate: (districtsData.find(d=>d.district_id === districtNum)?.voters_qtn || 0) - result.totalVotesInDistrict,
            previousSeatHolderCoalitionLegend: previousDistrictResultsData.find(d => d.district_id === districtNum)?.winner_2018_legend || null,
            coalitionColorMap: coalitionColorMap
        };
        const detailedStatusForTickerItem = calculateDistrictDynamicStatus(statusInputForTickerItem);

        tickerEntries.push({
            district_id: districtNum, 
            districtName: result.districtName || `Distrito ${districtNum}`,
            stateId: stateInfo.uf, 
            stateName: stateInfo.uf_name,
            statusLabel: result.statusLabel || "N/A", 
            statusBgColor: detailedStatusForTickerItem.backgroundColor,
            statusTextColor: detailedStatusForTickerItem.textColor,
            winnerName: result.winnerName || null,
            winnerLegend: result.winnerLegend || null, 
            winnerPercentage: winnerPercentage,
            runnerUpName: runnerUpCandidateRaw?.candidate_name || null,
            runnerUpLegend: runnerUpCandidateRaw?.parl_front_legend || null,
            runnerUpPercentage: runnerUpPercentage,
        });
    });
    return tickerEntries.sort((a,b) => a.district_id - b.district_id);
  }, [ isLoading, detailedDistrictResultsInState, stateInfo, coalitionColorMap, candidateVotesInState ]);

  const proportionalVotesForBarChart = useMemo(() => {
    if (!pageData?.proportionalVotes || !stateId) return [];
    return pageData.proportionalVotes
      .filter(vote => vote.uf === stateId && vote.parl_front_legend)
      .map(vote => ({
        name: vote.parl_front_legend!,
        value: parseNumber(vote.proportional_votes_qtn),
      }));
  },[pageData?.proportionalVotes, stateId]);

  const proportionalVotesForAllocationDetails = useMemo(() => {
    if (!proportionalVotesForBarChart) return [];
    return proportionalVotesForBarChart.map(item => ({
        legend: item.name,
        votes: item.value,
    }));
  }, [proportionalVotesForBarChart]);

  const currentProportionalPercentages = useMemo((): Record<string, number> => {
    if (!proportionalVotesForBarChart || proportionalVotesForBarChart.length === 0) return {};
    const totalCurrentProportionalVotes = proportionalVotesForBarChart.reduce((sum, entry) => sum + entry.value, 0);
    if (totalCurrentProportionalVotes === 0) return {};
    const percentages: Record<string, number> = {};
    proportionalVotesForBarChart.forEach(entry => { percentages[entry.name] = (entry.value / totalCurrentProportionalVotes) * 100; });
    return percentages;
  }, [proportionalVotesForBarChart]);
  
  const previousPRDataForThisState = useMemo(() => {
    if (!stateId) return null;
    return previousStateProportionalPercentagesData.find(s => s.uf === stateId);
  }, [stateId]);
  const previousPRSeatsForThisState = useMemo(() => {
    if (!stateId) return null;
    return previousStateProportionalSeatsData.find(s => s.uf === stateId);
  }, [stateId]);

  const stateProportionalSwingData = useMemo((): ProportionalSwingEntry[] => {
    if (!stateId || !currentProportionalPercentages || Object.keys(currentProportionalPercentages).length === 0) return [];
    const previousStateData = previousPRDataForThisState;
    if (!previousStateData) {
      return Object.entries(currentProportionalPercentages).map(([legend, currentPercent]) => ({
        legend, currentPercent, previousPercent: 0, swing: currentPercent,
      })).sort((a,b) => b.currentPercent - a.currentPercent);
    }
    const swingEntries: ProportionalSwingEntry[] = [];
    const allLegends = new Set<string>([ ...Object.keys(currentProportionalPercentages), ...Object.keys(previousStateData.percentages) ]);
    allLegends.forEach(legend => {
        const currentPercent = currentProportionalPercentages[legend] || 0;
        const previousPercent = previousStateData.percentages[legend] || 0;
        swingEntries.push({ legend, currentPercent, previousPercent, swing: currentPercent - previousPercent });
    });
    return swingEntries.sort((a, b) => b.swing - a.swing || b.currentPercent - a.currentPercent);
  }, [stateId, currentProportionalPercentages, previousPRDataForThisState]);

  // Tipo para o parâmetro districtInfo que o InteractiveMap.tsx realmente passa em seus callbacks
  type MapCallbackDistrictInfo = (BaseDistrictResultInfo & {isFinal?: boolean; totalVotesInDistrict?: number;}) | null;

  const handleStateMapDistrictHover = (districtInfoFromMap: MapCallbackDistrictInfo, districtIdFromMap: string | null) => {
    if (districtIdFromMap) {
        // Busca a informação enriquecida do nosso summary
        const enrichedInfo = detailedDistrictResultsInState[districtIdFromMap];
        if (enrichedInfo) {
            setHoveredDistrictInfo( `Distrito: ${enrichedInfo.districtName} | ${enrichedInfo.statusLabel || 'N/A'} (${enrichedInfo.winnerLegend || 'N/D'})`);
        } else {
            // Fallback caso não encontre (não deveria acontecer se detailedDistrictResultsInState estiver completo)
            // Usa o districtInfoFromMap que o InteractiveMap passou, se disponível
            const fallbackName = districtInfoFromMap?.districtName || districtsData.find(d => String(d.district_id) === districtIdFromMap)?.district_name || districtIdFromMap;
            const fallbackLegend = districtInfoFromMap?.winnerLegend || 'N/D';
            setHoveredDistrictInfo(`Distrito: ${fallbackName} | Status indisponível (${fallbackLegend})`);
        }
    } else { 
        setHoveredDistrictInfo(null); 
    }
  };

  const handleStateMapDistrictClick = (districtInfoFromMap: MapCallbackDistrictInfo, districtIdFromMap: string) => {
    // districtInfoFromMap não é usado diretamente aqui para a navegação, apenas districtIdFromMap
    if (districtIdFromMap) {
        const districtNum = parseNumber(districtIdFromMap);
        router.push(`/distrito/${districtNum}?time=${currentTime}`);
    }
  };

  const filteredMapLayout = useMemo(() => {
    if (!stateId || !haagarDistrictLayout) return [];
    const districtIdsInStateSet = new Set( districtsData.filter(d => d.uf === stateId).map(d => String(d.district_id)));
    return haagarDistrictLayout.filter(layoutItem => districtIdsInStateSet.has(layoutItem.id));
  }, [stateId]);

  const stateLevelScrutinyData = useMemo(() => {
    if (!stateId || !districtsData || !pageData?.candidateVotes || !stateInfo) {
      return { apuratedStateVotes: 0, totalPollsInState: 0, areVotesBeingCounted: false, stateNameForLabel: stateInfo?.uf_name || stateId || "" };
    }
    const districtsInThisState = districtsData.filter(d => d.uf === stateId);
    const totalPollsInState = districtsInThisState.reduce((acc, district) => acc + (district.polls_qtn || 0), 0);
    const districtIdsInStateSet = new Set(districtsInThisState.map(d => d.district_id));
    const apuratedStateVotes = pageData.candidateVotes
      .filter(vote => districtIdsInStateSet.has(parseNumber(vote.district_id)))
      .reduce((acc, vote) => acc + parseNumber(vote.votes_qtn), 0);
    return {
      apuratedStateVotes,
      totalPollsInState,
      areVotesBeingCounted: apuratedStateVotes > 0,
      stateNameForLabel: stateInfo.uf_name
    };
  }, [stateId, pageData?.candidateVotes, stateInfo]);

  if (!stateId || !stateInfo ) {
    const message = !stateId ? "ID do Estado não fornecido." : `Estado ${params.uf} não encontrado.`;
    return <div className="container mx-auto p-6 text-center text-red-500">{message} <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  const stateName = stateInfo.uf_name; 
  const totalDistrictSeatsInState = districtsData.filter(d => d.uf === stateId).length;
  const totalSeatsInStateChamber = totalDistrictSeatsInState + totalPRSeatsForThisState;
  const majorityThresholdStateChamber = Math.floor(totalSeatsInStateChamber / 2) + 1;
  const majorityThresholdPR = totalPRSeatsForThisState > 0 ? Math.floor(totalPRSeatsForThisState / 2) + 1 : 0;

  if (isLoading && !pageData) { return <div className="container mx-auto p-6 text-center text-gray-500 animate-pulse">Carregando dados para {stateName}...</div>; }
  if (error) { return <div className="container mx-auto p-6 text-center text-red-500">Erro ao carregar dados: {error}. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>; }
  if (!pageData && !isLoading) { return <div className="container mx-auto p-6 text-center text-gray-500">Dados de votos não disponíveis para {stateName} no momento {currentTime}%. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>; }

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-8">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <Link href="/" className="text-blue-600 hover:underline">&larr; Visão Nacional</Link>
        <div className="flex space-x-1 sm:space-x-2 flex-wrap gap-y-1 justify-end">
          {allPossibleStates.map(s => (
            s.id !== stateId && (
              <Link key={s.id} href={`/estado/${s.id.toLowerCase()}?time=${currentTime}`} legacyBehavior>
                <a className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs sm:text-sm transition-colors">
                  {s.id}
                </a>
              </Link>
            )
          ))}
        </div>
      </div>

      <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 w-full md:w-auto text-center md:text-left">
          {stateName}
        </h1>
        
        {stateInfo && pageData && (
            <div className="w-full md:w-auto md:max-w-lg flex-shrink-0"> 
                <ApuracaoVisao
                isLoadingVotes={isLoading}
                statusLabel={isLoading && !pageData ? "Carregando apuração..." : `Apuração em andamento`}
                statusLabelColor={(isLoading && !pageData) || !stateLevelScrutinyData.stateNameForLabel ? "#E5E7EB" : "#D1D5DB"} 
                statusLabelTextColor={(isLoading && !pageData) || !stateLevelScrutinyData.stateNameForLabel ? "#6B7280" : "#374151"} 
                areVotesBeingCounted={stateLevelScrutinyData.areVotesBeingCounted}
                apuratedVotesCount={stateLevelScrutinyData.apuratedStateVotes}
                totalPollsCount={stateLevelScrutinyData.totalPollsInState}
                />
            </div>
        )}
      </header>

      <div className="my-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto justify-center" aria-label="State Views">
            <button onClick={() => setCurrentView('visaoGeral')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'visaoGeral' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Visão Geral</button>
            {totalPRSeatsForThisState > 0 && ( 
              <>
                <button onClick={() => setCurrentView('votacaoProporcional')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'votacaoProporcional' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Votação Proporcional</button>
                <button onClick={() => setCurrentView('movimentacao')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'movimentacao' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  Movimentação
                </button>
              </>
            )}
        </nav>
      </div>

      <div className="mt-4">
          {currentView === 'visaoGeral' && stateInfo && pageData && (
            <section className="space-y-8"> 
              <div>
                {(filteredMapLayout.length > 0 && Object.keys(detailedDistrictResultsInState).length > 0) ? 
                ( <InteractiveMap 
                    results={detailedDistrictResultsInState} 
                    colorMap={coalitionColorMap} 
                    onDistrictHover={handleStateMapDistrictHover} 
                    onDistrictClick={handleStateMapDistrictClick} 
                  />
                ) : (<p className="text-gray-600 py-10 text-center">Não foi possível renderizar o mapa dos distritos.</p> )}
                {hoveredDistrictInfo && ( <div className="mt-2 text-center text-sm text-gray-700 p-2 bg-gray-100 rounded">{hoveredDistrictInfo}</div> )}
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-3 text-center"> 
                  Total de Assentos: {totalSeatsInStateChamber} (Distritais: {totalDistrictSeatsInState}, Proporcionais: {totalPRSeatsForThisState}) 
                  {' | '}Maioria: {majorityThresholdStateChamber} 
                </p>
                <SeatCompositionPanel 
                  seatData={totalSeatsByFrontForState} 
                  colorMap={coalitionColorMap} 
                  totalSeats={totalSeatsInStateChamber} 
                />
              </div>
              
              {districtResultsForTicker.length > 0 && (
                <div>
                  <RaceTicker data={districtResultsForTicker} colorMap={coalitionColorMap} /> 
                </div>
              )}
            </section> 
          )}

          {currentView === 'votacaoProporcional' && totalPRSeatsForThisState > 0 && stateInfo && pageData && (
            <section className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div> 
                  <ProportionalSeatAllocationDetails 
                    allocatedSeats={proportionalSeatsByFront} 
                    colorMap={coalitionColorMap} 
                    stateName={stateName} 
                    totalSeatsInState={totalPRSeatsForThisState} 
                    majorityThreshold={majorityThresholdPR} 
                    rawVotes={proportionalVotesForAllocationDetails} 
                  /> 
                </div> 
                <div> 
                  <h3 className="text-lg font-semibold mb-2 text-gray-700">Votos Proporcionais por Legenda</h3> 
                  {proportionalVotesForBarChart.length > 0 ? ( 
                    <ProportionalBarChart data={proportionalVotesForBarChart} colorMap={coalitionColorMap} /> 
                  ) : ( <p className="text-center text-gray-500 py-10">Sem dados de votos proporcionais para este estado.</p> )} 
                </div> 
              </div>
            </section>
          )}
          
          {currentView === 'movimentacao' && totalPRSeatsForThisState > 0 && stateInfo && pageData && (
          <section className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
            {stateProportionalSwingData.length > 0 ? (
            <StateProportionalSwing
                swingDataPercent={stateProportionalSwingData}
                currentPRSeatsByFront={proportionalSeatsByFront} 
                previousPRSeatsDataForState={previousPRSeatsForThisState}
                colorMap={coalitionColorMap}
                stateName={stateName}
              />
               ) : (
               <p className="text-center text-gray-500 py-10">Dados insuficientes para análise de movimentação proporcional.</p>
               )}
          </section>
        )}
      </div>

    </div>
  );
}
