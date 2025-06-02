// app/parlamento/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import ParliamentCompositionChart from '@/components/ParliamentCompositionChart';
import CoalitionBuilderSimulator from '@/components/CoalitionBuilderSimulator';

import { calculateProportionalSeats, ProportionalVotesInput } from '@/lib/electionCalculations'; 
import { partyData, districtsData } from '@/lib/staticData';
import { previousDistrictResultsData } from '@/lib/previousElectionData'; // Necessário para status do distrito

// CORRIGIDO: Removida a tentativa de importar CoalitionVoteInfo daqui
import type { ProportionalVote, CandidateVote, DistrictInfoFromData } from '@/types/election'; 

// Lógica de Status Dinâmico (importações e helper local)
// CORRIGIDO: Adicionada importação de CoalitionVoteInfo daqui
import {
  calculateDistrictDynamicStatus,
  DistrictStatusInput,
  CoalitionVoteInfo, 
} from '@/lib/statusCalculator';

const TOTAL_SEATS_IN_PARLIAMENT = 213;
const MAJORITY_THRESHOLD = Math.floor(TOTAL_SEATS_IN_PARLIAMENT / 2) + 1;

const totalProportionalSeatsByState: Record<string, number> = { "TP": 1, "MA": 40, "MP": 23, "BA": 16, "PB": 9, "PN": 4 };
const COALITION_FALLBACK_COLOR = '#6B7280'; // Necessário para statusCalculator

// Helper checkIfStatusIsFinal (definido localmente)
const checkIfStatusIsFinal = (statusLabel: string | null | undefined): boolean => {
  if (!statusLabel) return false;
  const lowerLabel = statusLabel.toLowerCase();
  const finalKeywords = ["ganhou", "manteve", "eleito", "definido", "conquistou"]; 
  return finalKeywords.some(keyword => lowerLabel.includes(keyword));
};


const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') { const cleanedStr = String(value).replace(/\./g, '').replace(',', '.'); const num = parseFloat(cleanedStr); return isNaN(num) ? 0 : num; }
    return 0;
};
interface ApiAllVotesData { time: number; proportionalVotes: ProportionalVote[]; candidateVotes: CandidateVote[]; }

const buildColorMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  partyData.forEach(party => { if (party.parl_front_legend && party.parl_front_color) map[party.parl_front_legend] = party.parl_front_color; });
  partyData.forEach(party => { if (party.party_legend && party.party_color && !map[party.party_legend]) map[party.party_legend] = party.party_color; });
  return map;
};
const getAllUfInfo = (): { uf: string; stateName: string }[] => {
  const ufMap = new Map<string, string>();
  districtsData.forEach(d => { if (d.uf && d.uf_name && !ufMap.has(d.uf)) ufMap.set(d.uf, d.uf_name); });
  Object.keys(totalProportionalSeatsByState).forEach(uf => { if (!ufMap.has(uf)) { const dName = districtsData.find(d_1 => d_1.uf === uf); ufMap.set(uf, dName?.uf_name || uf); } });
  return Array.from(ufMap, ([uf, stateName]) => ({ uf, stateName })).sort((a,b) => a.stateName.localeCompare(b.stateName));
};

interface PartySeatDataForParliament {
    legend: string;
    seats: number;
    color: string;
}

const FALLBACK_COLOR_PARLIAMENT = '#CCCCCC';

const LEGEND_ORDER_FOR_PARLIAMENT_CHART: string[] = [
    "PSH", 
    "TDS", 
    "PSD", 
    "UNI", 
    "NAC", 
    "CON"  
];

export default function ParlamentoNacionalPage() {
  const searchParamsHook = useSearchParams();
  const [parliamentSeatData, setParliamentSeatData] = useState<PartySeatDataForParliament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // currentTime não é mais usado para a chamada da API, mas pode ser mantido se houver outros usos.
  // const [currentTime, setCurrentTime] = useState<number>(100); 

  const colorMap = useMemo(() => buildColorMap(), []);
  const allUfInfos = useMemo(() => getAllUfInfo(), []);
  
  // const initialTimeFromQuery = useMemo(() => searchParamsHook.get('time') ? parseInt(searchParamsHook.get('time')!, 10) : 100, [searchParamsHook]);
  // useEffect(() => { setCurrentTime(initialTimeFromQuery); }, [initialTimeFromQuery]);


  useEffect(() => {
    const fetchAndProcessNationalSeatData = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch(`/api/results?time=100`); 
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Falha API'); }
        const allVoteData: ApiAllVotesData = await response.json();

        const legendsSet = new Set<string>();
        partyData.forEach(p => { if (p.parl_front_legend) legendsSet.add(p.parl_front_legend); if (p.party_legend) legendsSet.add(p.party_legend); });
        allVoteData.proportionalVotes.forEach(v => { if (v.parl_front_legend) legendsSet.add(v.parl_front_legend); });
        allVoteData.candidateVotes.forEach(v => { if (v.parl_front_legend) legendsSet.add(v.parl_front_legend); if (v.party_legend) legendsSet.add(v.party_legend);});
        
        const nationalTotalSeatsByLegend: Record<string, number> = {};
        Array.from(legendsSet).forEach(l => nationalTotalSeatsByLegend[l] = 0);

        // --- CÁLCULO DE ASSENTOS PROPORCIONAIS (JÁ ATUALIZADO) ---
        allUfInfos.forEach(({ uf }) => {
          const seatsForStateProportional = totalProportionalSeatsByState[uf] || 0;
          if (seatsForStateProportional === 0) return;
          const allProportionalVotesInUf = allVoteData.proportionalVotes.filter(v => v.uf === uf);
          const voteThreshold = uf === "TP" ? 40000 : 250000;
          const eligibleVotesInUf: ProportionalVotesInput[] = allProportionalVotesInUf
            .filter(vote => {
                const numericVotes = parseNumber(vote.proportional_votes_qtn);
                return numericVotes > voteThreshold;
            })
            .filter(vote => vote.parl_front_legend) 
            .map(vote => ({ 
                legend: vote.parl_front_legend!, 
                votes: parseNumber(vote.proportional_votes_qtn) 
            }));
            
          if (seatsForStateProportional > 0 && eligibleVotesInUf.length > 0) {
            const calculatedPrSeatsObj = calculateProportionalSeats(
              eligibleVotesInUf, 
              seatsForStateProportional, 
              5 
            );
            Object.keys(calculatedPrSeatsObj).forEach(legend_1 => { 
              if (!nationalTotalSeatsByLegend[legend_1]) nationalTotalSeatsByLegend[legend_1] = 0;
              nationalTotalSeatsByLegend[legend_1] += calculatedPrSeatsObj[legend_1];
            });
          }
        });

        // --- CÁLCULO DE ASSENTOS DISTRITAIS (ATUALIZADO COM STATUS FINAL) ---
        const allDistrictEntities: DistrictInfoFromData[] = districtsData;
        allDistrictEntities.forEach(district => {
          const votesInDistrict = allVoteData.candidateVotes.filter(
            vote => parseNumber(vote.district_id) === district.district_id
          );

          if (votesInDistrict.length > 0) {
            const votesWithNumeric = votesInDistrict.map(v => ({ ...v, numericVotes: parseNumber(v.votes_qtn) }));
            const totalVotesInThisDistrict = votesWithNumeric.reduce((sum, current) => sum + current.numericVotes, 0);
            const sortedVotes = [...votesWithNumeric].sort((a, b) => b.numericVotes - a.numericVotes);
            
            const leadingCandidateData = sortedVotes[0] || null;
            const runnerUpCandidateData = sortedVotes[1] || null;

            // CORRIGIDO: Usa CoalitionVoteInfo importado de statusCalculator
            let leadingCoalitionForStatus: CoalitionVoteInfo | undefined = undefined;
            if (leadingCandidateData) {
                leadingCoalitionForStatus = {
                    legend: leadingCandidateData.parl_front_legend || leadingCandidateData.party_legend || "N/D",
                    votes: leadingCandidateData.numericVotes, name: leadingCandidateData.candidate_name
                };
            }
            // CORRIGIDO: Usa CoalitionVoteInfo importado de statusCalculator
            let runnerUpCoalitionForStatus: CoalitionVoteInfo | undefined = undefined;
            if (runnerUpCandidateData) {
                runnerUpCoalitionForStatus = {
                    legend: runnerUpCandidateData.parl_front_legend || runnerUpCandidateData.party_legend || "N/D",
                    votes: runnerUpCandidateData.numericVotes, name: runnerUpCandidateData.candidate_name
                };
            }
            
            const previousResultForThisDistrict = previousDistrictResultsData.find(d => d.district_id === district.district_id);
            const previousSeatHolderLegend = previousResultForThisDistrict?.winner_2018_legend || null;
            
            let remainingVotesEst = 0;
            if (district.voters_qtn && totalVotesInThisDistrict >= 0) { 
                remainingVotesEst = district.voters_qtn - totalVotesInThisDistrict;
                if (remainingVotesEst < 0) remainingVotesEst = 0;
            }

            const statusInputForDistrict: DistrictStatusInput = {
                isLoading: false, 
                leadingCoalition: leadingCoalitionForStatus,
                runnerUpCoalition: runnerUpCoalitionForStatus,
                totalVotesInDistrict: totalVotesInThisDistrict,
                remainingVotesEstimate: remainingVotesEst,
                previousSeatHolderCoalitionLegend: previousSeatHolderLegend,
                coalitionColorMap: colorMap, 
                fallbackCoalitionColor: COALITION_FALLBACK_COLOR 
            };
            const detailedStatus = calculateDistrictDynamicStatus(statusInputForDistrict);
            const isDistrictFinal = checkIfStatusIsFinal(detailedStatus.label);

            if (isDistrictFinal && leadingCandidateData) { 
                const winnerLegend = leadingCandidateData.parl_front_legend || leadingCandidateData.party_legend;
                if (winnerLegend) {
                    if (!nationalTotalSeatsByLegend[winnerLegend]) nationalTotalSeatsByLegend[winnerLegend] = 0; 
                    nationalTotalSeatsByLegend[winnerLegend] += 1;
                }
            }
          }
        });

        const processedSeatData: PartySeatDataForParliament[] = [];
        
        LEGEND_ORDER_FOR_PARLIAMENT_CHART.forEach(orderedLegend => {
            const seats = nationalTotalSeatsByLegend[orderedLegend] || 0;
            processedSeatData.push({
                legend: orderedLegend,
                seats,
                color: colorMap[orderedLegend] || FALLBACK_COLOR_PARLIAMENT
            });
        });

        Object.keys(nationalTotalSeatsByLegend).forEach(legend_2 => {
            if (!LEGEND_ORDER_FOR_PARLIAMENT_CHART.includes(legend_2)) {
                const seats = nationalTotalSeatsByLegend[legend_2] || 0;
                if (seats > 0 || (legendsSet.has(legend_2) && !processedSeatData.find(p => p.legend === legend_2))) {
                    processedSeatData.push({
                        legend: legend_2,
                        seats,
                        color: colorMap[legend_2] || FALLBACK_COLOR_PARLIAMENT
                    });
                 }
            }
        });
        
        const sumOfCalculatedSeats = processedSeatData.reduce((acc, party) => acc + party.seats, 0);

        console.log("Soma total de assentos para o parlamento:", sumOfCalculatedSeats);
        if (sumOfCalculatedSeats !== TOTAL_SEATS_IN_PARLIAMENT) {
            console.warn(`ALERTA: A soma dos assentos calculados (${sumOfCalculatedSeats}) não é igual ao total esperado de ${TOTAL_SEATS_IN_PARLIAMENT}.`);
        }
        
        setParliamentSeatData(processedSeatData);

      } catch (e) {
        console.error("Erro ao buscar ou processar dados para o parlamento:", e);
        setError(e instanceof Error ? e.message : "Erro desconhecido.");
      } finally {
        setIsLoading(false);
      }
    };

    if (allUfInfos.length > 0) { fetchAndProcessNationalSeatData(); }
    else { setIsLoading(false); setError("Lista de UFs não pôde ser carregada."); }
  }, [allUfInfos, colorMap]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen bg-slate-100"><p className="text-xl text-gray-500 animate-pulse">Carregando dados do parlamento...</p></div>;
  }
  if (error) {
    return <div className="container mx-auto p-6 text-center text-red-500">Erro: {error} <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  if (parliamentSeatData.length === 0 && !isLoading ) { 
    return <div className="container mx-auto p-6 text-center text-gray-500">Não há dados de assentos para exibir o parlamento.</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8 antialiased">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 space-y-10">
        <header className="text-center mb-8">
          <Link href="/" className="text-sky-600 hover:text-sky-800 hover:underline mb-6 inline-block transition-colors text-sm">
            &larr; Voltar para Nacional
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-3xl lg:text-4xl tracking-tight">
            Balanço de poder
          </h1>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-7 gap-6 xl:gap-8 items-start">
          <section className="lg:col-span-4">
            <ParliamentCompositionChart
              seatData={parliamentSeatData}
              totalSeatsInLayout={TOTAL_SEATS_IN_PARLIAMENT} 
              majorityThreshold={MAJORITY_THRESHOLD}
            />
          </section>
          <section className="lg:col-span-3">
            <CoalitionBuilderSimulator
              partySeatData={parliamentSeatData} 
              totalSeatsInParliament={TOTAL_SEATS_IN_PARLIAMENT}
              majorityThreshold={MAJORITY_THRESHOLD}
            />
          </section>
        </main>

        <footer className="text-center py-10 mt-12 border-t border-slate-200">
        </footer>
      </div>
    </div>
  );
}
