// app/distrito/[districtId]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Seus componentes existentes
import CandidateCardInfo, { CandidateCardInfoProps } from '@/components/CandidateCardInfo'; // Importe o tipo das props também
import DistrictBarChart from '@/components/DistrictBarChart';
import ApuracaoVisao from '@/components/ApuracaoVisao';

// Tipos e Dados Estáticos
import { CandidateVote, DistrictInfoFromData } from '@/types/election'; // Removidos PartyInfo, DistrictResultInfo, TickerEntry, ProportionalVote se não usados diretamente aqui
import { districtsData, partyData } from '@/lib/staticData'; // partyData ainda é usado para coalitionColorMap
import { previousDistrictResultsData } from '@/lib/previousElectionData'; // Removido PreviousDistrictResult se só o array é usado

// Importar a nova lógica de status
import { calculateDistrictDynamicStatus, getSimplifiedCandidateStatus, DistrictStatusInput, DistrictStatusOutput, CoalitionVoteInfo } from '@/lib/statusCalculator'; // Ajuste o caminho
import SwingAnalysis from '@/components/SwingAnalysis';

type DistrictViewMode = 'candidates' | 'bars' | 'swing' ;

interface ApiVotesData {
  time: number;
  candidateVotes: CandidateVote[];
  // proportionalVotes: ProportionalVote[]; // Removido se não usado nesta página
}

// ... (FALLBACK_COLOR, COALITION_FALLBACK_COLOR, parseNumber, getTextColorForBackground - mantenha como estão) ...
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
    if (hexcolor.length !== 6 && hexcolor.length !== 3) return '#1F2937';
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(char => char + char).join('');
    }
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128 || hexcolor.toLowerCase() === 'ffffff' || hexcolor.toLowerCase() === '#ffffff') ? '#1F2937' : '#FFFFFF';
    } catch (e) { return '#1F2937'; }
}


// Defina o tipo para os candidatos processados que irão para CandidateCardInfo
interface CandidateVoteProcessedForCard extends CandidateVote {
  percentage: number;
  numericVotes: number;
  status?: string; // Status simplificado: "Eleito", "Liderando", "Processando"
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
    // Garantir que vote.district_id seja comparado como número
    return apiVotesData.candidateVotes.filter(vote => Number(vote.district_id) === districtId );
  }, [apiVotesData?.candidateVotes, districtId]);

  const districtResults = useMemo(() => {
    if (!filteredCandidateVotes || filteredCandidateVotes.length === 0) {
      return { votes: [], totalVotes: 0, leadingCandidate: null, runnerUpCandidate: null };
    }
    const votesWithNumeric = filteredCandidateVotes.map(v => ({...v, numericVotes: parseNumber(v.votes_qtn)}));
    const totalVotes = votesWithNumeric.reduce((sum, current) => sum + current.numericVotes, 0);
    const sortedVotes = [...votesWithNumeric].sort((a,b) => b.numericVotes - a.numericVotes);
    
    const leadingCandidate = sortedVotes[0] || null;
    const runnerUpCandidate = sortedVotes[1] || null;

    const votesWithPercentage = sortedVotes.map(vote => ({
      ...vote,
      percentage: totalVotes > 0 ? ((vote.numericVotes / totalVotes) * 100) : 0,
    }));
    return {
      votes: votesWithPercentage as (CandidateVote & { numericVotes: number, percentage: number })[],
      totalVotes,
      leadingCandidate: leadingCandidate as (CandidateVote & { numericVotes: number, percentage: number }) | null, // Para ter numericVotes e percentage
      runnerUpCandidate: runnerUpCandidate as (CandidateVote & { numericVotes: number, percentage: number }) | null, // Para ter numericVotes e percentage
    };
  }, [filteredCandidateVotes]);

  const previousResultForThisDistrict = useMemo(() => {
    if (!districtId) return undefined;
    return previousDistrictResultsData.find(d => d.district_id === districtId);
  }, [districtId]);

  // --- CÁLCULO DO NOVO STATUS DINÂMICO ---
  const detailedDistrictStatus = useMemo((): DistrictStatusOutput => {
    const previousSeatHolder = previousResultForThisDistrict?.winner_2018_legend || null;
    
    let leadingCoalitionData: CoalitionVoteInfo | undefined = undefined;
    if (districtResults.leadingCandidate) {
      leadingCoalitionData = {
        legend: districtResults.leadingCandidate.parl_front_legend || districtResults.leadingCandidate.party_legend || "N/A",
        votes: districtResults.leadingCandidate.numericVotes,
        name: districtResults.leadingCandidate.candidate_name
      };
    }

    let runnerUpCoalitionData: CoalitionVoteInfo | undefined = undefined;
    if (districtResults.runnerUpCandidate) {
      runnerUpCoalitionData = {
        legend: districtResults.runnerUpCandidate.parl_front_legend || districtResults.runnerUpCandidate.party_legend || "N/A",
        votes: districtResults.runnerUpCandidate.numericVotes,
        name: districtResults.runnerUpCandidate.candidate_name
      };
    }

    // Cálculo da estimativa de votos restantes
    // Usaremos voters_qtn como total de eleitores aptos e districtResults.totalVotes como total apurado
    // Assumindo que currentDistrictInfo.voters_qtn é o total esperado de votos.
    let remainingVotesEstimate = 0;
    if (currentDistrictInfo && currentDistrictInfo.voters_qtn && districtResults.totalVotes >= 0) {
        remainingVotesEstimate = currentDistrictInfo.voters_qtn - districtResults.totalVotes;
        if (remainingVotesEstimate < 0) remainingVotesEstimate = 0; // Não pode ser negativo
    } else if (currentDistrictInfo && currentDistrictInfo.polls_qtn > 0) {
        // Fallback: Estimativa baseada em urnas se voters_qtn não for confiável ou ausente
        // Supondo que ApuracaoVisao ainda use a lógica de 500 votos/urna para seu display interno,
        // aqui precisamos de uma estimativa para a lógica de virada.
        // Se não tivermos urnas apuradas, não podemos estimar bem.
        // Esta parte pode precisar de mais dados (ex: urnas apuradas de fato).
        // Por simplicidade, se voters_qtn não estiver disponível, a precisão da virada pode ser comprometida.
        // Deixaremos remainingVotesEstimate como 0 se não houver voters_qtn para simplificar.
    }


    const statusInput: DistrictStatusInput = {
      isLoading: isLoadingVotes,
      leadingCoalition: leadingCoalitionData,
      runnerUpCoalition: runnerUpCoalitionData,
      totalVotesInDistrict: districtResults.totalVotes,
      remainingVotesEstimate: remainingVotesEstimate,
      previousSeatHolderCoalitionLegend: previousSeatHolder,
    };

    return calculateDistrictDynamicStatus(statusInput);
  }, [
    isLoadingVotes,
    districtResults.leadingCandidate,
    districtResults.runnerUpCandidate,
    districtResults.totalVotes,
    currentDistrictInfo, // Adicionado currentDistrictInfo para voters_qtn/polls_qtn
    previousResultForThisDistrict,
  ]);


  // --- Preparar dados para CandidateCardInfo com o novo status ---
  const processedCandidatesForCard: CandidateCardInfoProps['data'] = useMemo(() => {
    if (!districtResults.votes || !currentDistrictInfo) return [];

    return districtResults.votes.map(candidate => {
      const isCandidateTheLeader = candidate.candidate_name === districtResults.leadingCandidate?.candidate_name; // Uma forma de verificar
      
      // Adiciona numericVotes e percentage se não estiverem já no tipo base (CandidateVote)
      // No seu districtResults, 'votes' já tem numericVotes e percentage
      const candidateProcessed = candidate as (CandidateVote & { numericVotes: number, percentage: number });

      return {
        ...candidateProcessed,
        status: getSimplifiedCandidateStatus(
          detailedDistrictStatus,
          candidateProcessed.parl_front_legend || candidateProcessed.party_legend,
          isCandidateTheLeader
        ),
      };
    });
  }, [districtResults.votes, districtResults.leadingCandidate, detailedDistrictStatus, currentDistrictInfo]);


  // SwingAnalysisData (mantenha sua lógica existente, apenas certifique-se que não conflita)
  const swingAnalysisData = useMemo(() => {
    // ... sua lógica de swingAnalysisData ...
    // Certifique-se que districtResults.votes[0] e [1] são usados corretamente aqui
    // e que currentDistrictInfo está disponível.
    if (!districtId || !currentDistrictInfo || !districtResults.votes || districtResults.votes.length === 0) {
        return null;
    }
    const currentWinner = districtResults.votes[0];
    const currentRunnerUp = districtResults.votes[1] || null;
    const previousResult = previousResultForThisDistrict;
    // ... resto da sua lógica ...
    if (!currentWinner) return null; // Adicionar guarda para currentWinner

    let actualSwingValue: number = 0;
    let swingText = "";
    let swingValueForGraph = 0;
    let graphTargetLegend = currentWinner.parl_front_legend;
    let graphOpponentLegend: string | null = null;
    let finalContextualSwingColor = '#E5E7EB';

    if (!previousResult) {
        actualSwingValue = 0;
        swingText = "Dados de 2018 não disponíveis para este distrito.";
        graphOpponentLegend = currentRunnerUp?.parl_front_legend || "Outros";
        finalContextualSwingColor = graphTargetLegend ? (coalitionColorMap[graphTargetLegend] ?? FALLBACK_COLOR) : FALLBACK_COLOR;
    } else {
        graphOpponentLegend = previousResult.winner_2018_legend;
        const currentWinnerLegend = currentWinner.parl_front_legend;
        const previousWinnerLegend = previousResult.winner_2018_legend;
        if (currentWinnerLegend && currentWinnerLegend === previousWinnerLegend) {
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
            actualSwingValue = currentWinner.percentage;
            swingText = `${currentWinnerLegend} é o novo líder.`;
            finalContextualSwingColor = coalitionColorMap[currentWinnerLegend] ?? FALLBACK_COLOR;
            graphOpponentLegend = "Cenário Anterior";
        } else {
            actualSwingValue = 0;
            swingText = "Resultado indefinido.";
            graphTargetLegend = null;
            graphOpponentLegend = null;
        }
    }
    return {
        currentWinner, currentRunnerUp, previousWinnerInfo: previousResult || null,
        actualSwingValue, swingValueForGraph, graphTargetLegend, graphOpponentLegend,
        contextualSwingText: swingText, contextualSwingColor: finalContextualSwingColor,
    };
  }, [districtId, currentDistrictInfo, districtResults, previousResultForThisDistrict, coalitionColorMap]);

  if (!districtId) { return <div className="container mx-auto p-6 text-center text-red-600">ID do Distrito inválido na URL. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div> }
  if (!currentDistrictInfo) { return <div className="container mx-auto p-6 text-center text-red-600">Informações do distrito ID {districtId} não encontradas. <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div> }

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline inline-block">&larr; Voltar para Visão Nacional</Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div className="space-y-1">
          <Link href={`/estado/${currentDistrictInfo.uf.toLowerCase()}?time=${currentTime}`} className="inline-block">
            <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-300 transition-colors cursor-pointer">
              {currentDistrictInfo.uf_name}
            </span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            {currentDistrictInfo.district_name}
          </h1>
        </div>
        {/* ÁREA DE STATUS E APURAÇÃO UNIFICADA NO ApuracaoVisao */}
        <ApuracaoVisao
            isLoadingVotes={isLoadingVotes} // Passa o estado de carregamento dos votos
            // Props para o rótulo de status dinâmico
            statusLabel={detailedDistrictStatus.label}
            statusLabelColor={detailedDistrictStatus.backgroundColor}
            statusLabelTextColor={detailedDistrictStatus.textColor}
            // Props existentes para a apuração de urnas/votos
            areVotesBeingCounted={districtResults.totalVotes > 0}
            apuratedVotesCount={districtResults.totalVotes}
            totalPollsCount={currentDistrictInfo?.polls_qtn || 0} // Usa polls_qtn real
        />
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
                        processedCandidatesForCard.length > 0 ?
                        <CandidateCardInfo
                            data={processedCandidatesForCard}
                            // leadingId precisa ser o ID do candidato líder, não apenas o nome.
                            // Ajustar se necessário, districtResults.leadingCandidate pode ter o ID.
                            leadingId={districtResults.leadingCandidate?.candidate_id || districtResults.leadingCandidate?.candidate_name || null}
                            coalitionColorMap={coalitionColorMap}
                        /> : <p className="text-center text-gray-500">Sem dados de candidatos para este distrito neste momento.</p>
                    )}
                    {districtViewMode === 'bars' && (
                          districtResults.votes.length > 0 ? // Usa districtResults.votes aqui pois DistrictBarChart espera esse formato
                        <DistrictBarChart
                            data={districtResults.votes}
                            colorMap={coalitionColorMap}
                        /> : <p className="text-center text-gray-500">Sem dados de candidatos para este distrito neste momento.</p>
                    )}
                    {districtViewMode === 'swing' && (
                        swingAnalysisData && currentDistrictInfo ?
                        <SwingAnalysis
                            analysisData={swingAnalysisData}
                            colorMap={coalitionColorMap}
                            districtName={currentDistrictInfo.district_name}
                        />
                        : (
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