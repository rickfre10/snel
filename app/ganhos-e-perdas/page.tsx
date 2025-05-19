// app/ganhos-e-perdas/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Se precisar de navegação programática

// Seus tipos e dados (ajuste os caminhos)
import { 
    DistrictInfoFromData, 
    CandidateVote, 
    StateOption,
    TickerEntry
} from '@/types/election';
import { districtsData, partyData } from '@/lib/staticData';
import { previousDistrictResultsData } from '@/lib/previousElectionData';
import { 
    calculateDistrictDynamicStatus, 
    DistrictStatusInput, 
    CoalitionVoteInfo,
    DistrictStatusOutput 
} from '@/lib/statusCalculator';

interface ApiVotesData {
    time: number;
    candidateVotes: CandidateVote[];
}

const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedStr = String(value).replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

// Defina a interface para os itens da lista de ganhos/perdas
interface SeatChangeListItem {
    districtId: number;
    districtName: string;
    stateId: string;
    currentWinnerName: string | null;
    currentWinnerCoalition: string | null;
    previousHolderCoalition: string | null;
    status: DistrictStatusOutput; // Usar o output completo do statusCalculator
    marginPercentage: number | null;
    marginVotes: number | null;
}

// Defina a interface para o sumário de ganhos/perdas por coligação
interface CoalitionGainLossSummary {
    [coalitionLegend: string]: {
        gained: number;
        lost: number;
        net: number; // gained - lost
        held: number;
    };
}

const COALITION_FALLBACK_COLOR = '#6B7280'; // Reutilize se necessário

export default function GainsLossesPage() {
    const [currentTime, setCurrentTime] = useState<number>(100); // Ou buscar da URL
    const [apiVotesData, setApiVotesData] = useState<ApiVotesData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStateFilter, setSelectedStateFilter] = useState<string | null>(null); // Novo estado para o filtro

    const router = useRouter();

    // Seu useEffect para buscar apiVotesData (similar a outras páginas)
    useEffect(() => {
        const fetchVoteData = async () => {
            setIsLoading(true); setError(null);
            try {
                const response = await fetch(`/api/results?time=${currentTime}`);
                if (!response.ok) throw new Error('Falha ao buscar dados');
                const data: ApiVotesData = await response.json();
                setApiVotesData(data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchVoteData();
    }, [currentTime]);

    const allStates: StateOption[] = useMemo(() => {
        const uniqueStates = new Map<string, string>();
        districtsData.forEach(district => {
          if (district.uf && district.uf_name) { uniqueStates.set(district.uf, district.uf_name); }
        });
        return Array.from(uniqueStates, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    const coalitionColorMap: Record<string, string> = useMemo(() => {
        const map: Record<string, string> = {};
        partyData.forEach(party => {
          if (party.parl_front_legend && party.parl_front_color) map[party.parl_front_legend] = party.parl_front_color;
          if (party.party_legend && party.party_color && !map[party.party_legend]) map[party.party_legend] = party.party_color;
        });
        return map;
    }, []);

    // --- CÁLCULO PRINCIPAL DE MUDANÇAS DE ASSENTOS E STATUS ---
    const districtSeatChanges = useMemo((): SeatChangeListItem[] => {
        if (isLoading || !apiVotesData?.candidateVotes || !districtsData) {
            return [];
        }

        let relevantDistricts = districtsData;
        if (selectedStateFilter) {
            relevantDistricts = districtsData.filter(d => d.uf === selectedStateFilter);
        }

        const changes: SeatChangeListItem[] = [];

        relevantDistricts.forEach(district => {
            const votesInDistrict = apiVotesData.candidateVotes.filter(
                vote => parseNumber(vote.district_id) === district.district_id
            );

            if (votesInDistrict.length === 0 && !selectedStateFilter && !isLoading) { // Só pular se não tiver filtro e não estiver carregando
                 // Se não há votos e não estamos filtrando um estado específico (onde poderia não haver dados ainda),
                 // podemos não adicionar ao ticker de todas as mudanças, a menos que queiramos mostrar "Aguardando"
                 // return;
            }

            const votesWithNumeric = votesInDistrict.map(v => ({ ...v, numericVotes: parseNumber(v.votes_qtn) }));
            const totalVotesInDistrict = votesWithNumeric.reduce((sum, cv) => sum + cv.numericVotes, 0);
            const sortedVotes = [...votesWithNumeric].sort((a, b) => b.numericVotes - a.numericVotes);

            const currentWinnerRaw = sortedVotes[0] || null;
            const runnerUpRaw = sortedVotes[1] || null;

            let leadingCoalition: CoalitionVoteInfo | undefined = undefined;
            if (currentWinnerRaw) {
                leadingCoalition = {
                    legend: currentWinnerRaw.parl_front_legend || currentWinnerRaw.party_legend || "N/D",
                    votes: currentWinnerRaw.numericVotes,
                    name: currentWinnerRaw.candidate_name,
                };
            }

            let runnerUpCoalition: CoalitionVoteInfo | undefined = undefined;
            if (runnerUpRaw) {
                runnerUpCoalition = {
                    legend: runnerUpRaw.parl_front_legend || runnerUpRaw.party_legend || "N/D",
                    votes: runnerUpRaw.numericVotes,
                    name: runnerUpRaw.candidate_name,
                };
            }

            const previousResult = previousDistrictResultsData.find(d => d.district_id === district.district_id);
            const previousHolder = previousResult?.winner_2018_legend || null;

            let remainingVotes = 0;
            if (district.voters_qtn && totalVotesInDistrict >= 0) {
                remainingVotes = district.voters_qtn - totalVotesInDistrict;
                if (remainingVotes < 0) remainingVotes = 0;
            }

            const statusInput: DistrictStatusInput = {
                isLoading: isLoading, // O isLoading geral da página pode ser usado aqui
                leadingCoalition,
                runnerUpCoalition,
                totalVotesInDistrict,
                remainingVotesEstimate: remainingVotes,
                previousSeatHolderCoalitionLegend: previousHolder,
                coalitionColorMap,
                fallbackCoalitionColor: COALITION_FALLBACK_COLOR,
            };
            const detailedStatus = calculateDistrictDynamicStatus(statusInput);

            let marginVotes: number | null = null;
            let marginPercentage: number | null = null;

            if (leadingCoalition && runnerUpCoalition) {
                marginVotes = leadingCoalition.votes - runnerUpCoalition.votes;
                if (totalVotesInDistrict > 0) {
                    const leaderPercentage = (leadingCoalition.votes / totalVotesInDistrict) * 100;
                    const runnerUpPercentageCalc = (runnerUpCoalition.votes / totalVotesInDistrict) * 100;
                    marginPercentage = leaderPercentage - runnerUpPercentageCalc;
                }
            } else if (leadingCoalition) { // Líder sem vice claro
                marginVotes = leadingCoalition.votes;
                if (totalVotesInDistrict > 0) {
                    marginPercentage = (leadingCoalition.votes / totalVotesInDistrict) * 100;
                }
            }
            
            changes.push({
                districtId: district.district_id,
                districtName: district.district_name,
                stateId: district.uf,
                currentWinnerName: leadingCoalition?.name || null,
                currentWinnerCoalition: detailedStatus.actingCoalitionLegend || leadingCoalition?.legend || null,
                previousHolderCoalition: previousHolder,
                status: detailedStatus,
                marginVotes,
                marginPercentage,
            });
        });
        return changes.sort((a,b)=> a.districtId - b.districtId);
    }, [isLoading, apiVotesData, districtsData, selectedStateFilter, coalitionColorMap]); // Adicionadas dependências

    // --- CÁLCULO DO SUMÁRIO DE GANHOS E PERDAS ---
    const gainLossSummary = useMemo((): CoalitionGainLossSummary => {
        const summary: CoalitionGainLossSummary = {};
        if (!partyData) return summary; // Precisa de partyData para inicializar todas as coalizões

        partyData.forEach(p => {
            if (p.parl_front_legend && !summary[p.parl_front_legend]) {
                summary[p.parl_front_legend] = { gained: 0, lost: 0, net: 0, held: 0 };
            }
             // Se quiser rastrear por partido também, adicione aqui
        });
         // Adiciona "N/D" ou outras legendas que possam surgir
        if (!summary["N/D"]) summary["N/D"] = { gained: 0, lost: 0, net: 0, held: 0 };


        districtSeatChanges.forEach(change => {
            const currentWinner = change.currentWinnerCoalition;
            const previousHolder = change.previousHolderCoalition;

            if (change.status.isFinal) { // Apenas considera mudanças finais
                if (currentWinner) {
                    if (!summary[currentWinner]) summary[currentWinner] = { gained: 0, lost: 0, net: 0, held: 0 };
                    if (previousHolder) {
                        if (!summary[previousHolder]) summary[previousHolder] = { gained: 0, lost: 0, net: 0, held: 0 };
                        if (currentWinner !== previousHolder) {
                            summary[currentWinner].gained++;
                            summary[previousHolder].lost++;
                        } else {
                            summary[currentWinner].held++;
                        }
                    } else { // Ganhou de "ninguém" (assento novo ou dados anteriores não claros)
                        summary[currentWinner].gained++;
                    }
                }
            }
        });

        Object.keys(summary).forEach(coalition => {
            summary[coalition].net = summary[coalition].gained - summary[coalition].lost;
        });

        return summary;
    }, [districtSeatChanges, partyData]);


    if (isLoading) return <div className="container mx-auto p-6 text-center">Carregando dados...</div>;
    if (error) return <div className="container mx-auto p-6 text-center text-red-500">Erro: {error}</div>;

    return (
        <div>
            <Head>
                <title>Ganhos e Perdas de Assentos - Eleições</title>
            </Head>
            <main className="container mx-auto p-4 lg:p-6 space-y-8">
                <header className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Ganhos e Perdas de Assentos</h1>
                    <p className="text-lg text-gray-600">Acompanhe a dinâmica das disputas distritais.</p>
                </header>

                {/* Filtro de Estado */}
                <section className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                    <label htmlFor="state-filter-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Filtrar por Estado:
                    </label>
                    <select
                        id="state-filter-select"
                        value={selectedStateFilter || ""}
                        onChange={(e) => setSelectedStateFilter(e.target.value || null)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-highlight focus:border-highlight sm:text-sm rounded-md"
                    >
                        <option value="">Todos os Estados (Nacional)</option>
                        {allStates.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                        ))}
                    </select>
                </section>

                {/* Sumário Nacional/Estadual de Ganhos e Perdas */}
                <section className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">
                        Sumário de Mudanças por Coalizão {selectedStateFilter ? `(${selectedStateFilter})` : '(Nacional)'}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {Object.entries(gainLossSummary)
                            .filter(([_, data]) => data.gained > 0 || data.lost > 0 || data.held > 0) // Mostra apenas quem teve alguma atividade
                            .sort(([, a], [, b]) => (b.net - a.net) || (b.gained - a.gained) ) // Ordena por saldo líquido, depois por ganhos
                            .map(([coalition, data]) => (
                            <div key={coalition} className="p-3 rounded-md border" style={{borderColor: coalitionColorMap[coalition] || COALITION_FALLBACK_COLOR}}>
                                <h3 className="font-bold text-md truncate" style={{color: coalitionColorMap[coalition] || COALITION_FALLBACK_COLOR}}>{coalition}</h3>
                                <p className="text-sm text-green-600">Ganhos: {data.gained}</p>
                                <p className="text-sm text-red-600">Perdas: {data.lost}</p>
                                <p className="text-sm text-blue-600">Manteve: {data.held}</p>
                                <p className="text-sm font-semibold">Saldo: {data.net > 0 ? '+' : ''}{data.net}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Lista Detalhada de Distritos */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">
                        Detalhes por Distrito {selectedStateFilter ? `(${selectedStateFilter})` : ''}
                    </h2>
                    {districtSeatChanges.length > 0 ? (
                        districtSeatChanges.map(item => (
                            <div key={item.districtId} className="p-4 bg-white rounded-lg shadow-md border border-l-4" style={{borderLeftColor: item.status.backgroundColor}}>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">{item.districtName} <span className="text-sm font-normal text-gray-500">({item.stateId})</span></h3>
                                        <p className="text-xs text-gray-600">
                                            Vencedor: <span className="font-medium">{item.currentWinnerName || "N/A"}</span>
                                            {item.currentWinnerCoalition && ` (${item.currentWinnerCoalition})`}
                                        </p>
                                        {item.previousHolderCoalition && item.currentWinnerCoalition !== item.previousHolderCoalition && (
                                            <p className="text-xs text-gray-500">
                                                (Anteriormente: {item.previousHolderCoalition})
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-2 sm:mt-0 text-left sm:text-right">
                                        <span 
                                            className="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap"
                                            style={{backgroundColor: item.status.backgroundColor, color: item.status.textColor}}
                                        >
                                            {item.status.label}
                                        </span>
                                        {(item.marginVotes !== null || item.marginPercentage !== null) && item.status.isFinal && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Margem: {item.marginVotes?.toLocaleString('pt-BR')} votos 
                                                ({item.marginPercentage?.toFixed(2)}%)
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-600 text-center py-10">
                            {selectedStateFilter ? `Nenhuma mudança de assento ou dados para ${selectedStateFilter}.` : "Nenhum dado de mudança de assento disponível."}
                        </p>
                    )}
                </section>
                 {/* Controles de Tempo */}
                <div className="text-center p-4 bg-white rounded-lg shadow-md border border-gray-200 container mx-auto mt-8 mb-6">
                    <h3 className="text-lg font-medium mb-2 text-gray-700">Ver Apuração em:</h3>
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button onClick={() => setCurrentTime(50)} disabled={isLoading} className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${currentTime === 50 ? 'bg-highlight text-white border-highlight' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100'} disabled:opacity-50 transition-colors`}>50%</button>
                        <button onClick={() => setCurrentTime(100)} disabled={isLoading} className={`px-4 py-2 text-sm font-medium rounded-r-lg border border-l-0 ${currentTime === 100 ? 'bg-highlight text-white border-highlight' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-100'} disabled:opacity-50 transition-colors`}>100%</button>
                    </div>
                    {isLoading && <p className="text-sm text-gray-500 mt-2 animate-pulse">Carregando resultados ({currentTime}%)...</p>}
                    {error && <p className="text-sm text-red-600 mt-2">Erro: {error}</p>}
                </div>
            </main>
        </div>
    );
}