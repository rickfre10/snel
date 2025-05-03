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

// Tipos e Dados Estáticos (Ajuste caminho se necessário)
import { CandidateVote, ProportionalVote, DistrictInfoFromData, PartyInfo, StateOption, DistrictOption, DistrictResultInfo } from '../types/election';
import { districtsData, partyData } from '../lib/staticData';

// --- DEFINIÇÃO DO TIPO FALTANTE ---
type DistrictViewMode = 'candidates' | 'bars' | 'proportional';
// -----------------------------------

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
  // Estado para controlar a visão do detalhe do distrito, usando o tipo definido acima
  const [districtViewMode, setDistrictViewMode] = useState<DistrictViewMode>('candidates');

  // --- Busca de Dados de Votos ---
  useEffect(() => {
    const fetchVoteData = async () => {
        setIsLoadingVotes(true); setErrorVotes(null);
        try {
            const response = await fetch(`/api/results?time=${currentTime}`);
            if (!response.ok) throw new Error((await response.json()).error || 'Erro API');
            const data: ApiVotesData = await response.json(); setApiVotesData(data);
        } catch (err: unknown) { console.error("Falha API Votos:", err); setErrorVotes(err instanceof Error ? err.message : 'Erro'); setApiVotesData(null);
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
    return Array.from(uniqueStates, ([id, name]) => ({ id, name }));
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
  }, [apiVotesData?.candidateVotes]); // Depende apenas dos votos agora

  // Calcular Assentos Distritais por Frente (GARANTIR QUE ESTE BLOCO ESTEJA AQUI)
  const districtSeatsByCoalition = useMemo(() => {
    const seatCounts: Record<string, number> = {};
     // Usa districtResultsSummary que acabamos de calcular
    if (!districtResultsSummary) return seatCounts;
    Object.values(districtResultsSummary).forEach(result => {
      if (result.winnerLegend) {
        seatCounts[result.winnerLegend] = (seatCounts[result.winnerLegend] || 0) + 1;
      }
    });
    return seatCounts;
  }, [districtResultsSummary]); // Depende do sumário

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
            if (vote.numericVotes > maxVotes) { maxVotes = vote.numericVotes; leadingCandidateId = vote.candidate_name; } // Usa candidate_name
            return { ...vote, percentage: totalVotes > 0 ? ((vote.numericVotes / totalVotes) * 100) : 0, }
        });
        // Retorna tipo correto aqui
        return { votes: votesWithPercentage as (CandidateVote & { numericVotes: number, percentage: number })[], totalVotes, leadingCandidateId };
    }, [filteredCandidateVotes]);

  // --- Handlers ---
  const handleStateChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const newState = event.target.value; setSelectedState(newState || null); setSelectedDistrict(null); setDistrictViewMode('candidates'); }; // Reseta view ao mudar estado
  const handleDistrictChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const newDistrictId = event.target.value ? parseInt(event.target.value, 10) : null; setSelectedDistrict(newDistrictId); setDistrictViewMode('candidates');}; // Reseta view ao mudar distrito
  const handleDistrictHover = (districtInfo: DistrictResultInfo | null, districtId: string | null) => { if (districtInfo && districtId) { setHoveredDistrictInfo( `Distrito: ${districtInfo.districtName || districtId} | Vencedor: ${districtInfo.winnerName || 'N/A'} (${districtInfo.winnerLegend || 'N/D'})` ); } else { setHoveredDistrictInfo(null); } };
  const handleDistrictClick = (districtInfo: DistrictResultInfo | null, districtId: string) => { if (districtId) { console.log("Clicou Distrito:", districtId, districtInfo); const districtNum = parseInt(districtId, 10); if (!isNaN(districtNum)) { const distData = districtsData.find(d => d.district_id === districtNum); if (distData) { setSelectedState(distData.uf); setTimeout(() => setSelectedDistrict(districtNum), 0); setDistrictViewMode('candidates');} } } }; // Reseta view ao clicar no mapa

  // --- Calcula o nome do distrito ANTES do return principal ---
  const selectedDistrictName = useMemo(() => {
      if (!selectedDistrict) return null;
      return districts.find(d => d.id === selectedDistrict)?.name || `ID ${selectedDistrict}`;
  }, [selectedDistrict, districts]);
  // ---------------------------------------------------------


  // --- Renderização ---
  return (
    <div>
      <Head>
        <title>Eleições 2022</title>
        <meta name="description" content="Simulador de apuração eleitoral Haagar" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto p-4 lg:p-6 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">Haagar - Eleições 2022</h1>

        {/* Layout Principal: Mapa e Painel de Assentos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna do Mapa */}
            <div className="lg:col-span-2 relative bg-white p-4 rounded-lg shadow-md border border-gray-200">
                 <h2 className="text-xl font-semibold mb-2 text-gray-700">Mapa Interativo de Haagar</h2>
                 <InteractiveMap
                     results={districtResultsSummary}
                     colorMap={coalitionColorMap}
                     onDistrictHover={handleDistrictHover}
                     onDistrictClick={handleDistrictClick}
                 />
                 {hoveredDistrictInfo && (
                     <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white p-2 rounded text-xs shadow-lg pointer-events-none z-10">
                         {hoveredDistrictInfo}
                     </div>
                 )}
            </div>

             {/* Coluna do Painel de Assentos */}
            <div className="lg:col-span-1">
                 <SeatCompositionPanel
                     seatData={districtSeatsByCoalition} // Usa a variável calculada
                     colorMap={coalitionColorMap}
                     totalSeats={districtsData.length}
                 />
            </div>
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
                    {/* Usa a variável calculada ANTES do return */}
                    Detalhes do Distrito: {selectedDistrictName} ({selectedState}) - {currentTime}%
                </h2>

                 {/* Botões de Navegação da Visão */}
                <div className="mb-4 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {/* Botões que mudam districtViewMode */}
                        <button onClick={() => setDistrictViewMode('candidates')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'candidates' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Candidatos</button>
                        <button onClick={() => setDistrictViewMode('bars')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'bars' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Gráfico Barras</button>
                        <button onClick={() => setDistrictViewMode('proportional')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'proportional' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Prop. Estado ({selectedState})</button>
                        <button disabled title="Dados de eleição anterior não disponíveis" className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm border-transparent text-gray-400 cursor-not-allowed`}>Swing</button>
                    </nav>
                </div>

                 {/* Renderização Condicional da Visualização */}
                 <div className="mt-4 min-h-[300px]">
                    {isLoadingVotes && <p className="text-center text-gray-500">Carregando...</p>}
                    {!isLoadingVotes && errorVotes && <p className="text-red-600">Erro: {errorVotes}</p>}
                    {/* Renderiza SÓ SE não estiver carregando, sem erro E apiVotesData existir */}
                    {!isLoadingVotes && !errorVotes && apiVotesData && (
                        <>
                            {districtViewMode === 'candidates' && (
                                districtResults.votes.length > 0 ?
                                <CandidateDisplay
                                    data={districtResults.votes}
                                    leadingId={districtResults.leadingCandidateId}
                                    colorMap={coalitionColorMap}
                        
                                /> : <p>Sem dados de candidatos para este distrito.</p>
                            )}
                            {districtViewMode === 'bars' && (
                                 districtResults.votes.length > 0 ?
                                <DistrictBarChart
                                    data={districtResults.votes}
                                    colorMap={coalitionColorMap} // colorMap é necessário aqui
                                /> : <p>Sem dados de candidatos para este distrito.</p>
                            )}
                             {districtViewMode === 'proportional' && (
                                 filteredProportionalVotes.length > 0 ? (
                                    <ProportionalPieChart
                                        data={filteredProportionalVotes}
                                        colorMap={coalitionColorMap} // colorMap é necessário aqui
                                    />
                                 ) : (
                                     <p>Sem dados proporcionais para este estado.</p>
                                 )
                            )}
                            {/* {districtViewMode === 'swing' && <p>Visualização de Swing (ainda não implementada).</p>} */}
                        </>
                    )}
                 </div>
            </div>
        )}
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

      </main>
    </div>
    
  );
}