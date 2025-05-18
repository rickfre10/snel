// components/StateProportionalSwing.tsx
"use client";
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList, ReferenceLine
} from 'recharts';
import type { ProportionalSwingEntry } from '@/types/election';
import type { PreviousStateProportionalSeats } from '@/lib/previousElectionData';

interface StateProportionalSwingProps {
  swingDataPercent: ProportionalSwingEntry[];
  currentPRSeatsByFront: Record<string, number>;
  previousPRSeatsDataForState: PreviousStateProportionalSeats | null | undefined;
  colorMap: Record<string, string>;
  stateName: string;
}

interface SeatTableEntry {
  legend: string;
  previousSeats: number;
  currentSeats: number;
  seatChange: number;
  swingPercent: number;
}

const FALLBACK_COLOR = '#B0B0B0';
const SWING_BAR_FALLBACK_COLOR = '#A9A9A9';
const TEXT_COLOR_DARK = '#1F2937';

// getTextColorForBackground (mantida para a tabela)
function getTextColorForBackground(hexcolor: string): string {
    // ... (sua implementação)
    if (!hexcolor) return TEXT_COLOR_DARK;
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6 && hexcolor.length !== 3) return TEXT_COLOR_DARK;
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(char => char + char).join('');
    }
    try {
        const r = parseInt(hexcolor.substring(0, 2), 16);
        const g = parseInt(hexcolor.substring(2, 4), 16);
        const b = parseInt(hexcolor.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128 || hexcolor.toLowerCase() === 'ffffff' || hexcolor.toLowerCase() === '#ffffff') ? TEXT_COLOR_DARK : '#FFFFFF';
    } catch (e) { return TEXT_COLOR_DARK; }
}


const StateProportionalSwing: React.FC<StateProportionalSwingProps> = ({
  swingDataPercent,
  currentPRSeatsByFront,
  previousPRSeatsDataForState,
  colorMap,
  stateName,
}) => {
  if (!swingDataPercent || swingDataPercent.length === 0) {
    return <p className="text-gray-500 text-center py-4">Dados de swing proporcional de votos não disponíveis para {stateName}.</p>;
  }

  const barChartDataForColumn1 = [...swingDataPercent].sort((a,b) => b.currentPercent - a.currentPercent);
  const dataForSwingColumnChart = [...swingDataPercent].sort((a, b) => b.swing - a.swing);
  const seatTableData: SeatTableEntry[] = barChartDataForColumn1.map((item: ProportionalSwingEntry) => {
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
        <h4 className="text-lg font-semibold text-gray-700 mb-3 text-center">Variação Percentual de Votos</h4>
        {/* Linha 80 do seu log deve ser este ResponsiveContainer */}
        <ResponsiveContainer width="100%" height={300 + barChartDataForColumn1.length * 45}>
          <BarChart
            data={barChartDataForColumn1}
            layout="vertical"
            margin={{ left: 10, right: 50, top: 5, bottom: 5 }} // Margem direita para os rótulos que estavam fora
            barCategoryGap="10%"
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" hide={true} />
            <YAxis dataKey="legend" type="category" width={120} interval={0} tick={{ fontSize: 10, fill: '#4A5568' }} axisLine={false} tickLine={false} />

            <Bar dataKey="previousPercent" name="% Anterior (2018)" fill="#A0AEC0" barSize={16} radius={[3, 3, 0, 0]}>
              {/* --- COMENTE TEMPORARIAMENTE ESTE LABEL LIST --- */}
              {/*
              <LabelList
                dataKey="previousPercent"
                position="right"
                offset={5}
                fill="#555"
                fontSize={9}
                formatter={(value: number) => value != null ? `${value.toFixed(1)}%` : ""}
              />
              */}
            </Bar>
            <Bar dataKey="currentPercent" name="% Atual (2022)" barSize={16} radius={[3, 3, 0, 0]}>
              {barChartDataForColumn1.map((entry: ProportionalSwingEntry, index: number) => (
                <Cell key={`cell-current-<span class="math-inline">\{entry\.legend\}\-</span>{index}`} fill={colorMap[entry.legend] || FALLBACK_COLOR} />
              ))}
              {/* --- E COMENTE TEMPORARIAMENTE ESTE LABEL LIST --- */}
              {/*
              <LabelList
                dataKey="currentPercent"
                position="right"
                offset={5}
                fill={TEXT_COLOR_DARK}
                fontSize={9}
                fontWeight="bold"
                formatter={(value: number) => value != null ? `${value.toFixed(1)}%` : ""}
              />
              */}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Coluna 2: Gráfico de COLUNAS de Swing e Tabela de Assentos */}
      {/* (O código da Coluna 2 e da Tabela permanece como na resposta #142, que não estava dando erro) */}
      <div className="lg:col-span-3 p-4 bg-gray-50 rounded-lg shadow-sm h-full space-y-6">
        <div>
            <h4 className="text-lg font-semibold text-gray-700 mb-3 text-center">Swing Proporcional de Votos (%) - Colunas</h4>
            <ResponsiveContainer width="100%" height={150 + dataForSwingColumnChart.length * 35}>
            <BarChart data={dataForSwingColumnChart} layout="horizontal" margin={{ top: 20, right: 10, left: 10, bottom: 30 }} barCategoryGap="5%">
                <XAxis dataKey="legend" type="category" hide={true} />
                <YAxis type="number" domain={['auto', 'auto']} hide={true} />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" strokeOpacity={0.8}/>
                <Bar dataKey="swing" name="Swing" barSize={40}>
                {dataForSwingColumnChart.map((entry: ProportionalSwingEntry, index: number) => (
                    <Cell key={`cell-swing-col-<span class="math-inline">\{entry\.legend\}\-</span>{index}`} fill={colorMap[entry.legend] || SWING_BAR_FALLBACK_COLOR} />
                ))}
                <LabelList
                    dataKey="swing"
                    content={(props: any) => {
                        const { x, y, width, height, value, payload } = props;
                        if (value === undefined || value === null || !payload || typeof payload.legend !== 'string') {
                            return null;
                        }
                        const isNegative = value < 0;
                        const labelX = x + width / 2;
                        const valueY = isNegative ? y + height + 12 : y - 6;
                        const legendName = payload.legend;
                        const swingValueText = `<span class="math-inline">\{value \> 0 ? '\+' \: ''\}</span>{value.toFixed(1)}%`;
                        return (
                            <g>
                                <text x={labelX} y={valueY} textAnchor="middle" fill="#333" fontSize={10} fontWeight="bold">{swingValueText}</text>
                                <text x={labelX} y={isNegative ? y - 5 : y + height + 15} textAnchor="middle" fill={colorMap[legendName] || TEXT_COLOR_DARK} fontSize={10} fontWeight="bold">{legendName}</text>
                            </g>
                        );
                    }}
                />
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        </div>
        <div>
            <h4 className="text-lg font-semibold text-gray-700 mb-3 text-center">Movimentação de Assentos Proporcionais</h4>
            <div className="space-y-1">
              <div className="grid grid-cols-5 gap-1 text-xs font-semibold text-gray-500 uppercase pb-2 border-b mb-2">
                <span className="col-span-1 truncate">Frente</span>
                <span className="text-right">2018</span>
                <span className="text-right">2022</span>
                <span className="text-right">Saldo</span>
                <span className="text-right col-span-1 truncate">Swing Votos %</span>
              </div>
              {seatTableData.map((item: SeatTableEntry) => {
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
                      <span style={{ backgroundColor: color }} className="w-2.5 h-2.5 inline-block mr-1.5 rounded-sm flex-shrink-0 border border-gray-400"></span>
                      <span className="font-medium text-gray-800 truncate" title={item.legend}>{item.legend}</span>
                    </div>
                    <span className="text-right text-gray-700">{item.previousSeats}</span>
                    <span className="text-right text-gray-700 font-semibold">{item.currentSeats}</span>
                    <div className="text-right">
                        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${seatChangeTagClasses}`}>
                            {seatSign}{item.seatChange}
                        </span>
                    </div>
                    <div className="text-right col-span-1">
                        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${percentChangeTagClasses}`}>
                            {percentSign}{swingPercentNum.toFixed(1)}%
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