// components/NationalProportionalOverview.tsx
"use client";

import React, { useState } from 'react';
// Assegure-se que os tipos abaixo estejam definidos, idealmente em seu arquivo types/election.ts
// ou podem ser definidos localmente se usados apenas aqui.

export interface StateDetailEntry {
  uf: string;
  stateName: string;
  currentPercentInState?: number;
  previousPercentInState?: number;
  currentSeatsInState: number;
  previousSeatsInState: number;
}

export interface NationalComparisonEntry {
  legend: string;
  currentNationalPercent: number;
  previousNationalPercent: number;
  currentNationalSeats: number;
  previousNationalSeats: number;
  stateDetails: StateDetailEntry[];
}

interface NationalProportionalOverviewProps {
  comparisonEntries: NationalComparisonEntry[];
  colorMap: Record<string, string>;
}

// --- Constantes de Estilo Globais ---
const TEXT_COLOR_DARK = '#1F2937';
const TEXT_COLOR_MEDIUM = '#4A5568';
const FALLBACK_COLOR = '#D1D5DB'; // Um cinza mais claro para fallback

// --- Subcomponente: Gráfico de Barras Empilhadas 100% ---
interface VotingPercentageData {
  legend: string;
  percent: number;
}

interface BarSegment extends VotingPercentageData {
  color: string;
}

interface StackedBarViewProps {
  label: string;
  segments: BarSegment[];
}

const StackedBarView: React.FC<StackedBarViewProps> = ({ label, segments }) => (
  <div className="mb-4">
    <span className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</span>
    <div className="h-10 bg-gray-200 rounded-md flex overflow-hidden shadow-sm" title={segments.map(s => `${s.legend}: ${s.percent.toFixed(1)}%`).join(' | ')}>
      {segments.map((seg, idx) => (
        <div
          key={`${label}-${seg.legend}-${idx}`}
          title={`${seg.legend}: ${seg.percent.toFixed(1)}%`}
          className="h-full flex items-center justify-center text-xs font-bold"
          style={{
            width: `${seg.percent}%`,
            backgroundColor: seg.color,
            color: контрастCorTexto(seg.color), // Função para cor de texto contrastante
            borderRight: idx < segments.length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none',
          }}
        >
          {/* Opcional: Mostrar % se o segmento for grande o suficiente */}
          {seg.percent > 7 && <span className="truncate px-0.5">{seg.percent.toFixed(0)}%</span>}
        </div>
      ))}
    </div>
  </div>
);

// Função simples para determinar cor de texto contrastante (preto ou branco)
const контрастCorTexto = (hexcolor: string): string => {
  if (!hexcolor) return TEXT_COLOR_DARK;
  try {
    const r = parseInt(hexcolor.substring(1, 3), 16);
    const g = parseInt(hexcolor.substring(3, 5), 16);
    const b = parseInt(hexcolor.substring(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? TEXT_COLOR_DARK : '#FFFFFF';
  } catch (e) {
    return TEXT_COLOR_DARK;
  }
};

interface StackedPercentBarChartDisplayProps {
  currentData: VotingPercentageData[];
  previousData: VotingPercentageData[];
  colorMap: Record<string, string>;
}

const StackedPercentBarChartDisplay: React.FC<StackedPercentBarChartDisplayProps> = ({ currentData, previousData, colorMap }) => {
  const createSegments = (data: VotingPercentageData[]): BarSegment[] => {
    const filteredData = data.filter(d => d.percent > 0.01); // Pequeno threshold para evitar micro-segmentos
    const totalPercent = filteredData.reduce((sum, d) => sum + d.percent, 0);
    
    if (totalPercent === 0) return [];

    return filteredData
      .sort((a, b) => b.percent - a.percent) // Opcional: ordenar segmentos por tamanho
      .map(d => ({
        legend: d.legend,
        percent: (d.percent / totalPercent) * 100, // Normaliza para que a soma seja 100% dos dados filtrados
        color: colorMap[d.legend] || FALLBACK_COLOR,
      }));
  };

  const currentSegments = createSegments(currentData);
  const previousSegments = createSegments(previousData);

  const allLegendsInvolved = Array.from(new Set([...currentData.map(d => d.legend), ...previousData.map(d => d.legend)]));

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow">
      <StackedBarView label="Eleição Atual" segments={currentSegments} />
      <StackedBarView label="Eleição Anterior" segments={previousSegments} />
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
        {allLegendsInvolved.sort().map(legend => (
          <div key={legend} className="flex items-center text-xs">
            <span style={{ backgroundColor: colorMap[legend] || FALLBACK_COLOR }} className="w-3 h-3 inline-block mr-1.5 rounded-sm border border-gray-300"></span>
            <span>{legend}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Subcomponente: Tabela de Comparação Nacional e Estadual ---
interface ComparisonTableDisplayProps {
  entries: NationalComparisonEntry[]; // Já vem com a cor, não precisa do colorMap aqui
  colorMap: Record<string, string>;
}

const ComparisonTableDisplay: React.FC<ComparisonTableDisplayProps> = ({ entries, colorMap }) => {
  const [expandedLegend, setExpandedLegend] = useState<string | null>(null);

  const toggleExpand = (legend: string) => {
    setExpandedLegend(expandedLegend === legend ? null : legend);
  };

  const sortedEntries = [...entries].sort((a, b) => b.currentNationalSeats - a.currentNationalSeats);

  return (
    <div className="overflow-x-auto bg-gray-50 p-4 rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-300 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="py-3 px-3 text-left font-semibold text-gray-900">Legenda</th>
            <th scope="col" className="py-3 px-2 text-center font-semibold text-gray-900 Tooltip" title="Cadeiras Proporcionais Nacionais (Soma dos Estados)">Cadeiras 2022</th>
            <th scope="col" className="py-3 px-2 text-center font-semibold text-gray-900 Tooltip" title="Cadeiras Proporcionais Nacionais Anteriores (Soma dos Estados)">Cadeiras 2018</th>
            <th scope="col" className="py-3 px-2 text-center font-semibold text-gray-900 Tooltip" title="Saldo de Cadeiras Nacionais">Saldo Cad.</th>
            <th scope="col" className="py-3 px-2 text-center font-semibold text-gray-900">% Votos (2018)</th>
            <th scope="col" className="py-3 px-2 text-center font-semibold text-gray-900">% Votos (2022)</th>
            <th scope="col" className="py-3 px-2 text-center font-semibold text-gray-900">Movimentação %</th>
            <th scope="col" className="py-3 px-2 text-center font-semibold text-gray-900">Detalhes Estaduais</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {sortedEntries.map((item) => {
            const nationalSeatChange = item.currentNationalSeats - item.previousNationalSeats;
            const nationalPercentSwing = item.currentNationalPercent - item.previousNationalPercent;
            const isExpanded = expandedLegend === item.legend;
            const legendColor = colorMap[item.legend] || FALLBACK_COLOR;

            return (
              <React.Fragment key={item.legend}>
                <tr>
                  <td className="py-3 px-3">
                    <div className="flex items-center">
                      <span style={{ backgroundColor: legendColor }} className="h-2.5 w-2.5 rounded-sm mr-2 border border-gray-400 flex-shrink-0"></span>
                      <span className="font-medium text-gray-900">{item.legend}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center font-medium">{item.currentNationalSeats}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{item.previousNationalSeats}</td>
                  <td className={`px-2 py-3 text-center font-semibold ${nationalSeatChange > 0 ? 'text-green-600' : nationalSeatChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {nationalSeatChange !== 0 ? (nationalSeatChange > 0 ? `+${nationalSeatChange}` : nationalSeatChange) : '0'}
                  </td>
                  <td className="px-2 py-3 text-center font-medium">{item.currentNationalPercent.toFixed(1)}%</td>
                  <td className="px-2 py-3 text-center text-gray-500">{item.previousNationalPercent.toFixed(1)}%</td>
                  <td className={`px-2 py-3 text-center font-semibold ${nationalPercentSwing > 0 ? 'text-green-600' : nationalPercentSwing < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {nationalPercentSwing.toFixed(1).startsWith('-') || nationalPercentSwing === 0 ? '' : '+'}{nationalPercentSwing.toFixed(1)}%
                  </td>
                  <td className="px-2 py-3 text-center">
                    {item.stateDetails && item.stateDetails.length > 0 && (
                      <button onClick={() => toggleExpand(item.legend)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                        {isExpanded ? 'Ocultar' : `Ver (${item.stateDetails.length})`}
                      </button>
                    )}
                  </td>
                </tr>
                {isExpanded && item.stateDetails && item.stateDetails.length > 0 && (
                  <tr className="bg-slate-50">
                    <td colSpan={8} className="p-0">
                      <div className="p-3">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="py-1.5 px-2 text-left font-semibold text-slate-700">Estado</th>
                              <th className="py-1.5 px-2 text-center font-semibold text-slate-700">Cadeiras (2022)</th>
                              <th className="py-1.5 px-2 text-center font-semibold text-slate-700">Cadeiras (2018)</th>
                              <th className="py-1.5 px-2 text-center font-semibold text-slate-700">Saldo</th>
                              {item.stateDetails.some(sd => sd.currentPercentInState !== undefined) && <th className="py-1.5 px-2 text-center font-semibold text-slate-700">% (2022)</th>}
                              {item.stateDetails.some(sd => sd.previousPercentInState !== undefined) && <th className="py-1.5 px-2 text-center font-semibold text-slate-700">% (2018)</th>}
                              {item.stateDetails.some(sd => sd.currentPercentInState !== undefined && sd.previousPercentInState !== undefined) && <th className="py-1.5 px-2 text-center font-semibold text-slate-700">Movimentação %</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {item.stateDetails.sort((a,b) => a.stateName.localeCompare(b.stateName)).map(state => {
                              const stateSeatChange = state.currentSeatsInState - state.previousSeatsInState;
                              const currentPercent = state.currentPercentInState;
                              const previousPercent = state.previousPercentInState;
                              const statePercentSwing = (currentPercent !== undefined && previousPercent !== undefined) ? currentPercent - previousPercent : undefined;
                              return (
                                <tr key={state.uf}>
                                  <td className="py-1.5 px-2 text-left text-slate-600">{state.stateName} ({state.uf})</td>
                                  <td className="py-1.5 px-2 text-center text-slate-600 font-medium">{state.currentSeatsInState}</td>
                                  <td className="py-1.5 px-2 text-center text-slate-500">{state.previousSeatsInState}</td>
                                  <td className={`py-1.5 px-2 text-center font-medium ${stateSeatChange > 0 ? 'text-green-600' : stateSeatChange < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                    {stateSeatChange !== 0 ? (stateSeatChange > 0 ? `+${stateSeatChange}` : stateSeatChange) : '0'}
                                  </td>
                                  {item.stateDetails.some(sd => sd.currentPercentInState !== undefined) && <td className="py-1.5 px-2 text-center text-slate-600 font-medium">{currentPercent !== undefined ? `${currentPercent.toFixed(1)}%` : '–'}</td>}
                                  {item.stateDetails.some(sd => sd.previousPercentInState !== undefined) && <td className="py-1.5 px-2 text-center text-slate-500">{previousPercent !== undefined ? `${previousPercent.toFixed(1)}%` : '–'}</td>}
                                  {item.stateDetails.some(sd => sd.currentPercentInState !== undefined && sd.previousPercentInState !== undefined) &&
                                    <td className={`py-1.5 px-2 text-center font-medium ${statePercentSwing !== undefined && statePercentSwing > 0 ? 'text-green-600' : statePercentSwing !== undefined && statePercentSwing < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                      {statePercentSwing !== undefined ? ((statePercentSwing > 0 ? '+' : '') + statePercentSwing.toFixed(1) + '%') : '–'}
                                    </td>
                                  }
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};


// --- Componente Principal ---
const NationalProportionalOverview: React.FC<NationalProportionalOverviewProps> = ({
  comparisonEntries,
  colorMap,
}) => {
  if (!comparisonEntries || comparisonEntries.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg shadow-md">
        <p className="text-center text-gray-600">Dados nacionais de votação proporcional não disponíveis para exibição.</p>
      </div>
    );
  }

  // Preparar dados para os gráficos de barra empilhada
  const currentVotingData: VotingPercentageData[] = comparisonEntries.map(item => ({
    legend: item.legend,
    percent: item.currentNationalPercent,
  }));
  const previousVotingData: VotingPercentageData[] = comparisonEntries.map(item => ({
    legend: item.legend,
    percent: item.previousNationalPercent,
  }));

  return (
    <div className="p-4 md:p-6 bg-white rounded-xl shadow-xl space-y-10">
      
      <StackedPercentBarChartDisplay
        currentData={currentVotingData}
        previousData={previousVotingData}
        colorMap={colorMap}
      />

      <ComparisonTableDisplay
        entries={comparisonEntries}
        colorMap={colorMap}
      />
    </div>
  );
};

export default NationalProportionalOverview;