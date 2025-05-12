// app/estado/[uf]/page.tsx
"use client";

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation'; // Corrigido para useSearchParams
import React, { useMemo, useState, useEffect } from 'react';

// Funções e dados estáticos
import { calculateProportionalSeats, ProportionalVotesInput } from '@/lib/electionCalculations';
import { partyData, districtsData } from '@/lib/staticData';
import type { ProportionalVote, CandidateVote, TickerEntry, DistrictInfoFromData, PartyInfo, DistrictResultInfo } from '@/types/election';

// Componentes
import SeatCompositionPanel from '@/components/SeatCompositionPanel';
import RaceTicker from '@/components/RaceTicker';
// Vamos usar ProportionalPieChart para a visualização de votos proporcionais por enquanto
import ProportionalPieChart from '@/components/ProportionalPieChart';
// Mantenha este se quiser usar o componente que a IA parceira sugeriu para detalhes da alocação
import ProportionalSeatAllocationDetails from '@/components/ProportionalSeatAllocationDetails'; // Nome que a IA parceira usou


// Dados de configuração dos assentos proporcionais
const totalProportionalSeatsByState: Record<string, number> = {
  "TP":1, "MA": 40, "MP": 23, "BA": 16, "PB": 9, "PN": 4
};

// Mapa de cores das coalizões
const coalitionColorMap: Record<string, string> = partyData.reduce((acc, party) => {
  if (party.parl_front_legend && party.parl_front_color) {
    acc[party.parl_front_legend] = party.parl_front_color;
  }
  return acc;
}, {} as Record<string, string>);

// Helper parseNumber
const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedStr = String(value).replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

// Interface para os dados de VOTOS que vêm da nossa API /api/results
interface ApiResultsData {
  time: number;
  candidateVotes: CandidateVote[];
  proportionalVotes: ProportionalVote[];
}

// REMOVIDA A FUNÇÃO MOCK getVoteData DAQUI

// Tipo para a View desta página de estado
type StateViewMode = 'composition' | 'pr_details' | 'district_ticker' | 'pr_pie_chart';


interface StatePageProps {
  params: {
    uf: string;
  };
  // searchParams é opcional e será pego pelo hook useSearchParams
}

export default function StatePage({ params }: StatePageProps) {
  const routerParams = useParams(); // Para pegar o UF se params não for passado diretamente
  const searchParams = useSearchParams(); // Hook para ler query params

  const stateId = useMemo(() => (params.uf || routerParams.uf as string)?.toUpperCase(), [params.uf, routerParams.uf]);
  const timeFromQuery = useMemo(() => searchParams.get('time') ? parseInt(searchParams.get('time')!, 10) : 100, [searchParams]);

  const [currentTime, setCurrentTime] = useState<number>(timeFromQuery || 100);
  // pageData agora vai guardar os dados de /api/results
  const [pageData, setPageData] = useState<ApiResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateViewMode, setStateViewMode] = useState<StateViewMode>('composition');


  // Validar UF e buscar dados de configuração do estado
  const stateInfo = useMemo(() => districtsData.find(d => d.uf === stateId), [stateId]);
  const totalPRSeatsForThisState = stateId ? totalProportionalSeatsByState[stateId] : undefined;

  // --- Fetch dos Dados da API REAL ---
  useEffect(() => {
    if (!stateId || !stateInfo || totalPRSeatsForThisState === undefined) {
      setError(`Estado (${stateId}) não encontrado ou mal configurado.`);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Substituindo a chamada ao mock pela API REAL
        const response = await fetch(`/api/results?time=${currentTime}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Falha ao buscar dados da API: ${response.status}`);
        }
        const data: ApiResultsData = await response.json();
        setPageData(data); // Guarda TODOS os dados nacionais
      } catch (e) {
        console.error("Erro ao carregar dados do estado via API:", e);
        setError(e instanceof Error ? e.message : "Erro desconhecido ao buscar dados");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [stateId, currentTime, stateInfo, totalPRSeatsForThisState]); // Dependências do useEffect

  // --- Cálculos baseados nos dados carregados (pageData) ---

  // Filtra Votos Proporcionais para o Estado Atual
  const proportionalVotesRawForState = useMemo(() => {
    if (!pageData?.proportionalVotes || !stateId) return [];
    return pageData.proportionalVotes.filter(vote => vote.uf === stateId);
  }, [pageData?.proportionalVotes, stateId]);

  // Transforma para o formato esperado pela função de cálculo D'Hondt
  const proportionalVotesInput: ProportionalVotesInput[] = useMemo(() => {
    return proportionalVotesRawForState
      .filter(vote => vote.parl_front_legend)
      .map(vote => ({
        legend: vote.parl_front_legend!,
        votes: parseNumber(vote.proportional_votes_qtn),
      }));
  }, [proportionalVotesRawForState]);

  // Calcula Assentos Proporcionais (PR)
  const proportionalSeatsByFront = useMemo(() => {
    if (totalPRSeatsForThisState === undefined || proportionalVotesInput.length === 0) return {};
    return calculateProportionalSeats(
      proportionalVotesInput,
      totalPRSeatsForThisState,
      5 // Cláusula de barreira de 5%
    );
  }, [proportionalVotesInput, totalPRSeatsForThisState]);

  // Filtra votos de candidatos apenas para os distritos deste estado
  const candidateVotesInState = useMemo(() => {
    if (!pageData?.candidateVotes || !stateId) return [];
    const districtIdsInThisState = districtsData
        .filter(d => d.uf === stateId)
        .map(d => d.district_id);
    return pageData.candidateVotes.filter(vote =>
        districtIdsInThisState.includes(parseNumber(vote.district_id))
    );
  }, [pageData?.candidateVotes, stateId]);

  // Calcula Assentos Distritais Ganhos por Frente neste Estado
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

  // Prepara dados para o Ticker/Lista de Distritos deste estado
  const districtResultsForTicker: TickerEntry[] = useMemo(() => {
    // ... (lógica para tickerData como na sua página nacional, mas filtrando por stateId) ...
    // Esta lógica precisa ser adaptada para pegar apenas distritos do stateId
    if (!candidateVotesInState || !districtsData || !stateId) return [];
    const tickerEntries: TickerEntry[] = [];
    const districtsInThisState = districtsData.filter(d => d.uf === stateId);

    districtsInThisState.forEach(district => {
      const votesInDistrict = candidateVotesInState.filter(
        vote => parseNumber(vote.district_id) === district.district_id
      );

      let winner: CandidateVote | null = null;
      let runnerUp: CandidateVote | null = null;
      let totalVotesInDistrict = 0;

      if (votesInDistrict.length > 0) {
        const votesWithNumeric = votesInDistrict.map(v => ({...v, numericVotes: parseNumber(v.votes_qtn)}));
        totalVotesInDistrict = votesWithNumeric.reduce((sum, cv) => sum + cv.numericVotes, 0);
        const sortedVotes = votesWithNumeric.sort((a,b) => b.numericVotes - a.numericVotes);
        winner = sortedVotes[0] || null;
        runnerUp = sortedVotes[1] || null;
      }

      tickerEntries.push({
        districtId: district.district_id,
        districtName: district.district_name,
        stateId: district.uf,
        stateName: district.uf_name,
        winnerName: winner?.candidate_name || null,
        winnerLegend: winner?.parl_front_legend || null,
        winnerPercentage: winner && totalVotesInDistrict > 0 ? (parseNumber(winner.votes_qtn) / totalVotesInDistrict * 100) : null,
        runnerUpName: runnerUp?.candidate_name || null,
        runnerUpLegend: runnerUp?.parl_front_legend || null,
        runnerUpPercentage: runnerUp && totalVotesInDistrict > 0 ? (parseNumber(runnerUp.votes_qtn) / totalVotesInDistrict * 100) : null,
      });
    });
    return tickerEntries.sort((a,b) => a.districtId - b.districtId);
  }, [candidateVotesInState, stateId]);


  // Composição Total da Câmara Estadual (Distritais + Proporcionais)
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

  // Validações e Loading
  if (!stateId || !stateInfo || totalPRSeatsForThisState === undefined) {
    return <div className="container mx-auto p-6 text-center text-red-500">Estado ({params.uf}) não encontrado ou não configurado para proporcional. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  if (isLoading) {
    return <div className="container mx-auto p-6 text-center text-gray-500 animate-pulse">Carregando dados para {stateInfo.uf_name}...</div>;
  }
  if (error) {
    return <div className="container mx-auto p-6 text-center text-red-500">Erro ao carregar dados: {error}. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  if (!pageData) { // Se não há dados da API após o loading
    return <div className="container mx-auto p-6 text-center text-gray-500">Dados de votos não disponíveis para {stateInfo.uf_name} no momento {currentTime}%. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }

  // Constantes para o JSX
  const stateName = stateInfo.uf_name;
  const totalDistrictSeatsInState = districtsData.filter(d => d.uf === stateId).length;
  const totalSeatsInStateChamber = totalDistrictSeatsInState + totalPRSeatsForThisState; // totalPRSeatsForThisState já é número
  const majorityThresholdStateChamber = Math.floor(totalSeatsInStateChamber / 2) + 1;
  const majorityThresholdPR = totalPRSeatsForThisState > 0 ? Math.floor(totalPRSeatsForThisState / 2) + 1 : 0;


  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-8">
       <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Voltar para Visão Nacional</Link>
      <header className="text-center">
        <h1 className="text-4xl font-bold text-gray-800">
          {stateName} ({stateId})
        </h1>
        {/* Exibe o tempo dos dados da API, não o da URL, pois o mock não usa o tempo da URL */}
        <p className="text-xl text-gray-600">Resultados Eleitorais Estaduais - {pageData.time}%</p>
         {/* Controle de tempo para ESTA PÁGINA */}
         <div className="mt-4">
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
      </header>

      {/* Botões de Navegação da Visão */}
      <div className="my-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto justify-center" aria-label="State Views">
            <button onClick={() => setStateViewMode('composition')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-sm ${stateViewMode === 'composition' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Composição Estadual</button>
            <button onClick={() => setStateViewMode('pr_details')} className={`whitespace-nowrap pb-3 px-2 border-b-2 font-medium text-sm ${stateViewMode === 'pr_details' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Detalhes PR</button>
            <button onClick={() => setStateViewMode('district_ticker')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${stateViewMode === 'district_ticker' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Ticker Distritos</button>
            <button onClick={() => setStateViewMode('pr_pie_chart')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${stateViewMode === 'pr_pie_chart' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Gráfico PR (Votos)</button>
        </nav>
      </div>

      {/* Renderização Condicional da Visão */}
      {isLoading && <p className="text-center text-gray-500 animate-pulse">Carregando visualização...</p>}
      {!isLoading && error && <p className="text-red-600 text-center">Erro: {error}</p>}
      {!isLoading && !error && pageData && (
        <>
          {stateViewMode === 'composition' && (
            <section>
              <h2 className="text-2xl font-semibold mb-1 text-gray-700">Composição da Câmara Estadual</h2>
              <p className="text-sm text-gray-500 mb-3">
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

          {stateViewMode === 'pr_details' && totalPRSeatsForThisState > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-700">Detalhes da Alocação Proporcional</h2>
              <ProportionalSeatAllocationDetails
                allocatedSeats={proportionalSeatsByFront}
                colorMap={coalitionColorMap}
                stateName={stateName}
                totalSeatsInState={totalPRSeatsForThisState}
                majorityThreshold={majorityThresholdPR}
                rawVotes={proportionalVotesInput}
              />
            </section>
          )}

          {stateViewMode === 'district_ticker' && (
            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-700">Resultados Distritais em {stateName}</h2>
              {districtResultsForTicker.length > 0 ? (
                <RaceTicker data={districtResultsForTicker} colorMap={coalitionColorMap} />
              ) : (
                <p className="text-gray-600">Não há distritos com resultados para este estado.</p>
              )}
            </section>
          )}

          {stateViewMode === 'pr_pie_chart' && (
            <section>
                <h2 className="text-2xl font-semibold mb-3 text-gray-700">Votos Proporcionais no Estado (Gráfico)</h2>
                {proportionalVotesInput.length > 0 ? (
                    <ProportionalPieChart
                    data={
                      proportionalVotesInput.map(pv => ({
                          name: pv.legend,
                          value: pv.votes
                      }))
                  }
                        colorMap={coalitionColorMap}
                    />
                ) : (
                    <p className="text-center text-gray-500">Sem dados de votos proporcionais para este estado.</p>
                )}
            </section>
          )}
        </>
      )}
    </div>
  );
}