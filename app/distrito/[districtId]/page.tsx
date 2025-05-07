// app/distrito/[districtId]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation'; // Hook para pegar parâmetros da URL
import Link from 'next/link'; // Para um link de "Voltar"

// Componentes de Visualização para esta página
import CandidateCardInfo from '@/components/CandidateCardInfo'; // Usando alias @/components/
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
  // Adicionar campos para urnas se vierem da API no futuro
  // processed_urns?: number;
  // total_urns?: number;
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

  const districtId = useMemo(() => {
      const idParam = params.districtId;
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      return id ? parseInt(id, 10) : null;
  }, [params.districtId]);

  const [currentTime, setCurrentTime] = useState<number>(100);
  const [apiVotesData, setApiVotesData] = useState<ApiVotesData | null>(null);
  const [isLoadingVotes, setIsLoadingVotes] = useState<boolean>(true);
  const [errorVotes, setErrorVotes] = useState<string | null>(null);
  const [districtViewMode, setDistrictViewMode] = useState<DistrictViewMode>('candidates');

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

  useEffect(() => {
    if (!districtId) {
      setIsLoadingVotes(false);
      setErrorVotes("ID do Distrito inválido.");
      return;
    }
    const fetchVoteData = async () => {
      console.log(`Buscando dados para distrito ${districtId}, tempo ${currentTime}`);
      setIsLoadingVotes(true); setErrorVotes(null);
      try {
          const response = await fetch(`/api/results?time=${currentTime}`);
          console.log('Status da resposta da API:', response.status, response.ok);
          if (!response.ok) {
               let errorMsg = 'Erro ao buscar votos';
               try { errorMsg = (await response.json()).error || errorMsg; } catch (e) {}
               console.error('Erro na resposta da API:', errorMsg);
               throw new Error(errorMsg);
          }
          const data: ApiVotesData = await response.json();
          console.log('Dados recebidos da API:', data);
          setApiVotesData(data);
      } catch (err: unknown) {
          console.error("Falha ao buscar/processar dados da API:", err);
          setErrorVotes(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido');
          setApiVotesData(null);
      } finally {
          setIsLoadingVotes(false);
          console.log('Busca finalizada. isLoadingVotes = false');
      }
  };
  fetchVoteData();
  }, [currentTime, districtId]);

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

   // const selectedDistrictName = currentDistrictInfo?.district_name || `ID ${districtId}`;

  if (!districtId) {
    return <div className="container mx-auto p-6 text-center text-red-600">ID do Distrito inválido na URL. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>
  }
  if (!currentDistrictInfo) {
    return <div className="container mx-auto p-6 text-center text-red-600">Informações do distrito ID {districtId} não encontradas. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>
  }

  // Placeholders para dados de apuração de urnas
  // No futuro, estes viriam de `apiVotesData` ou `currentDistrictInfo` se disponíveis
  const urnasApuradas = 1230; // Exemplo, substitua por dados reais
  const urnasTotais = 1500;    // Exemplo, substitua por dados reais
  const percentualApurado = urnasTotais > 0 ? (urnasApuradas / urnasTotais) * 100 : 0;


  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      {/* Link para Voltar - Permanece no topo */}
      <div className="mb-4"> {/* Adicionado mb-4 para dar espaço antes da próxima seção */}
        <Link href="/" className="text-blue-600 hover:underline inline-block">&larr; Voltar para Visão Nacional</Link>
      </div>

      {/* NOVA SEÇÃO DE CABEÇALHO DO DISTRITO */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        {/* Coluna Esquerda: Informações do Local */}
        <div className="space-y-1">
          {/* Tag do Estado (UF) - Futuramente um Link */}
          {/* <Link href={`/estado/${currentStateId}`}> */}
            <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-300 transition-colors cursor-pointer">
              {currentDistrictInfo.uf_name}
            </span>
          {/* </Link> */}
          {/* Nome do Distrito */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            {currentDistrictInfo.district_name}
          </h1>
        </div>

        {/* Coluna Direita: Informações de Apuração (Placeholders) */}
        <div className="text-sm md:text-right space-y-1">
          <div className="text-gray-600">
            {urnasApuradas.toLocaleString('pt-BR')} / {urnasTotais.toLocaleString('pt-BR')} urnas
          </div>
          <div className="w-full md:w-48 bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${percentualApurado.toFixed(2)}%` }}
              title={`${percentualApurado.toFixed(2)}% apuradas`}
            ></div>
          </div>
          <div className="text-gray-800">
            <span className="font-bold">{percentualApurado.toFixed(2)}%</span> apuradas
          </div>
        </div>
      </div>
      {/* FIM DA NOVA SEÇÃO DE CABEÇALHO DO DISTRITO */}


      {/* Painel Principal de Detalhes (Botões de Navegação e Conteúdo) */}
      <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
         {/* Botões de Navegação da Visão */}
        <div className="mb-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                <button onClick={() => setDistrictViewMode('candidates')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'candidates' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    Candidatos
                </button>
                <button onClick={() => setDistrictViewMode('bars')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'bars' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    Gráfico Barras
                </button>
                <button onClick={() => setDistrictViewMode('proportional')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'proportional' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    Prop. Estado ({currentStateId})
                </button>
                <button disabled title="Dados de eleição anterior não disponíveis" className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm border-transparent text-gray-400 cursor-not-allowed`}>
                    Swing
                </button>
            </nav>
        </div>

        {/* Renderização Condicional da Visualização */}
        <>
            {districtViewMode === 'candidates' && (
                districtResults.votes.length > 0 ?
                <CandidateCardInfo
                    data={districtResults.votes}
                    leadingId={districtResults.leadingCandidateId}
                    coalitionColorMap={coalitionColorMap}
                /> : <p className="text-center text-gray-500">Sem dados de candidatos para este distrito neste momento.</p>
            )}
            {districtViewMode === 'bars' && (
                  districtResults.votes.length > 0 ?
                <DistrictBarChart
                    data={districtResults.votes}
                    colorMap={coalitionColorMap}
                /> : <p className="text-center text-gray-500">Sem dados de candidatos para este distrito neste momento.</p>
            )}
              {districtViewMode === 'proportional' && (
                  filteredProportionalVotes.length > 0 ? (
                    <ProportionalPieChart
                        data={filteredProportionalVotes}
                        colorMap={coalitionColorMap}
                    />
                  ) : ( <p className="text-center text-gray-500">Sem dados proporcionais para este estado neste momento.</p> )
            )}
        </>
      </div>

     {/* Controles de Tempo */}
     <div className="text-left p-4 bg-white rounded-lg shadow-md border border-gray-200">
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

    </div>
  );
}