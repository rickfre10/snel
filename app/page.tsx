// app/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';

// Componentes de Visualização
import InteractiveMap from '../components/InteractiveMap';
import SeatCompositionPanel from '../components/SeatCompositionPanel';
import CandidateDisplay from '../components/CandidateDisplay';
import DistrictBarChart from '../components/DistrictBarChart';
import ProportionalPieChart from '../components/ProportionalPieChart';
import RaceTicker from '../components/RaceTicker';
import { TickerEntry } from '../components/RaceTicker';


// Tipos e Dados Estáticos (Ajuste caminho se necessário, ex: @/types/election)
import { CandidateVote, ProportionalVote, DistrictInfoFromData, PartyInfo, StateOption, DistrictOption, DistrictResultInfo } from '../types/election';
import { districtsData, partyData } from '../lib/staticData'; // Ajuste caminho se necessário

// --- Definição do Tipo para a View do Distrito ---
type DistrictViewMode = 'candidates' | 'bars' | 'proportional';
// --------------------------------------------------

// Interface para os dados de VOTOS vindos da API
interface ApiVotesData {
  time: number;
  candidateVotes: CandidateVote[];
  proportionalVotes: ProportionalVote[];
}

// Helper parseNumber (Definido aqui ou importado de utils)
const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Remove pontos de milhar e substitui vírgula decimal por ponto
        const cleanedStr = value.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    }
    return 0;
  };

// --- COMPONENTE PRINCIPAL ---
export default function Home() {
  // --- Estados ---
  const [currentTime, setCurrentTime] = useState<number>(50);
  const [apiVotesData, setApiVotesData] = useState<ApiVotesData | null>(null);
  const [isLoadingVotes, setIsLoadingVotes] = useState<boolean>(true);
  const [errorVotes, setErrorVotes] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [hoveredDistrictInfo, setHoveredDistrictInfo] = useState<string | null>(null);
  // Estado para controlar a visão do detalhe do distrito
  const [districtViewMode, setDistrictViewMode] = useState<DistrictViewMode>('candidates');

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

  // Estados (dos dados estáticos)
  const states: StateOption[] = useMemo(() => {
    const uniqueStates = new Map<string, string>();
    districtsData.forEach(district => {
      if (district.uf && district.uf_name) { uniqueStates.set(district.uf, district.uf_name); }
    });
    return Array.from(uniqueStates, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, []); // Dependência vazia

  // Distritos (filtrados pelos dados estáticos)
  const districts: DistrictOption[] = useMemo(() => {
    if (!selectedState) return [];
    return districtsData
      .filter(district => district.uf === selectedState)
      .map(district => ({ id: district.district_id, name: district.district_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedState]);

  // Mapa de Cores (dos dados estáticos)
  const coalitionColorMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    partyData.forEach(party => {
      if (party.parl_front_legend && party.parl_front_color && !map[party.parl_front_legend]) {
        map[party.parl_front_legend] = party.parl_front_color;
      }
    });
    return map;
  }, []);

  // Sumário de Resultados por Distrito (para o mapa) - Usando Reduce
  const districtResultsSummary: Record<string, DistrictResultInfo> = useMemo(() => {
        const summary: Record<string, DistrictResultInfo> = {};
        if (!apiVotesData?.candidateVotes || !districtsData) { return summary; }

        const votesByDistrict: Record<string, CandidateVote[]> = {};
        apiVotesData.candidateVotes.forEach((vote: CandidateVote) => {
            const districtIdStr = String(vote.district_id);
            if (!districtIdStr) return;
            if (!votesByDistrict[districtIdStr]) { votesByDistrict[districtIdStr] = []; }
            if (vote.candidate_name && vote.votes_qtn !== undefined && vote.votes_qtn !== null) {
                votesByDistrict[districtIdStr].push(vote);
            }
        });

        Object.keys(votesByDistrict).forEach(districtIdStr => {
            const votes = votesByDistrict[districtIdStr];
            if (!votes || votes.length === 0) return;

            const winner = votes.reduce((currentWinner: CandidateVote | null, currentVote: CandidateVote) => {
                const currentVotesNum = parseNumber(currentVote.votes_qtn);
                if (currentWinner === null) { return currentVote; }
                const winnerVotesNum = parseNumber(currentWinner.votes_qtn);
                return currentVotesNum > winnerVotesNum ? currentVote : currentWinner;
            }, null);

            const districtInfo = districtsData.find(d => String(d.district_id) === districtIdStr);
            const maxVotes = winner ? parseNumber(winner.votes_qtn) : 0;

            if (winner) {
                summary[districtIdStr] = {
                    winnerLegend: winner.parl_front_legend ?? null,
                    winnerName: winner.candidate_name,
                    districtName: districtInfo?.district_name || `Distrito ${districtIdStr}`,
                    maxVotes: maxVotes,
                };
            } else {
                 summary[districtIdStr] = { winnerLegend: null, winnerName: undefined, districtName: districtInfo?.district_name || `Distrito ${districtIdStr}`, maxVotes: 0, };
            }
        });

         districtsData.forEach(d => {
             const districtIdStr = String(d.district_id);
             if (!summary[districtIdStr]) { summary[districtIdStr] = { winnerLegend: null, districtName: d.district_name, maxVotes: 0, } }
         });
        return summary;
    }, [apiVotesData?.candidateVotes]); // Apenas votos como dependência dinâmica

  // Calcular Assentos Distritais por Frente
  const districtSeatsByCoalition = useMemo(() => {
    const seatCounts: Record<string, number> = {};
    if (!districtResultsSummary) return seatCounts;
    Object.values(districtResultsSummary).forEach(result => {
      if (result.winnerLegend) {
        seatCounts[result.winnerLegend] = (seatCounts[result.winnerLegend] || 0) + 1;
      }
    });
    return seatCounts;
  }, [districtResultsSummary]);

  // Votos de candidatos filtrados para o distrito selecionado
  const filteredCandidateVotes = useMemo(() => {
    if (!apiVotesData?.candidateVotes || !selectedDistrict) return [];
    return apiVotesData.candidateVotes.filter(vote => parseInt(String(vote.district_id), 10) === selectedDistrict );
  }, [apiVotesData?.candidateVotes, selectedDistrict]);

  // Votos proporcionais filtrados para o estado selecionado
  const filteredProportionalVotes = useMemo(() => {
      if (!apiVotesData?.proportionalVotes || !selectedState) return [];
      return apiVotesData.proportionalVotes.filter(vote => vote.uf === selectedState);
  }, [apiVotesData?.proportionalVotes, selectedState]);

  // Resultados calculados (com %) para o display de candidato
  const districtResults = useMemo(() => {
        if (!filteredCandidateVotes || filteredCandidateVotes.length === 0) { return { votes: [], totalVotes: 0, leadingCandidateId: null }; }
        const votesWithNumeric = filteredCandidateVotes.map((v: CandidateVote) => ({...v, numericVotes: parseNumber(v.votes_qtn)}));
        const totalVotes = votesWithNumeric.reduce((sum: number, current: { numericVotes: number }) => sum + current.numericVotes, 0);
        let leadingCandidateId: string | number | null = null; let maxVotes = -1;
        const votesWithPercentage = votesWithNumeric.map(vote => {
            // Corrigido para usar candidate_name consistentemente
            if (vote.numericVotes > maxVotes) { maxVotes = vote.numericVotes; leadingCandidateId = vote.candidate_name; }
            return { ...vote, percentage: totalVotes > 0 ? ((vote.numericVotes / totalVotes) * 100) : 0, }
        });
        // Tipagem explícita do retorno para ajudar o TS
        return { votes: votesWithPercentage as (CandidateVote & { numericVotes: number, percentage: number })[], totalVotes, leadingCandidateId };
    }, [filteredCandidateVotes]);

    // Calcula nome do distrito selecionado ANTES do return
    const selectedDistrictName = useMemo(() => {
        if (!selectedDistrict) return null;
        // Usa 'districts' que já está calculado e memoizado
        return districts.find(d => d.id === selectedDistrict)?.name || `ID ${selectedDistrict}`;
    }, [selectedDistrict, districts]);

  // --- Handlers ---
  const handleStateChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const newState = event.target.value; setSelectedState(newState || null); setSelectedDistrict(null); setDistrictViewMode('candidates'); };
  const handleDistrictChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const newDistrictId = event.target.value ? parseInt(event.target.value, 10) : null; setSelectedDistrict(newDistrictId); setDistrictViewMode('candidates');};
  const handleDistrictHover = (districtInfo: DistrictResultInfo | null, districtId: string | null) => { if (districtInfo && districtId) { setHoveredDistrictInfo( `Distrito: ${districtInfo.districtName || districtId} | Vencedor: ${districtInfo.winnerName || 'N/A'} (${districtInfo.winnerLegend || 'N/D'})` ); } else { setHoveredDistrictInfo(null); } };
  const handleDistrictClick = (districtInfo: DistrictResultInfo | null, districtId: string) => { if (districtId) { console.log("Clicou Distrito:", districtId, districtInfo); const districtNum = parseInt(districtId, 10); if (!isNaN(districtNum)) { const distData = districtsData.find(d => d.district_id === districtNum); if (distData) { setSelectedState(distData.uf); setTimeout(() => setSelectedDistrict(districtNum), 0); setDistrictViewMode('candidates');} } } };

      // --- NOVO: Calcular dados para o Ticker ---
      const tickerData = useMemo(() => {
        const dataForTicker: TickerEntry[] = [];
        if (!apiVotesData?.candidateVotes || !districtsData) {
            return dataForTicker; // Retorna vazio se não há dados
        }

        // 1. Agrupa votos por distrito
        const votesByDistrict: Record<string, CandidateVote[]> = {};
        apiVotesData.candidateVotes.forEach((vote: CandidateVote) => {
            const districtIdStr = String(vote.district_id);
            if (!districtIdStr || !vote.candidate_name || vote.votes_qtn === undefined || vote.votes_qtn === null) return; // Validação mínima
            if (!votesByDistrict[districtIdStr]) { votesByDistrict[districtIdStr] = []; }
            votesByDistrict[districtIdStr].push(vote);
        });

        // 2. Processa cada distrito
        Object.keys(votesByDistrict).forEach(districtIdStr => {
            const votes = votesByDistrict[districtIdStr];
            if (!votes || votes.length === 0) return;

            // Calcula % e votos numéricos para este distrito
            const votesWithCalc = votes.map(v => ({ ...v, numericVotes: parseNumber(v.votes_qtn) }));
            const totalVotes = votesWithCalc.reduce((sum, current) => sum + current.numericVotes, 0);
            const votesProcessed = votesWithCalc.map(v => ({
                ...v,
                percentage: totalVotes > 0 ? ((v.numericVotes / totalVotes) * 100) : 0,
            })).sort((a, b) => b.numericVotes - a.numericVotes); // Ordena por votos

            // Pega info do distrito (nome, uf)
            const districtNum = parseInt(districtIdStr, 10);
            const districtInfo = districtsData.find(d => d.district_id === districtNum);
            if (!districtInfo) return; // Pula se não achar info do distrito

            // Monta a entrada para o ticker
            const entry: TickerEntry = {
                districtId: districtNum,
                districtName: districtInfo.district_name,
                stateId: districtInfo.uf,
                stateName: districtInfo.uf_name,
                winnerName: votesProcessed[0]?.candidate_name || null,
                winnerLegend: votesProcessed[0]?.parl_front_legend || null,
                winnerPercentage: votesProcessed[0]?.percentage ?? null,
                runnerUpLegend: votesProcessed[1]?.parl_front_legend || null, // Pega o segundo (índice 1)
                runnerUpPercentage: votesProcessed[1]?.percentage ?? null, // Pega % do segundo
            };
            dataForTicker.push(entry);
        });

        // Opcional: Ordenar os distritos (ex: por ID ou nome)
        dataForTicker.sort((a, b) => a.districtId - b.districtId);

        return dataForTicker;
    }, [apiVotesData?.candidateVotes, districtsData]); // Depende dos votos e dados estáticos de distrito
    // -----------------------------------------


  // --- Renderização ---
  return (
    <div>
      <Head>
        <title>Painel Apuração Haagar</title>
        <meta name="description" content="Simulador de apuração eleitoral Haagar" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto p-4 lg:p-6 space-y-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">Eleições 2022</h1>

        {/* Layout Principal: Mapa e Painel de Assentos */}
        <div className="relative bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <div className="lg:col-span-2 relative bg-white p-4 rounded-lg shadow-md border border-gray-200">
                 <InteractiveMap
                     results={districtResultsSummary}
                     colorMap={coalitionColorMap}
                     onDistrictHover={handleDistrictHover}
                     onDistrictClick={handleDistrictClick}
                 />
                 {hoveredDistrictInfo && ( <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white p-2 rounded text-xs shadow-lg pointer-events-none z-10">{hoveredDistrictInfo}</div> )}
            </div>
            <div className="lg:col-span-1">
                 <SeatCompositionPanel
                     seatData={districtSeatsByCoalition} // Corrigido: Passa a variável correta
                     colorMap={coalitionColorMap}
                     totalSeats={districtsData.length}
                 />
            </div>
            {/* --- NOVO: Adiciona o Ticker aqui --- */}
            {tickerData.length > 0 && !isLoadingVotes && ( // Mostra só se tiver dados e não estiver carregando
            <RaceTicker data={tickerData} colorMap={coalitionColorMap} interval={8000} />
             )}
            {/* --------------------------------- */}
            
        </div>

        {/* Seletores Geográficos */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-4 p-4 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center gap-2">
            <label htmlFor="state-select" className="font-medium text-gray-700">Estado:</label>
            <select id="state-select" value={selectedState ?? ''} onChange={handleStateChange} className="rounded border-gray-300 shadow-sm">
              <option value="">-- Selecione UF --</option>
              {states.map(state => ( <option key={state.id} value={state.id}>{state.name} ({state.id})</option> ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="district-select" className="font-medium text-gray-700">Distrito:</label>
            <select id="district-select" value={selectedDistrict ?? ''} onChange={handleDistrictChange} disabled={!selectedState || isLoadingVotes} className="rounded border-gray-300 shadow-sm disabled:opacity-50">
              <option value="">-- Selecione Distrito --</option>
              {districts.map(district => ( <option key={district.id} value={district.id}>{district.name} ({district.id})</option> ))}
            </select>
          </div>
        </div>

        {/* Painel de Detalhes do Distrito (Condicional) */}
        {selectedDistrict && ( // Renderiza apenas se um distrito for selecionado
            <div className="mt-6 p-4 bg-white rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">
                    {/* Usa a variável selectedDistrictName calculada antes do return */}
                    Detalhes do Distrito: {selectedDistrictName} ({selectedState}) - {currentTime}%
                </h2>

                 {/* Botões de Navegação da Visão */}
                <div className="mb-4 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        <button onClick={() => setDistrictViewMode('candidates')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'candidates' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Candidatos</button>
                        <button onClick={() => setDistrictViewMode('bars')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'bars' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Gráfico Barras</button>
                        <button onClick={() => setDistrictViewMode('proportional')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'proportional' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Prop. Estado ({selectedState})</button>
                        <button disabled title="Dados de eleição anterior não disponíveis" className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm border-transparent text-gray-400 cursor-not-allowed`}>Swing</button>
                    </nav>
                </div>

                 {/* Renderização Condicional da Visualização */}
                 <div className="mt-4 min-h-[300px]">
                    {isLoadingVotes && <p className="text-center text-gray-500">Carregando...</p>}
                    {!isLoadingVotes && errorVotes && <p className="text-red-600 text-center">Erro: {errorVotes}</p>}
                    {!isLoadingVotes && !errorVotes && apiVotesData && (
                        <>
                            {districtViewMode === 'candidates' && (
                                districtResults.votes.length > 0 ?
                                <CandidateDisplay
                                    data={districtResults.votes}
                                    leadingId={districtResults.leadingCandidateId}
                                    colorMap={coalitionColorMap}
                                /> : <p className="text-center text-gray-500">Sem dados de candidatos para este distrito.</p>
                            )}
                            {districtViewMode === 'bars' && (
                                 districtResults.votes.length > 0 ?
                                <DistrictBarChart
                                    data={districtResults.votes}
                                    colorMap={coalitionColorMap} // Precisa do colorMap
                                /> : <p className="text-center text-gray-500">Sem dados de candidatos para este distrito.</p>
                            )}
                             {districtViewMode === 'proportional' && (
                                 filteredProportionalVotes.length > 0 ? (
                                    <ProportionalPieChart
                                        data={filteredProportionalVotes}
                                        colorMap={coalitionColorMap} // Precisa do colorMap
                                    />
                                 ) : (
                                     <p className="text-center text-gray-500">Sem dados proporcionais para este estado.</p>
                                 )
                            )}
                        </>
                    )}
                 </div>
            </div>
        )}
      </main>
              {/* Controles de Tempo */}
              <div className="text-center p-4 bg-white rounded-lg shadow-md border border-gray-200">
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