// app/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import DistrictBarChart from '../components/DistrictBarChart';
import ProportionalPieChart from '../components/ProportionalPieChart';
// --- Importe os tipos do novo arquivo ---
import { ApiResultData, CandidateVote, ProportionalVote, DistrictInfoFromData, StateOption, DistrictOption } from '../types/election'; // Ajuste o caminho se necessário



export default function Home() {
  const [currentTime, setCurrentTime] = useState<number>(50);
  const [apiData, setApiData] = useState<ApiResultData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);

  // Busca dados da API (useEffect permanece igual)
  useEffect(() => {
    const fetchData = async () => {
       setIsLoading(true); setError(null);
      try {
        const response = await fetch(`/api/results?time=${currentTime}`);
        if (!response.ok) { throw new Error((await response.json()).error || 'Erro ao buscar dados'); }
        const data: ApiResultData = await response.json(); setApiData(data);
      } catch (err: unknown) { console.error("Falha API:", err); setError(err instanceof Error ? err.message : 'Erro desconhecido'); setApiData(null);
      } finally { setIsLoading(false); }
    };
    fetchData();
  }, [currentTime]);

  // Derivar listas de Estados e Distritos (lógica permanece igual)
  const states: StateOption[] = useMemo(() => {
    if (!apiData?.districtsData) return [];
    const uniqueStates = new Map<string, string>();
    apiData.districtsData.forEach(d => { if (d.uf && d.uf_name) uniqueStates.set(d.uf, d.uf_name); });
    return Array.from(uniqueStates, ([id, name]) => ({ id, name }));
  }, [apiData?.districtsData]);

  const districts: DistrictOption[] = useMemo(() => {
    if (!apiData?.districtsData || !selectedState) return [];
    return apiData.districtsData
      .filter(d => d.uf === selectedState)
      .map(d => ({ id: parseInt(String(d.district_id), 10), name: d.district_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [apiData?.districtsData, selectedState]);

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


  // Filtrar dados de candidatos (permanece igual)
  const filteredCandidateVotes = useMemo(() => {
    if (!apiData || !selectedDistrict) return [];
    return apiData.candidateVotes.filter(vote => parseInt(String(vote.district_id), 10) === selectedDistrict );
  }, [apiData?.candidateVotes, selectedDistrict]);

  // --- NOVO: Filtrar dados proporcionais para o estado selecionado ---
  const filteredProportionalVotes = useMemo(() => {
      if (!apiData?.proportionalVotes || !selectedState) return [];
      return apiData.proportionalVotes.filter(vote => vote.uf === selectedState);
  }, [apiData?.proportionalVotes, selectedState]);
  // -----------------------------------------------------------------

  // --- Renderização Condicional com GRÁFICOS ---
  let resultsContent;
  if (isLoading) {
    resultsContent = <p>Carregando dados ({currentTime}%)...</p>;
  } else if (error) {
    resultsContent = <p style={{ color: 'red' }}>Erro ao carregar dados: {error}</p>;
  } else if (apiData) {
     resultsContent = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Gráfico de Barras só aparece se um distrito for selecionado */}
        {selectedDistrict && filteredCandidateVotes.length > 0 && (
          <div>
            <h3>Resultados Distritais - Distrito {selectedDistrict} - {currentTime}%</h3>
            <DistrictBarChart data={filteredCandidateVotes} />
          </div>
        )}
        {selectedDistrict && filteredCandidateVotes.length === 0 && (
             <p>Sem dados de candidatos para o distrito {selectedDistrict}.</p>
        )}

        {/* Gráfico de Pizza só aparece se um estado for selecionado */}
         {selectedState && filteredProportionalVotes.length > 0 && (
          <div>
            <h3>Distribuição Proporcional - Estado {selectedState} - {currentTime}%</h3>
            <ProportionalPieChart data={filteredProportionalVotes} />
          </div>
         )}
         {selectedState && filteredProportionalVotes.length === 0 && (
             <p>Sem dados proporcionais para o estado {selectedState}.</p>
         )}
         {/* Se nenhum estado/distrito selecionado, pode mostrar algo geral ou nada */}
         {!selectedState && (
            <p>Selecione um Estado e um Distrito para ver os resultados detalhados.</p>
         )}
      </div>
    );
  } else {
    resultsContent = <p>Nenhum dado para exibir.</p>;
  }
  // ---------------------------------

  return (
    <div>
      <Head>
        <title>Painel Apuração Haagar</title>
        {/* ... */}
      </Head>
      <main style={{ padding: '2rem' }}>
        <h1>Painel de Apuração (Gráficos)</h1>
        {/* Controles de Tempo */}
        <div>{/* ... controles de tempo ... */}</div>
         {/* Cole os controles de tempo aqui (igual ao da resposta anterior) */}
         <h3>Ver Apuração em:</h3>
          <button onClick={() => setCurrentTime(50)} disabled={currentTime === 50 || isLoading}>50%</button>
          <button onClick={() => setCurrentTime(100)} disabled={currentTime === 100 || isLoading}>100%</button>
          <p>Mostrando resultados para: {currentTime}%</p>
        <hr />
        {/* Seletores Geográficos */}
        <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
          {/* ... seletores ... */}
           {/* Cole os seletores aqui (igual ao da resposta anterior) */}
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
            <select id="district-select" value={selectedDistrict ?? ''} onChange={handleDistrictChange} disabled={!selectedState || isLoading}>
              <option value="">-- Selecione Distrito --</option>
              {districts.map(district => (
                <option key={district.id} value={district.id}>{district.name} ({district.id})</option>
              ))}
            </select>
          </div>
        </div>
        <hr />
        {/* Exibe o conteúdo (Carregando, Erro ou Gráficos) */}
        {resultsContent}
      </main>
    </div>
  );
}