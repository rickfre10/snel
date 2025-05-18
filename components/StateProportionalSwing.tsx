// components/StateProportionalSwing.tsx
"use client";
import React from 'react';
// --- CORRIGIDO: Adicionado ReferenceLine ao import ---
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList, ReferenceLine
} from 'recharts';
// Importe seus tipos
import type { PartyInfo } from '@/types/election'; // Se ProportionalSwingEntry usa algo de PartyInfo indiretamente
import type { PreviousStateProportionalSeats } from '@/lib/previousElectionData';

// Tipo para os dados que esta página/componente espera
export interface ProportionalSwingEntry {
  legend: string; // parl_front_legend
  currentPercent: number;
  previousPercent: number;
  swing: number;
}

interface StateProportionalSwingProps {
  swingDataPercent: ProportionalSwingEntry[];
  currentPRSeatsByFront: Record<string, number>;
  previousPRSeatsDataForState: PreviousStateProportionalSeats | null | undefined;
  colorMap: Record<string, string>;
  stateName: string;
}

const FALLBACK_COLOR = '#B0B0B0'; // Cinza neutro para barras
const SWING_BAR_FALLBACK_COLOR = '#A9A9A9'; // Cor para barras de swing se legenda não encontrada no colorMap
const TEXT_COLOR_DARK = '#1F2937';

function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return TEXT_COLOR_DARK;
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6 && hexcolor.length !== 3) return TEXT_COLOR_DARK;
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(char => char + char).join('');
    }
    const r = parseInt(hexcolor.substring(0, 2), 16);
    const g = parseInt(hexcolor.substring(2, 4), 16);
    const b = parseInt(hexcolor.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128 || hexcolor.toLowerCase() === 'ffffff' || hexcolor.toLowerCase() === '#ffffff') ? TEXT_COLOR_DARK : '#FFFFFF';
}


const StateProportionalSwing: React.FC<StateProportionalSwingProps> = ({
  swingDataPercent,
  currentPRSeatsByFront,
  previousPRSeatsDataForState,
  colorMap,
  stateName,
}) => {
  if (!swingDataPercent || swingDataPercent.length === 0) {
    return <p className="text-gray-500 text-center py-4">Dados de movimentação proporcional de votos não disponíveis para {stateName}.</p>;
  }

  // Dados para o gráfico de barras da Coluna 1 (% anterior vs atual)
  const barChartDataForColumn1 = [...swingDataPercent].sort((a,b) => b.currentPercent - a.currentPercent);

  // Dados para o gráfico de swing da Coluna 2 (usa o mesmo 'swingDataPercent' ou uma ordenação específica)
  // Vamos usar uma ordenação por maior swing absoluto para o gráfico de swing
  const dataForSwingGraph = [...swingDataPercent].sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing));


  // Dados para a tabela de assentos (como antes)
  const seatTableData = barChartDataForColumn1.map(item => {
    const previousSeats = previousPRSeatsDataForState?.seats[item.legend] || 0;
    const currentSeats = currentPRSeatsByFront[item.legend] || 0;
    const seatChange = currentSeats - previousSeats;
    return {
      legend: item.legend,
      previousSeats,
      currentSeats,
      seatChange,
      swingPercent: item.swing,
    };
  });


  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

      {/* Coluna 1: Gráfico de Barras Agrupadas (% Anterior vs % Atual) */}
      <div className="lg:col-span-2 p-4 bg-gray-50 rounded-lg shadow-sm h-full">
        <ResponsiveContainer width="100%" height={300 + barChartDataForColumn1.length * 45}>
          <BarChart
            data={barChartDataForColumn1}
            layout="vertical"
            margin={{ left: 10, right: 50, top: 5, bottom: 5 }}
            barCategoryGap="10%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" hide={true} />
            <YAxis dataKey="legend" type="category" width={120} interval={0} tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} />
            {/* Tooltip e Legenda Removidos */}

            <Bar dataKey="previousPercent" name="% Anterior (2018)" fill="#A0AEC0" barSize={18} radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="previousPercent"
                position="right"
                offset={5}
                fill="#555"
                fontSize={10}
                formatter={(value: number) => value !== undefined && value !== null ? `${value.toFixed(1)}%` : ""}
              />
            </Bar>
            <Bar dataKey="currentPercent" name="% Atual (2022)" barSize={18} radius={[4, 4, 0, 0]}>
              {barChartDataForColumn1.map((entry: ProportionalSwingEntry, index: number) => (
                <Cell key={`cell-current-${entry.legend}-${index}`} fill={colorMap[entry.legend] || FALLBACK_COLOR} />
              ))}
              <LabelList
                dataKey="currentPercent"
                position="right"
                offset={5}
                fill={TEXT_COLOR_DARK}
                fontSize={10}
                fontWeight="bold"
                formatter={(value: number) => value !== undefined && value !== null ? `${value.toFixed(1)}%` : ""}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Coluna 2: Gráfico de Barras de Swing e Tabela de Assentos */}
      <div className="lg:col-span-3 p-4 bg-gray-50 rounded-lg shadow-sm h-full space-y-6">
        <div>
            {/* Linha 80 do seu log deve ser este ResponsiveContainer */}
            <ResponsiveContainer width="100%" height={150 + dataForSwingGraph.length * 35}>
            <BarChart
                data={dataForSwingGraph}
                layout="vertical"
                margin={{ left: 5, right: 60, top: 5, bottom: 5 }} // Aumentada margem direita para labels
            >
                {/* <CartesianGrid strokeDasharray="3 3" /> */}
                <XAxis type="number" domain={['auto', 'auto']} hide={true} />
                <YAxis dataKey="legend" type="category" hide={true} /> {/* Eixo Y escondido */}
                <ReferenceLine x={0} stroke="#888" strokeDasharray="2 2" strokeOpacity={0.7}/>

                <Bar dataKey="swing" name="Swing" barSize={25}>
                {/* CORRIGIDO: Usa dataForSwingGraph e adiciona tipos explícitos */}
                {dataForSwingGraph.map((entry: ProportionalSwingEntry, index: number) => (
                    <Cell key={`cell-swing-${entry.legend}-${index}`} fill={colorMap[entry.legend] || SWING_BAR_FALLBACK_COLOR} />
                ))}
                <LabelList
                    dataKey="swing"
                    content={(props: any) => {
                        const { x, y, width, height, value, payload } = props;
                        if (value === undefined || value === null) return null;
                        
                        const isNegative = value < 0;
                        // Posição X do label:
                        // Se negativo, o 'x' do Recharts é a ponta esquerda da barra, então o texto vai ANTES (x - offset)
                        // Se positivo, o 'x' do Recharts é o início da barra (no eixo 0), então o texto vai DEPOIS (x + width + offset)
                        const labelX = isNegative ? x - 5 : x + width + 5;
                        const textAnchor = isNegative ? 'end' : 'start';
                        const legendName = payload.legend || "";
                        const swingValueText = `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

                        return (
                            <g>
                                <text 
                                    x={labelX} 
                                    y={y + height / 2} 
                                    dy={3.5}
                                    textAnchor={textAnchor} 
                                    fill="#374151"
                                    fontSize={11}
                                    fontWeight="semibold"
                                >
                                    {legendName}: {swingValueText}
                                </text>
                            </g>
                        );
                    }}
                />
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        </div>
        
        {/* Tabela de Movimentação de Assentos */}
        <div>
            <div className="space-y-1">
              {/* ... (código da tabela como na resposta #138) ... */}
              <div className="grid grid-cols-5 gap-1 text-xs font-semibold text-gray-500 uppercase pb-2 border-b mb-2">
                <span className="col-span-1">Frente</span>
                <span className="text-right">2018</span>
                <span className="text-right">2022</span>
                <span className="text-right">Saldo</span>
                <span className="text-right col-span-1">Swing % Votos</span>
              </div>
              {seatTableData.map((item) => {
                const color = colorMap[item.legend] ?? FALLBACK_COLOR;
                let seatChangeTagClasses = 'bg-gray-200 text-gray-700';
                let percentChangeTagClasses = 'bg-gray-200 text-gray-700';
                let seatSign = item.seatChange === 0 ? "" : item.seatChange > 0 ? "+" : "";
                const swingPercentNum = typeof item.swingPercent === 'number' ? item.swingPercent : 0;
                let percentSign = swingPercentNum === 0 ? "" : swingPercentNum > 0 ? "+" : "";

                if (item.seatChange > 0) seatChangeTagClasses = 'bg-green-100 text-green-700';
                else if (item.seatChange < 0) seatChangeTagClasses = 'bg-red-100 text-red-700';

                if (swingPercentNum > 0.05) percentChangeTagClasses = 'bg-green-100 text-green-700';
                else if (swingPercentNum < -0.05) percentChangeTagClasses = 'bg-red-100 text-red-700';

                return (
                  <div key={item.legend} className="grid grid-cols-5 gap-1 items-center py-1.5 border-b border-gray-200 last:border-b-0 text-sm">
                    <div className="flex items-center col-span-1">
                      <span style={{ backgroundColor: color }} className="w-2.5 h-2.5 inline-block mr-2 rounded-sm flex-shrink-0 border border-gray-400"></span>
                      <span className="font-medium text-gray-800 truncate" title={item.legend}>{item.legend}</span>
                    </div>
                    <span className="text-right text-gray-700">{item.previousSeats}</span>
                    <span className="text-right text-gray-700 font-semibold">{item.currentSeats}</span>
                    <div className="text-right">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${seatChangeTagClasses}`}>
                            {seatSign}{item.seatChange}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${percentChangeTagClasses}`}>
                            {percentSign}{swingPercentNum.toFixed(1)}
                        </span>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default StateProportionalSwing;