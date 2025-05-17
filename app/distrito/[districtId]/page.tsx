// app/distrito/[districtId]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import CandidateCardInfo from '@/components/CandidateCardInfo';
import DistrictBarChart from '@/components/DistrictBarChart';

import { CandidateVote, ProportionalVote, DistrictInfoFromData, PartyInfo, DistrictResultInfo, StateOption, DistrictOption, TickerEntry } from '@/types/election';
import { districtsData, partyData } from '@/lib/staticData';
import SwingAnalysis from '@/components/SwingAnalysis';
import { previousDistrictResultsData } from '@/lib/previousElectionData';

type DistrictViewMode = 'candidates' | 'bars' | 'swing' ;

interface ApiVotesData {
  time: number;
  candidateVotes: CandidateVote[];
  proportionalVotes: ProportionalVote[];
  // processed_urns?: number; // Futuro
  // total_urns?: number;   // Futuro
}

const FALLBACK_COLOR = '#D1D5DB';
const COALITION_FALLBACK_COLOR = '#6B7280';

const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedStr = value.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return '#1F2937';
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6) return '#1F2937';
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1F2937' : '#FFFFFF';
    } catch (e) { return '#1F2937'; }
}

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
      // Adicionar também cores de partidos individuais se necessário para fallback
      if (party.party_legend && party.party_color && !map[party.party_legend]) {
          map[party.party_legend] = party.party_color;
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
      setIsLoadingVotes(true); setErrorVotes(null);
      try {
          const response = await fetch(`/api/results?time=${currentTime}`);
          if (!response.ok) {
               let errorMsg = 'Erro ao buscar votos';
               try { errorMsg = (await response.json()).error || errorMsg; } catch (e) {}
               throw new Error(errorMsg);
          }
          const data: ApiVotesData = await response.json();
          setApiVotesData(data);
      } catch (err: unknown) {
          setErrorVotes(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido');
          setApiVotesData(null);
      } finally {
          setIsLoadingVotes(false);
      }
  };
  fetchVoteData();
  }, [currentTime, districtId]);

  const filteredCandidateVotes = useMemo(() => {
    if (!apiVotesData?.candidateVotes || !districtId) return [];
    return apiVotesData.candidateVotes.filter(vote => parseInt(String(vote.district_id), 10) === districtId );
  }, [apiVotesData?.candidateVotes, districtId]);

  // --- NOVO: useMemo para pegar dados da eleição anterior ---
const previousResultForThisDistrict = useMemo(() => {
  if (!districtId) return undefined;
  return previousDistrictResultsData.find(d => d.district_id === districtId);
}, [districtId]);
// --------------------------------------------------------

  const districtResults = useMemo(() => {
        if (!filteredCandidateVotes || filteredCandidateVotes.length === 0) { return { votes: [], totalVotes: 0, leadingCandidateId: null }; }
        const votesWithNumeric = filteredCandidateVotes.map((v: CandidateVote) => ({...v, numericVotes: parseNumber(v.votes_qtn)}));
        const totalVotes = votesWithNumeric.reduce((sum: number, current: { numericVotes: number }) => sum + current.numericVotes, 0);
        
        // Ordena para garantir que o primeiro é o líder (necessário para status)
        const sortedVotes = [...votesWithNumeric].sort((a,b) => b.numericVotes - a.numericVotes);

        let leadingCandidateId: string | number | null = null; 
        if (sortedVotes.length > 0) {
            leadingCandidateId = sortedVotes[0].candidate_name; // Ou ID se preferir
        }

        const votesWithPercentage = sortedVotes.map(vote => ({ 
            ...vote, 
            percentage: totalVotes > 0 ? ((vote.numericVotes / totalVotes) * 100) : 0, 
        }));
        return { votes: votesWithPercentage as (CandidateVote & { numericVotes: number, percentage: number })[], totalVotes, leadingCandidateId };
    }, [filteredCandidateVotes]);

  if (!districtId) {
    return <div className="container mx-auto p-6 text-center text-red-600">ID do Distrito inválido na URL. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>
  }
  if (!currentDistrictInfo) {
    return <div className="container mx-auto p-6 text-center text-red-600">Informações do distrito ID {districtId} não encontradas. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>
  }

  const urnasApuradas = 1230;
  const urnasTotais = 1500;
  const percentualApurado = urnasTotais > 0 ? (urnasApuradas / urnasTotais) * 100 : 0;

  // Lógica para o Status do Distrito
  const leaderCandidate = districtResults.votes.length > 0 ? districtResults.votes[0] : null;
  let districtWinnerLegend: string | null = null;
  let districtWinnerColor: string = COALITION_FALLBACK_COLOR; // Cor de fallback inicial
  let districtWinnerTagTextColor: string = getTextColorForBackground(districtWinnerColor);

  if (leaderCandidate) {
    const legend = leaderCandidate.parl_front_legend || leaderCandidate.party_legend;
    if (legend) {
        districtWinnerLegend = legend;
        districtWinnerColor = coalitionColorMap[legend] || COALITION_FALLBACK_COLOR;
        districtWinnerTagTextColor = getTextColorForBackground(districtWinnerColor);
    }
  }

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline inline-block">&larr; Voltar para Visão Nacional</Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        {/* Coluna Esquerda: Informações do Local */}
        <div className="space-y-1">
          <Link href={`/estado/${currentDistrictInfo.uf.toLowerCase()}`} className="inline-block">
            <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-300 transition-colors cursor-pointer">
              {currentDistrictInfo.uf_name}
            </span>
            </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            {currentDistrictInfo.district_name}
          </h1>
        </div>

        {/* Coluna Direita: Status do Distrito e Informações de Apuração */}
        <div className="flex flex-col items-start md:flex-row md:items-end md:justify-end gap-2 md:gap-4">
          {/* Status do Distrito (Tag) */}
          <div className="flex-shrink-0 order-1 md:order-none"> {/* order-1 para mobile, se necessário, ou manter a ordem natural */}
            {isLoadingVotes ? (
              <span className="text-xs italic text-gray-500 whitespace-nowrap">Carregando status...</span>
            ) : districtWinnerLegend && leaderCandidate ? (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                style={{ backgroundColor: districtWinnerColor, color: districtWinnerTagTextColor }}
              >
                {districtWinnerLegend} liderando
              </span>
            ) : (
              <span className="text-xs italic text-gray-500 whitespace-nowrap">
                {districtResults.votes.length > 0 ? 'Disputa acirrada' : 'Aguardando dados'}
              </span>
            )}
          </div>

          {/* Bloco de Urnas */}
          <div className="text-sm space-y-0.5 text-left md:text-right order-2 md:order-none">
            <div className="text-gray-600">
              {urnasApuradas.toLocaleString('pt-BR')} / {urnasTotais.toLocaleString('pt-BR')} urnas
            </div>
            {/* Aumentei um pouco a largura da barra para melhor visualização em telas menores */}
            <div className="w-32 sm:w-36 md:w-40 lg:w-48 bg-gray-200 rounded-full h-2.5">
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
      </div>

      <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
        <div className="mb-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                <button onClick={() => setDistrictViewMode('candidates')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'candidates' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    Candidatos
                </button>
                <button onClick={() => setDistrictViewMode('bars')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'bars' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                    Gráfico Barras
                </button>
                <button onClick={() => setDistrictViewMode('swing')} className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${districtViewMode === 'swing' ? 'border-highlight text-highlight' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  Swing
                </button>
            </nav>
        </div>

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
           {/* --- NOVO: Renderização da Visão de Swing --- */}
        {districtViewMode === 'swing' && (
            currentDistrictInfo && districtResults.votes.length > 0 ? (
                <SwingAnalysis
                    currentResults={districtResults.votes} // Passa todos os candidatos atuais ordenados
                    previousResult={previousResultForThisDistrict}
                    colorMap={coalitionColorMap}
                    districtName={currentDistrictInfo.district_name}
                />
            ) : (
                <p className="text-center text-gray-500">Dados insuficientes para análise de swing.</p>
            )
        )}
        {/* ----------------------------------------- */} 
        </>
      </div>

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
