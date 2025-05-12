// app/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation'; // Importar para navegação

// Componentes de Visualização da Home
import InteractiveMap from '../components/InteractiveMap';
import SeatCompositionPanel from '../components/SeatCompositionPanel';
// Componentes de detalhe não são mais renderizados aqui, mas podem ser importados se tipos forem necessários
// import CandidateDisplay from '../components/CandidateDisplay';
// import DistrictBarChart from '../components/DistrictBarChart';
// import ProportionalPieChart from '../components/ProportionalPieChart';
import RaceTicker from '../components/RaceTicker';

// Tipos e Dados Estáticos (Ajuste caminho)
// Importa todos os tipos necessários, incluindo os que são calculados aqui mas usados em outros lugares
import { CandidateVote, ProportionalVote, DistrictInfoFromData, PartyInfo, StateOption, DistrictOption, DistrictResultInfo, TickerEntry } from '../types/election';
import { districtsData, partyData } from '../lib/staticData';

// --- IMPORTAR LÓGICA DE CÁLCULO E DADOS DE CONFIGURAÇÃO PR ---
import { calculateProportionalSeats, ProportionalVotesInput } from '../lib/electionCalculations';

const totalProportionalSeatsByState: Record<string, number> = {
  "TP": 1,
  "MA": 40,
  "MP": 23,
  "BA": 16,
  "PB": 9,
  "PN": 4
};

// Interface para os dados de VOTOS vindos da API
interface ApiVotesData {
  time: number;
  candidateVotes: CandidateVote[];
  proportionalVotes: ProportionalVote[];
}

// Helper parseNumber
const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedStr = value.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

// --- COMPONENTE PRINCIPAL DA HOME (SIMPLIFICADO) ---
export default function Home() {
  // --- Estados NECESSÁRIOS para a Home ---
  const [currentTime, setCurrentTime] = useState<number>(100); // Ajuste padrão se desejar
  const [apiVotesData, setApiVotesData] = useState<ApiVotesData | null>(null);
  const [isLoadingVotes, setIsLoadingVotes] = useState<boolean>(true);
  const [errorVotes, setErrorVotes] = useState<string | null>(null);
  // Mantém seleção para dropdowns E para navegação via clique no mapa
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [hoveredDistrictInfo, setHoveredDistrictInfo] = useState<string | null>(null);
  // REMOVIDO: districtViewMode

  const handleNavigate = () => {
    if (selectedDistrict && selectedState) { // Se AMBOS estão selecionados, vai para o distrito
      console.log("Navegando para Distrito via botão:", selectedDistrict, "com tempo:", currentTime);
      router.push(`/distrito/${selectedDistrict}?time=${currentTime}`);
    } else if (selectedState) { // Se SÓ o estado está selecionado, vai para o estado
      console.log("Navegando para Estado via botão:", selectedState, "com tempo:", currentTime);
      // Garante que o UF vai em minúsculas para a URL da página de estado
      router.push(`/estado/${selectedState.toLowerCase()}?time=${currentTime}`);
    }
    // Se nada estiver selecionado, o botão estará desabilitado, então não faz nada aqui
  };

  const router = useRouter(); // Hook para navegação

  // --- Busca de Dados de Votos ---
  useEffect(() => {
    const fetchVoteData = async () => {
        setIsLoadingVotes(true); setErrorVotes(null);
        try {
            const response = await fetch(`/api/results?time=${currentTime}`);
            if (!response.ok) {
                 let errorMsg = 'Erro ao buscar votos';
                 try { errorMsg = (await response.json()).error || errorMsg; } catch (e) {}
                 throw new Error(errorMsg);
            }
            const data: ApiVotesData = await response.json(); setApiVotesData(data);
        } catch (err: unknown) { console.error("Falha API Votos:", err); setErrorVotes(err instanceof Error ? err.message : 'Erro desconhecido'); setApiVotesData(null);
        } finally { setIsLoadingVotes(false); }
    };
    fetchVoteData();
  }, [currentTime]);

  // --- Cálculos Derivados (useMemo) ---

  // Estados (para dropdown)
  const states: StateOption[] = useMemo(() => {
    const uniqueStates = new Map<string, string>();
    districtsData.forEach(district => {
      if (district.uf && district.uf_name) { uniqueStates.set(district.uf, district.uf_name); }
    });
    return Array.from(uniqueStates, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Distritos (para dropdown)
  const districts: DistrictOption[] = useMemo(() => {
    if (!selectedState) return [];
    return districtsData
      .filter(district => district.uf === selectedState)
      .map(district => ({ id: district.district_id, name: district.district_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedState]);

  // Mapa de Cores (para mapa, painel, ticker)
  const coalitionColorMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    partyData.forEach(party => {
      if (party.parl_front_legend && party.parl_front_color && !map[party.parl_front_legend]) {
        map[party.parl_front_legend] = party.parl_front_color;
      }
    });
    return map;
  }, []);

  // Sumário de Resultados por Distrito (para o mapa)
  const districtResultsSummary: Record<string, DistrictResultInfo> = useMemo(() => {
    const summary: Record<string, DistrictResultInfo> = {};
    if (!apiVotesData?.candidateVotes || !districtsData) { return summary; }
    const votesByDistrict: Record<string, CandidateVote[]> = {};
    apiVotesData.candidateVotes.forEach((vote: CandidateVote) => { const districtIdStr = String(vote.district_id); if (!districtIdStr) return; if (!votesByDistrict[districtIdStr]) { votesByDistrict[districtIdStr] = []; } if (vote.candidate_name && vote.votes_qtn !== undefined && vote.votes_qtn !== null) { votesByDistrict[districtIdStr].push(vote); } });
    Object.keys(votesByDistrict).forEach(districtIdStr => { const votes = votesByDistrict[districtIdStr]; if (!votes || votes.length === 0) return; const winner = votes.reduce((cw: CandidateVote | null, cv: CandidateVote) => { const cvNum = parseNumber(cv.votes_qtn); if(cw === null) return cv; const cwNum = parseNumber(cw.votes_qtn); return cvNum > cwNum ? cv : cw; }, null); const districtInfo = districtsData.find(d => String(d.district_id) === districtIdStr); const maxVotes = winner ? parseNumber(winner.votes_qtn) : 0; if (winner) { summary[districtIdStr] = { winnerLegend: winner.parl_front_legend ?? null, winnerName: winner.candidate_name, districtName: districtInfo?.district_name || `Distrito ${districtIdStr}`, maxVotes: maxVotes, }; } else { summary[districtIdStr] = { winnerLegend: null, winnerName: undefined, districtName: districtInfo?.district_name || `Distrito ${districtIdStr}`, maxVotes: 0, }; } });
    districtsData.forEach(d => { const districtIdStr = String(d.district_id); if (!summary[districtIdStr]) { summary[districtIdStr] = { winnerLegend: null, districtName: d.district_name, maxVotes: 0, } } });
    return summary;
  }, [apiVotesData?.candidateVotes]);

  // Calcular Assentos Distritais por Frente (para painel)
  const districtSeatsByCoalition = useMemo(() => {
    const seatCounts: Record<string, number> = {};
    if (!districtResultsSummary) return seatCounts;
    Object.values(districtResultsSummary).forEach(result => { if (result.winnerLegend) { seatCounts[result.winnerLegend] = (seatCounts[result.winnerLegend] || 0) + 1; } });
    return seatCounts;
  }, [districtResultsSummary]);

// --- NOVO: useMemo para calcular ASSENTOS PROPORCIONAIS NACIONAIS por frente ---
const nationalProportionalSeatsByCoalition = useMemo(() => {
  const nationalPRCounts: Record<string, number> = {};
  if (!apiVotesData?.proportionalVotes) {
    // Adiciona log se os dados de votos proporcionais não estiverem disponíveis
    // console.log("Cálculo PR: apiVotesData.proportionalVotes não disponível.");
    return nationalPRCounts;
  }

  // Itera sobre cada estado que tem assentos proporcionais definidos
  Object.keys(totalProportionalSeatsByState).forEach(uf => {
    const seatsForThisState = totalProportionalSeatsByState[uf];
    if (seatsForThisState === 0) return; // Pula se o estado não tem assentos PR

    // Filtra os votos proporcionais apenas para o estado atual
    const votesInThisState = apiVotesData.proportionalVotes.filter(vote => vote.uf === uf);
    if (votesInThisState.length === 0 && seatsForThisState > 0) {
        // console.log(`Cálculo PR: Sem votos proporcionais para ${uf}, mas ${seatsForThisState} assentos definidos.`);
    }

    // Prepara os dados de entrada para a função de cálculo
    const proportionalVotesInputForState: ProportionalVotesInput[] = votesInThisState
      .filter(vote => vote.parl_front_legend) // Garante que a legenda existe
      .map(vote => ({
        legend: vote.parl_front_legend!, // Sabemos que existe por causa do filtro
        votes: parseNumber(vote.proportional_votes_qtn)
      }));

    if (proportionalVotesInputForState.length === 0 && seatsForThisState > 0) {
        // console.log(`Cálculo PR: Input para cálculo proporcional vazio para ${uf} após filtro/map.`);
        // return; // Considerar se deve pular ou calcular com array vazio (D'Hondt deve retornar {})
    }

    // Calcula os assentos proporcionais para este estado
    const prSeatsThisState = calculateProportionalSeats(
      proportionalVotesInputForState,
      seatsForThisState,
      5 // Cláusula de barreira de 5%
    );

    // Soma os assentos ao total nacional de cada frente
    Object.entries(prSeatsThisState).forEach(([legend, seats]) => {
      nationalPRCounts[legend] = (nationalPRCounts[legend] || 0) + seats;
    });
  });
  // console.log("Assentos Proporcionais Nacionais Calculados:", nationalPRCounts);
  return nationalPRCounts;
}, [apiVotesData?.proportionalVotes]); // Depende apenas dos votos proporcionais
// --------------------------------------------------------------------------

// --- NOVO: useMemo para COMBINAR assentos distritais e proporcionais ---
const finalNationalSeatComposition = useMemo(() => {
  const combinedSeats: Record<string, number> = {};
  // Garante que os dois objetos de contagem existam antes de tentar combiná-los
  if (!districtSeatsByCoalition || !nationalProportionalSeatsByCoalition) return combinedSeats;

  const allFronts = new Set<string>([
    ...Object.keys(districtSeatsByCoalition),
    ...Object.keys(nationalProportionalSeatsByCoalition)
  ]);

  allFronts.forEach(front => {
    // Checa se 'front' é uma string válida antes de usar como chave
    if (typeof front === 'string' && front.trim() !== "" && front !== "null" && front !== "undefined") {
      combinedSeats[front] =
        (districtSeatsByCoalition[front] || 0) +
        (nationalProportionalSeatsByCoalition[front] || 0);
    }
  });
  // console.log("Composição Final Nacional:", combinedSeats);
  return combinedSeats;
}, [districtSeatsByCoalition, nationalProportionalSeatsByCoalition]);
// --------------------------------------------------------------------

// --- NOVO: useMemo para o TOTAL GERAL de assentos na câmara ---
const grandTotalSeats = useMemo(() => {
  const totalDistrict = districtsData.length; 
  const totalProportional = Object.values(totalProportionalSeatsByState)
    .reduce((sum: number, seats: number) => sum + seats, 0); // Tipos explícitos
  return totalDistrict + totalProportional;
}, []); // Depende apenas de dados estáticos
// ----------------------------------------------------------------
  // Calcular Dados para o Ticker
  const tickerData: TickerEntry[] = useMemo(() => {
    const dataForTicker: TickerEntry[] = [];
    if (!apiVotesData?.candidateVotes || !districtsData) { return dataForTicker; }
    const votesByDistrict: Record<string, CandidateVote[]> = {};
    apiVotesData.candidateVotes.forEach((vote: CandidateVote) => { const districtIdStr = String(vote.district_id); if (!districtIdStr || !vote.candidate_name || vote.votes_qtn === undefined || vote.votes_qtn === null) return; if (!votesByDistrict[districtIdStr]) { votesByDistrict[districtIdStr] = []; } votesByDistrict[districtIdStr].push(vote); });
    Object.keys(votesByDistrict).forEach(districtIdStr => { const votes = votesByDistrict[districtIdStr]; if (!votes || votes.length === 0) return; const votesWithCalc = votes.map(v => ({ ...v, numericVotes: parseNumber(v.votes_qtn) })); const totalVotes = votesWithCalc.reduce((sum: number, current: { numericVotes: number }) => sum + current.numericVotes, 0); const votesProcessed = votesWithCalc.map(v => ({ ...v, percentage: totalVotes > 0 ? ((v.numericVotes / totalVotes) * 100) : 0, })).sort((a, b) => b.numericVotes - a.numericVotes); const districtNum = parseInt(districtIdStr, 10); const districtInfo = districtsData.find(d => d.district_id === districtNum); if (!districtInfo) return; const entry: TickerEntry = { districtId: districtNum, districtName: districtInfo.district_name, stateId: districtInfo.uf, stateName: districtInfo.uf_name, winnerName: votesProcessed[0]?.candidate_name || null, winnerLegend: votesProcessed[0]?.parl_front_legend || null, winnerPercentage: votesProcessed[0]?.percentage ?? null, runnerUpLegend: votesProcessed[1]?.parl_front_legend || null, runnerUpPercentage: votesProcessed[1]?.percentage ?? null, runnerUpName: votesProcessed[1]?.candidate_name || null, }; dataForTicker.push(entry); });
    dataForTicker.sort((a, b) => a.districtId - b.districtId);
    return dataForTicker;
  }, [apiVotesData?.candidateVotes]);

  // REMOVIDO: useMemo para filteredCandidateVotes
  // REMOVIDO: useMemo para filteredProportionalVotes
  // REMOVIDO: useMemo para districtResults
  // REMOVIDO: useMemo para selectedDistrictName

  // --- Handlers ---
  // Mantém handlers dos dropdowns, eles ainda controlam o estado localmente
  const handleStateChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const newState = event.target.value; setSelectedState(newState || null); setSelectedDistrict(null); /* REMOVIDO: setDistrictViewMode */ };
  const handleDistrictChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const newDistrictId = event.target.value ? parseInt(event.target.value, 10) : null; setSelectedDistrict(newDistrictId); /* REMOVIDO: setDistrictViewMode */};
  // Mantém handler de hover do mapa
  const handleDistrictHover = (districtInfo: DistrictResultInfo | null, districtId: string | null) => { if (districtInfo && districtId) { setHoveredDistrictInfo( `Distrito: ${districtInfo.districtName || districtId} | Vencedor: ${districtInfo.winnerName || 'N/A'} (${districtInfo.winnerLegend || 'N/D'})` ); } else { setHoveredDistrictInfo(null); } };
  // Modifica handler de clique do mapa para NAVEGAR
  const handleDistrictClick = (districtInfo: DistrictResultInfo | null, districtId: string) => {
    if (districtId) {
      console.log("Navegando para Distrito:", districtId);
      router.push(`/distrito/${districtId}`); // <-- NAVEGA
    }
  };

  // --- Renderização ---
  return (
    <div>
      <Head>
        <title>Smartv - Eleições 2022</title>
        <meta name="description" content="Visão geral da apuração eleitoral Haagar" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Mantém a estrutura principal e ordem do seu código original */}
      <main className="container mx-auto p-4 lg:p-6 space-y-8">

         {/* 1. Mapa Interativo */}
        <div className="relative"> {/* Mantido wrapper relativo para tooltip */}
         <InteractiveMap
             results={districtResultsSummary}
             colorMap={coalitionColorMap}
             onDistrictHover={handleDistrictHover}
             onDistrictClick={handleDistrictClick} // Click navega
         />
         {hoveredDistrictInfo && ( <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white p-2 rounded text-xs shadow-lg pointer-events-none z-10">{hoveredDistrictInfo}</div> )}
        </div>

        {/* 2. Painel de Composição */}
        <div> {/* Mantido wrapper simples */}
             <SeatCompositionPanel
                 seatData={finalNationalSeatComposition}
                 colorMap={coalitionColorMap}
                 totalSeats={grandTotalSeats}
             />
        </div>

        {/* 3. Ticker */}
        {(tickerData.length > 0 && !isLoadingVotes) && (
            <RaceTicker data={tickerData} colorMap={coalitionColorMap} interval={8000} />
        )}

          {/* Seletores Geográficos ATUALIZADOS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-4 p-4 bg-white rounded-lg shadow-md border border-gray-200">
          {/* Dropdown de Estado (como antes) */}
          <div className="flex items-center gap-2">
            <label htmlFor="state-select" className="font-medium text-gray-700">Estado:</label>
            <select id="state-select" value={selectedState ?? ''} onChange={handleStateChange} className="rounded border-gray-300 shadow-sm">
              <option value="">-- Selecione UF --</option>
              {states.map(state => ( <option key={state.id} value={state.id}>{state.name} ({state.id})</option> ))}
            </select>
          </div>

          {/* Dropdown de Distrito (como antes) */}
          <div className="flex items-center gap-2">
            <label htmlFor="district-select" className="font-medium text-gray-700">Distrito:</label>
            <select 
              id="district-select" 
              value={selectedDistrict ?? ''} 
              onChange={handleDistrictChange} 
              disabled={!selectedState || isLoadingVotes} 
              className="rounded border-gray-300 shadow-sm disabled:opacity-50"
            >
              <option value="">-- Selecione Distrito --</option>
              {districts.map(district => ( <option key={district.id} value={district.id}>{district.name} ({district.id})</option> ))}
            </select>
          </div>

          {/* --- NOVO BOTÃO NAVEGAR --- */}
          <div className="ml-0 sm:ml-4 mt-2 sm:mt-0"> {/* Margem para espaçamento */}
            <button
              onClick={handleNavigate}
              disabled={!selectedState || isLoadingVotes} // Desabilitado se nenhum estado selecionado ou se estiver carregando
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Navegar
            </button>
          </div>
        </div>

      </main>

       {/* 6. Controles de Tempo (Mantido no final, conforme seu código original) */}
       {/* Garantir que não haja duplicatas; este é o único bloco de controle de tempo */}
       <div className="text-center p-4 bg-white rounded-lg shadow-md border border-gray-200 container mx-auto mb-6"> {/* Adicionado container e margem */}
          <h3 className="text-lg font-medium mb-2 text-gray-700">Ver Apuração em:</h3>
          <div className="inline-flex rounded-md shadow-sm" role="group">
              <button onClick={() => setCurrentTime(50)} disabled={isLoadingVotes} className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${currentTime === 50 ? 'bg-highlight text-white border-highlight' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100'} disabled:opacity-50 transition-colors`}>50%</button>
              <button onClick={() => setCurrentTime(100)} disabled={isLoadingVotes} className={`px-4 py-2 text-sm font-medium rounded-r-lg border border-l-0 ${currentTime === 100 ? 'bg-highlight text-white border-highlight' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100'} disabled:opacity-50 transition-colors`}>100%</button>
          </div>
          {isLoadingVotes && <p className="text-sm text-gray-500 mt-2 animate-pulse">Carregando resultados ({currentTime}%)...</p>}
          {errorVotes && <p className="text-sm text-red-600 mt-2">Erro: {errorVotes}</p>}
        </div>
    </div>
  );
}