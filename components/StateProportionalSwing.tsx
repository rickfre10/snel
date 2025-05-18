// components/StateProportionalSwing.tsx
"use client";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { PartyInfo } from '@/types/election';
import type { PreviousStateProportionalSeats } from '@/lib/previousElectionData';

export interface ProportionalSwingEntry {
  legend: string;
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
const TEXT_COLOR_DARK = '#1F2937';
const TEXT_COLOR_LIGHT = '#FFFFFF';

function getTextColorForBackground(hexcolor: string): string {
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
        return (yiq >= 128 || hexcolor.toLowerCase() === 'ffffff' || hexcolor.toLowerCase() === '#ffffff') ? TEXT_COLOR_DARK : TEXT_COLOR_LIGHT;
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

  const barChartData = [...swingDataPercent].sort((a,b) => b.currentPercent - a.currentPercent);

  const seatTableData = barChartData.map(item => {
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
      {/* Coluna 1: Gráfico de Barras Agrupadas */}
      <div className="lg:col-span-3 p-4 bg-gray-50 rounded-lg shadow-sm h-full">
        <h4 className="text-lg font-semibold text-gray-700 mb-3 text-center">Variação Percentual de Votos Proporcionais</h4>
        {/* Linha 80 do seu log provavelmente aponta para este ResponsiveContainer */}
        <ResponsiveContainer width="100%" height={250 + barChartData.length * 55}>
          <BarChart
            data={barChartData}
            layout="vertical"
            margin={{ left: 10, right: 55, top: 5, bottom: 5 }} // Aumentada margem direita para labels
            barCategoryGap="30%"
            barGap={5}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" hide={true} />
            <YAxis dataKey="legend" type="category" width={120} interval={0} tick={{ fontSize: 11, fill: '#4A5568' }} axisLine={false} tickLine={false} />
            {/* Legenda e Tooltip removidos */}

            <Bar dataKey="previousPercent" name="% Anterior (2018)" fill="#A0AEC0" barSize={22} radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="previousPercent"
                position="right"
                offset={5}
                fill="#555"
                fontSize={10}
                formatter={(value: number) => value !== undefined && value !== null ? `${value.toFixed(1)}%` : ""}
              />
            </Bar>

            <Bar dataKey="currentPercent" name="% Atual (2022)" barSize={22} radius={[4, 4, 0, 0]}>
              {barChartData.map((entry: ProportionalSwingEntry, index: number) => (
                // A prop 'fill' no Cell deve ser uma string de cor, não um objeto de estilo.
                // entry.legend é a chave para colorMap.
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

      {/* Coluna 2: Tabela de Assentos */}
      <div className="lg:col-span-2 p-4 bg-gray-50 rounded-lg shadow-sm h-full">
        <h4 className="text-lg font-semibold text-gray-700 mb-3 text-center">Movimentação de Assentos Proporcionais</h4>
        <div className="space-y-1">
          <div className="grid grid-cols-5 gap-1 text-xs font-semibold text-gray-500 uppercase pb-2 border-b mb-2"> {/* Mudado para 5 colunas */}
            <span className="col-span-1">Frente</span> {/* Ajustado col-span */}
            <span className="text-right">2018</span>
            <span className="text-right">2022</span>
            <span className="text-right">Saldo</span>
            <span className="text-right">Swing %</span>
          </div>
          {seatTableData.map((item) => {
            const color = colorMap[item.legend] ?? FALLBACK_COLOR;
            let seatChangeTagClasses = 'bg-gray-200 text-gray-700';
            let percentChangeTagClasses = 'bg-gray-200 text-gray-700';
            let seatSign = item.seatChange === 0 ? "" : item.seatChange > 0 ? "+" : "";
            // Garantir que item.swingPercent seja tratado como número para comparação e toFixed
            const swingPercentNum = typeof item.swingPercent === 'number' ? item.swingPercent : 0;
            let percentSign = swingPercentNum === 0 ? "" : swingPercentNum > 0 ? "+" : "";


            if (item.seatChange > 0) seatChangeTagClasses = 'bg-green-100 text-green-700';
            else if (item.seatChange < 0) seatChangeTagClasses = 'bg-red-100 text-red-700';

            if (swingPercentNum > 0.05) percentChangeTagClasses = 'bg-green-100 text-green-700';
            else if (swingPercentNum < -0.05) percentChangeTagClasses = 'bg-red-100 text-red-700';

            return (
              <div key={item.legend} className="grid grid-cols-5 gap-1 items-center py-1.5 border-b border-gray-200 last:border-b-0 text-sm"> {/* Mudado para 5 colunas */}
                <div className="flex items-center col-span-1"> {/* Ajustado col-span */}
                  <span style={{ backgroundColor: color }} className="w-2.5 h-2.5 inline-block mr-2 rounded-sm flex-shrink-0 border border-gray-400"></span>
                  <span className="font-medium text-gray-800 truncate" title={item.legend}>{item.legend}</span>
                </div>
                <span className="text-right text-gray-700">{item.previousSeats}</span>
                <span className="text-right text-gray-700 font-semibold">{item.currentSeats}</span>
                <div className="text-right">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${seatChangeTagClasses}`}>
                        {seatSign}{item.seatChange}
                    </span>
                </div>
                <div className="text-right">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${percentChangeTagClasses}`}>
                        {percentSign}{swingPercentNum.toFixed(1)}
                    </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StateProportionalSwing;