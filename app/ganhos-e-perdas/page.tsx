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

const TEXT_COLOR_DARK_LOCAL = '#1F2937'; // Use nomes diferentes se houver conflito
const TEXT_COLOR_LIGHT_LOCAL = '#FFFFFF';

function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return TEXT_COLOR_DARK_LOCAL;
    let cleanHex = hexcolor.replace("#", "");
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    if (cleanHex.length !== 6) return TEXT_COLOR_DARK_LOCAL;
    try {
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128 || cleanHex.toLowerCase() === 'ffffff') ? TEXT_COLOR_DARK_LOCAL : TEXT_COLOR_LIGHT_LOCAL;
    } catch (e) {
        return TEXT_COLOR_DARK_LOCAL;
    }
}

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
    const [selectedStateFilter, setSelectedStateFilter] = useState<string | null>(null);
    const [resultTypeFilter, setResultTypeFilter] = useState<'onlyGains' | 'allDefinitive'>('onlyGains');
    const [selectedCoalitionFilter, setSelectedCoalitionFilter] = useState<string | null>(null); // NOVO: Estado para o filtro de coalizão
    
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

            if (votesInDistrict.length === 0 && !selectedStateFilter && !isLoading) {
                 return;
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
                isLoading: isLoading,
                leadingCoalition,
                runnerUpCoalition,
                totalVotesInDistrict,
                remainingVotesEstimate: remainingVotes,
                previousSeatHolderCoalitionLegend: previousHolder,
                coalitionColorMap,
                fallbackCoalitionColor: COALITION_FALLBACK_COLOR,
            };
            const detailedStatus = calculateDistrictDynamicStatus(statusInput);

            if (detailedStatus.isFinal) {
                let marginVotes: number | null = null;
                let marginPercentage: number | null = null;
                if (leadingCoalition && runnerUpCoalition) {
                    marginVotes = leadingCoalition.votes - runnerUpCoalition.votes;
                    if (totalVotesInDistrict > 0) {
                        const leaderPercentage = (leadingCoalition.votes / totalVotesInDistrict) * 100;
                        const runnerUpPercentageCalc = (runnerUpCoalition.votes / totalVotesInDistrict) * 100;
                        marginPercentage = leaderPercentage - runnerUpPercentageCalc;
                    }
                } else if (leadingCoalition) {
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
            }
        });
        return changes.sort((a,b)=> a.districtId - b.districtId);
    }, [isLoading, apiVotesData, districtsData, selectedStateFilter, coalitionColorMap]);

    // --- CÁLCULO DO SUMÁRIO DE GANHOS E PERDAS ---
    const gainLossSummary = useMemo((): CoalitionGainLossSummary => {
        const summary: CoalitionGainLossSummary = {};
        if (!partyData) return summary; 

        partyData.forEach(p => {
            if (p.parl_front_legend && !summary[p.parl_front_legend]) {
                summary[p.parl_front_legend] = { gained: 0, lost: 0, net: 0, held: 0 };
            }
        });
        if (!summary["N/D"]) summary["N/D"] = { gained: 0, lost: 0, net: 0, held: 0 };


        districtSeatChanges.forEach(change => {
            const currentWinner = change.currentWinnerCoalition;
            const previousHolder = change.previousHolderCoalition;

            if (change.status.isFinal) {
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
                    } else { 
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

    // NOVO: Gera a lista de coalizões ativas para os botões de filtro
    const activeCoalitionsForFilter = useMemo(() => {
        return Object.keys(gainLossSummary)
            .filter(key => gainLossSummary[key].gained > 0 || gainLossSummary[key].lost > 0 || gainLossSummary[key].held > 0)
            .sort();
    }, [gainLossSummary]);
    
    // ATUALIZADO: A lista de distritos agora aplica o filtro de coalizão
    const filteredDistrictListForDisplay = useMemo(() => {
        let list = districtSeatChanges;

        if (resultTypeFilter === 'onlyGains') {
            list = list.filter(item => {
                return item.currentWinnerCoalition !== item.previousHolderCoalition;
            });
        }
        
        // NOVO: Aplica o filtro de coalizão se um estiver selecionado
        if (selectedCoalitionFilter) {
            list = list.filter(item => item.currentWinnerCoalition === selectedCoalitionFilter);
        }

        return list;
    }, [districtSeatChanges, resultTypeFilter, selectedCoalitionFilter]);


    if (isLoading && !apiVotesData) return <div className="container mx-auto p-6 text-center">Carregando dados...</div>;
    if (error) return <div className="container mx-auto p-6 text-center text-red-500">Erro: {error}</div>;

    return (
        <div>
            <Head>
                <title>Ganhos e Perdas de Assentos - Eleições</title>
            </Head>
            <main className="container mx-auto p-4 lg:p-6 space-y-6">
                <div className="container mx-auto p-4 lg:p-6 space-y-8">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                        <Link href="/" className="text-blue-600 hover:underline">&larr; Visão Nacional</Link>
                    </div>
                </div>
                <header className="text-center mb-6">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Ganhos e Perdas de Assentos</h1>
                </header>

                {/* SEÇÃO DE FILTROS ATUALIZADA */}
                <section className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 mb-6 space-y-4">
                    {/* Filtros de Local e Tipo de Resultado */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-600">Local:</span>
                            <button onClick={() => setSelectedStateFilter(null)} className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md border ${!selectedStateFilter ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300'}`}>Nacional</button>
                            {allStates.map(s => (
                                <button key={s.id} onClick={() => setSelectedStateFilter(s.id)} className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md border ${selectedStateFilter === s.id ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300'}`}>{s.id}</button>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-600">Mostrar:</span>
                            <button onClick={() => setResultTypeFilter('onlyGains')} className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md border ${resultTypeFilter === 'onlyGains' ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300'}`}>Assentos Ganhos</button>
                            <button onClick={() => setResultTypeFilter('allDefinitive')} className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md border ${resultTypeFilter === 'allDefinitive' ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300'}`}>Todos Assentos</button>
                        </div>
                    </div>
                    {/* NOVO: Filtro de Frente Parlamentar */}
                    <div className="border-t pt-3 mt-3">
                         <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-600">Frente:</span>
                             <button onClick={() => setSelectedCoalitionFilter(null)} className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md border ${!selectedCoalitionFilter ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300'}`}>Todas</button>
                             {activeCoalitionsForFilter.map(coalition => (
                                <button key={coalition} onClick={() => setSelectedCoalitionFilter(coalition)} className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md border ${selectedCoalitionFilter === coalition ? 'bg-blue-600 text-white border-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300'}`}>{coalition}</button>
                            ))}
                         </div>
                    </div>
                </section>

                {Object.keys(gainLossSummary).length > 0 && (
                    <section className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {Object.entries(gainLossSummary)
                                .filter(([_, data]) => data.gained > 0 || data.lost > 0 || data.held > 0)
                                .sort(([, a], [, b]) => (b.net - a.net) || (b.gained - a.gained) )
                                .map(([coalition, data]) => (
                                <div key={coalition} className="p-2.5 rounded-md border shadow-sm flex flex-col items-center text-center" style={{borderColor: coalitionColorMap[coalition] || COALITION_FALLBACK_COLOR}}>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold mb-2 whitespace-nowrap shadow" style={{backgroundColor: coalitionColorMap[coalition] || COALITION_FALLBACK_COLOR, color: getTextColorForBackground(coalitionColorMap[coalition] || COALITION_FALLBACK_COLOR)}}>{coalition}</span>
                                    <div className="w-full text-xs space-y-0.5">
                                        <div className="flex justify-between"><span className="text-gray-500">GANHOS:</span><span className="font-semibold text-green-600">{data.gained}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">PERDAS:</span><span className="font-semibold text-red-600">{data.lost}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">MANTEVE:</span><span className="font-semibold text-blue-600">{data.held}</span></div>
                                        <div className="flex justify-between mt-1 pt-1 border-t"><span className="font-semibold text-gray-700">SALDO:</span><span className={`font-bold ${data.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{data.net > 0 ? '+' : ''}{data.net}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="space-y-2.5">
                    <h2 className="text-lg font-semibold text-gray-700 mb-3">
                        Detalhes por Distrito {selectedStateFilter ? `(${allStates.find(s => s.id === selectedStateFilter)?.name || selectedStateFilter})` : ''}
                        {resultTypeFilter === 'onlyGains' ? ' (Apenas Assentos Ganhos)' : ' (Todos Assentos Ganhos/Mantidos)'}
                        {selectedCoalitionFilter && ` | Frente: ${selectedCoalitionFilter}`}
                    </h2>
                    {filteredDistrictListForDisplay.length > 0 ? (
                        filteredDistrictListForDisplay.map(item => {
                            const isTurnover = item.previousHolderCoalition && item.currentWinnerCoalition && item.currentWinnerCoalition !== item.previousHolderCoalition && item.status.isFinal;
                            const leftBorderColor = isTurnover ? '#F59E0B' : item.status.backgroundColor;

                            return (
                                // MODIFICADO: O contêiner agora é um Link
                                <Link
                                    href={`/app/distrito/${item.districtId}`}
                                    key={item.districtId}
                                    className={`block p-3 bg-white rounded-md shadow border border-l-4 transition-all duration-200 ease-in-out hover:shadow-lg hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 ${isTurnover ? 'ring-2 ring-offset-1 ring-amber-400' : 'border-gray-200'}`} 
                                    style={{ borderLeftColor: leftBorderColor }}
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div className="mb-2 sm:mb-0 flex-grow pr-2">
                                            <h3 className="text-md font-semibold text-gray-800">{item.districtName} <span className="text-xs font-normal text-gray-500">({item.stateId})</span></h3>
                                            <p className="text-xs text-gray-600">Vencedor: <span className="font-medium">{item.currentWinnerName || "N/A"}</span>{item.currentWinnerCoalition && ` (${item.currentWinnerCoalition})`}</p>
                                            {isTurnover && (<p className="text-xs text-amber-600 font-semibold">GANHOU DE: {item.previousHolderCoalition}</p>)}
                                            {!isTurnover && item.previousHolderCoalition && item.currentWinnerCoalition === item.previousHolderCoalition && item.status.isFinal && (<p className="text-xs text-gray-500">(Manteve de: {item.previousHolderCoalition})</p>)}
                                        </div>
                                        <div className="text-left sm:text-right flex-shrink-0">
                                            <span className="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap" style={{backgroundColor: item.status.backgroundColor, color: item.status.textColor}}>{item.status.label}</span>
                                            {(item.marginVotes !== null || item.marginPercentage !== null) && item.status.isFinal && (
                                                <p className="text-xs text-gray-500 mt-1">Margem: {item.marginVotes?.toLocaleString('pt-BR')} votos {item.marginPercentage !== null ? ` (${item.marginPercentage?.toFixed(1)} p.p.)` : ''}</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    ) : (
                        <p className="text-gray-600 text-center py-10">Nenhum distrito corresponde aos filtros selecionados.</p>
                    )}
                </section>
                
                <div className="text-center p-4 bg-white rounded-lg shadow-md border border-gray-200 container mx-auto mt-6 mb-6">
                  <h3 className="text-lg font-medium mb-2 text-gray-700">Ver Apuração em:</h3>
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button onClick={() => setCurrentTime(50)} disabled={isLoading} className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${currentTime === 50 ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'} disabled:opacity-50 transition-colors`}>50%</button>
                        <button onClick={() => setCurrentTime(100)} disabled={isLoading} className={`px-4 py-2 text-sm font-medium rounded-r-lg border border-l-0 ${currentTime === 100 ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'} disabled:opacity-50 transition-colors`}>100%</button>
                    </div>
                    {isLoading && <p className="text-sm text-gray-500 mt-2 animate-pulse">Carregando resultados ({currentTime}%)...</p>}
                    {error && <p className="text-sm text-red-600 mt-2">Erro: {error}</p>}
                </div>
            </main>
        </div>
    );
}
