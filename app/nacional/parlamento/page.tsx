// app/parlamento/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import ParliamentCompositionChart from '@/components/ParliamentCompositionChart';
import CoalitionBuilderSimulator from '@/components/CoalitionBuilderSimulator';

import { calculateProportionalSeats } from '@/lib/electionCalculations';
import { partyData, districtsData } from '@/lib/staticData';
// Não precisamos de dados de eleições anteriores para este componente específico (a menos que queira mostrar um comparativo de assentos)

import type { ProportionalVote, CandidateVote, DistrictInfoFromData } from '@/types/election';

// Constantes do Parlamento Nacional
const TOTAL_SEATS_IN_PARLIAMENT = 213; // 120 Distritais + 93 Proporcionais
const MAJORITY_THRESHOLD = Math.floor(TOTAL_SEATS_IN_PARLIAMENT / 2) + 1; // 107

const totalProportionalSeatsByState: Record<string, number> = { "TP": 1, "MA": 40, "MP": 23, "BA": 16, "PB": 9, "PN": 4 }; // Soma = 93

const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') { const cleanedStr = String(value).replace(/\./g, '').replace(',', '.'); const num = parseFloat(cleanedStr); return isNaN(num) ? 0 : num; }
    return 0;
};

interface ApiAllVotesData {
  time: number;
  proportionalVotes: ProportionalVote[];
  candidateVotes: CandidateVote[]; // Necessário para cadeiras distritais
}

const buildColorMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  partyData.forEach(party => { if (party.parl_front_legend && party.parl_front_color) map[party.parl_front_legend] = party.parl_front_color; });
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
    seats: number; // Total de assentos (Distrital + Proporcional)
    color: string;
}

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
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Falha API'); }
        const allVoteData: ApiAllVotesData = await response.json();

        const legends = new Set<string>();
        partyData.forEach(p => { if (p.parl_front_legend) legends.add(p.parl_front_legend); });
        allVoteData.proportionalVotes.forEach(v => { if (v.parl_front_legend) legends.add(v.parl_front_legend); });
        allVoteData.candidateVotes.forEach(v => { if (v.parl_front_legend) legends.add(v.parl_front_legend); });
        
        const nationalTotalSeatsByLegend: Record<string, number> = {};
        legends.forEach(l => nationalTotalSeatsByLegend[l] = 0); // Inicializa

        // 1. Calcular Total de Cadeiras Proporcionais Nacionais por Legenda
        allUfInfos.forEach(({ uf }) => {
          const allProportionalVotesInUfCurrent = allVoteData.proportionalVotes
            .filter(v => v.uf === uf && v.parl_front_legend)
            .map(v_1 => ({ legend: v_1.parl_front_legend!, votes: parseNumber(v_1.proportional_votes_qtn) }));
          
          const seatsForStateProportional = totalProportionalSeatsByState[uf] || 0;
          if (seatsForStateProportional > 0 && allProportionalVotesInUfCurrent.length > 0) {
            const calculatedPrSeatsObj = calculateProportionalSeats(allProportionalVotesInUfCurrent, seatsForStateProportional, 5);
            legends.forEach(legend_1 => {
              nationalTotalSeatsByLegend[legend_1] += calculatedPrSeatsObj[legend_1] || 0;
            });
          }
        });

        // 2. Calcular Total de Cadeiras Distritais Nacionais por Legenda
        const allDistrictInfo: DistrictInfoFromData[] = districtsData; // Lista de todos os distritos
        
        allDistrictInfo.forEach(district => {
          const votesInDistrict = allVoteData.candidateVotes.filter(
            vote => parseNumber(vote.district_id) === district.district_id
          );
          if (votesInDistrict.length > 0) {
            const winner = votesInDistrict.reduce((prev, current) =>
              parseNumber(prev.votes_qtn) > parseNumber(current.votes_qtn) ? prev : current
            );
            if (winner.parl_front_legend && legends.has(winner.parl_front_legend)) { // Verifica se a legenda é conhecida
              nationalTotalSeatsByLegend[winner.parl_front_legend] += 1;
            } else if (winner.parl_front_legend) {
                // Legenda do vencedor distrital não estava no set inicial (raro se partyData for completo)
                // console.warn(`Legenda distrital ${winner.parl_front_legend} não previamente conhecida. Adicionando.`);
                // legends.add(winner.parl_front_legend); // Não é ideal modificar o set dentro do loop
                nationalTotalSeatsByLegend[winner.parl_front_legend] = (nationalTotalSeatsByLegend[winner.parl_front_legend] || 0) + 1;
            }
          }
        });

        const finalParliamentSeatData: PartySeatDataForParliament[] = [];
        let sumOfCalculatedSeats = 0;
        // Usar o Set 'legends' original para garantir que todas as legendas potenciais sejam consideradas
        Array.from(legends).forEach(legend_2 => {
          const seats = nationalTotalSeatsByLegend[legend_2] || 0;
          // Incluir no gráfico apenas legendas com assentos para não poluir
          if (seats > 0) { 
            finalParliamentSeatData.push({
              legend: legend_2,
              seats,
              color: colorMap[legend_2] || '#808080' // Fallback color
            });
          }
          sumOfCalculatedSeats += seats;
        });
        
        console.log("Soma total de assentos calculados (Distrital + Proporcional):", sumOfCalculatedSeats);
        if (sumOfCalculatedSeats !== TOTAL_SEATS_IN_PARLIAMENT) {
            console.warn(`ALERTA: A soma dos assentos calculados (${sumOfCalculatedSeats}) não é igual ao total esperado de ${TOTAL_SEATS_IN_PARLIAMENT}. Verifique a lógica de contagem de distritos e alocação proporcional.`);
            // Poderia haver um ajuste aqui se necessário, ou uma mensagem de erro mais proeminente.
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
  }, [currentTime, allUfInfos, colorMap]);

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
          <Link href="/" className="text-sky-600 hover:text-sky-800 hover:underline mb-6 inline-block transition-colors text-sm">
            &larr; Voltar para Visão Nacional
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl tracking-tight">
            Parlamento Nacional & Simulador
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Explore a composição de {TOTAL_SEATS_IN_PARLIAMENT} assentos e forme coalizões para alcançar a maioria de {MAJORITY_THRESHOLD} assentos.
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
          <section className="lg:col-span-4"> {/* Gráfico do Parlamento ocupa mais espaço */}
            <ParliamentCompositionChart
              seatData={parliamentSeatData}
              totalSeatsInParliament={TOTAL_SEATS_IN_PARLIAMENT}
            />
          </section>
          <section className="lg:col-span-3"> {/* Simulador ao lado */}
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