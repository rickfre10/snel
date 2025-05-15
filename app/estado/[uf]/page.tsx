// app/estado/[uf]/page.tsx
"use client";

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import React, { useMemo, useState, useEffect } from 'react';

// Funções e dados estáticos
import { calculateProportionalSeats, ProportionalVotesInput } from '@/lib/electionCalculations';
import { partyData, districtsData } from '@/lib/staticData';

// Importa os tipos necessários. GeoLayoutInfo e os arrays de layout
// agora são usados apenas dentro do InteractiveMap, então não precisam ser importados aqui.
import type { ProportionalVote, CandidateVote, TickerEntry, DistrictInfoFromData, PartyInfo, DistrictResultInfo, StateOption } from '@/types/election';

// Componentes
import SeatCompositionPanel from '@/components/SeatCompositionPanel';
import RaceTicker from '@/components/RaceTicker';
import ProportionalSeatAllocationDetails from '@/components/ProportionalSeatAllocationDetails';
import ProportionalBarChart from '@/components/ProportionalBarChart';
import InteractiveMap from '@/components/InteractiveMap'; // InteractiveMap já importa os layouts necessários

// Configuração de assentos e cores
const totalProportionalSeatsByState: Record<string, number> = { "TP": 1, "MA": 51, "MP": 29, "BA": 20, "PB": 10, "PN": 4 };

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
  // --- HOOKS DEVEM VIR PRIMEIRO ---
  const params = useParams();
  const searchParamsHook = useSearchParams();
  const router = useRouter();

  // Estados da página
  const [currentTime, setCurrentTime] = useState<number>(100); // Inicializado, será atualizado pelo useEffect se houver query param
  const [pageData, setPageData] = useState<ApiVotesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<StateViewMode>('placarEstadual');
  const [hoveredDistrictInfo, setHoveredDistrictInfo] = useState<string | null>(null);

  // Deriva stateId e timeFromQuery dos hooks
  const stateId = useMemo(() => (params.uf as string)?.toUpperCase(), [params.uf]);
  const initialTimeFromQuery = useMemo(() => searchParamsHook.get('time') ? parseInt(searchParamsHook.get('time')!, 10) : 100, [searchParamsHook]);

  // Atualiza currentTime se timeFromQuery mudar (ex: navegação com ?time=X)
  useEffect(() => {
    setCurrentTime(initialTimeFromQuery);
  }, [initialTimeFromQuery]);

  // Informações estáticas derivadas
  const stateInfo = useMemo(() => {
    if (!stateId) return null;
    return districtsData.find(d => d.uf === stateId);
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
    districtsData.forEach(district => {
        if (district.uf && district.uf_name) uniqueStates.set(district.uf, district.uf_name);
    });
    return Array.from(uniqueStates, ([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name));
  }, []);


  // --- Fetch de Dados ---
  useEffect(() => {
    if (!stateId || !stateInfo || totalPRSeatsForThisState === undefined) {
      // Tratar estado não encontrado ou mal configurado - já está ok abaixo
      // setError(`Estado (${stateId || params.uf}) não encontrado ou mal configurado.`);
      // setIsLoading(false); // Isto será tratado pela renderização condicional
      return;
    }
    const loadData = async () => {
      setIsLoading(true); setError(null);
      try {
        // Buscar dados de resultados para TODOS os distritos, InteractiveMap filtrará a coloração
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
     // Filtra os votos para incluir apenas os do estado atual
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
    Object.keys(districtSeatsByFrontInState).forEach(f => f && f !== "null" && f !== "undefined" && allFronts.add(f));
    Object.keys(proportionalSeatsByFront).forEach(f => f && f !== "null" && f !== "undefined" && allFronts.add(f));
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


  // Este useMemo agora apenas prepara os resultados dos distritos do estado atual para o mapa
  const districtResultsSummaryForStateMap: Record<string, DistrictResultInfo> = useMemo(() => {
    const summary: Record<string, DistrictResultInfo> = {};
    if (!pageData?.candidateVotes || !districtsData || !stateId) return summary; // Use pageData?.candidateVotes para checar se os dados chegaram

     // Crie um mapa rápido de votos por distrito para o estado atual
    const votesByDistrictInState: Record<string, CandidateVote[]> = {};
    const districtIdsInThisStateSet = new Set(districtsData.filter(d => d.uf === stateId).map(d => String(d.district_id)));

    pageData.candidateVotes.forEach((vote: CandidateVote) => {
        const districtIdStr = String(vote.district_id);
         // Processa apenas votos para distritos dentro do estado atual
        if (districtIdsInThisStateSet.has(districtIdStr)) {
            if (!votesByDistrictInState[districtIdStr]) { votesByDistrictInState[districtIdStr] = []; }
            if (vote.candidate_name && vote.votes_qtn !== undefined && vote.votes_qtn !== null) {
                votesByDistrictInState[districtIdStr].push(vote);
            }
        }
    });

    // Determine o vencedor para cada distrito no estado atual
    Object.keys(votesByDistrictInState).forEach(districtIdStr => {
        const votes = votesByDistrictInState[districtIdStr];
        if (!votes || votes.length === 0) return;
        const winner = votes.reduce((cw, cv) => (parseNumber(cw.votes_qtn) > parseNumber(cv.votes_qtn) ? cw : cv), votes[0]);
        const districtInfoForMap = districtsData.find(d => String(d.district_id) === districtIdStr); // Encontra info estática do distrito
        if (winner) {
            summary[districtIdStr] = {
                winnerLegend: winner.parl_front_legend ?? null,
                winnerName: winner.candidate_name,
                districtName: districtInfoForMap?.district_name || `Distrito ${districtIdStr}`,
                maxVotes: parseNumber(winner.votes_qtn),
            };
        }
    });

    // Garante que todos os distritos do estado estejam no summary, mesmo sem votos ainda
    districtsData.filter(d => d.uf === stateId).forEach(d => {
        const districtIdStr = String(d.district_id);
        if (!summary[districtIdStr]) {
            summary[districtIdStr] = { winnerLegend: null, districtName: d.district_name, maxVotes: 0 };
        }
    });

    return summary;
  }, [pageData?.candidateVotes, stateId]); // Adicionado pageData?.candidateVotes como dependência


  // Colar os handlers aqui (iguais aos da resposta #120)
    const handleStateMapDistrictHover = (districtInfo: DistrictResultInfo | null, districtId: string | null) => {
    if (districtInfo && districtId) {
       // Para a exibição de hover, talvez você queira mostrar o ID do distrito e nome,
       // independente se há um vencedor exibido.
       // Vamos buscar a informação estática do distrito pelo ID.
       const staticDistrictInfo = districtsData.find(d => String(d.district_id) === districtId);
       const districtName = districtInfo.districtName || staticDistrictInfo?.district_name || `Distrito ${districtId}`;


      setHoveredDistrictInfo(
        `Distrito: ${districtName} | Vencedor: ${districtInfo.winnerName || 'N/A'} (${districtInfo.winnerLegend || 'N/D'})`
      );
    } else {
      setHoveredDistrictInfo(null);
    }
  };
  const handleStateMapDistrictClick = (districtInfo: DistrictResultInfo | null, districtId: string) => {
    if (districtId) {
      // Navegar para a página do distrito com o tempo atual
      router.push(`/distrito/${districtId}?time=${currentTime}`);
    }
  };


  // --- Lógica de Renderização ---
  // As validações são movidas para o topo do return
  if (!stateId || !stateInfo || totalPRSeatsForThisState === undefined) {
    return <div className="container mx-auto p-6 text-center text-red-500">Estado ({params.uf}) não encontrado ou não configurado para proporcional. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }

  // Constantes para JSX (APÓS A VERIFICAÇÃO DE stateInfo)
  const stateName = stateInfo.uf_name;
  const totalDistrictSeatsInState = districtsData.filter(d => d.uf === stateId).length;
  const totalSeatsInStateChamber = totalDistrictSeatsInState + (totalPRSeatsForThisState || 0); // Garante que totalPRSeatsForState é número
  const majorityThresholdStateChamber = Math.floor(totalSeatsInStateChamber / 2) + 1;
  const majorityThresholdPR = totalPRSeatsForThisState > 0 ? Math.floor(totalPRSeatsForThisState / 2) + 1 : 0;


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

      <header className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{stateName}</h1>
      </header>

      {/* Botões de Navegação da Visão */}
      <div className="my-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto justify-center" aria-label="State Views">
            <button onClick={() => setCurrentView('placarEstadual')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'placarEstadual' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Placar Estadual</button>
            <button onClick={() => setCurrentView('votacaoProporcional')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'votacaoProporcional' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Votação Proporcional</button>
            <button onClick={() => setCurrentView('verDistritos')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-xs sm:text-sm ${currentView === 'verDistritos' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-300'}`}>Ver Distritos</button>
            <button disabled title="Dados de eleição anterior não disponíveis" className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs sm:text-sm border-transparent text-gray-400 cursor-not-allowed`}>Swing</button>
        </nav>
      </div>

      {/* Renderização Condicional da Visão */}
      {isLoading && <p className="text-center text-gray-500 animate-pulse py-10">Carregando visualização...</p>}
      {!isLoading && error && <p className="text-red-600 text-center py-10">Erro: {error}</p>}
      {!isLoading && !error && pageData && (
        <div className="mt-4">
          {currentView === 'placarEstadual' && ( <section> <p className="text-sm text-gray-500 mb-3 text-center"> Total de Assentos: {totalSeatsInStateChamber} (Distritais: {totalDistrictSeatsInState}, Proporcionais: {totalPRSeatsForThisState}) {' | '}Maioria: {majorityThresholdStateChamber} </p> <SeatCompositionPanel seatData={totalSeatsByFrontForState} colorMap={coalitionColorMap} totalSeats={totalSeatsInStateChamber} /> </section> )}
          {currentView === 'votacaoProporcional' && totalPRSeatsForThisState > 0 && ( <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"> <div> <ProportionalSeatAllocationDetails allocatedSeats={proportionalSeatsByFront} colorMap={coalitionColorMap} stateName={stateName} totalSeatsInState={totalPRSeatsForThisState} majorityThreshold={majorityThresholdPR} rawVotes={proportionalVotesInput} /> </div> <div> {proportionalVotesInput.length > 0 ? ( <ProportionalBarChart data={proportionalVotesInput.map(pv => ({ name: pv.legend, value: pv.votes }))} colorMap={coalitionColorMap} /> ) : ( <p className="text-center text-gray-500 py-10">Sem dados de votos proporcionais para este estado.</p> )} </div> </section> )}
          {currentView === 'verDistritos' && ( <section className="space-y-6"> <div>  {/* InteractiveMap agora renderiza TODOS os distritos e estados, e usa os resultados para colorir */} {Object.keys(districtResultsSummaryForStateMap).length > 0 || !pageData ? ( // Renderiza o mapa se houver resultados para o estado ou se os dados ainda estiverem carregando (pageData é null)
 <InteractiveMap
                results={districtResultsSummaryForStateMap} // Passa SOMENTE os resultados do estado atual
                colorMap={coalitionColorMap}
                onDistrictHover={handleStateMapDistrictHover}
                onDistrictClick={handleStateMapDistrictClick}
                // layoutData prop REMOVIDA - InteractiveMap importa layouts diretamente
              />
            ) : (
              // Mensagem de fallback se não houver resultados para o estado após o carregamento dos dados
             <p className="text-gray-600 py-10 text-center">Não foi possível carregar resultados para os distritos deste estado.</p>
            )}
            {hoveredDistrictInfo && ( <div className="mt-2 text-center text-sm text-gray-700 p-2 bg-gray-100 rounded">{hoveredDistrictInfo}</div> )}
          </div>
          <div> {districtResultsForTicker.length > 0 ? ( <RaceTicker data={districtResultsForTicker} colorMap={coalitionColorMap} /> ) : ( <p className="text-gray-600 py-10 text-center">Sem resultados distritais.</p> )} </div> </section> )}
          {currentView === 'swing' && <p className="text-center text-gray-500 py-10">Visualização de Swing (ainda não implementada).</p>}
        </div>
      )}

      {/* Seletor de Tempo (Movido para o final) */}
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