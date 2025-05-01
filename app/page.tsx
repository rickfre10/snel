// app/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import DistrictBarChart from '../components/DistrictBarChart'; 
import ProportionalPieChart from '../components/ProportionalPieChart';
// --- Importar tipos e DADOS ESTÁTICOS ---
import { CandidateVote, ProportionalVote, DistrictInfoFromData, PartyInfo, StateOption, DistrictOption } from '../types/election'; // Importar tipos
import { districtsData, partyData } from '../lib/staticData'; // Importar DADOS ESTÁTICOS
import CandidateDisplay from '../components/CandidateDisplay';
import InteractiveMap from '../components/InteractiveMap'; 
import { DistrictLayoutInfo } from '../lib/mapLayout'; 
import { DistrictResultInfo } from '../types/election'; 

const parseNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleanedStr = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanedStr);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

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

  const districtResultsSummary: Record<string, DistrictResultInfo> = useMemo(() => {
    const summary: Record<string, DistrictResultInfo> = {};
    // 1. Verifica se os dados necessários da API e os dados estáticos existem
    if (!apiVotesData?.candidateVotes || !districtsData) {
        console.log("Calculando summary: Dados de votos ou distritos estáticos ausentes.");
        return summary; // Retorna sumário vazio se dados essenciais faltam
    }

    // 2. Agrupa os votos por distrito (usando ID como string para a chave do objeto)
    const votesByDistrict: Record<string, CandidateVote[]> = {};
    apiVotesData.candidateVotes.forEach(vote => {
        // Valida se o voto tem as informações mínimas necessárias
        if (vote.district_id !== undefined && vote.district_id !== null && vote.district_id !== '' &&
            vote.candidate_name &&
            vote.votes_qtn !== undefined && vote.votes_qtn !== null)
        {
            const districtIdStr = String(vote.district_id);
            if (!votesByDistrict[districtIdStr]) {
                votesByDistrict[districtIdStr] = [];
            }
            // Adiciona o voto ao grupo do distrito (confiando que o tipo está ok após validação)
            votesByDistrict[districtIdStr].push(vote);
        } else {
             console.warn("Voto inválido ou incompleto ignorado:", vote);
        }
    });

    // 3. Processa cada distrito que teve votos registrados
    Object.keys(votesByDistrict).forEach(districtIdStr => {
        const votes = votesByDistrict[districtIdStr];
        if (!votes || votes.length === 0) return; // Segurança extra

        // --- Encontra o objeto 'winner' usando reduce ---
        const winner = votes.reduce((currentWinner: CandidateVote | null, currentVote: CandidateVote) => {
            const currentVotesNum = parseNumber(currentVote.votes_qtn); // Usa helper para converter

            // Se ainda não temos um vencedor, o voto atual se torna o primeiro candidato
            if (currentWinner === null) {
                return currentVote;
            }

            // Compara o voto atual com o maior encontrado até agora
            const winnerVotesNum = parseNumber(currentWinner.votes_qtn);
            return currentVotesNum > winnerVotesNum ? currentVote : currentWinner;
        }, null); // O valor inicial do acumulador (currentWinner) é null
        // -------------------------------------------------

        // Encontra informações adicionais do distrito (nome) nos dados estáticos
        const districtInfo = districtsData.find(d => String(d.district_id) === districtIdStr);
        // Pega o número máximo de votos do vencedor encontrado
        const maxVotes = winner ? parseNumber(winner.votes_qtn) : 0;

        // Adiciona a entrada ao sumário SOMENTE se um vencedor foi encontrado
        if (winner) {
            // Dentro deste bloco, 'winner' tem o tipo 'CandidateVote', não 'null'
            summary[districtIdStr] = {
                winnerLegend: winner.parl_front_legend ?? null, // Acesso seguro aqui
                winnerName: winner.candidate_name,             // Acesso seguro aqui
                districtName: districtInfo?.district_name || `Distrito ${districtIdStr}`,
                maxVotes: maxVotes,
            };
        } else {
            // Caso raro onde 'votes' não era vazio, mas 'reduce' retornou null (ex: todos votos 0 ou inválidos)
             summary[districtIdStr] = {
                winnerLegend: null,
                winnerName: undefined, // Ou "Nenhum Vencedor"
                districtName: districtInfo?.district_name || `Distrito ${districtIdStr}`,
                maxVotes: 0,
            };
             console.warn(`Nenhum vencedor encontrado para o distrito ${districtIdStr} apesar de ter votos.`);
        }
    });

    // 4. Garante que todos os distritos definidos no layout estático tenham uma entrada no sumário
    // Isso é importante para o mapa poder renderizar todos os retângulos
     districtsData.forEach(d => {
         const districtIdStr = String(d.district_id);
         if (!summary[districtIdStr]) {
             // Adiciona uma entrada padrão para distritos sem votos registrados
             summary[districtIdStr] = {
                 winnerLegend: null,
                 districtName: d.district_name,
                 maxVotes: 0,
             }
         }
     });

    // 5. Retorna o objeto de sumário completo
    return summary;
}, [apiVotesData?.candidateVotes, districtsData]); // Dependências do useMemo
// --- Fim do Bloco useMemo ---



// --- NOVO: Estado e Handlers para interação com o mapa ---
const [hoveredDistrictInfo, setHoveredDistrictInfo] = useState<string | null>(null);

// Chamado quando o mouse entra/sai de um distrito no mapa
const handleDistrictHover = (districtInfo: DistrictResultInfo | null, districtId: string | null) => {
  if (districtInfo && districtId) {
      setHoveredDistrictInfo(
          `Distrito: ${districtInfo.districtName || districtId} | Vencedor: ${districtInfo.winnerName || 'N/A'} (${districtInfo.winnerLegend || 'N/D'})`
      );
  } else {
      setHoveredDistrictInfo(null); // Limpa ao sair
  }
};

// Chamado quando um distrito é clicado no mapa
const handleDistrictClick = (districtInfo: DistrictResultInfo | null, districtId: string) => {
  if (districtId) {
      console.log("Clicou no Distrito:", districtId, districtInfo);
      const districtNum = parseInt(districtId, 10);
       if (!isNaN(districtNum)) {
           const distData = districtsData.find(d => d.district_id === districtNum);
           if (distData) {
              setSelectedState(distData.uf); // Seleciona o estado no dropdown
              // Pequeno delay para garantir que o estado atualize ANTES do distrito no dropdown filho
              setTimeout(() => setSelectedDistrict(districtNum), 0);
           }
       }
  }
};
// ---------------------------------------------------------


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

// Calcular total, %, e líder
const districtResults = useMemo(() => {
  if (!filteredCandidateVotes || filteredCandidateVotes.length === 0) {
    return { votes: [], totalVotes: 0, leadingCandidateId: null };
  }
  // Garante que votes_qtn seja número aqui
  const votesWithNumeric = filteredCandidateVotes.map(v => ({...v, numericVotes: parseNumber(v.votes_qtn)}));

  const totalVotes = votesWithNumeric.reduce((sum, current) => sum + current.numericVotes, 0);
  let leadingCandidateId: string | number | null = null;
  let maxVotes = -1;

  const votesWithPercentage = votesWithNumeric.map(vote => {
      if (vote.numericVotes > maxVotes) {
          maxVotes = vote.numericVotes;
          // Use candidate_name como ID fallback se candidate_id não existir/for inconsistente
          leadingCandidateId = vote.candidate_name;
      }
      return {
        ...vote,
        percentage: totalVotes > 0 ? ((vote.numericVotes / totalVotes) * 100) : 0,
      }
    });

  return { votes: votesWithPercentage, totalVotes, leadingCandidateId };
}, [filteredCandidateVotes]);

  // Filtrar dados proporcionais (agora usa apiVotesData)
  const filteredProportionalVotes = useMemo(() => {
      if (!apiVotesData?.proportionalVotes || !selectedState) return [];
      return apiVotesData.proportionalVotes.filter(vote => vote.uf === selectedState);
  }, [apiVotesData?.proportionalVotes, selectedState]);


  // --- Renderização Condicional com AMBOS os componentes ---
  let resultsContent;
  if (isLoadingVotes) {
    resultsContent = <p>Carregando resultados ({currentTime}%)...</p>;
  } else if (errorVotes) {
    resultsContent = <p style={{ color: 'red' }}>Erro ao carregar resultados: {errorVotes}</p>;
  } else if (apiVotesData) {
     const selectedDistrictName = districts.find(d => d.id === selectedDistrict)?.name || selectedDistrict;
     resultsContent = (
      // Container geral para os resultados
      <div className="space-y-6"> {/* Adiciona espaço vertical entre os blocos */}

        {/* Bloco de Resultados Distritais (Só aparece se distrito selecionado) */}
        {selectedDistrict && (
          // Usamos um Fragment <> ou <div> para agrupar título e componentes
          <div>
            <h3 className="text-xl font-semibold mb-4"> {/* Adiciona um título geral */}
                Resultados Distritais - Distrito {selectedDistrictName} - {currentTime}%
            </h3>
            {districtResults.votes.length > 0 ? (
               // Container para as duas visualizações distritais
               <div className="space-y-6"> {/* Espaço entre CandidateDisplay e BarChart */}
                 {/* 1. Novo Display de Candidatos */}
                 <CandidateDisplay
                   data={districtResults.votes}
                   leadingId={districtResults.leadingCandidateId} 
                   colorMap={coalitionColorMap}
                   />

                 {/* 2. Gráfico de Barras */}
                 <DistrictBarChart
                   data={districtResults.votes}
                   colorMap={coalitionColorMap}
             
                 />
               </div>
            ) : (
              // Mensagem se não houver votos para este distrito
              <p>Sem dados de candidatos para o distrito {selectedDistrictName}.</p>
            )}
          </div>
        )}

        {/* Bloco de Resultados Proporcionais (Só aparece se estado selecionado) */}
        {selectedState && (
           <div>
                <h3 className="text-xl font-semibold mb-4"> {/* Adiciona um título geral */}
                    Distribuição Proporcional - Estado {selectedState} - {currentTime}%
                </h3>
                {filteredProportionalVotes.length > 0 ? (
                    <ProportionalPieChart
                        data={filteredProportionalVotes}
                        colorMap={coalitionColorMap}
                    />
                ) : (
                    <p>Sem dados proporcionais para o estado {selectedState}.</p>
                )}
           </div>
        )}

         {/* Mensagem inicial se nada selecionado */}
         {!selectedState && !isLoadingVotes && (
            <p>Selecione um Estado e um Distrito para ver os resultados detalhados.</p>
         )}
      </div>
    );
  } else {
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
        {/* --- NOVO: Container para Mapa e Info Hover --- */}
        <div className="relative my-6"> {/* Adiciona margem vertical */}
                    <h2 className="text-xl font-semibold mb-2">Mapa Interativo de Haagar</h2>
                    {/* Renderiza o mapa passando os dados e handlers */}
                    <InteractiveMap
                        results={districtResultsSummary}
                        colorMap={coalitionColorMap}
                        onDistrictHover={handleDistrictHover}
                        onDistrictClick={handleDistrictClick}
                    />
                    {/* Exibe info do hover (tooltip flutuante simples) */}
                    {hoveredDistrictInfo && (
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white p-2 rounded text-xs shadow-lg pointer-events-none z-10">
                            {hoveredDistrictInfo}
                        </div>
                    )}
                </div>
                {/* ---------------------------------------------- */}


                <hr className="my-6"/> {/* Separador */}

                {/* Exibe o conteúdo dos resultados (CandidateDisplay/Charts) */}
                {resultsContent}
        <hr />
        {/* Exibe o conteúdo */}
        {resultsContent}
      </main>
    </div>
  );
}