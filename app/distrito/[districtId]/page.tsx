// app/distrito/[districtId]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Seus componentes existentes
import CandidateCardInfo from '@/components/CandidateCardInfo';
import DistrictBarChart from '@/components/DistrictBarChart';
import ApuracaoVisao from '@/components/ApuracaoVisao';

// Tipos e Dados Estáticos
import { CandidateVote, ProportionalVote, DistrictInfoFromData, PartyInfo, DistrictResultInfo, TickerEntry } from '@/types/election';
import { districtsData, partyData } from '@/lib/staticData';

// --- NOVO: Import para Swing ---
import SwingAnalysis from '@/components/SwingAnalysis';
import { previousDistrictResultsData, PreviousDistrictResult } from '@/lib/previousElectionData';
// -----------------------------

type DistrictViewMode = 'candidates' | 'bars' | 'swing' ;

interface ApiVotesData {
  time: number;
  candidateVotes: CandidateVote[];
  proportionalVotes: ProportionalVote[];
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
    if (!hexcolor) return '#1F2937'; // Cor padrão para texto se hexcolor for inválido
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6) return '#1F2937';
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1F2937' : '#FFFFFF'; // Preto para fundos claros, Branco para escuros
    } catch (e) {
        return '#1F2937'; // Cor padrão em caso de erro na conversão
    }
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

  const coalitionColorMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    partyData.forEach(party => {
      if (party.parl_front_legend && party.parl_front_color && !map[party.parl_front_legend]) {
        map[party.parl_front_legend] = party.parl_front_color;
      }
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

  const districtResults = useMemo(() => {
    if (!filteredCandidateVotes || filteredCandidateVotes.length === 0) { return { votes: [], totalVotes: 0, leadingCandidateId: null }; }
    const votesWithNumeric = filteredCandidateVotes.map((v: CandidateVote) => ({...v, numericVotes: parseNumber(v.votes_qtn)}));
    const totalVotes = votesWithNumeric.reduce((sum: number, current: { numericVotes: number }) => sum + current.numericVotes, 0);
    const sortedVotes = [...votesWithNumeric].sort((a,b) => b.numericVotes - a.numericVotes);
    let leadingCandidateId: string | number | null = null;
    if (sortedVotes.length > 0) { leadingCandidateId = sortedVotes[0].candidate_name; }
    const votesWithPercentage = sortedVotes.map(vote => ({ ...vote, percentage: totalVotes > 0 ? ((vote.numericVotes / totalVotes) * 100) : 0, }));
    return { votes: votesWithPercentage as (CandidateVote & { numericVotes: number, percentage: number })[], totalVotes, leadingCandidateId };
}, [filteredCandidateVotes]);

  const previousResultForThisDistrict = useMemo(() => {
    if (!districtId) return undefined;
    return previousDistrictResultsData.find(d => d.district_id === districtId);
  }, [districtId]);

  const swingAnalysisData = useMemo(() => {
    if (!districtId || !currentDistrictInfo || !districtResults.votes || districtResults.votes.length === 0) {
        console.log("[SwingAnalysisData] Retornando NULL - Dados de entrada insuficientes.");
        return null;
    }
    const currentWinner = districtResults.votes[0];
    const currentRunnerUp = districtResults.votes[1] || null;
    const previousResult = previousResultForThisDistrict;
    let actualSwingValue: number = 0;
    let swingText = "";
    let swingValueForGraph = 0;
    let graphTargetLegend = currentWinner.parl_front_legend;
    let graphOpponentLegend: string | null = null;
    let finalContextualSwingColor = '#E5E7EB';
    console.log(`[SwingAnalysisData] Distrito: ${districtId}`);
    console.log(`[SwingAnalysisData] Vencedor Atual: ${currentWinner?.candidate_name} (${currentWinner?.parl_front_legend})`);
    console.log(`[SwingAnalysisData] Vencedor Anterior (2018): ${previousResult?.winner_2018_legend}`);
    if (!previousResult) {
        actualSwingValue = 0;
        swingText = "Dados de 2018 não disponíveis para este distrito.";
        graphOpponentLegend = currentRunnerUp?.parl_front_legend || "Outros";
        finalContextualSwingColor = graphTargetLegend ? (coalitionColorMap[graphTargetLegend] ?? FALLBACK_COLOR) : FALLBACK_COLOR;
        console.log("[SwingAnalysisData] Caso: Sem resultado anterior.");
    } else {
        graphOpponentLegend = previousResult.winner_2018_legend;
        const currentWinnerLegend = currentWinner.parl_front_legend;
        const previousWinnerLegend = previousResult.winner_2018_legend;
        if (currentWinnerLegend && currentWinnerLegend === previousWinnerLegend) {
            console.log("[SwingAnalysisData] Caso: Manteve a Frente -", currentWinnerLegend);
            const swing = currentWinner.percentage - previousResult.winner_2018_percentage;
            actualSwingValue = swing;
            swingValueForGraph = Math.max(-10, Math.min(10, swing));
            graphTargetLegend = currentWinnerLegend;
            graphOpponentLegend = currentRunnerUp?.parl_front_legend || "Outros";
            if (swing > 0.05) {
                swingText = `De ${graphOpponentLegend} para ${currentWinnerLegend}.`;
                finalContextualSwingColor = coalitionColorMap[currentWinnerLegend] ?? FALLBACK_COLOR;
            } else if (swing < -0.05) {
                swingText = `De ${currentWinnerLegend} para ${graphOpponentLegend}.`;
                finalContextualSwingColor = graphOpponentLegend !== "Outros" && graphOpponentLegend ? (coalitionColorMap[graphOpponentLegend] ?? FALLBACK_COLOR) : FALLBACK_COLOR;
            } else {
                swingText = `${currentWinnerLegend} mantém com performance similar a 2018.`;
            }
        } else if (currentWinnerLegend && previousWinnerLegend) {
            console.log(`[SwingAnalysisData] Caso: Virada - De ${previousWinnerLegend} para ${currentWinnerLegend}`);
            const previousWinnerCurrentPerformance = districtResults.votes.find(
                v => v.parl_front_legend === previousWinnerLegend
            );
            const previousWinnerCurrentPercentage = previousWinnerCurrentPerformance?.percentage ?? 0;
            const swing = previousResult.winner_2018_percentage - previousWinnerCurrentPercentage;
            actualSwingValue = swing;
            swingValueForGraph = Math.max(-10, Math.min(10, swing));
            graphTargetLegend = currentWinnerLegend;
            graphOpponentLegend = previousWinnerLegend;
            swingText = `De ${previousWinnerLegend} para ${currentWinnerLegend}.`;
            finalContextualSwingColor = coalitionColorMap[currentWinnerLegend] ?? FALLBACK_COLOR;
        } else if (currentWinnerLegend) {
            console.log("[SwingAnalysisData] Caso: Vencedor atual, mas anterior incerto para comparação de swing.");
            actualSwingValue = currentWinner.percentage;
            swingText = `${currentWinnerLegend} é o novo líder.`;
            finalContextualSwingColor = coalitionColorMap[currentWinnerLegend] ?? FALLBACK_COLOR;
            graphOpponentLegend = "Cenário Anterior";
        } else {
            console.log("[SwingAnalysisData] Caso: Sem vencedor atual claro.");
            actualSwingValue = 0;
            swingText = "Resultado indefinido.";
            graphTargetLegend = null;
            graphOpponentLegend = null;
        }
    }
    const dataToReturn = {
        currentWinner,
        currentRunnerUp,
        previousWinnerInfo: previousResult || null,
        actualSwingValue,
        swingValueForGraph,
        graphTargetLegend,
        graphOpponentLegend,
        contextualSwingText: swingText,
        contextualSwingColor: finalContextualSwingColor,
    };
    return dataToReturn;
  }, [districtId, currentDistrictInfo, districtResults, previousResultForThisDistrict, coalitionColorMap]);

  if (!districtId) { return <div className="container mx-auto p-6 text-center text-red-600">ID do Distrito inválido na URL. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div> }
  // currentDistrictInfo é verificado aqui, então seu uso posterior no cabeçalho é seguro.
  if (!currentDistrictInfo) { return <div className="container mx-auto p-6 text-center text-red-600">Informações do distrito ID {districtId} não encontradas. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div> }


  const leaderCandidate = districtResults.votes.length > 0 ? districtResults.votes[0] : null;
  let districtWinnerLegend: string | undefined = undefined; // Alterado para undefined para melhor correspondência com a prop
  let districtWinnerColor: string = COALITION_FALLBACK_COLOR;
  let districtWinnerTagTextColor: string = getTextColorForBackground(districtWinnerColor);

  if (leaderCandidate) {
    const legend = leaderCandidate.parl_front_legend || leaderCandidate.party_legend;
    if (legend) {
        districtWinnerLegend = legend; // Apenas a legenda, "liderando" será adicionado na prop
        districtWinnerColor = coalitionColorMap[legend] || COALITION_FALLBACK_COLOR;
        districtWinnerTagTextColor = getTextColorForBackground(districtWinnerColor);
    }
  }

  // --- Preparando props para ApuracaoVisao ---
  const apuratedVotesCountForDisplay = districtResults.totalVotes;
  const areVotesBeingCountedForDisplay = districtResults.totalVotes > 0;

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline inline-block">&larr; Voltar para Visão Nacional</Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div className="space-y-1">
          {/* currentDistrictInfo é garantido como não nulo neste ponto devido à verificação anterior */}
          <Link href={`/estado/${currentDistrictInfo.uf.toLowerCase()}?time=${currentTime}`} className="inline-block">
            <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-300 transition-colors cursor-pointer">
              {currentDistrictInfo.uf_name}
            </span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            {currentDistrictInfo.district_name}
          </h1>
        </div>
        <div className="flex flex-col items-start md:flex-row md:items-end md:justify-end gap-2 md:gap-4">
            <div className="flex-shrink-0 order-1 md:order-none">
                {isLoadingVotes ? ( <span className="text-xs italic text-gray-500 whitespace-nowrap">Carregando status...</span>
                ) : districtWinnerLegend && leaderCandidate ? ( <span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={{ backgroundColor: districtWinnerColor, color: districtWinnerTagTextColor }}> {districtWinnerLegend} liderando </span>
                ) : ( <span className="text-xs italic text-gray-500 whitespace-nowrap"> {districtResults.votes.length > 0 ? 'Disputa acirrada' : 'Aguardando dados'} </span> )}
            </div>
            <ApuracaoVisao
                isLoadingVotes={isLoadingVotes}
                districtWinnerLegend={districtWinnerLegend ? `${districtWinnerLegend} liderando` : undefined}
                districtWinnerColor={districtWinnerColor}
                districtWinnerTagTextColor={districtWinnerTagTextColor}
                areVotesBeingCounted={areVotesBeingCountedForDisplay}
                apuratedVotesCount={apuratedVotesCountForDisplay}
                totalPollsCount={currentDistrictInfo?.polls_qtn || 0}
            />
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
                  Movimentação
                </button>
            </nav>
        </div>

        <div className="mt-4 min-h-[300px]">
            {isLoadingVotes && <p className="text-center text-gray-500">Carregando...</p>}
            {!isLoadingVotes && errorVotes && <p className="text-red-600 text-center">Erro: {errorVotes}</p>}
            {!isLoadingVotes && !errorVotes && apiVotesData && (
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
                    {districtViewMode === 'swing' && (
                        swingAnalysisData && currentDistrictInfo ? ( // Adicionada verificação de currentDistrictInfo aqui também por segurança
                        <SwingAnalysis
                            analysisData={swingAnalysisData}
                            colorMap={coalitionColorMap}
                            districtName={currentDistrictInfo.district_name} // Agora seguro devido à verificação acima e ao `if` no início do componente.
                        />
                        ) : (
                        <p className="text-center text-gray-500">
                            {isLoadingVotes ? 'Calculando dados de movimentação...' : 'Dados insuficientes para análise de movimentação.'}
                        </p>
                        )
                    )}
                </>
            )}
        </div>
      </div>

     <div className="text-left p-4 bg-white rounded-lg shadow-md border border-gray-200 mt-8">
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