// app/estado/[uf]/page.tsx
"use client";

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import React, { useMemo, useState, useEffect } from 'react';

// Funções e dados estáticos
import { calculateProportionalSeats, ProportionalVotesInput } from '@/lib/electionCalculations';
import { partyData, districtsData } from '@/lib/staticData';
import { haagarDistrictLayout } from '@/lib/mapLayout'; // Usado para o mapa dos distritos
import {
    previousStateProportionalPercentagesData,
    PreviousStateProportionalPercentage,
    previousStateProportionalSeatsData,
    PreviousStateProportionalSeats,
    previousDistrictResultsData // Necessário para o status do ticker
} from '@/lib/previousElectionData';

// Tipos
import type {
    ProportionalVote,
    CandidateVote,
    TickerEntry,
    DistrictInfoFromData,
    DistrictResultInfo,
    ProportionalSwingEntry
} from '@/types/election';

// Componentes
import SeatCompositionPanel from '@/components/SeatCompositionPanel';
import RaceTicker from '@/components/RaceTicker';
import ProportionalSeatAllocationDetails from '@/components/ProportionalSeatAllocationDetails';
import ProportionalBarChart from '@/components/ProportionalBarChart';
import InteractiveMap from '@/components/InteractiveMap';
import StateProportionalSwing from '@/components/StateProportionalSwing';
import ApuracaoVisao from '@/components/ApuracaoVisao'; // Importado para apuração do estado

// Lógica de Status Dinâmico
import {
  calculateDistrictDynamicStatus,
  DistrictStatusInput,
  CoalitionVoteInfo
} from '@/lib/statusCalculator';

// Configuração de assentos
const totalProportionalSeatsByState: Record<string, number> = { "TP": 1, "MA": 40, "MP": 23, "BA": 16, "PB": 9, "PN": 4 };
const COALITION_FALLBACK_COLOR = '#6B7280';

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

// 1. StateViewMode ATUALIZADO
type StateViewMode = 'visaoGeral' | 'votacaoProporcional' | 'movimentacao';

export default function StatePage() {
  const params = useParams();
  const searchParamsHook = useSearchParams();
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState<number>(100);
  const [pageData, setPageData] = useState<ApiVotesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 2. Visão Inicial ATUALIZADA
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

  const proportionalVotesInput: ProportionalVotesInput[] = useMemo(() => {
    if (!pageData?.proportionalVotes || !stateId) return [];
    return pageData.proportionalVotes
      .filter(vote => vote.uf === stateId && vote.parl_front_legend)
      .map(vote => ({
        legend: vote.parl_front_legend!,
        votes: parseNumber(vote.proportional_votes_qtn),
      }));
  }, [pageData?.proportionalVotes, stateId]);

  const proportionalSeatsByFront = useMemo(() => {
    if (totalPRSeatsForThisState === 0 || proportionalVotesInput.length === 0) return {};
    return calculateProportionalSeats( proportionalVotesInput, totalPRSeatsForThisState, 5 );
  }, [proportionalVotesInput, totalPRSeatsForThisState]);

  const candidateVotesInState = useMemo(() => {
    if (!pageData?.candidateVotes || !stateId) return [];
    const districtIdsInThisStateSet = new Set(districtsData.filter(d => d.uf === stateId).map(d => d.district_id));
    return pageData.candidateVotes.filter(vote =>
        districtIdsInThisStateSet.has(parseNumber(vote.district_id))
    );
  }, [pageData?.candidateVotes, stateId]);

  const districtSeatsByFrontInState: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!candidateVotesInState) return counts;
    const votesByDistrict: Record<string, CandidateVote[]> = {};
    candidateVotesInState.forEach(vote => {
      const districtIdStr = String(parseNumber(vote.district_id));
      if (!votesByDistrict[districtIdStr]) votesByDistrict[districtIdStr] = [];
      votesByDistrict[districtIdStr].push(vote);
    });
    Object.values(votesByDistrict).forEach(districtVotes => {
      if (districtVotes.length > 0) {
        const winner = districtVotes.reduce((prev, current) =>
          parseNumber(prev.votes_qtn) > parseNumber(current.votes_qtn) ? prev : current
        );
        if (winner.parl_front_legend) {
          counts[winner.parl_front_legend] = (counts[winner.parl_front_legend] || 0) + 1;
        }
      }
    });
    return counts;
  }, [candidateVotesInState]);

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

  // 3. Cálculo para Apuração Geral do Estado
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
  }, [stateId, pageData?.candidateVotes, stateInfo]); // districtsData é estático

  const districtResultsForTicker: TickerEntry[] = useMemo(() => {
    if (isLoading || !candidateVotesInState || !districtsData || !stateId || !stateInfo || !coalitionColorMap) {
      return [];
    }
    const tickerEntries: TickerEntry[] = [];
    const districtsInThisState = districtsData.filter(d => d.uf === stateId);

    districtsInThisState.forEach(district => {
      const votesInCurrentDistrict = candidateVotesInState.filter(
        vote => parseNumber(vote.district_id) === district.district_id
      );
      let leadingCandidateProcessed: (CandidateVote & { numericVotes: number; percentage: number }) | null = null;
      let runnerUpCandidateProcessed: (CandidateVote & { numericVotes: number; percentage: number }) | null = null;
      let totalVotesInThisDistrict = 0;

      if (votesInCurrentDistrict.length > 0) {
        const votesWithNumeric = votesInCurrentDistrict.map(v => ({...v, numericVotes: parseNumber(v.votes_qtn)}));
        totalVotesInThisDistrict = votesWithNumeric.reduce((sum, cv) => sum + cv.numericVotes, 0);
        const sortedVotes = [...votesWithNumeric].sort((a,b) => b.numericVotes - a.numericVotes);
        const winnerCandidateRaw = sortedVotes[0] || null;
        const runnerUpCandidateRaw = sortedVotes[1] || null;
        if (winnerCandidateRaw) {
            leadingCandidateProcessed = {
                ...winnerCandidateRaw, numericVotes: winnerCandidateRaw.numericVotes,
                percentage: totalVotesInThisDistrict > 0 ? (winnerCandidateRaw.numericVotes / totalVotesInThisDistrict) * 100 : 0
            };
        }
        if (runnerUpCandidateRaw) {
            runnerUpCandidateProcessed = {
                ...runnerUpCandidateRaw, numericVotes: runnerUpCandidateRaw.numericVotes,
                percentage: totalVotesInThisDistrict > 0 ? (runnerUpCandidateRaw.numericVotes / totalVotesInThisDistrict) * 100 : 0
            };
        }
      }
      let leadingCoalitionForStatus: CoalitionVoteInfo | undefined = undefined;
      if (leadingCandidateProcessed) {
        leadingCoalitionForStatus = {
          legend: leadingCandidateProcessed.parl_front_legend || leadingCandidateProcessed.party_legend || "N/D",
          votes: leadingCandidateProcessed.numericVotes, name: leadingCandidateProcessed.candidate_name
        };
      }
      let runnerUpCoalitionForStatus: CoalitionVoteInfo | undefined = undefined;
      if (runnerUpCandidateProcessed) {
        runnerUpCoalitionForStatus = {
          legend: runnerUpCandidateProcessed.parl_front_legend || runnerUpCandidateProcessed.party_legend || "N/D",
          votes: runnerUpCandidateProcessed.numericVotes, name: runnerUpCandidateProcessed.candidate_name
        };
      }
      const previousResultForThisDistrict = previousDistrictResultsData.find(d => d.district_id === district.district_id);
      const previousSeatHolderLegend = previousResultForThisDistrict?.winner_2018_legend || null;
      let remainingVotesEst = 0;
      if (district.voters_qtn && totalVotesInThisDistrict >= 0) { 
          remainingVotesEst = district.voters_qtn - totalVotesInThisDistrict;
          if (remainingVotesEst < 0) remainingVotesEst = 0;
      }
      const statusInputForTickerItem: DistrictStatusInput = {
        isLoading: isLoading, leadingCoalition: leadingCoalitionForStatus,
        runnerUpCoalition: runnerUpCoalitionForStatus, totalVotesInDistrict: totalVotesInThisDistrict,
        remainingVotesEstimate: remainingVotesEst, previousSeatHolderCoalitionLegend: previousSeatHolderLegend,
        coalitionColorMap: coalitionColorMap, fallbackCoalitionColor: COALITION_FALLBACK_COLOR
      };
      const detailedStatus = calculateDistrictDynamicStatus(statusInputForTickerItem);
      tickerEntries.push({
        district_id: district.district_id, districtName: district.district_name,
        stateId: district.uf, stateName: stateInfo.uf_name,
        statusLabel: detailedStatus.label, statusBgColor: detailedStatus.backgroundColor, statusTextColor: detailedStatus.textColor,
        winnerName: leadingCandidateProcessed?.candidate_name || null,
        winnerLegend: detailedStatus.actingCoalitionLegend || leadingCoalitionForStatus?.legend || null,
        winnerPercentage: leadingCandidateProcessed?.percentage ?? null,
        runnerUpName: runnerUpCandidateProcessed?.candidate_name || null,
        runnerUpLegend: runnerUpCoalitionForStatus?.legend || null,
        runnerUpPercentage: runnerUpCandidateProcessed?.percentage ?? null,
      });
    });
    return tickerEntries.sort((a,b) => a.district_id - b.district_id);
  }, [ isLoading, candidateVotesInState, stateId, stateInfo, coalitionColorMap ]);

  const previousPRDataForThisState = useMemo(() => {
    if (!stateId) return null;
    return previousStateProportionalPercentagesData.find(s => s.uf === stateId);
  }, [stateId]);
  const previousPRSeatsForThisState = useMemo(() => {
    if (!stateId) return null;
    return previousStateProportionalSeatsData.find(s => s.uf === stateId);
  }, [stateId]);

  const districtResultsSummaryForStateMap: Record<string, DistrictResultInfo> = useMemo(() => {
    const summary: Record<string, DistrictResultInfo> = {};
    if (!pageData?.candidateVotes || !districtsData || !stateId) return summary;
    const votesByDistrictInState: Record<string, CandidateVote[]> = {};
    const districtIdsInThisStateSet = new Set(districtsData.filter(d => d.uf === stateId).map(d => String(d.district_id)));
    pageData.candidateVotes.forEach((vote: CandidateVote) => {
        const districtIdStr = String(parseNumber(vote.district_id));
        if (districtIdsInThisStateSet.has(districtIdStr)) {
            if (!votesByDistrictInState[districtIdStr]) { votesByDistrictInState[districtIdStr] = []; }
            if (vote.candidate_name && vote.votes_qtn !== undefined && vote.votes_qtn !== null) {
                votesByDistrictInState[districtIdStr].push(vote);
            }
        }
    });
    Object.keys(votesByDistrictInState).forEach(districtIdStr => {
        const votes = votesByDistrictInState[districtIdStr];
        if (!votes || votes.length === 0) return;
        const winner = votes.reduce((cw, cv) => (parseNumber(cw.votes_qtn) > parseNumber(cv.votes_qtn) ? cw : cv), votes[0]);
        const districtInfoForMap = districtsData.find(d => String(d.district_id) === districtIdStr);
        if (winner) {
            summary[districtIdStr] = {
                winnerLegend: winner.parl_front_legend ?? null, winnerName: winner.candidate_name,
                districtName: districtInfoForMap?.district_name || `Distrito ${districtIdStr}`, maxVotes: parseNumber(winner.votes_qtn),
            };
        }
    });
    districtsData.filter(d=>d.uf === stateId).forEach(d => {
        const districtIdStr = String(d.district_id);
        if (!summary[districtIdStr]) { summary[districtIdStr] = { winnerLegend: null, districtName: d.district_name, maxVotes: 0 }; }
    });
    return summary;
  }, [pageData?.candidateVotes, stateId]);

  const currentProportionalPercentages = useMemo((): Record<string, number> => {
    if (!proportionalVotesInput || proportionalVotesInput.length === 0) return {};
    const totalCurrentProportionalVotes = proportionalVotesInput.reduce((sum, entry) => sum + entry.votes, 0);
    if (totalCurrentProportionalVotes === 0) return {};
    const percentages: Record<string, number> = {};
    proportionalVotesInput.forEach(entry => { percentages[entry.legend] = (entry.votes / totalCurrentProportionalVotes) * 100; });
    return percentages;
  }, [proportionalVotesInput]);

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

  const handleStateMapDistrictHover = (districtInfo: DistrictResultInfo | null, districtId: string | null) => {
    if (districtInfo && districtId) {
       const staticDistrictInfo = districtsData.find(d => String(d.district_id) === districtId);
       const districtName = districtInfo.districtName || staticDistrictInfo?.district_name || `Distrito ${districtId}`;
      setHoveredDistrictInfo( `Distrito: ${districtName} | Vencedor: ${districtInfo.winnerName || 'N/A'} (${districtInfo.winnerLegend || 'N/D'})`);
    } else { setHoveredDistrictInfo(null); }
  };
  const handleStateMapDistrictClick = (districtInfo: DistrictResultInfo | null, districtIdStr: string) => {
    if (districtIdStr) {
        const districtNum = parseNumber(districtIdStr);
        router.push(`/distrito/${districtNum}?time=${currentTime}`);
    }
  };

  const filteredMapLayout = useMemo(() => {
    if (!stateId || !haagarDistrictLayout) return [];
    const districtIdsInStateSet = new Set( districtsData.filter(d => d.uf === stateId).map(d => String(d.district_id)));
    return haagarDistrictLayout.filter(layoutItem => districtIdsInStateSet.has(layoutItem.id));
  }, [stateId]);

  if (!stateId || !stateInfo ) {
    const message = !stateId ? "ID do Estado não fornecido." : `Estado ${params.uf} não encontrado.`;
    return <div className="container mx-auto p-6 text-center text-red-500">{message} <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  const stateName = stateInfo.uf_name; // Garantido que stateInfo não é nulo aqui
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
        {/* Título Alinhado à Esquerda */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 w-full md:w-auto text-center md:text-left">
          {stateName}
        </h1>
        
        {/* Componente de Apuração (será empurrado para a direita em telas md+) */}
        {stateInfo && pageData && (
            <div className="w-full md:w-auto md:max-w-lg flex-shrink-0"> {/* Controla a largura e evita que encolha demais */}
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

      {/* 2. & 4. Botões de Navegação da Visão ATUALIZADOS */}
      <div className="my-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto justify-center" aria-label="State Views">
            <button onClick={() => setCurrentView('visaoGeral')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'visaoGeral' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Visão Geral</button>
            {totalPRSeatsForThisState > 0 && ( // Só mostra abas de proporcional se houver assentos PR
              <>
                <button onClick={() => setCurrentView('votacaoProporcional')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'votacaoProporcional' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Votação Proporcional</button>
                <button onClick={() => setCurrentView('movimentacao')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'movimentacao' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  Movimentação
                </button>
              </>
            )}
        </nav>
      </div>

      {/* 3. Renderização Condicional da Visão ATUALIZADA */}
      <div className="mt-4">
          {currentView === 'visaoGeral' && stateInfo && pageData && (
            <section className="space-y-8"> {/* Espaçamento entre os componentes da visão geral */}
              {/* 1. MAPA */}
              <div>
                {(filteredMapLayout.length > 0 && Object.keys(districtResultsSummaryForStateMap).length > 0) ? 
                ( <InteractiveMap 
                    results={districtResultsSummaryForStateMap} 
                    colorMap={coalitionColorMap} 
                    onDistrictHover={handleStateMapDistrictHover} 
                    onDistrictClick={handleStateMapDistrictClick}
                  />
                ) : (<p className="text-gray-600 py-10 text-center">Não foi possível renderizar o mapa dos distritos.</p> )}
                {hoveredDistrictInfo && ( <div className="mt-2 text-center text-sm text-gray-700 p-2 bg-gray-100 rounded">{hoveredDistrictInfo}</div> )}
              </div>

              {/* 2. PAINEL DE ASSENTOS DO ESTADO */}
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
              
              {/* 3. TICKER DOS DISTRITOS DO ESTADO */}
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
                  <ProportionalSeatAllocationDetails allocatedSeats={proportionalSeatsByFront} colorMap={coalitionColorMap} stateName={stateName} totalSeatsInState={totalPRSeatsForThisState} majorityThreshold={majorityThresholdPR} rawVotes={proportionalVotesInput} /> 
                </div> 
                <div> 
                  <h3 className="text-lg font-semibold mb-2 text-gray-700">Votos Proporcionais por Legenda</h3> 
                  {proportionalVotesInput.length > 0 ? ( 
                    <ProportionalBarChart data={proportionalVotesInput.map(pv => ({ name: pv.legend, value: pv.votes }))} colorMap={coalitionColorMap} /> 
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

      <div className="mt-8 text-center p-4 bg-white rounded-lg shadow-md border border-gray-200">
        <label htmlFor="time-select-state" className="text-sm font-medium mr-2">Ver Apuração em:</label>
        <select id="time-select-state" value={currentTime} onChange={(e) => setCurrentTime(parseInt(e.target.value, 10))} disabled={isLoading} className="rounded border-gray-300 shadow-sm" >
            <option value={50}>50%</option>
            <option value={100}>100%</option>
        </select>
      </div>
    </div>
  );
}