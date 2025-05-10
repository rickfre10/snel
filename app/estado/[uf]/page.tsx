// app/estado/[uf]/page.tsx
"use client"; // Componentes que usam hooks como useParams precisam ser Client Components

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import React, { useMemo, useState, useEffect } from 'react'; // Adicionado useState, useEffect

// Funções e dados estáticos (ajuste os caminhos se @/ não funcionar)
import { calculateProportionalSeats, ProportionalVotesInput } from '@/lib/electionCalculations';
import { partyData, districtsData } from '@/lib/staticData';
import type { ProportionalVote, CandidateVote, TickerEntry, DistrictInfoFromData, PartyInfo, DistrictResultInfo } from '@/types/election';

// Componentes (ajuste os caminhos se @/ não funcionar)
import SeatCompositionPanel from '@/components/SeatCompositionPanel';
import RaceTicker from '@/components/RaceTicker';
import ProportionalSeatAllocation from '@/components/ProportionalSeatAllocation';

// Dados de configuração dos assentos proporcionais (como você forneceu)
const totalProportionalSeatsByState: Record<string, number> = {
  "TP": 39, "MA": 51, "MP": 29, "BA": 20, "PB": 10, "PN": 4
};

// Mapa de cores das coalizões (gerado a partir de partyData)
const coalitionColorMap: Record<string, string> = partyData.reduce((acc, party) => {
  if (party.parl_front_legend && party.parl_front_color) {
    acc[party.parl_front_legend] = party.parl_front_color;
  }
  return acc;
}, {} as Record<string, string>);

// Helper parseNumber (se não estiver global, defina ou importe de utils)
const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedStr = String(value).replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

// Interface para os dados de VOTOS (simulando o que viria da sua API /api/results)
interface ApiVotesData {
  time: number;
  candidateVotes: CandidateVote[];
  proportionalVotes: ProportionalVote[];
}

// Simulação da API de votos (AJUSTADA PARA SEUS TIPOS)
// Em um projeto real, esta função seria substituída pela sua lógica de fetch da API real
async function getVoteData(uf_param?: string, currentTimeParam?: number): Promise<ApiVotesData> {
  console.warn("Usando dados mockados para getVoteData. Substitua pela sua lógica de fetch real!");
  const exampleTime = currentTimeParam || Date.now(); // Usa o tempo passado ou o atual

  // Mock Proportional Votes ALINHADO com seus tipos
  const mockProportionalVotes: ProportionalVote[] = [
    { uf: 'MA', parlamentar_front: 'Frente de Todos', parl_front_legend: 'TDS', proportional_votes_qtn: 150000 },
    { uf: 'MA', parlamentar_front: 'Unidos por Haagar', parl_front_legend: 'UNI', proportional_votes_qtn: 120000 },
    { uf: 'MA', parlamentar_front: 'Frente Conservadora', parl_front_legend: 'CON', proportional_votes_qtn: 70000 },
    { uf: 'MA', parlamentar_front: 'Partido Social Democrata', parl_front_legend: 'PSD', proportional_votes_qtn: 65000 },
    { uf: 'MA', parlamentar_front: 'Partido Socialista de Haagar', parl_front_legend: 'PSH', proportional_votes_qtn: 30000 },
    { uf: 'MA', parlamentar_front: 'Nacionalistas', parl_front_legend: 'NAC', proportional_votes_qtn: 10000 },
    { uf: 'TP', parlamentar_front: 'Frente de Todos', parl_front_legend: 'TDS', proportional_votes_qtn: 50000 },
    { uf: 'TP', parlamentar_front: 'Unidos por Haagar', parl_front_legend: 'UNI', proportional_votes_qtn: 45000 },
    { uf: 'TP', parlamentar_front: 'Frente Conservadora', parl_front_legend: 'CON', proportional_votes_qtn: 20000 },
  ].map(v => ({...v, proportional_votes_qtn: parseNumber(v.proportional_votes_qtn)})); // Garante que votos são números

  // Mock Candidate Votes ALINHADO com seus tipos
  const mockCandidateVotes: CandidateVote[] = [
    { district_id: 201, candidate_name: 'Beltrano de Tal (MA)', parl_front_legend: 'UNI', votes_qtn: 15000, party_legend: 'PDEA', candidate_status: "Eleito", candidate_photo:"photo.jpg" },
    { district_id: 201, candidate_name: 'Ciclana Silva (MA)', parl_front_legend: 'TDS', votes_qtn: 12000, party_legend: 'PECO', candidate_status: "Não Eleito", candidate_photo:"photo.jpg" },
    { district_id: 202, candidate_name: 'Fulano Oliveira (MA)', parl_front_legend: 'CON', votes_qtn: 18000, party_legend: 'PCON', candidate_status: "Eleito", candidate_photo:"photo.jpg" },
    { district_id: 101, candidate_name: 'João Neves (TP)', parl_front_legend: 'TDS', votes_qtn: 9000, party_legend: 'AE', candidate_status: "Eleito", candidate_photo:"photo.jpg" },
    { district_id: 101, candidate_name: 'Maria Souza (TP)', parl_front_legend: 'UNI', votes_qtn: 8500, party_legend: 'LIVRE', candidate_status: "Não Eleito", candidate_photo:"photo.jpg" },
  ].map(v => ({...v, votes_qtn: parseNumber(v.votes_qtn), district_id: parseNumber(v.district_id)})); // Garante números

  return {
    time: exampleTime,
    candidateVotes: mockCandidateVotes,
    proportionalVotes: uf_param ? mockProportionalVotes.filter(v => v.uf === uf_param.toUpperCase()) : mockProportionalVotes,
  };
}


interface StatePageProps {
  params: {
    uf: string; // ex: "MA", "TP" (vem da URL)
  };
   searchParams?: { // Para ler query params como ?time=100
    time?: string;
  };
}

export default function StatePage({ params, searchParams }: StatePageProps) {
  const stateId = params.uf.toUpperCase();
  const timeFromQuery = searchParams?.time ? parseInt(searchParams.time, 10) : 100;
  // Estado para o tempo, pode ser controlado por query param ou um seletor na página
  const [currentTime, setCurrentTime] = useState<number>(timeFromQuery || 100);
  const [pageData, setPageData] = useState<ApiVotesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validar UF e buscar dados de configuração do estado
  const stateInfo = useMemo(() => districtsData.find(d => d.uf === stateId), [stateId]);
  const totalPRSeatsForThisState = totalProportionalSeatsByState[stateId];

  useEffect(() => {
    if (!stateInfo || totalPRSeatsForThisState === undefined) {
      // Chamar notFound() aqui pode ser problemático em client components se chamado condicionalmente no topo.
      // É melhor tratar no return ou antes de chamar o fetch.
      // notFound(); // Se UF inválido ou não configurado
      setError("Estado não encontrado ou mal configurado.");
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Em um app real, você faria fetch da sua API real aqui, ex:
        // const response = await fetch(`/api/results?time=${currentTime}`);
        // const data = await response.json();
        // setPageData(data);
        const data = await getVoteData(stateId, currentTime); // Usando mock ajustado
        setPageData(data);
      } catch (e) {
        console.error("Erro ao carregar dados do estado:", e);
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [stateId, currentTime, stateInfo, totalPRSeatsForThisState]);


  // --- Cálculos baseados nos dados carregados ---
  const proportionalVotesInput = useMemo((): ProportionalVotesInput[] => {
    if (!pageData?.proportionalVotes) return [];
    // Filtra novamente para o estado (se getVoteData não filtrou) e mapeia
    return pageData.proportionalVotes
      .filter(vote => vote.uf === stateId && vote.parl_front_legend) // Garante que parl_front_legend existe
      .map(vote => ({
        legend: vote.parl_front_legend!, // '!' porque filtramos acima
        votes: parseNumber(vote.proportional_votes_qtn),
      }));
  }, [pageData?.proportionalVotes, stateId]);

  const proportionalSeatsByFront = useMemo(() => {
    if (!totalPRSeatsForThisState || proportionalVotesInput.length === 0) return {};
    return calculateProportionalSeats(
      proportionalVotesInput,
      totalPRSeatsForThisState,
      5 // Cláusula de barreira de 5%
    );
  }, [proportionalVotesInput, totalPRSeatsForThisState]);

  const candidateVotesInState = useMemo(() => {
    if (!pageData?.candidateVotes) return [];
    const districtIdsInThisState = districtsData
        .filter(d => d.uf === stateId)
        .map(d => d.district_id);
    return pageData.candidateVotes.filter(vote =>
        districtIdsInThisState.includes(parseNumber(vote.district_id))
    );
  }, [pageData?.candidateVotes, stateId]);

  const districtSeatsByFront: Record<string, number> = useMemo(() => {
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
        if (winner.parl_front_legend) { // Checa se a legenda do vencedor existe
          counts[winner.parl_front_legend] = (counts[winner.parl_front_legend] || 0) + 1;
        }
      }
    });
    return counts;
  }, [candidateVotesInState]);

  const districtResultsForTicker: TickerEntry[] = useMemo(() => {
    if (!candidateVotesInState || !districtsData) return [];
    const tickerEntries: TickerEntry[] = [];
    const districtsInThisState = districtsData.filter(d => d.uf === stateId);

    districtsInThisState.forEach(district => {
      const votesInDistrict = candidateVotesInState.filter(
        vote => parseNumber(vote.district_id) === district.district_id
      );

      if (votesInDistrict.length > 0) {
        const votesWithCalc = votesInDistrict.map(v => ({ ...v, numericVotes: parseNumber(v.votes_qtn) }));
        const totalVotes = votesWithCalc.reduce((sum, current) => sum + current.numericVotes, 0);
        const votesProcessed = votesWithCalc.map(v => ({
            ...v,
            percentage: totalVotes > 0 ? ((v.numericVotes / totalVotes) * 100) : 0,
        })).sort((a, b) => b.numericVotes - a.numericVotes);

        tickerEntries.push({
          districtId: district.district_id,
          districtName: district.district_name,
          stateId: district.uf,
          stateName: district.uf_name,
          winnerName: votesProcessed[0]?.candidate_name || null,
          winnerLegend: votesProcessed[0]?.parl_front_legend || null,
          winnerPercentage: votesProcessed[0]?.percentage ?? null,
          runnerUpName: votesProcessed[1]?.candidate_name || null,
          runnerUpLegend: votesProcessed[1]?.parl_front_legend || null,
          runnerUpPercentage: votesProcessed[1]?.percentage ?? null,
        });
      } else {
        // Adiciona entrada mesmo sem votos para o ticker mostrar o distrito
         tickerEntries.push({
          districtId: district.district_id,
          districtName: district.district_name,
          stateId: district.uf,
          stateName: district.uf_name,
          winnerName: null, winnerLegend: null, winnerPercentage: null,
          runnerUpName: null, runnerUpLegend: null, runnerUpPercentage: null,
        });
      }
    });
    return tickerEntries.sort((a,b) => a.districtId - b.districtId);
  }, [candidateVotesInState, stateId]);


  const totalSeatsByFront: Record<string, number> = useMemo(() => {
    const combined: Record<string, number> = {};
    const allFronts = new Set([
      ...Object.keys(districtSeatsByFront).filter(f => f && f !== "null" && f !== "undefined"), // Filtra null/undefined strings
      ...Object.keys(proportionalSeatsByFront).filter(f => f && f !== "null" && f !== "undefined"),
    ]);

    allFronts.forEach((front) => {
      if(front) { // Checagem extra
         combined[front] = (districtSeatsByFront[front] || 0) + (proportionalSeatsByFront[front] || 0);
      }
    });
    return combined;
  }, [districtSeatsByFront, proportionalSeatsByFront]);

  // Validações e Loading
  if (!stateInfo || totalPRSeatsForThisState === undefined) {
    // Em vez de notFound(), que só funciona em Server Components puros ou build time,
    // retornamos uma mensagem de erro ou redirecionamos.
    return <div className="container mx-auto p-6 text-center text-red-500">Estado ({stateId}) não encontrado ou mal configurado. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  if (isLoading) {
    return <div className="container mx-auto p-6 text-center text-gray-500">Carregando dados para {stateInfo.uf_name}...</div>;
  }
  if (error) {
    return <div className="container mx-auto p-6 text-center text-red-500">Erro ao carregar dados: {error}. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  if (!pageData) {
    return <div className="container mx-auto p-6 text-center text-gray-500">Dados não disponíveis para {stateInfo.uf_name}. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }

  const stateName = stateInfo.uf_name;
  const totalDistrictSeatsInState = districtsData.filter(d => d.uf === stateId).length;
  const totalSeatsInStateChamber = totalDistrictSeatsInState + totalPRSeatsForThisState;
  const majorityThresholdStateChamber = Math.floor(totalSeatsInStateChamber / 2) + 1;
  const majorityThresholdPR = Math.floor(totalPRSeatsForThisState / 2) + 1;


  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-8">
       <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Voltar para Visão Nacional</Link>
      <header className="text-center">
        <h1 className="text-4xl font-bold text-gray-800">
          {stateName} ({stateId})
        </h1>
        <p className="text-xl text-gray-600">Resultados Eleitorais Estaduais - {pageData.time}%</p>
      </header>

      {/* Seção de Composição Total da Câmara Estadual */}
      <section>
        <h2 className="text-2xl font-semibold mb-1 text-gray-700">Composição da Câmara Estadual</h2>
        <p className="text-sm text-gray-500 mb-3">
          Total de Assentos: {totalSeatsInStateChamber} (Distritais: {totalDistrictSeatsInState}, Proporcionais: {totalPRSeatsForThisState})
          {' | '}Maioria: {majorityThresholdStateChamber}
        </p>
        <SeatCompositionPanel
          seatData={totalSeatsByFront}
          colorMap={coalitionColorMap}
          totalSeats={totalSeatsInStateChamber}
        />
      </section>

      {/* Seção de Alocação de Assentos Proporcionais */}
      {totalPRSeatsForThisState > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-gray-700">Detalhes da Alocação Proporcional</h2>
          <ProportionalSeatAllocation
            allocatedSeats={proportionalSeatsByFront}
            colorMap={coalitionColorMap}
            stateName={stateName}
            totalSeatsInState={totalPRSeatsForThisState}
            majorityThreshold={majorityThresholdPR}
            rawVotes={proportionalVotesInput}
          />
        </section>
      )}

      {/* Seção de Resultados dos Distritos no Estado */}
      <section>
        <h2 className="text-2xl font-semibold mb-3 text-gray-700">Resultados Distritais em {stateName}</h2>
        {districtResultsForTicker.length > 0 ? (
          <RaceTicker data={districtResultsForTicker} colorMap={coalitionColorMap} />
        ) : (
          <p className="text-gray-600">Não há distritos com resultados para este estado ou não há distritos configurados.</p>
        )}
      </section>
    </div>
  );
}