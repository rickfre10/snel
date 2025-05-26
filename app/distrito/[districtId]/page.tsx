// app/parlamento/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import ParliamentCompositionChart from '@/components/ParliamentCompositionChart';
import CoalitionBuilderSimulator from '@/components/CoalitionBuilderSimulator';

import { calculateProportionalSeats } from '@/lib/electionCalculations';
import { partyData, districtsData } from '@/lib/staticData';

import type { ProportionalVote, CandidateVote, DistrictInfoFromData } from '@/types/election';

// Constantes do Parlamento Nacional
const TOTAL_SEATS_IN_PARLIAMENT = 213; // 120 Distritais + 93 Proporcionais
const MAJORITY_THRESHOLD = Math.floor(TOTAL_SEATS_IN_PARLIAMENT / 2) + 1; // 107

const totalProportionalSeatsByState: Record<string, number> = { "TP": 1, "MA": 40, "MP": 23, "BA": 16, "PB": 9, "PN": 4 };

const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') { const cleanedStr = String(value).replace(/\./g, '').replace(',', '.'); const num = parseFloat(cleanedStr); return isNaN(num) ? 0 : num; }
    return 0;
};
interface ApiAllVotesData {
  time: number;
  proportionalVotes: ProportionalVote[];
  candidateVotes: CandidateVote[];
}

const buildColorMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  partyData.forEach(party => { if (party.parl_front_legend && party.parl_front_color) map[party.parl_front_legend] = party.parl_front_color; });
  // Adicionar cores para legendas de partido também, se necessário, como fallback
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

const FALLBACK_COLOR_PARLIAMENT = '#CCCCCC'; // Cinza claro para legendas sem cor definida

export default function ParlamentoNacionalPage() {
  const searchParamsHook = useSearchParams();
  const [parliamentSeatData, setParliamentSeatData] = useState<PartySeatDataForParliament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(100);

  const colorMap = useMemo(() => buildColorMap(), []);
  const allUfInfos = useMemo(() => getAllUfInfo(), []);
  const initialTimeFromQuery = useMemo(() => searchParamsHook.get('time') ? parseInt(searchParamsHook.get('time')!, 10) : 100, [searchParamsHook]);

  useEffect(() => { setCurrentTime(initialTimeFromQuery); }, [initialTimeFromQuery]);

  useEffect(() => {
    const fetchAndProcessNationalSeatData = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch(`/api/results?time=${currentTime}`);
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Falha ao buscar dados da API'); }
        const allVoteData: ApiAllVotesData = await response.json();

        const legendsSet = new Set<string>();
        partyData.forEach(p => { if (p.parl_front_legend) legendsSet.add(p.parl_front_legend); if (p.party_legend) legendsSet.add(p.party_legend); });
        allVoteData.proportionalVotes.forEach(v => { if (v.parl_front_legend) legendsSet.add(v.parl_front_legend); });
        allVoteData.candidateVotes.forEach(v => { if (v.parl_front_legend) legendsSet.add(v.parl_front_legend); if (v.party_legend) legendsSet.add(v.party_legend);});
        
        const nationalTotalSeatsByLegend: Record<string, number> = {};
        Array.from(legendsSet).forEach(l => nationalTotalSeatsByLegend[l] = 0);

        // 1. Calcular Total de Cadeiras Proporcionais Nacionais por Legenda
        allUfInfos.forEach(({ uf }) => {
          const allProportionalVotesInUfCurrent = allVoteData.proportionalVotes
            .filter(v_1 => v_1.uf === uf && v_1.parl_front_legend)
            .map(v_2 => ({ legend: v_2.parl_front_legend!, votes: parseNumber(v_2.proportional_votes_qtn) }));
          
          const seatsForStateProportional = totalProportionalSeatsByState[uf] || 0;
          if (seatsForStateProportional > 0 && allProportionalVotesInUfCurrent.length > 0) {
            const calculatedPrSeatsObj = calculateProportionalSeats(allProportionalVotesInUfCurrent, seatsForStateProportional, 5);
            Array.from(legendsSet).forEach(legend_1 => {
              nationalTotalSeatsByLegend[legend_1] += calculatedPrSeatsObj[legend_1] || 0;
            });
          }
        });

        // 2. Calcular Total de Cadeiras Distritais Nacionais por Legenda
        const allDistrictEntities: DistrictInfoFromData[] = districtsData;
        
        allDistrictEntities.forEach(district => {
          const votesInDistrict = allVoteData.candidateVotes.filter(
            vote => parseNumber(vote.district_id) === district.district_id
          );
          if (votesInDistrict.length > 0) {
            const winner = votesInDistrict.reduce((prev, current) =>
              parseNumber(prev.votes_qtn) > parseNumber(current.votes_qtn) ? prev : current
            );
            const winnerLegend = winner.parl_front_legend || winner.party_legend; // Prioriza frente, depois partido
            if (winnerLegend && legendsSet.has(winnerLegend)) {
              nationalTotalSeatsByLegend[winnerLegend] += 1;
            } else if (winnerLegend) {
                // Legenda não estava no Set original, adiciona se não existir e soma
                if (!nationalTotalSeatsByLegend[winnerLegend]) nationalTotalSeatsByLegend[winnerLegend] = 0;
                nationalTotalSeatsByLegend[winnerLegend] += 1;
            }
          }
        });

        const finalParliamentSeatData: PartySeatDataForParliament[] = [];
        let sumOfCalculatedSeats = 0;
        Array.from(legendsSet).forEach(legend_2 => {
          const seats = nationalTotalSeatsByLegend[legend_2] || 0;
          if (seats > 0) { 
            finalParliamentSeatData.push({
              legend: legend_2,
              seats,
              color: colorMap[legend_2] || FALLBACK_COLOR_PARLIAMENT
            });
          }
          sumOfCalculatedSeats += seats;
        });
        
        console.log("Soma total de assentos calculados (Distrital + Proporcional):", sumOfCalculatedSeats);
        if (sumOfCalculatedSeats !== TOTAL_SEATS_IN_PARLIAMENT) {
            console.warn(`ALERTA: A soma dos assentos calculados (${sumOfCalculatedSeats}) não é igual ao total esperado de ${TOTAL_SEATS_IN_PARLIAMENT}.`);
        }
        
        setParliamentSeatData(finalParliamentSeatData.sort((a,b) => b.seats - a.seats));

      } catch (e) {
        console.error("Erro ao buscar ou processar dados para o parlamento:", e);
        setError(e instanceof Error ? e.message : "Erro desconhecido.");
      } finally {
        setIsLoading(false);
      }
    };

    if (allUfInfos.length > 0) { fetchAndProcessNationalSeatData(); }
    else { setIsLoading(false); setError("Lista de UFs não pôde ser carregada."); }
  }, [currentTime, allUfInfos, colorMap]); // Adicionado colorMap

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen bg-slate-100"><p className="text-xl text-gray-500 animate-pulse">Carregando dados do parlamento...</p></div>;
  }
  if (error) {
    return <div className="container mx-auto p-6 text-center text-red-500">Erro: {error} <Link href="/" className="text-blue-600 hover:underline">Voltar</Link></div>;
  }
  if (parliamentSeatData.length === 0 && !isLoading) {
    return <div className="container mx-auto p-6 text-center text-gray-500">Não há dados de assentos para exibir o parlamento. Verifique a fonte de dados.</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8 antialiased">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 space-y-10">
        <header className="text-center mb-8">
          <Link href="/nacional" className="text-sky-600 hover:text-sky-800 hover:underline mb-6 inline-block transition-colors text-sm">
            &larr; Voltar para Panorama Nacional Proporcional
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl tracking-tight">
            Parlamento Nacional & Simulador de Coalizões
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Composição de <span className="font-semibold">{TOTAL_SEATS_IN_PARLIAMENT}</span> assentos. Maioria: <span className="font-semibold">{MAJORITY_THRESHOLD}</span> assentos. ({currentTime}% apurados)
          </p>
           <div className="mt-6">
            <label htmlFor="time-select-parl" className="text-sm font-medium mr-2 text-slate-700">Ver Apuração em:</label>
            <select 
              id="time-select-parl" 
              value={currentTime} 
              onChange={(e) => setCurrentTime(parseInt(e.target.value, 10))} 
              className="rounded border-gray-300 shadow-sm p-2 text-sm focus:ring-sky-500 focus:border-sky-500"
            >
                <option value={50}>50%</option>
                <option value={100}>100%</option>
            </select>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-7 gap-6 xl:gap-8 items-start">
          <section className="lg:col-span-4">
            <ParliamentCompositionChart
              seatData={parliamentSeatData}
              totalSeatsInParliament={TOTAL_SEATS_IN_PARLIAMENT}
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
          <p className="text-xs text-slate-500">
            Total de {TOTAL_SEATS_IN_PARLIAMENT} assentos na simulação (120 distritais + 93 proporcionais).
          </p>
        </footer>
      </div>
    </div>
  );
}