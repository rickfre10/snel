// app/nacional/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import NationalProportionalOverview, {
  NationalComparisonEntry,
  StateDetailEntry,
} from '@/components/NationalProportionalOverview';

import { calculateProportionalSeats } from '@/lib/electionCalculations';
import { partyData, districtsData } from '@/lib/staticData';
import {
    previousStateProportionalPercentagesData, // Ainda usado para % anterior DENTRO do estado
    previousStateProportionalSeatsData,
} from '@/lib/previousElectionData';

import type {
    ProportionalVote,
    DistrictInfoFromData,
} from '@/types/election';

const totalProportionalSeatsByState: Record<string, number> = { "TP": 1, "MA": 40, "MP": 23, "BA": 16, "PB": 9, "PN": 4 };

const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedStr = String(value).replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

interface ApiAllVotesData {
  time: number;
  proportionalVotes: ProportionalVote[];
}

// Dados de votos nominais da eleição anterior por estado e legenda
interface PreviousStateNominalVotes {
  uf: string;
  legend: string;
  previous_votes: number;
}

const previousStateNominalVotesData: PreviousStateNominalVotes[] = [
  { legend: "TDS", uf: "TP", previous_votes: 18711 }, { legend: "UNI", uf: "TP", previous_votes: 58610 }, { legend: "CON", uf: "TP", previous_votes: 30664 }, { legend: "PSD", uf: "TP", previous_votes: 23381 }, { legend: "PSH", uf: "TP", previous_votes: 6202 }, { legend: "NAC", uf: "TP", previous_votes: 12599 },
  { legend: "TDS", uf: "MA", previous_votes: 12356062 }, { legend: "UNI", uf: "MA", previous_votes: 2414895 }, { legend: "CON", uf: "MA", previous_votes: 192479 }, { legend: "PSD", uf: "MA", previous_votes: 561397 }, { legend: "PSH", uf: "MA", previous_votes: 939225 }, { legend: "NAC", uf: "MA", previous_votes: 1358044 },
  { legend: "TDS", uf: "MP", previous_votes: 5592764 }, { legend: "UNI", uf: "MP", previous_votes: 1714682 }, { legend: "CON", uf: "MP", previous_votes: 117764 }, { legend: "PSD", uf: "MP", previous_votes: 1716712 }, { legend: "PSH", uf: "MP", previous_votes: 463949 }, { legend: "NAC", uf: "MP", previous_votes: 546181 },
  { legend: "TDS", uf: "BA", previous_votes: 3183583 }, { legend: "UNI", uf: "BA", previous_votes: 1742630 }, { legend: "CON", uf: "BA", previous_votes: 175328 }, { legend: "PSD", uf: "BA", previous_votes: 455711 }, { legend: "PSH", uf: "BA", previous_votes: 1002989 }, { legend: "NAC", uf: "BA", previous_votes: 538051 },
  { legend: "TDS", uf: "PB", previous_votes: 683861 }, { legend: "UNI", uf: "PB", previous_votes: 932673 }, { legend: "CON", uf: "PB", previous_votes: 468572 }, { legend: "PSD", uf: "PB", previous_votes: 1159510 }, { legend: "PSH", uf: "PB", previous_votes: 352733 }, { legend: "NAC", uf: "PB", previous_votes: 127386 },
  { legend: "TDS", uf: "PN", previous_votes: 281576 }, { legend: "UNI", uf: "PN", previous_votes: 785097 }, { legend: "CON", uf: "PN", previous_votes: 127120 }, { legend: "PSD", uf: "PN", previous_votes: 386312 }, { legend: "PSH", uf: "PN", previous_votes: 36735 }, { legend: "NAC", uf: "PN", previous_votes: 91752 },
];


const buildColorMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  partyData.forEach(party => {
    if (party.parl_front_legend && party.parl_front_color) {
      map[party.parl_front_legend] = party.parl_front_color;
    }
  });
  return map;
};

const getAllUfInfo = (): { uf: string; stateName: string }[] => {
  const ufMap = new Map<string, string>();
  districtsData.forEach(d => { if (d.uf && d.uf_name && !ufMap.has(d.uf)) ufMap.set(d.uf, d.uf_name); });
  Object.keys(totalProportionalSeatsByState).forEach(uf => {
    if (!ufMap.has(uf)) {
      const districtWithName = districtsData.find(d => d.uf === uf);
      ufMap.set(uf, districtWithName?.uf_name || uf);
    }
  });
  return Array.from(ufMap, ([uf, stateName]) => ({ uf, stateName })).sort((a,b) => a.stateName.localeCompare(b.stateName));
};


export default function NacionalOverviewPage() {
  const searchParamsHook = useSearchParams();
  const [comparisonData, setComparisonData] = useState<NationalComparisonEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(100);

  const colorMap = useMemo(() => buildColorMap(), []);
  const allUfInfos = useMemo(() => getAllUfInfo(), []);
  const initialTimeFromQuery = useMemo(() => searchParamsHook.get('time') ? parseInt(searchParamsHook.get('time')!, 10) : 100, [searchParamsHook]);

  useEffect(() => { setCurrentTime(initialTimeFromQuery); }, [initialTimeFromQuery]);

  useEffect(() => {
    const fetchAndProcessData = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch(`/api/results?time=${currentTime}`);
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Falha API'); }
        const allVoteData: ApiAllVotesData = await response.json();

        const legends = new Set<string>();
        partyData.forEach(p => { if (p.parl_front_legend) legends.add(p.parl_front_legend); });
        allVoteData.proportionalVotes.forEach(v => { if (v.parl_front_legend) legends.add(v.parl_front_legend); });
        previousStateNominalVotesData.forEach(v => legends.add(v.legend)); // Usar os novos dados para popular legendas
        previousStateProportionalSeatsData.forEach(s => Object.keys(s.seats).forEach(l => legends.add(l)));

        const processedEntries: NationalComparisonEntry[] = [];
        const totalCurrentNationalProportionalVotesAllLegends = allVoteData.proportionalVotes.reduce((sum, v) => sum + parseNumber(v.proportional_votes_qtn), 0);

        // Calcular totais nacionais da eleição anterior usando os novos dados nominais
        const previousNationalVotesByLegend: Record<string, number> = {};
        let overallTotalPreviousNationalVotes = 0;
        previousStateNominalVotesData.forEach(voteData => {
          previousNationalVotesByLegend[voteData.legend] = (previousNationalVotesByLegend[voteData.legend] || 0) + voteData.previous_votes;
          overallTotalPreviousNationalVotes += voteData.previous_votes;
        });

        legends.forEach(legend => {
          let currentNationalVotes = 0;
          let currentNationalProportionalSeats = 0;
          let previousNationalTotalProportionalSeatsForLegend = 0; // Renomeado para clareza
          const stateDetails: StateDetailEntry[] = [];

          allUfInfos.forEach(({ uf, stateName }) => {
            const currentVotesForLegendInUf = allVoteData.proportionalVotes
              .filter(v => v.uf === uf && v.parl_front_legend === legend)
              .reduce((sum, v) => sum + parseNumber(v.proportional_votes_qtn), 0);
            currentNationalVotes += currentVotesForLegendInUf;

            const allProportionalVotesInUfCurrent = allVoteData.proportionalVotes
              .filter(v => v.uf === uf && v.parl_front_legend)
              .map(v => ({ legend: v.parl_front_legend!, votes: parseNumber(v.proportional_votes_qtn) }));
            
            const totalProportionalVotesInUfCurrentForCalc = allProportionalVotesInUfCurrent.reduce((sum, v) => sum + v.votes, 0);
            const currentPercentInState = totalProportionalVotesInUfCurrentForCalc > 0 ? (currentVotesForLegendInUf / totalProportionalVotesInUfCurrentForCalc) * 100 : undefined;

            const seatsForState = totalProportionalSeatsByState[uf] || 0;
            let currentSeatsInState = 0;
            if (seatsForState > 0 && allProportionalVotesInUfCurrent.length > 0) {
              const calculatedSeatsObj = calculateProportionalSeats(allProportionalVotesInUfCurrent, seatsForState, 5);
              currentSeatsInState = calculatedSeatsObj[legend] || 0;
            }
            currentNationalProportionalSeats += currentSeatsInState;

            const prevPercDataUf = previousStateProportionalPercentagesData.find(s => s.uf === uf);
            const previousPercentInState = prevPercDataUf?.percentages[legend];

            const prevSeatsDataUf = previousStateProportionalSeatsData.find(s => s.uf === uf);
            const previousSeatsInState = prevSeatsDataUf?.seats[legend] || 0;
            // previousNationalTotalProportionalSeatsForLegend será calculado uma vez fora deste loop

            if(currentSeatsInState > 0 || previousSeatsInState > 0 || currentPercentInState !== undefined || previousPercentInState !== undefined) {
                stateDetails.push({
                    uf, stateName, currentSeatsInState, previousSeatsInState,
                    currentPercentInState, previousPercentInState,
                });
            }
          });

          previousNationalTotalProportionalSeatsForLegend = allUfInfos.reduce((acc, {uf}) => {
            const prevSeatsDataUf = previousStateProportionalSeatsData.find(s => s.uf === uf);
            return acc + (prevSeatsDataUf?.seats[legend] || 0);
          },0);

          const currentNationalPercent = totalCurrentNationalProportionalVotesAllLegends > 0 ? (currentNationalVotes / totalCurrentNationalProportionalVotesAllLegends) * 100 : 0;
          const previousNationalPercent = overallTotalPreviousNationalVotes > 0 ? ((previousNationalVotesByLegend[legend] || 0) / overallTotalPreviousNationalVotes) * 100 : 0;

          if (currentNationalPercent > 0.001 || previousNationalPercent > 0.001 || currentNationalProportionalSeats > 0 || previousNationalTotalProportionalSeatsForLegend > 0) {
            processedEntries.push({
              legend,
              currentNationalPercent,
              previousNationalPercent,
              currentNationalSeats: currentNationalProportionalSeats,
              previousNationalSeats: previousNationalTotalProportionalSeatsForLegend,
              stateDetails,
            });
          }
        });

        setComparisonData(processedEntries);
      } catch (e) {
        console.error("Erro ao buscar ou processar dados nacionais:", e);
        setError(e instanceof Error ? e.message : "Erro desconhecido ao carregar dados.");
      } finally {
        setIsLoading(false);
      }
    };

    if (allUfInfos.length > 0) { fetchAndProcessData(); }
    else { setIsLoading(false); setError("Lista de UFs não pôde ser carregada."); }
  }, [currentTime, allUfInfos]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen bg-slate-100"><p className="text-xl text-gray-500 animate-pulse">Carregando dados nacionais...</p></div>;
  }
  if (error) {
    return <div className="container mx-auto p-6 text-center text-red-500">Erro: {error} <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  if (comparisonData.length === 0 && !isLoading) {
    return <div className="container mx-auto p-6 text-center text-gray-500">Não há dados nacionais para exibir. Verifique a fonte de dados e os filtros.</div>;
  }

  return (
    <div className="bg-slate-100 min-h-screen py-8">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 space-y-10">
        <header className="text-center mb-8">
          <div className="mb-6">
            <label htmlFor="time-select-national" className="text-sm font-medium mr-2 text-slate-700">Ver Apuração em:</label>
            <select 
              id="time-select-national" 
              value={currentTime} 
              onChange={(e) => setCurrentTime(parseInt(e.target.value, 10))} 
              className="rounded border-gray-300 shadow-sm p-2 text-sm"
            >
                <option value={50}>50%</option>
                <option value={100}>100%</option>
            </select>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl tracking-tight">
            Panorama Nacional Proporcional
          </h1>
          <p className="mt-4 text-xl text-slate-700">
            Comparativo da votação proporcional: Atual vs. Eleição Anterior ({currentTime}% apurados).
          </p>
        </header>
        <main>
          <NationalProportionalOverview
            comparisonEntries={comparisonData}
            colorMap={colorMap}
          />
        </main>
        <footer className="text-center py-10 mt-12 border-t border-slate-300">
          <p className="text-sm text-slate-500">
            Os totais de cadeiras nacionais referem-se à soma das cadeiras proporcionais obtidas nos estados.
          </p>
        </footer>
      </div>
    </div>
  );
}