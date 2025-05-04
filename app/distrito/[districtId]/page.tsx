// app/distrito/[districtId]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation'; // Hook para pegar parâmetros da URL
import Link from 'next/link'; // Para um link de "Voltar"

// Componentes de Visualização para esta página
import CandidateDisplay from '@/components/CandidateDisplay'; // Usando alias @/components/
import DistrictBarChart from '@/components/DistrictBarChart';
import ProportionalPieChart from '@/components/ProportionalPieChart';

// Tipos e Dados Estáticos (Usando alias @/)
import { CandidateVote, ProportionalVote, DistrictInfoFromData, PartyInfo, DistrictResultInfo, StateOption, DistrictOption, TickerEntry } from '@/types/election'; // Adicionado TickerEntry só para garantir
import { districtsData, partyData } from '@/lib/staticData';

// --- Definição do Tipo para a View do Distrito ---
type DistrictViewMode = 'candidates' | 'bars' | 'proportional';
// --------------------------------------------------

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

// --- Componente da Página de Detalhe do Distrito ---
export default function DistrictDetailPage() {
  const params = useParams();

  // Pega o ID do distrito da URL e converte para número
  const districtId = useMemo(() => {
      const idParam = params.districtId;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      return id ? parseInt(id, 10) : null;
  }, [params.districtId]);

  // --- Estados específicos desta página ---
  const [currentTime, setCurrentTime] = useState<number>(100); // Padrão 100%
  const [apiVotesData, setApiVotesData] = useState<ApiVotesData | null>(null);
  const [isLoadingVotes, setIsLoadingVotes] = useState<boolean>(true);
  const [errorVotes, setErrorVotes] = useState<string | null>(null);
  const [districtViewMode, setDistrictViewMode] = useState<DistrictViewMode>('candidates');

  // --- Dados Estáticos Derivados ---
  const currentDistrictInfo = useMemo(() => {
    if (!districtId) return null;
    return districtsData.find(d => d.district_id === districtId);
  }, [districtId]);

  const currentStateId = currentDistrictInfo?.uf || null;

  const coalitionColorMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    partyData.forEach(party => {
      if (party.parl_front_legend && party.parl_front_color && !map[party.parl_front_legend]) {
        map[party.parl_front_legend] = party.parl_front_color;
      }
    });
    return map;
  }, []);

  // --- Busca de Dados de Votos ---
  useEffect(() => {
    if (!districtId) {
      setIsLoadingVotes(false);
      setErrorVotes("ID do Distrito inválido.");
      return;
    }
    const fetchVoteData = async () => {
      console.log(`Buscando dados para distrito ${districtId}, tempo ${currentTime}`); // Log 1: Inicio da busca
      setIsLoadingVotes(true); setErrorVotes(null);
      try {
          const response = await fetch(`/api/results?time=${currentTime}`);
          console.log('Status da resposta da API:', response.status, response.ok); // Log 2: Status da resposta
          if (!response.ok) {
               let errorMsg = 'Erro ao buscar votos';
               try { errorMsg = (await response.json()).error || errorMsg; } catch (e) {}
               console.error('Erro na resposta da API:', errorMsg); // Log 3a: Erro específico da API
               throw new Error(errorMsg);
          }
          const data: ApiVotesData = await response.json();
          console.log('Dados recebidos da API:', data); // Log 4: Dados recebidos com sucesso
          setApiVotesData(data); // Tenta guardar os dados
      } catch (err: unknown) {
          console.error("Falha ao buscar/processar dados da API:", err); // Log 3b: Erro geral (rede, json inválido, etc)
          setErrorVotes(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido');
          setApiVotesData(null);
      } finally {
          setIsLoadingVotes(false);
          console.log('Busca finalizada. isLoadingVotes = false'); // Log 5: Fim da busca
      }
  };
  fetchVoteData();
  }, [currentTime, districtId]);

  // --- Cálculos Derivados (Filtrados) ---
  const filteredCandidateVotes = useMemo(() => {
    if (!apiVotesData?.candidateVotes || !districtId) return [];
    return apiVotesData.candidateVotes.filter(vote => parseInt(String(vote.district_id), 10) === districtId );
  }, [apiVotesData?.candidateVotes, districtId]);

  const filteredProportionalVotes = useMemo(() => {
      if (!apiVotesData?.proportionalVotes || !currentStateId) return [];
      return apiVotesData.proportionalVotes.filter(vote => vote.uf === currentStateId);
  }, [apiVotesData?.proportionalVotes, currentStateId]);

  const districtResults = useMemo(() => {
        if (!filteredCandidateVotes || filteredCandidateVotes.length === 0) { return { votes: [], totalVotes: 0, leadingCandidateId: null }; }
        const votesWithNumeric = filteredCandidateVotes.map((v: CandidateVote) => ({...v, numericVotes: parseNumber(v.votes_qtn)}));
        const totalVotes = votesWithNumeric.reduce((sum: number, current: { numericVotes: number }) => sum + current.numericVotes, 0);
        let leadingCandidateId: string | number | null = null; let maxVotes = -1;
        const votesWithPercentage = votesWithNumeric.map(vote => {
            if (vote.numericVotes > maxVotes) { maxVotes = vote.numericVotes; leadingCandidateId = vote.candidate_name; }
            return { ...vote, percentage: totalVotes > 0 ? ((vote.numericVotes / totalVotes) * 100) : 0, }
        });
        return { votes: votesWithPercentage as (CandidateVote & { numericVotes: number, percentage: number })[], totalVotes, leadingCandidateId };
    }, [filteredCandidateVotes]);

   const selectedDistrictName = currentDistrictInfo?.district_name || `ID ${districtId}`;

  // --- Renderização da Página de Detalhe ---
  if (!districtId) {
    // Se não há ID válido na URL
    return <div className="container mx-auto p-6 text-center text-red-600">ID do Distrito inválido na URL. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>
}
if (!currentDistrictInfo) {
    // Se o ID é válido mas não foi encontrado nos dados estáticos
    // (isLoadingVotes é irrelevante aqui, pois currentDistrictInfo depende de dados estáticos)
    return <div className="container mx-auto p-6 text-center text-red-600">Informações do distrito ID {districtId} não encontradas. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>
}
// A partir daqui, TypeScript sabe que currentDistrictInfo NÃO é null/undefined

console.log('--- ESTADO ANTES DE RENDERIZAR ---');
console.log('isLoadingVotes:', isLoadingVotes);
console.log('errorVotes:', errorVotes);
// console.log('apiVotesData:', apiVotesData); // Já vimos que este objeto tem dados

console.log('--- DADOS PROCESSADOS ---');
console.log('District ID p/ Filtro:', districtId); // Deve ser 204
console.log('Estado p/ Filtro:', currentStateId); // Deve ser o UF de 204
console.log('API Candidate Votes RAW (amostra):', apiVotesData?.candidateVotes?.slice(0, 10)); // Amostra dos dados brutos
console.log('Filtrados (Candidatos):', filteredCandidateVotes); // <-- É [] ou tem objetos? Quantos?
console.log('Filtrados (Proporcionais):', filteredProportionalVotes); // <-- É [] ou tem objetos?
console.log('Resultados Calculados (districtResults):', districtResults); // <-- O array 'votes' aqui dentro é [] ou tem objetos?
console.log('--------------------------');

return (
  <div className="container mx-auto p-4 lg:p-6 space-y-6">
    {/* Link para Voltar */}
    <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Voltar para Visão Nacional</Link>

    {/* Título - Agora seguro para acessar as propriedades */}
    <h1 className="text-3xl font-bold text-gray-800">
      Distrito: {currentDistrictInfo.district_name} ({currentDistrictInfo.uf})
    </h1>

    {/* Controles de Tempo (como antes) */}
    <div className="text-left p-4 bg-white rounded-lg shadow-md border border-gray-200">
        {/* ... select de tempo ... */}
        <label htmlFor="time-select" className="text-sm font-medium mr-2">Ver Apuração em:</label>
        <select
           id="time-select"
           value={currentTime}
           onChange={(e) => setCurrentTime(parseInt(e.target.value, 10))}
           disabled={isLoadingVotes}
           className="rounded border-gray-300 shadow-sm"
        >
            <option value={50}>50%</option>
            <option value={100}>100%</option>
        </select>
    </div>

    {/* Painel Principal de Detalhes (como antes) */}
    <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
        {/* ... Título H2, Botões de Navegação ... */}
         <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Resultados - {currentTime}%
        </h2>
        <div className="mb-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                  {/* ... botões ... */}
            </nav>
        </div>


        {/* Renderização Condicional da Visualização (como antes) */}
        <div className="mt-4 min-h-[400px]">
            {isLoadingVotes && <p className="text-center text-gray-500 animate-pulse">Carregando resultados...</p>}
            {!isLoadingVotes && errorVotes && <p className="text-red-600 text-center">Erro: {errorVotes}</p>}
            {!isLoadingVotes && !errorVotes && apiVotesData && (
                <>
                    {/* ... Lógica com districtViewMode ... */}
                </>
            )}
             {!isLoadingVotes && !errorVotes && !apiVotesData && (<p className="text-center text-gray-500">Não foi possível carregar os dados de votos.</p>)}
        </div>
    </div>
    </div>
  );
}