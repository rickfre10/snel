// app/estado/[uf]/page.tsx
"use client";

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import React, { useMemo, useState, useEffect } from 'react';

// Funções e dados estáticos
import { calculateProportionalSeats, ProportionalVotesInput } from '@/lib/electionCalculations';
import { partyData, districtsData } from '@/lib/staticData';
import { haagarStateLayout, haagarDistrictLayout } from '@/lib/mapLayout'; // Importa layout do mapa
import {
    previousStateProportionalPercentagesData,
    PreviousStateProportionalPercentage,
    previousStateProportionalSeatsData,
    PreviousStateProportionalSeats
} from '@/lib/previousElectionData'; // Importa dados da eleição anterior

// Tipos
import type {
    ProportionalVote,
    CandidateVote,
    TickerEntry,
    DistrictInfoFromData,
    PartyInfo,
    DistrictResultInfo,
    StateOption,
    ProportionalSwingEntry // Certifique-se que esta está em types/election.ts
} from '@/types/election';

// Componentes
import SeatCompositionPanel from '@/components/SeatCompositionPanel';
import RaceTicker from '@/components/RaceTicker';
import ProportionalSeatAllocationDetails from '@/components/ProportionalSeatAllocationDetails';
import ProportionalBarChart from '@/components/ProportionalBarChart'; // Mudei de ProportionalBarChart para PieChart
import InteractiveMap from '@/components/InteractiveMap';
import StateProportionalSwing from '@/components/StateProportionalSwing';

// Configuração de assentos
const totalProportionalSeatsByState: Record<string, number> = { "TP": 1, "MA": 40, "MP": 23, "BA": 16, "PB": 9, "PN": 4 };

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
type StateViewMode = 'placarEstadual' | 'votacaoProporcional' | 'verDistritos' | 'swingProporcional';

// REMOVIDA definição local de ProportionalSwingEntry (deve vir de types/election.ts)

export default function StatePage() {
  const params = useParams();
  const searchParamsHook = useSearchParams();
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState<number>(100);
  const [pageData, setPageData] = useState<ApiVotesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<StateViewMode>('placarEstadual');
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
    if (!stateId) return undefined;
    return totalProportionalSeatsByState[stateId];
  }, [stateId]);

  const coalitionColorMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    partyData.forEach(party => {
      if (party.parl_front_legend && party.parl_front_color) {
        map[party.parl_front_legend] = party.parl_front_color;
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

  // --- Fetch de Dados ---
  useEffect(() => {
    if (!stateId || !stateInfo || totalPRSeatsForThisState === undefined) {
      // setError pode ser setado aqui, mas a renderização condicional abaixo tratará
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
  }, [stateId, currentTime, stateInfo, totalPRSeatsForThisState]);

  // --- Cálculos Derivados (useMemo) ---
  // Estas são as definições ÚNICAS destes useMemos
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
    if (totalPRSeatsForThisState === undefined || proportionalVotesInput.length === 0) return {};
    return calculateProportionalSeats(
      proportionalVotesInput,
      totalPRSeatsForThisState,
      5
    );
  }, [proportionalVotesInput, totalPRSeatsForThisState]);

  const candidateVotesInState = useMemo(() => {
    if (!pageData?.candidateVotes || !stateId) return [];
    const districtIdsInThisStateSet = new Set(districtsData.filter((d: DistrictInfoFromData) => d.uf === stateId).map((d: DistrictInfoFromData) => d.district_id));
    return pageData.candidateVotes.filter(vote =>
        districtIdsInThisStateSet.has(parseNumber(vote.district_id))
    );
  }, [pageData?.candidateVotes, stateId]);

  const districtSeatsByFrontInState: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!candidateVotesInState) return counts;
    const votesByDistrict: Record<string, CandidateVote[]> = {};
    candidateVotesInState.forEach(vote => {
      const districtIdStr = String(vote.district_id);
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

  const districtResultsForTicker: TickerEntry[] = useMemo(() => {
    if (!candidateVotesInState || !districtsData || !stateId) return [];
    const tickerEntries: TickerEntry[] = [];
    const districtsInThisState = districtsData.filter((d: DistrictInfoFromData) => d.uf === stateId);
    districtsInThisState.forEach(district => {
      const votesInDistrict = candidateVotesInState.filter( vote => parseNumber(vote.district_id) === district.district_id );
      let winner: CandidateVote | null = null; let runnerUp: CandidateVote | null = null; let totalVotesInDistrict = 0;
      if (votesInDistrict.length > 0) {
        const votesWithNumeric = votesInDistrict.map(v => ({...v, numericVotes: parseNumber(v.votes_qtn)}));
        totalVotesInDistrict = votesWithNumeric.reduce((sum: number, cv: {numericVotes: number}) => sum + cv.numericVotes, 0);
        const sortedVotes = votesWithNumeric.sort((a,b) => b.numericVotes - a.numericVotes);
        winner = sortedVotes[0] || null; runnerUp = sortedVotes[1] || null;
      }
      tickerEntries.push({
        districtId: district.district_id as number, districtName: district.district_name, stateId: district.uf, stateName: district.uf_name,
        winnerName: winner?.candidate_name || null, winnerLegend: winner?.parl_front_legend || null,
        winnerPercentage: winner && totalVotesInDistrict > 0 ? (parseNumber(winner.votes_qtn) / totalVotesInDistrict * 100) : null,
        runnerUpName: runnerUp?.candidate_name || null, runnerUpLegend: runnerUp?.parl_front_legend || null,
        runnerUpPercentage: runnerUp && totalVotesInDistrict > 0 ? (parseNumber(runnerUp.votes_qtn) / totalVotesInDistrict * 100) : null,
      });
    });
    return tickerEntries.sort((a,b) => a.districtId - b.districtId);
  }, [candidateVotesInState, stateId]);

  const previousPRDataForThisState = useMemo(() => { // Definição ÚNICA
    if (!stateId) return null;
    return previousStateProportionalPercentagesData.find((s: PreviousStateProportionalPercentage) => s.uf === stateId);
  }, [stateId]);

  const previousPRSeatsForThisState = useMemo(() => { // Definição ÚNICA
    if (!stateId) return null;
    return previousStateProportionalSeatsData.find((s: PreviousStateProportionalSeats) => s.uf === stateId);
  }, [stateId]);

  const districtResultsSummaryForStateMap: Record<string, DistrictResultInfo> = useMemo(() => {
    const summary: Record<string, DistrictResultInfo> = {};
    if (!pageData?.candidateVotes || !districtsData || !stateId) return summary;
    const votesByDistrictInState: Record<string, CandidateVote[]> = {};
    const districtIdsInThisStateSet = new Set(districtsData.filter((d: DistrictInfoFromData) => d.uf === stateId).map((d: DistrictInfoFromData) => String(d.district_id)));
    pageData.candidateVotes.forEach((vote: CandidateVote) => {
        const districtIdStr = String(vote.district_id);
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
        const districtInfoForMap = districtsData.find((d: DistrictInfoFromData) => String(d.district_id) === districtIdStr);
        if (winner) {
            summary[districtIdStr] = {
                winnerLegend: winner.parl_front_legend ?? null, winnerName: winner.candidate_name,
                districtName: districtInfoForMap?.district_name || `Distrito ${districtIdStr}`, maxVotes: parseNumber(winner.votes_qtn),
            };
        }
    });
    districtsData.filter((d: DistrictInfoFromData)=>d.uf === stateId).forEach((d: DistrictInfoFromData) => {
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

  const stateProportionalSwingData = useMemo((): ProportionalSwingEntry[] => { // Definição ÚNICA
    if (!stateId || !currentProportionalPercentages || Object.keys(currentProportionalPercentages).length === 0) return [];
    const previousStateData = previousStateProportionalPercentagesData.find((s: PreviousStateProportionalPercentage) => s.uf === stateId);
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
  }, [stateId, currentProportionalPercentages]); // Removido previousStateProportionalPercentagesData daqui, pois previousPRDataForThisState já a tem

  // Handlers (COPIADOS DO SEU CÓDIGO)
  const handleStateMapDistrictHover = (districtInfo: DistrictResultInfo | null, districtId: string | null) => {
    if (districtInfo && districtId) {
       const staticDistrictInfo = districtsData.find((d: DistrictInfoFromData) => String(d.district_id) === districtId);
       const districtName = districtInfo.districtName || staticDistrictInfo?.district_name || `Distrito ${districtId}`;
      setHoveredDistrictInfo(
        `Distrito: ${districtName} | Vencedor: ${districtInfo.winnerName || 'N/A'} (${districtInfo.winnerLegend || 'N/D'})`
      );
    } else { setHoveredDistrictInfo(null); }
  };
  const handleStateMapDistrictClick = (districtInfo: DistrictResultInfo | null, districtId: string) => {
    if (districtId) { router.push(`/distrito/${districtId}?time=${currentTime}`); }
  };

  // --- Filtrar layout do mapa para o estado atual ---
  const filteredMapLayout = useMemo(() => {
    if (!stateId || !haagarDistrictLayout) return []; // districtsData não é necessário se já usado em districtIdsInStateSet
    const districtIdsInStateSet = new Set(
      districtsData.filter((d: DistrictInfoFromData) => d.uf === stateId).map((d: DistrictInfoFromData) => String(d.district_id))
    );
    return haagarDistrictLayout.filter(layoutItem => districtIdsInStateSet.has(layoutItem.id));
  }, [stateId]); // Removido districtsData e haagarMapLayout se forem estáticos globais importados

  // --- Lógica de Renderização ---
  if (!stateId || !stateInfo || totalPRSeatsForThisState === undefined) {
    return <div className="container mx-auto p-6 text-center text-red-500">Estado ({params.uf}) não encontrado ou não configurado para proporcional. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  const stateName = stateInfo.uf_name;
  const totalDistrictSeatsInState = districtsData.filter((d: DistrictInfoFromData) => d.uf === stateId).length;
  const totalSeatsInStateChamber = totalDistrictSeatsInState + (totalPRSeatsForThisState || 0);
  const majorityThresholdStateChamber = Math.floor(totalSeatsInStateChamber / 2) + 1;
  const majorityThresholdPR = totalPRSeatsForThisState > 0 ? Math.floor(totalPRSeatsForThisState / 2) + 1 : 0;

  if (isLoading) { return <div className="container mx-auto p-6 text-center text-gray-500 animate-pulse">Carregando dados para {stateName}...</div>; }
  if (error) { return <div className="container mx-auto p-6 text-center text-red-500">Erro ao carregar dados: {error}. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>; }
  if (!pageData) { return <div className="container mx-auto p-6 text-center text-gray-500">Dados de votos não disponíveis para {stateName} no momento {currentTime}%. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>; }

  return (
    // O JSX principal como no seu código, com as correções e chamadas aos componentes corretos
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

      <header className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{stateName} ({stateId})</h1> {/* Adicionado stateId */}
      </header>

      {/* Botões de Navegação da Visão */}
      <div className="my-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto justify-center" aria-label="State Views">
            <button onClick={() => setCurrentView('placarEstadual')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'placarEstadual' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Placar Estadual</button>
            <button onClick={() => setCurrentView('votacaoProporcional')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'votacaoProporcional' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Votação Proporcional</button>
            <button onClick={() => setCurrentView('verDistritos')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'verDistritos' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Ver Distritos</button>
            <button onClick={() => setCurrentView('swingProporcional')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'swingProporcional' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Swing Proporcional
            </button>
        </nav>
      </div>

      {/* Renderização Condicional da Visão */}
      <div className="mt-4">
          {currentView === 'placarEstadual' && ( <section> <p className="text-sm text-gray-500 mb-3 text-center"> Total de Assentos: {totalSeatsInStateChamber} (Distritais: {totalDistrictSeatsInState}, Proporcionais: {totalPRSeatsForThisState ?? 0}) {' | '}Maioria: {majorityThresholdStateChamber} </p> <SeatCompositionPanel seatData={totalSeatsByFrontForState} colorMap={coalitionColorMap} totalSeats={totalSeatsInStateChamber} /> </section> )}
          {currentView === 'votacaoProporcional' && (totalPRSeatsForThisState ?? 0) > 0 && ( <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"> <div> <ProportionalSeatAllocationDetails allocatedSeats={proportionalSeatsByFront} colorMap={coalitionColorMap} stateName={stateName} totalSeatsInState={totalPRSeatsForThisState!} majorityThreshold={majorityThresholdPR} rawVotes={proportionalVotesInput} /> </div> <div> <h3 className="text-xl font-semibold mb-2 text-gray-700">Votos Proporcionais</h3> {proportionalVotesInput.length > 0 ? ( <ProportionalBarChart data={proportionalVotesInput.map(pv => ({ name: pv.legend, value: pv.votes }))} colorMap={coalitionColorMap} /> ) : ( <p className="text-center text-gray-500 py-10">Sem dados de votos proporcionais para este estado.</p> )} </div> </section> )}
          {currentView === 'verDistritos' && (
             <section className="space-y-6"> <div> 
              {(filteredMapLayout.length > 0 && Object.keys(districtResultsSummaryForStateMap).length > 0) ? 
              ( <InteractiveMap 
              results={districtResultsSummaryForStateMap} 
              colorMap={coalitionColorMap} onDistrictHover={handleStateMapDistrictHover} 
              onDistrictClick={handleStateMapDistrictClick}
              />
              ):(<p className="text-gray-600 py-10 text-center">Não foi possível renderizar o mapa.</p> )} {hoveredDistrictInfo && ( <div className="mt-2 text-center text-sm text-gray-700 p-2 bg-gray-100 rounded">{hoveredDistrictInfo}</div> )} </div> <div> <h3 className="text-xl font-semibold mb-2 text-gray-700">Ticker dos Distritos de {stateName}</h3> {districtResultsForTicker.length > 0 ? ( <RaceTicker data={districtResultsForTicker} colorMap={coalitionColorMap} /> ) : ( <p className="text-gray-600 py-10 text-center">Sem resultados distritais.</p> )} </div> 
              </section> 
              
              )}
          {currentView === 'swingProporcional' && (
          <section>
            {stateProportionalSwingData.length > 0 ? (
            <StateProportionalSwing
                swingDataPercent={stateProportionalSwingData}
                currentPRSeatsByFront={proportionalSeatsByFront}
                previousPRSeatsDataForState={previousPRSeatsForThisState} // Passando os dados corretos
                colorMap={coalitionColorMap}
                stateName={stateName}
              />
               ) : (
               <p className="text-center text-gray-500 py-10">Dados insuficientes para análise de swing proporcional.</p>
               )}
          </section>
        )}
      </div>

      {/* Seletor de Tempo (Movido para o final) */}
      <div className="mt-8 text-center p-4 bg-white rounded-lg shadow-md border border-gray-200">
        <label htmlFor="time-select-state" className="text-sm font-medium mr-2">Ver Apuração em:</label>
        <select id="time-select-state" value={currentTime} onChange={(e) => setCurrentTime(parseInt(e.target.value, 10))} disabled={isLoading} className="rounded border-gray-300 shadow-sm" >
            <option value={50}>50%</option>
            <option value={100}>100%</option>
        </select>
      </div>
    </div> // <-- GARANTIR QUE ESTE É O FECHAMENTO CORRETO DA DIV PRINCIPAL DO RETURN
  );
}