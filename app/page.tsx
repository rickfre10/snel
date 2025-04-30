// app/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import DistrictBarChart from '../components/DistrictBarChart'; // Ou CandidateDisplay se já o criou
import ProportionalPieChart from '../components/ProportionalPieChart';
// --- Importar tipos e DADOS ESTÁTICOS ---
import { CandidateVote, ProportionalVote, DistrictInfoFromData, PartyInfo, StateOption, DistrictOption } from '../types/election'; // Importar tipos
import { districtsData, partyData } from '../lib/staticData'; // Importar DADOS ESTÁTICOS

// Interface para os dados de VOTOS vindos da API (não inclui mais estáticos)
interface ApiVotesData {
  time: number;
  candidateVotes: CandidateVote[];
  proportionalVotes: ProportionalVote[];
}

export default function Home() {
  const [currentTime, setCurrentTime] = useState<number>(50);
  // Estado apenas para os dados de VOTOS da API
  const [apiVotesData, setApiVotesData] = useState<ApiVotesData | null>(null);
  const [isLoadingVotes, setIsLoadingVotes] = useState<boolean>(true); // Loading específico para votos
  const [errorVotes, setErrorVotes] = useState<string | null>(null); // Erro específico para votos

  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);

 // Handler para mudança de estado
 const handleStateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  const newState = event.target.value;
  setSelectedState(newState || null);
  setSelectedDistrict(null); // Reseta o distrito ao mudar o estado
};

// Handler para mudança de distrito
const handleDistrictChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  const newDistrictId = event.target.value ? parseInt(event.target.value, 10) : null;
  setSelectedDistrict(newDistrictId);
};

  // Busca dados de VOTOS da API (quando currentTime muda)
  useEffect(() => {
    const fetchVoteData = async () => {
      setIsLoadingVotes(true);
      setErrorVotes(null);
      try {
        // Chama a API simplificada de resultados
        const response = await fetch(`/api/results?time=${currentTime}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erro ${response.status} ao buscar votos`);
        }
        const data: ApiVotesData = await response.json();
        setApiVotesData(data);
      } catch (err: unknown) {
        console.error("Falha ao buscar dados de VOTOS da API:", err);
        setErrorVotes(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido ao buscar votos');
        setApiVotesData(null);
      } finally {
        setIsLoadingVotes(false);
      }
    };
    fetchVoteData();
  }, [currentTime]);

  // --- Derivar listas e mapas a partir dos DADOS ESTÁTICOS importados ---
  const states: StateOption[] = useMemo(() => {
    const uniqueStates = new Map<string, string>();
    districtsData.forEach(district => { // Usa o districtsData importado
      if (district.uf && district.uf_name) {
        uniqueStates.set(district.uf, district.uf_name);
      }
    });
    return Array.from(uniqueStates, ([id, name]) => ({ id, name }));
  }, []); // Dependência vazia, calcula só uma vez

  const districts: DistrictOption[] = useMemo(() => {
    if (!selectedState) return [];
    return districtsData // Usa o districtsData importado
      .filter(district => district.uf === selectedState)
      .map(district => ({
        id: district.district_id, // Já é número no staticData.ts
        name: district.district_name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedState]); // Recalcula quando selectedState mudar

  const coalitionColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    partyData.forEach(party => { // Usa o partyData importado
        // Garante que temos a legenda e a cor antes de adicionar ao mapa
      if (party.parl_front_legend && party.parl_front_color && !map[party.parl_front_legend]) {
        map[party.parl_front_legend] = party.parl_front_color;
      }
    });
    return map;
  }, []); // Dependência vazia, calcula só uma vez
  // -----------------------------------------------------------------




  // Filtrar dados de candidatos (agora usa apiVotesData)
  const filteredCandidateVotes = useMemo(() => {
    if (!apiVotesData?.candidateVotes || !selectedDistrict) return [];
    return apiVotesData.candidateVotes.filter(vote =>
        parseInt(String(vote.district_id), 10) === selectedDistrict
    );
  }, [apiVotesData?.candidateVotes, selectedDistrict]);

  // Filtrar dados proporcionais (agora usa apiVotesData)
  const filteredProportionalVotes = useMemo(() => {
      if (!apiVotesData?.proportionalVotes || !selectedState) return [];
      return apiVotesData.proportionalVotes.filter(vote => vote.uf === selectedState);
  }, [apiVotesData?.proportionalVotes, selectedState]);


  // --- Renderização Condicional ---
  let resultsContent;
  if (isLoadingVotes) { // Usa o loading específico dos votos
    resultsContent = <p>Carregando resultados ({currentTime}%)...</p>;
  } else if (errorVotes) { // Usa o erro específico dos votos
    resultsContent = <p style={{ color: 'red' }}>Erro ao carregar resultados: {errorVotes}</p>;
  } else if (apiVotesData) { // Usa os dados de votos
     const selectedDistrictName = districts.find(d => d.id === selectedDistrict)?.name || selectedDistrict;
     resultsContent = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {selectedDistrict && filteredCandidateVotes.length > 0 && (
          <div>
            <h3>Resultados Distritais - Distrito {selectedDistrictName} - {currentTime}%</h3>
            <DistrictBarChart // Ou CandidateDisplay
                data={filteredCandidateVotes}
                colorMap={coalitionColorMap} // Usa o mapa derivado dos dados estáticos
            />
          </div>
        )}
        {/* ... (lógica para mostrar 'sem dados') ... */}

         {selectedState && filteredProportionalVotes.length > 0 && (
          <div>
            <h3>Distribuição Proporcional - Estado {selectedState} - {currentTime}%</h3>
            <ProportionalPieChart
                data={filteredProportionalVotes}
                colorMap={coalitionColorMap} // Usa o mapa derivado dos dados estáticos
            />
          </div>
         )}
         {/* ... (lógica para mostrar 'sem dados' ou 'selecione estado') ... */}
          {!selectedState && (
            <p>Selecione um Estado e um Distrito para ver os resultados detalhados.</p>
         )}
      </div>
    );
  } else {
    // Pode acontecer brevemente antes da primeira carga ou se a API falhar sem erro explícito
    resultsContent = <p>Aguardando dados...</p>;
  }
  // ---------------------------------

  return (
    <div>
      <Head>
        <title>Painel Apuração Haagar</title>
        {/* ... */}
      </Head>
      <main style={{ padding: '2rem' }}>
        <h1>Painel de Apuração (Dados Estáticos + API)</h1>
         {/* Controles de Tempo (iguais, mas usam isLoadingVotes) */}
        <div>
           <h3>Ver Apuração em:</h3>
          <button onClick={() => setCurrentTime(50)} disabled={currentTime === 50 || isLoadingVotes}>50%</button>
          <button onClick={() => setCurrentTime(100)} disabled={currentTime === 100 || isLoadingVotes}>100%</button>
          <p>Mostrando resultados para: {currentTime}%</p>
        </div>
        <hr />
        {/* Seletores Geográficos (iguais, usam dados estáticos agora) */}
        <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
         <div>
            <label htmlFor="state-select">Estado: </label>
            <select id="state-select" value={selectedState ?? ''} onChange={handleStateChange}>
              <option value="">-- Selecione UF --</option>
              {states.map(state => (
                <option key={state.id} value={state.id}>{state.name} ({state.id})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="district-select">Distrito: </label>
            {/* Desabilita se estado não selecionado OU se votos estiverem carregando */}
            <select id="district-select" value={selectedDistrict ?? ''} onChange={handleDistrictChange} disabled={!selectedState || isLoadingVotes}>
              <option value="">-- Selecione Distrito --</option>
              {districts.map(district => (
                <option key={district.id} value={district.id}>{district.name} ({district.id})</option>
              ))}
            </select>
          </div>
        </div>
        <hr />
        {/* Exibe o conteúdo */}
        {resultsContent}
      </main>
    </div>
  );
}