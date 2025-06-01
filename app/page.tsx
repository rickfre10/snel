// app/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Componentes de Visualização da Home
import InteractiveMap from '../components/InteractiveMap';
import SeatCompositionPanel from '../components/SeatCompositionPanel';
import RaceTicker from '../components/RaceTicker';

// Tipos e Dados Estáticos
import { CandidateVote, ProportionalVote, DistrictInfoFromData, PartyInfo, StateOption, DistrictOption, DistrictResultInfo, TickerEntry } from '../types/election';
import { districtsData, partyData} from '../lib/staticData';
import { previousDistrictResultsData } from '../lib/previousElectionData';
import { mapDimensions } from '../lib/mapLayout'; 

// Lógica de Cálculo e Dados de Configuração
import { calculateProportionalSeats, ProportionalVotesInput } from '../lib/electionCalculations';
import {
  calculateDistrictDynamicStatus,
  DistrictStatusInput,
  DistrictStatusOutput,
  CoalitionVoteInfo
} from '../lib/statusCalculator';

const totalProportionalSeatsByState: Record<string, number> = {
  "TP": 1, "MA": 40, "MP": 23, "BA": 16, "PB": 9, "PN": 4
};

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

// Helper para verificar se o status do distrito é considerado final
const checkIfStatusIsFinal = (statusLabel: string | null | undefined): boolean => {
  if (!statusLabel) return false;
  const lowerLabel = statusLabel.toLowerCase();
  const finalKeywords = ["ganhou", "manteve", "eleito", "definido", "conquistou"]; // Adicione mais palavras-chave se necessário
  return finalKeywords.some(keyword => lowerLabel.includes(keyword));
};

// Tipo para o parâmetro que pode vir do InteractiveMap
type PossibleMapCallbackParam = string | { district_id?: number | string; id?: number | string; [key: string]: any } | null | undefined;


// --- COMPONENTE PRINCIPAL DA HOME ---
export default function Home() {
  const [currentTime, setCurrentTime] = useState<number>(100); // Padrão, já que os botões de tempo serão removidos
  const [apiVotesData, setApiVotesData] = useState<ApiVotesData | null>(null);
  const [isLoadingVotes, setIsLoadingVotes] = useState<boolean>(true);
  const [errorVotes, setErrorVotes] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [hoveredDistrictInfo, setHoveredDistrictInfo] = useState<string | null>(null);

  const router = useRouter();

  const handleNavigate = () => {
    // A navegação ainda usa currentTime, que será o valor mais recente após a remoção dos botões de controle.
    // Se a API sempre fornecer o mais recente, o parâmetro `time` pode se tornar opcional na URL.
    if (selectedDistrict && selectedState) {
      router.push(`/distrito/${selectedDistrict}?time=${currentTime}`);
    } else if (selectedState) {
      router.push(`/estado/${selectedState.toLowerCase()}?time=${currentTime}`);
    }
  };

  // --- Busca de Dados de Votos ---
  // Envolvemos fetchVoteData em useCallback para evitar recriação desnecessária
  // se fosse passada como dependência para outro useEffect.
  const fetchVoteData = useCallback(async () => {
    // Não resetar isLoadingVotes para true a cada atualização automática para evitar piscar de "Carregando..."
    // A menos que seja a primeira carga.
    if (!apiVotesData) {
        setIsLoadingVotes(true);
    }
    setErrorVotes(null);
    try {
        // `currentTime` aqui pode ser o valor mais recente do estado, ou, se a API
        // sempre retorna o último, este parâmetro pode não ser necessário.
        // Por ora, mantemos como está, assumindo que a API pode usar `time`.
        const response = await fetch(`/api/results?time=${currentTime}`);
        if (!response.ok) {
             let errorMsg = 'Erro ao buscar votos';
             try { errorMsg = (await response.json()).error || errorMsg; } catch (e) {}
             throw new Error(errorMsg);
        }
        const data: ApiVotesData = await response.json();
        setApiVotesData(data);
        // Atualiza currentTime com o tempo dos dados recebidos, se necessário
        // Isso garante que `currentTime` reflita o "tempo" dos dados mais recentes.
        if (data.time) {
            setCurrentTime(data.time);
        }
    } catch (err: unknown) {
        console.error("Falha API Votos:", err);
        setErrorVotes(err instanceof Error ? err.message : 'Erro desconhecido');
        // Não limpar apiVotesData em caso de erro de atualização para manter os dados antigos visíveis
    } finally {
        setIsLoadingVotes(false);
    }
  }, [currentTime, apiVotesData]); // Adicionado apiVotesData para a lógica de isLoadingVotes

  useEffect(() => {
    fetchVoteData(); // Busca inicial

    // Configura o intervalo para atualização automática
    const intervalId = setInterval(() => {
      console.log("Atualizando dados da API automaticamente...");
      fetchVoteData();
    }, 60000); // 60000 ms = 1 minuto

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);
  }, [fetchVoteData]); // fetchVoteData está agora em useCallback

  // --- Cálculos Derivados (useMemo) ---

  const states: StateOption[] = useMemo(() => {
    const uniqueStates = new Map<string, string>();
    districtsData.forEach(district => {
      if (district.uf && district.uf_name) { uniqueStates.set(district.uf, district.uf_name); }
    });
    return Array.from(uniqueStates, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const districts: DistrictOption[] = useMemo(() => {
    if (!selectedState) return [];
    return districtsData
      .filter(district => district.uf === selectedState)
      .map(district => ({ id: district.district_id, name: district.district_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedState]);

  const coalitionColorMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    partyData.forEach(party => {
      if (party.parl_front_legend && party.parl_front_color && !map[party.parl_front_legend]) {
        map[party.parl_front_legend] = party.parl_front_color;
      }
    });
    return map;
  }, []);

  // Sumário de Resultados por Distrito (para o mapa E para o ticker)
  // Esta estrutura agora também inclui informações de status para cada distrito.
  const districtResultsSummaryAndStatus = useMemo(() => {
    const summary: Record<string, DistrictResultInfo & { isFinal: boolean; statusLabel: string | null; totalVotesInDistrict: number }> = {};
    if (!apiVotesData?.candidateVotes || !districtsData || !coalitionColorMap || !previousDistrictResultsData) {
        // Preenche com dados básicos se a API ainda não carregou, para que o mapa possa renderizar distritos vazios
        districtsData.forEach(d => {
            const districtIdStr = String(d.district_id);
            summary[districtIdStr] = {
                winnerLegend: null,
                winnerName: undefined,
                districtName: d.district_name,
                maxVotes: 0,
                isFinal: false, // Status padrão
                statusLabel: "Aguardando dados...", // Status padrão
                totalVotesInDistrict: 0,
            };
        });
        return summary;
    }

    const votesByDistrict: Record<string, CandidateVote[]> = {};
    apiVotesData.candidateVotes.forEach((vote: CandidateVote) => {
        const districtIdStr = String(vote.district_id);
        if (!districtIdStr) return;
        if (!votesByDistrict[districtIdStr]) { votesByDistrict[districtIdStr] = []; }
        if (vote.candidate_name && vote.votes_qtn !== undefined && vote.votes_qtn !== null) {
            votesByDistrict[districtIdStr].push(vote);
        }
    });

    districtsData.forEach(d => {
        const districtIdStr = String(d.district_id);
        const districtNum = d.district_id;
        const votesInCurrentDistrict = votesByDistrict[districtIdStr] || [];
        
        const votesWithNumeric = votesInCurrentDistrict.map(v => ({ ...v, numericVotes: parseNumber(v.votes_qtn) }));
        const totalVotesInDistrict = votesWithNumeric.reduce((sum, current) => sum + current.numericVotes, 0);
        const sortedVotes = [...votesWithNumeric].sort((a, b) => b.numericVotes - a.numericVotes);

        const leadingCandidateData = sortedVotes[0] || null;
        const runnerUpCandidateData = sortedVotes[1] || null;

        let leadingCoalition: CoalitionVoteInfo | undefined = undefined;
        if (leadingCandidateData) {
            leadingCoalition = {
                legend: leadingCandidateData.parl_front_legend || leadingCandidateData.party_legend || "N/D",
                votes: leadingCandidateData.numericVotes,
                name: leadingCandidateData.candidate_name
            };
        }

        let runnerUpCoalition: CoalitionVoteInfo | undefined = undefined;
        if (runnerUpCandidateData) {
            runnerUpCoalition = {
                legend: runnerUpCandidateData.parl_front_legend || runnerUpCandidateData.party_legend || "N/D",
                votes: runnerUpCandidateData.numericVotes,
                name: runnerUpCandidateData.candidate_name
            };
        }

        const previousResult = previousDistrictResultsData.find(pr => pr.district_id === districtNum);
        const previousSeatHolderCoalitionLegend = previousResult?.winner_2018_legend || null;

        let remainingVotesEstimate = 0;
        if (d.voters_qtn && totalVotesInDistrict >= 0) {
            remainingVotesEstimate = d.voters_qtn - totalVotesInDistrict;
            if (remainingVotesEstimate < 0) remainingVotesEstimate = 0;
        }

        const statusInput: DistrictStatusInput = {
            isLoading: isLoadingVotes, // Passando o estado de carregamento geral
            leadingCoalition: leadingCoalition,
            runnerUpCoalition: runnerUpCoalition,
            totalVotesInDistrict: totalVotesInDistrict,
            remainingVotesEstimate: remainingVotesEstimate,
            previousSeatHolderCoalitionLegend: previousSeatHolderCoalitionLegend,
            coalitionColorMap: coalitionColorMap,
        };
        const detailedStatus = calculateDistrictDynamicStatus(statusInput);
        const isFinalStatus = checkIfStatusIsFinal(detailedStatus.label);

        const winner = leadingCandidateData; // O líder é o "vencedor" para fins de exibição
        const maxVotes = winner ? winner.numericVotes : 0;

        summary[districtIdStr] = {
            winnerLegend: winner?.parl_front_legend ?? null,
            winnerName: winner?.candidate_name,
            districtName: d.district_name,
            maxVotes: maxVotes,
            isFinal: isFinalStatus,
            statusLabel: detailedStatus.label,
            totalVotesInDistrict: totalVotesInDistrict,
        };
    });
    return summary;
  }, [apiVotesData, isLoadingVotes, coalitionColorMap, districtsData, previousDistrictResultsData]);
  
  // Calcular Assentos Distritais por Frente (para painel)
  const districtSeatsByCoalition = useMemo(() => {
    const seatCounts: Record<string, number> = {};
    if (!districtResultsSummaryAndStatus) return seatCounts;

    Object.values(districtResultsSummaryAndStatus).forEach(result => {
      if (result.isFinal && result.winnerLegend) {
        seatCounts[result.winnerLegend] = (seatCounts[result.winnerLegend] || 0) + 1;
      }
    });
    return seatCounts;
  }, [districtResultsSummaryAndStatus]);

  const nationalProportionalSeatsByCoalition = useMemo(() => {
    const nationalPRCounts: Record<string, number> = {};
    if (!apiVotesData?.proportionalVotes) { return nationalPRCounts; }

    Object.keys(totalProportionalSeatsByState).forEach(uf => {
      const seatsForThisState = totalProportionalSeatsByState[uf];
      if (seatsForThisState === 0) return; 

      const votesInThisState = apiVotesData.proportionalVotes.filter(vote => vote.uf === uf);
      
      const proportionalVotesInputForState: ProportionalVotesInput[] = votesInThisState
        .filter(vote => vote.parl_front_legend) 
        .map(vote => ({
          legend: vote.parl_front_legend!, 
          votes: parseNumber(vote.proportional_votes_qtn)
        }));

      const prSeatsThisState = calculateProportionalSeats(
        proportionalVotesInputForState,
        seatsForThisState,
        5 // Cláusula de barreira de 5%
      );

      Object.entries(prSeatsThisState).forEach(([legend, seats]) => {
        nationalPRCounts[legend] = (nationalPRCounts[legend] || 0) + seats;
      });
    });
    return nationalPRCounts;
  }, [apiVotesData?.proportionalVotes]);

  const finalNationalSeatComposition = useMemo(() => {
    const combinedSeats: Record<string, number> = {};
    if (!districtSeatsByCoalition || !nationalProportionalSeatsByCoalition) return combinedSeats;

    const allFronts = new Set<string>([
      ...Object.keys(districtSeatsByCoalition),
      ...Object.keys(nationalProportionalSeatsByCoalition)
    ]);

    allFronts.forEach(front => {
      if (typeof front === 'string' && front.trim() !== "" && front !== "null" && front !== "undefined") {
        combinedSeats[front] =
          (districtSeatsByCoalition[front] || 0) +
          (nationalProportionalSeatsByCoalition[front] || 0);
      }
    });
    return combinedSeats;
  }, [districtSeatsByCoalition, nationalProportionalSeatsByCoalition]);

  const grandTotalSeats = useMemo(() => {
    const totalDistrict = districtsData.length; 
    const totalProportional = Object.values(totalProportionalSeatsByState)
      .reduce((sum: number, seats: number) => sum + seats, 0);
    return totalDistrict + totalProportional;
  }, []); // districtsData e totalProportionalSeatsByState são estáticos

  // Calcular Dados para o Ticker
  const tickerData: TickerEntry[] = useMemo(() => {
    if (isLoadingVotes || !districtResultsSummaryAndStatus || Object.keys(districtResultsSummaryAndStatus).length === 0 || !apiVotesData?.candidateVotes || !districtsData || !previousDistrictResultsData) {
      return [];
    }

    const dataForTicker: TickerEntry[] = [];

    Object.entries(districtResultsSummaryAndStatus).forEach(([districtIdStr, result]) => {
      const districtNum = parseInt(districtIdStr, 10);
      const districtInfo = districtsData.find(d => d.district_id === districtNum);
      if (!districtInfo) return;

      const votesInDistrict = apiVotesData.candidateVotes.filter(v => String(v.district_id) === districtIdStr) || [];
      const votesWithNumeric = votesInDistrict.map(v => ({ ...v, numericVotes: parseNumber(v.votes_qtn) }));
      const sortedVotes = [...votesWithNumeric].sort((a, b) => b.numericVotes - a.numericVotes);
      
      const leadingCandidateData = sortedVotes[0] || null;
      const runnerUpCandidateData = sortedVotes[1] || null;

      const totalVotesInDistrict = result.totalVotesInDistrict; 

      const leadingCandidatePercentage = leadingCandidateData && totalVotesInDistrict > 0 ? (leadingCandidateData.numericVotes / totalVotesInDistrict) * 100 : null;
      const runnerUpPercentage = runnerUpCandidateData && totalVotesInDistrict > 0 ? (runnerUpCandidateData.numericVotes / totalVotesInDistrict) * 100 : null;
      
       const statusInputForTicker: DistrictStatusInput = {
        isLoading: isLoadingVotes,
        leadingCoalition: leadingCandidateData ? { legend: leadingCandidateData.parl_front_legend || "N/D", votes: leadingCandidateData.numericVotes, name: leadingCandidateData.candidate_name } : undefined,
        runnerUpCoalition: runnerUpCandidateData ? { legend: runnerUpCandidateData.parl_front_legend || "N/D", votes: runnerUpCandidateData.numericVotes, name: runnerUpCandidateData.candidate_name } : undefined,
        totalVotesInDistrict: totalVotesInDistrict,
        remainingVotesEstimate: districtInfo.voters_qtn ? Math.max(0, districtInfo.voters_qtn - totalVotesInDistrict) : 0,
        previousSeatHolderCoalitionLegend: previousDistrictResultsData.find(d => d.district_id === districtNum)?.winner_2018_legend || null,
        coalitionColorMap: coalitionColorMap,
      };
      const detailedStatusForTicker = calculateDistrictDynamicStatus(statusInputForTicker);

      const entry: TickerEntry = {
        district_id: districtNum,
        districtName: result.districtName || "N/D", 
        stateId: districtInfo.uf,
        stateName: districtInfo.uf_name,
        
        statusLabel: detailedStatusForTicker.label, 
        statusBgColor: detailedStatusForTicker.backgroundColor, 
        statusTextColor: detailedStatusForTicker.textColor, 

        winnerName: result.winnerName || null,
        winnerLegend: detailedStatusForTicker.actingCoalitionLegend || result.winnerLegend || null, 
        winnerPercentage: leadingCandidatePercentage,
        runnerUpLegend: runnerUpCandidateData?.parl_front_legend || null,
        runnerUpPercentage: runnerUpPercentage,
        runnerUpName: runnerUpCandidateData?.candidate_name || null,
      };
      dataForTicker.push(entry);
    });

    dataForTicker.sort((a, b) => (a.district_id - b.district_id));
    return dataForTicker;
  }, [districtResultsSummaryAndStatus, isLoadingVotes, coalitionColorMap, apiVotesData?.candidateVotes, districtsData, previousDistrictResultsData]);

  // --- Handlers ---
  const handleStateChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const newState = event.target.value; setSelectedState(newState || null); setSelectedDistrict(null); };
  const handleDistrictChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const newDistrictId = event.target.value ? parseInt(event.target.value, 10) : null; setSelectedDistrict(newDistrictId); };
  
  const handleDistrictHover = (districtInfoFromMap: { districtName?: string; winnerName?: string; winnerLegend?: string; districtId?: string } | null) => {
    if (districtInfoFromMap && districtInfoFromMap.districtId) {
        const fullDistrictInfo = districtResultsSummaryAndStatus[districtInfoFromMap.districtId];
        if (fullDistrictInfo) {
            setHoveredDistrictInfo(
                `Distrito: ${fullDistrictInfo.districtName || districtInfoFromMap.districtId} | ${fullDistrictInfo.statusLabel} ${fullDistrictInfo.winnerName ? `(${fullDistrictInfo.winnerName} - ${fullDistrictInfo.winnerLegend || 'N/D'})` : ''}`
            );
        } else {
             setHoveredDistrictInfo(`Distrito: ${districtInfoFromMap.districtName || districtInfoFromMap.districtId}`);
        }
    } else {
        setHoveredDistrictInfo(null);
    }
  };

  const handleDistrictClick = (districtClickedInfo: { districtId: string }) => {
    if (districtClickedInfo.districtId) {
      router.push(`/distrito/${districtClickedInfo.districtId}?time=${currentTime}`);
    }
  };

  // --- Renderização ---
  return (
    <div>
      <Head>
        <title>Smartv - Eleições 2022</title>
        <meta name="description" content="Visão geral da apuração eleitoral Haagar" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto p-4 lg:p-6 space-y-8">
        <div className="my-4 p-3 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex flex-wrap justify-center items-center gap-2">
            <Link href={`/ganhos-e-perdas?time=${currentTime}`} legacyBehavior>
              <a className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 focus:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm font-medium shadow-sm transition-colors">
                Movimentação de Assentos
              </a>
            </Link>
            <Link href={`/nacional?time=${currentTime}`} legacyBehavior>
              <a className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 focus:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm font-medium shadow-sm transition-colors">
                Panorama Nacional
              </a>
            </Link>
            <Link href={`/nacional/parlamento?time=${currentTime}`} legacyBehavior>
              <a className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 focus:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm font-medium shadow-sm transition-colors">
                Balanço de poder
              </a>
            </Link>
            <span className="text-gray-300 hidden sm:inline mx-2">|</span>
            {states.map(s => (
              <Link key={s.id} href={`/estado/${s.id.toLowerCase()}?time=${currentTime}`} legacyBehavior>
                <a className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm font-medium shadow-sm transition-colors">
                  {s.id}
                </a>
              </Link>
            ))}
          </div>
        </div>

        <div className="relative">
         <InteractiveMap
             results={districtResultsSummaryAndStatus} 
             colorMap={coalitionColorMap}
             onDistrictHover={(dataFromMap: PossibleMapCallbackParam) => { 
                let idToUse: string | undefined = undefined;
                if (typeof dataFromMap === 'string') {
                    idToUse = dataFromMap;
                } else if (dataFromMap && typeof dataFromMap === 'object') {
                    if (dataFromMap.district_id !== undefined) {
                        idToUse = String(dataFromMap.district_id);
                    } else if (dataFromMap.id !== undefined) {
                        idToUse = String(dataFromMap.id);
                    }
                }

                if (idToUse && districtResultsSummaryAndStatus[idToUse]) {
                    const info = districtResultsSummaryAndStatus[idToUse];
                    handleDistrictHover({ 
                        districtId: idToUse,
                        districtName: info.districtName,
                        winnerName: info.winnerName,
                        winnerLegend: info.winnerLegend === null ? undefined : info.winnerLegend // CORRIGIDO AQUI
                    });
                } else {
                    handleDistrictHover(null);
                }
             }}
             onDistrictClick={(dataFromMap: PossibleMapCallbackParam) => { 
                let idToUse: string | undefined = undefined;
                if (typeof dataFromMap === 'string') {
                    idToUse = dataFromMap;
                } else if (dataFromMap && typeof dataFromMap === 'object') {
                     if (dataFromMap.district_id !== undefined) {
                        idToUse = String(dataFromMap.district_id);
                    } else if (dataFromMap.id !== undefined) {
                        idToUse = String(dataFromMap.id);
                    }
                }
                if (idToUse) {
                    handleDistrictClick({ districtId: idToUse });
                }
             }}
         />
         {hoveredDistrictInfo && ( <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white p-2 rounded text-xs shadow-lg pointer-events-none z-10">{hoveredDistrictInfo}</div> )}
        </div>

        <div>
             <SeatCompositionPanel
                 seatData={finalNationalSeatComposition} 
                 colorMap={coalitionColorMap}
                 totalSeats={grandTotalSeats}
             />
        {(tickerData.length > 0 && !isLoadingVotes) && ( 
            <RaceTicker data={tickerData} colorMap={coalitionColorMap} interval={8000} />
        )}
        </div>

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
          <div className="ml-0 sm:ml-4 mt-2 sm:mt-0">
            <button
              onClick={handleNavigate}
              disabled={!selectedState || isLoadingVotes}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Navegar
            </button>
          </div>
        </div>
      </main>

      <div className="text-center p-4 container mx-auto mb-6">
          {isLoadingVotes && !apiVotesData && <p className="text-sm text-gray-500 mt-2 animate-pulse">Carregando resultados iniciais...</p>}
          {errorVotes && <p className="text-sm text-red-600 mt-2">Erro ao carregar dados: {errorVotes}</p>}
          {apiVotesData && !isLoadingVotes && <p className="text-sm text-gray-500 mt-2">Dados atualizados. Próxima atualização em breve.</p>}
      </div>
    </div>
  );
}
