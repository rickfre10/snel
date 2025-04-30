// app/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import ResultsTable from '../components/ResultsTable';
// Não precisamos mais importar NADA de mockData para geografia!
// import { getStates, getDistrictsForState, mockGeography } from '../lib/mockData'; // REMOVER/COMENTAR

// Interface atualizada para incluir districtsData vindo da API
interface DistrictInfoFromData {
    district_id: string | number; // Pode vir como string da planilha
    district_name: string;
    uf: string;
    uf_name: string;
    // Incluir outras colunas se precisar delas diretamente
    [key: string]: any; // Permite outras colunas
}

interface ApiResultData {
  time: number;
  candidateVotes: Record<string, any>[];
  proportionalVotes: Record<string, any>[];
  districtsData: DistrictInfoFromData[]; // <-- ATUALIZADO
}

// Tipos para os seletores
interface StateOption {
    id: string; // uf
    name: string; // uf_name
}
interface DistrictOption {
    id: number; // district_id (convertido para número)
    name: string; // district_name
}


export default function Home() {
  const [currentTime, setCurrentTime] = useState<number>(50);
  const [apiData, setApiData] = useState<ApiResultData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedState, setSelectedState] = useState<string | null>(null); // Guarda o UF selecionado
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null); // Guarda o district_id selecionado


  // Busca dados da API (incluindo districtsData agora)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/results?time=${currentTime}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erro ${response.status} ao buscar dados`);
        }
        const data: ApiResultData = await response.json();
        setApiData(data);
      } catch (err: unknown) {
        console.error("Falha ao buscar dados da API:", err);
        setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido');
        setApiData(null); // Limpa dados em caso de erro
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentTime]);

  // --- Derivar listas de Estados e Distritos a partir dos dados REAIS ---
  const states: StateOption[] = useMemo(() => {
    if (!apiData?.districtsData) return [];
    // Usa um Map para pegar estados únicos (uf => uf_name)
    const uniqueStates = new Map<string, string>();
    apiData.districtsData.forEach(district => {
      if (district.uf && district.uf_name) {
        uniqueStates.set(district.uf, district.uf_name);
      }
    });
    // Converte o Map para o formato do array de opções
    return Array.from(uniqueStates, ([id, name]) => ({ id, name }));
  }, [apiData?.districtsData]); // Recalcula só quando districtsData mudar

  const districts: DistrictOption[] = useMemo(() => {
    if (!apiData?.districtsData || !selectedState) return [];
    // Filtra os distritos pelo UF selecionado e mapeia para o formato de opção
    return apiData.districtsData
      .filter(district => district.uf === selectedState)
      .map(district => ({
        // Garante que o ID seja número para o estado selectedDistrict
        id: parseInt(String(district.district_id), 10),
        name: district.district_name,
      }))
      // Opcional: Ordenar distritos por nome ou ID
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [apiData?.districtsData, selectedState]); // Recalcula quando districtsData ou selectedState mudar
  // -----------------------------------------------------------------

  // Handlers para mudança de estado e distrito (permanecem iguais)
  const handleStateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = event.target.value;
    setSelectedState(newState || null);
    setSelectedDistrict(null);
  };

  const handleDistrictChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDistrictId = event.target.value ? parseInt(event.target.value, 10) : null;
    setSelectedDistrict(newDistrictId);
  };

  // Filtrar dados de candidatos (permanece igual, mas agora usa dados reais)
  const filteredCandidateVotes = useMemo(() => {
    if (!apiData || !selectedDistrict) return [];
    return apiData.candidateVotes.filter(vote =>
        // Comparar como número após parse
        parseInt(String(vote.district_id), 10) === selectedDistrict
    );
  }, [apiData?.candidateVotes, selectedDistrict]);

  // --- Renderização Condicional (permanece a mesma lógica) ---
  let resultsContent;
  if (isLoading) {
    resultsContent = <p>Carregando dados ({currentTime}%)...</p>;
  } else if (error) {
    resultsContent = <p style={{ color: 'red' }}>Erro ao carregar dados: {error}</p>;
  } else if (apiData) {
     // Encontra o nome do distrito selecionado para exibir no título da tabela
     const selectedDistrictName = districts.find(d => d.id === selectedDistrict)?.name || selectedDistrict;
     resultsContent = (
      <>
        {selectedDistrict && (
          <>
            <ResultsTable
              title={`Votos por Candidato - Distrito ${selectedDistrictName} - ${currentTime}%`}
              data={filteredCandidateVotes}
            />
            <br />
          </>
        )}
        <ResultsTable
            title={`Votos Proporcionais (por UF/Frente) - ${currentTime}%`}
            data={apiData.proportionalVotes}
        />
      </>
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
        <h1>Painel de Apuração (Real via API)</h1>

        {/* Controles de Tempo */}
        <div>
          <h3>Ver Apuração em:</h3>
          <button onClick={() => setCurrentTime(50)} disabled={currentTime === 50 || isLoading}>50%</button>
          <button onClick={() => setCurrentTime(100)} disabled={currentTime === 100 || isLoading}>100%</button>
          <p>Mostrando resultados para: {currentTime}%</p>
        </div>
        <hr />

        {/* Seletores Geográficos (O JSX não muda, mas usarão dados reais) */}
        <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
          <div>
            <label htmlFor="state-select">Estado: </label>
            <select id="state-select" value={selectedState ?? ''} onChange={handleStateChange}>
              <option value="">-- Selecione UF --</option>
              {/* Popula com estados derivados da API */}
              {states.map(state => (
                <option key={state.id} value={state.id}>{state.name} ({state.id})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="district-select">Distrito: </label>
            <select id="district-select" value={selectedDistrict ?? ''} onChange={handleDistrictChange} disabled={!selectedState || isLoading}>
              <option value="">-- Selecione Distrito --</option>
              {/* Popula com distritos filtrados do estado selecionado */}
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