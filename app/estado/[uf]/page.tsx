// app/estado/[uf]/page.tsx
"use client";

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import React, { useMemo, useState, useEffect } from 'react';

// Funções e dados estáticos (ajuste os caminhos se @/ não funcionar para você)
import { calculateProportionalSeats, ProportionalVotesInput } from '@/lib/electionCalculations';
import { partyData, districtsData } from '@/lib/staticData';
import { haagarMapLayout, DistrictLayoutInfo } from '@/lib/mapLayout'; // Para o mapa estadual
import type { ProportionalVote, CandidateVote, TickerEntry, DistrictInfoFromData, PartyInfo, DistrictResultInfo, StateOption } from '@/types/election'; // Removido DistrictOption se não usado aqui

// Componentes
import SeatCompositionPanel from '@/components/SeatCompositionPanel';
import RaceTicker from '@/components/RaceTicker';
import ProportionalSeatAllocationDetails from '@/components/ProportionalSeatAllocationDetails';
import ProportionalPieChart from '@/components/ProportionalPieChart';
import InteractiveMap from '@/components/InteractiveMap';

// Configuração de assentos e cores
const totalProportionalSeatsByState: Record<string, number> = { "TP": 39, "MA": 51, "MP": 29, "BA": 20, "PB": 10, "PN": 4 };

const coalitionColorMap: Record<string, string> = partyData.reduce((acc, party) => {
  if (party.parl_front_legend && party.parl_front_color) {
    acc[party.parl_front_legend] = party.parl_front_color;
  }
  // Adicionando também cores de partidos individuais se a legenda da frente não existir ou para fallback
  if (party.party_legend && party.party_color && !acc[party.party_legend]) { // Evita sobrescrever se já houver cor da frente
      acc[party.party_legend] = party.party_color;
  }
  return acc;
}, {} as Record<string, string>);

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

type StateViewMode = 'placarEstadual' | 'votacaoProporcional' | 'verDistritos' | 'swing';

export default function StatePage() {
  const params = useParams();
  const searchParamsHook = useSearchParams();
  const router = useRouter();

  const stateId = useMemo(() => (params.uf as string)?.toUpperCase(), [params.uf]);
  const timeFromQuery = useMemo(() => searchParamsHook.get('time') ? parseInt(searchParamsHook.get('time')!, 10) : 100, [searchParamsHook]);

  const [currentTime, setCurrentTime] = useState<number>(timeFromQuery || 100);
  const [pageData, setPageData] = useState<ApiVotesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<StateViewMode>('placarEstadual');
  const [hoveredDistrictInfo, setHoveredDistrictInfo] = useState<string | null>(null);


  const stateInfo = useMemo(() => districtsData.find(d => d.uf === stateId), [stateId]);
  const totalPRSeatsForThisState = stateId ? totalProportionalSeatsByState[stateId] : undefined;

  useEffect(() => {
    if (!stateId || !stateInfo || totalPRSeatsForThisState === undefined) {
      setError(`Estado (${stateId || params.uf}) não encontrado ou mal configurado.`);
      setIsLoading(false);
      return;
    }
    const loadData = async () => {
      setIsLoading(true); setError(null);
      try {
        // SUBSTITUA PELA SUA LÓGICA DE FETCH REAL SE NECESSÁRIO
        // Esta API busca todos os dados, filtramos no cliente.
        const response = await fetch(`/api/results?time=${currentTime}`);
        if (!response.ok) throw new Error((await response.json()).error || 'Falha ao buscar dados de votos');
        const allVoteData: ApiVotesData = await response.json();
        setPageData(allVoteData);
      } catch (e) { console.error("Erro ao carregar dados do estado via API:", e); setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally { setIsLoading(false); }
    };
    loadData();
  }, [stateId, currentTime, stateInfo, totalPRSeatsForThisState, params.uf]);


  const proportionalVotesInput: ProportionalVotesInput[] = useMemo((): ProportionalVotesInput[] => {
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
      5 // Cláusula de barreira
    );
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
    Object.keys(districtSeatsByFrontInState).forEach(f => f && allFronts.add(f));
    Object.keys(proportionalSeatsByFront).forEach(f => f && allFronts.add(f));
    allFronts.forEach((front) => {
      combined[front] = (districtSeatsByFrontInState[front] || 0) + (proportionalSeatsByFront[front] || 0);
    });
    return combined;
  }, [districtSeatsByFrontInState, proportionalSeatsByFront]);

  const districtResultsForTicker: TickerEntry[] = useMemo(() => {
    if (!candidateVotesInState || !districtsData || !stateId) return [];
    const tickerEntries: TickerEntry[] = [];
    const districtsInThisState = districtsData.filter(d => d.uf === stateId);
    districtsInThisState.forEach(district => {
      const votesInDistrict = candidateVotesInState.filter( vote => parseNumber(vote.district_id) === district.district_id );
      let winner: CandidateVote | null = null; let runnerUp: CandidateVote | null = null; let totalVotesInDistrict = 0;
      if (votesInDistrict.length > 0) {
        const votesWithNumeric = votesInDistrict.map(v => ({...v, numericVotes: parseNumber(v.votes_qtn)}));
        totalVotesInDistrict = votesWithNumeric.reduce((sum, cv) => sum + cv.numericVotes, 0);
        const sortedVotes = votesWithNumeric.sort((a,b) => b.numericVotes - a.numericVotes);
        winner = sortedVotes[0] || null; runnerUp = sortedVotes[1] || null;
      }
      tickerEntries.push({
        districtId: district.district_id, districtName: district.district_name, stateId: district.uf, stateName: district.uf_name,
        winnerName: winner?.candidate_name || null, winnerLegend: winner?.parl_front_legend || null,
        winnerPercentage: winner && totalVotesInDistrict > 0 ? (parseNumber(winner.votes_qtn) / totalVotesInDistrict * 100) : null,
        runnerUpName: runnerUp?.candidate_name || null, runnerUpLegend: runnerUp?.parl_front_legend || null,
        runnerUpPercentage: runnerUp && totalVotesInDistrict > 0 ? (parseNumber(runnerUp.votes_qtn) / totalVotesInDistrict * 100) : null,
      });
    });
    return tickerEntries.sort((a,b) => a.districtId - b.districtId);
  }, [candidateVotesInState, stateId]);

  const filteredMapLayout = useMemo(() => {
    if (!stateId || !districtsData || !haagarMapLayout) return [];
    // Cria um conjunto (Set) com os IDs dos distritos que pertencem ao estado atual
    const districtIdsInStateSet = new Set(
      districtsData
        .filter(d => d.uf === stateId) // Filtra districtsData pelo UF atual
        .map(d => String(d.district_id)) // Pega os IDs desses distritos (como string)
    );
    // Filtra o haagarMapLayout completo, mantendo apenas os itens cujo ID está no conjunto acima
    return haagarMapLayout.filter(layoutItem => districtIdsInStateSet.has(layoutItem.id));
}, [stateId, districtsData, haagarMapLayout]); // Dependências corretas

  const districtResultsSummaryForStateMap: Record<string, DistrictResultInfo> = useMemo(() => {
    const summary: Record<string, DistrictResultInfo> = {};
    if (!candidateVotesInState || !districtsData || !stateId) return summary;
    const votesByDistrict: Record<string, CandidateVote[]> = {};
    candidateVotesInState.forEach((vote: CandidateVote) => {
        const districtIdStr = String(vote.district_id);
        if (!votesByDistrict[districtIdStr]) { votesByDistrict[districtIdStr] = []; }
        if (vote.candidate_name && vote.votes_qtn !== undefined && vote.votes_qtn !== null) {
            votesByDistrict[districtIdStr].push(vote);
        }
    });
    Object.keys(votesByDistrict).forEach(districtIdStr => {
        const votes = votesByDistrict[districtIdStr];
        if (!votes || votes.length === 0) return;
        const winner = votes.reduce((cw, cv) => (parseNumber(cw.votes_qtn) > parseNumber(cv.votes_qtn) ? cw : cv), votes[0]);
        const districtInfo = districtsData.find(d => String(d.district_id) === districtIdStr);
        if (winner) {
            summary[districtIdStr] = {
                winnerLegend: winner.parl_front_legend ?? null,
                winnerName: winner.candidate_name,
                districtName: districtInfo?.district_name || `Distrito ${districtIdStr}`,
                maxVotes: parseNumber(winner.votes_qtn),
            };
        }
    });
    districtsData.filter(d=>d.uf === stateId).forEach(d => {
        const districtIdStr = String(d.district_id);
        if (!summary[districtIdStr]) {
            summary[districtIdStr] = { winnerLegend: null, districtName: d.district_name, maxVotes: 0 };
        }
    });
    return summary;
  }, [candidateVotesInState, stateId]);

  // --- Handlers para o Mapa Estadual ---
  const handleStateMapDistrictHover = (districtInfo: DistrictResultInfo | null, districtId: string | null) => {
    if (districtInfo && districtId) {
      setHoveredDistrictInfo(
        `Distrito: ${districtInfo.districtName || districtId} | Vencedor: ${districtInfo.winnerName || 'N/A'} (${districtInfo.winnerLegend || 'N/D'})`
      );
    } else {
      setHoveredDistrictInfo(null);
    }
  };

  const handleStateMapDistrictClick = (districtInfo: DistrictResultInfo | null, districtId: string) => {
    if (districtId) {
      router.push(`/distrito/${districtId}?time=${currentTime}`);
    }
  };
  // ------------------------------------

  if (!stateId || !stateInfo || totalPRSeatsForThisState === undefined) {
    return <div className="container mx-auto p-6 text-center text-red-500">Estado ({params.uf}) não encontrado ou não configurado para proporcional. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  if (isLoading) {
    return <div className="container mx-auto p-6 text-center text-gray-500 animate-pulse">Carregando dados para {stateInfo.uf_name}...</div>;
  }
  if (error) {
    return <div className="container mx-auto p-6 text-center text-red-500">Erro ao carregar dados: {error}. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  if (!pageData) {
    return <div className="container mx-auto p-6 text-center text-gray-500">Dados de votos não disponíveis para {stateInfo.uf_name} no momento {currentTime}%. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }

  const stateName = stateInfo.uf_name;
  const totalDistrictSeatsInState = districtsData.filter(d => d.uf === stateId).length;
  const totalSeatsInStateChamber = totalDistrictSeatsInState + totalPRSeatsForThisState;
  const majorityThresholdStateChamber = Math.floor(totalSeatsInStateChamber / 2) + 1;
  const majorityThresholdPR = totalPRSeatsForThisState > 0 ? Math.floor(totalPRSeatsForThisState / 2) + 1 : 0;
  const allPossibleStates = useMemo(() => {
    const uniqueStates = new Map<string, string>();
    districtsData.forEach(district => {
        if (district.uf && district.uf_name) uniqueStates.set(district.uf, district.uf_name);
    });
    return Array.from(uniqueStates, ([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name));
  }, []);


  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-8">
      {/* Navegação Superior */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <Link href="/" className="text-blue-600 hover:underline">&larr; Visão Nacional</Link>
        <div className="flex space-x-1 sm:space-x-2 flex-wrap gap-y-1 justify-end">
          {allPossibleStates.map(s => (
            s.id !== stateId && (
              <Link key={s.id} href={`/estado/${s.id.toLowerCase()}?time=${currentTime}`} legacyBehavior>
                <a className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs sm:text-sm transition-colors">
                  {s.id} {/* Mostra só a sigla para economizar espaço */}
                </a>
              </Link>
            )
          ))}
        </div>
      </div>

      <header className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{stateName} ({stateId})</h1>
        <p className="text-lg sm:text-xl text-gray-600">Resultados Eleitorais Estaduais - {currentTime}%</p>
      </header>

      {/* Botões de Navegação da Visão */}
      <div className="my-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto justify-center" aria-label="State Views">
            <button onClick={() => setCurrentView('placarEstadual')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'placarEstadual' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Placar Estadual</button>
            <button onClick={() => setCurrentView('votacaoProporcional')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'votacaoProporcional' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Votação Proporcional</button>
            <button onClick={() => setCurrentView('verDistritos')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'verDistritos' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Ver Distritos</button>
            <button disabled title="Dados de eleição anterior não disponíveis" className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs sm:text-sm border-transparent text-gray-400 cursor-not-allowed`}>Swing</button>
        </nav>
      </div>

      {/* Renderização Condicional da Visão */}
      {isLoading && <p className="text-center text-gray-500 animate-pulse py-10">Carregando visualização...</p>}
      {!isLoading && error && <p className="text-red-600 text-center py-10">Erro: {error}</p>}
      {!isLoading && !error && pageData && (
        <div className="mt-4">
          {currentView === 'placarEstadual' && (
            <section>
              <p className="text-sm text-gray-500 mb-3 text-center">
                Total de Assentos: {totalSeatsInStateChamber} (Distritais: {totalDistrictSeatsInState}, Proporcionais: {totalPRSeatsForThisState})
                {' | '}Maioria: {majorityThresholdStateChamber}
              </p>
              <SeatCompositionPanel
                seatData={totalSeatsByFrontForState}
                colorMap={coalitionColorMap}
                totalSeats={totalSeatsInStateChamber}
              />
            </section>
          )}

          {currentView === 'votacaoProporcional' && totalPRSeatsForThisState > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-gray-700">Detalhes da Alocação Proporcional</h3>
                <ProportionalSeatAllocationDetails
                  allocatedSeats={proportionalSeatsByFront}
                  colorMap={coalitionColorMap}
                  stateName={stateName}
                  totalSeatsInState={totalPRSeatsForThisState}
                  majorityThreshold={majorityThresholdPR}
                  rawVotes={proportionalVotesInput}
                />
              </div>
              <div>
                 <h3 className="text-xl font-semibold mb-2 text-gray-700">Gráfico de Votos Proporcionais</h3>
                {proportionalVotesInput.length > 0 ? (
                    <ProportionalPieChart
                        data={proportionalVotesInput.map(pv => ({ name: pv.legend, value: pv.votes }))}
                        colorMap={coalitionColorMap}
                    />
                ) : ( <p className="text-center text-gray-500 py-10">Sem dados de votos proporcionais para este estado.</p> )}
              </div>
            </section>
          )}

          {currentView === 'verDistritos' && (
            <section className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-gray-700">Mapa dos Distritos de {stateName}</h3>
                {filteredMapLayout.length > 0 && Object.keys(districtResultsSummaryForStateMap).length > 0 ? (
                     <InteractiveMap
                         results={districtResultsSummaryForStateMap}
                         colorMap={coalitionColorMap}
                         onDistrictHover={handleStateMapDistrictHover}
                         onDistrictClick={handleStateMapDistrictClick}
                         layoutData={filteredMapLayout}
                     />
                 ) : ( <p className="text-gray-600 py-10 text-center">Não foi possível renderizar o mapa dos distritos.</p> )}
                 {hoveredDistrictInfo && ( <div className="mt-2 text-center text-sm text-gray-700 p-2 bg-gray-100 rounded">{hoveredDistrictInfo}</div> )}
              </div>
              <div>
                 <h3 className="text-xl font-semibold mb-2 text-gray-700">Ticker dos Distritos de {stateName}</h3>
                {districtResultsForTicker.length > 0 ? (
                  <RaceTicker data={districtResultsForTicker} colorMap={coalitionColorMap} interval={4000} />
                ) : ( <p className="text-gray-600 py-10 text-center">Sem resultados distritais para exibir no ticker.</p> )}
              </div>
            </section>
          )}
           {currentView === 'swing' && <p className="text-center text-gray-500 py-10">Visualização de Swing (ainda não implementada).</p>}
        </div>
      )}

      {/* Seletor de Tempo (Movido para o final) */}
      <div className="mt-8 text-center p-4 bg-white rounded-lg shadow-md border border-gray-200">
        <label htmlFor="time-select-state" className="text-sm font-medium mr-2">Ver Apuração em:</label>
        <select
            id="time-select-state"
            value={currentTime}
            onChange={(e) => setCurrentTime(parseInt(e.target.value, 10))}
            disabled={isLoading}
            className="rounded border-gray-300 shadow-sm"
        >
            <option value={50}>50%</option>
            <option value={100}>100%</option>
        </select>
      </div>
    </div>
  );
}