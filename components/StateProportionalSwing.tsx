// components/StateProportionalSwing.tsx
"use client";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
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

const FALLBACK_COLOR = '#B0B0B0';

function getTextColorForBackground(hexcolor: string): string {
    if (!hexcolor) return '#1F2937';
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length !== 6 && hexcolor.length !== 3) return TEXT_COLOR_DARK;
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(char => char + char).join('');
    }
    const r = parseInt(hexcolor.substring(0, 2), 16);
    const g = parseInt(hexcolor.substring(2, 4), 16);
    const b = parseInt(hexcolor.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128 || hexcolor.toLowerCase() === 'ffffff' || hexcolor.toLowerCase() === '#ffffff') ? '#1F2937' : '#FFFFFF';
}
const TEXT_COLOR_DARK = '#1F2937';
const TEXT_COLOR_LIGHT = '#FFFFFF';

// --- NOVO: Componente Customizado para o Tick do Eixo Y ---
const CustomYAxisTickForSwing = (props: any) => {
  const { x, y, payload, width } = props; // Adicionado width para possível uso futuro
  const legendText = payload.value as string;

  if (!legendText) return null;

  // dy={4} é um pequeno ajuste vertical para alinhar melhor com a linha do tick (se visível)
  // x={-5} ou similar pode ser usado para um pequeno recuo da linha do eixo se textAnchor="end"
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-5} y={0} dy={4} textAnchor="end" fill="#666" fontSize={10}>
        {legendText}
      </text>
    </g>
  );
};
// --- FIM DO COMPONENTE CUSTOMIZADO ---

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

  const seatTableData = swingDataPercent.map(item => {
    const previousSeats = previousPRSeatsDataForState?.seats[item.legend] || 0;
    const currentSeats = currentPRSeatsByFront[item.legend] || 0;
    const seatChange = currentSeats - previousSeats;
    return { legend: item.legend, previousSeats, currentSeats, seatChange };
  }).sort((a,b) => b.currentSeats - a.currentSeats);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Coluna 1: Gráfico de Barras Agrupadas */}
      <div className="p-4 bg-gray-50 rounded-lg shadow-sm h-full">
        <h4 className="text-lg font-semibold text-gray-700 mb-3 text-center">Variação Percentual de Votos Proporcionais</h4>
        <ResponsiveContainer width="100%" height={300 + barChartData.length * 25}>
          <BarChart
            data={barChartData}
            layout="vertical"
            margin={{ left: 20, right: 30, top: 20, bottom: 5 }} // Ajustada margem esquerda
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="%" domain={[0, 'dataMax + 10']} tick={{ fontSize: 10 }} />
            {/* YAxis AGORA USA O TICK CUSTOMIZADO */}
            <YAxis
                dataKey="legend"
                type="category"
                width={120} // Aumente esta largura se as legendas forem longas
                interval={0}
                tickLine={false} // Remove a linha do tick
                axisLine={false} // Remove a linha do eixo
                tick={<CustomYAxisTickForSwing />}
            />
            <Tooltip
              formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
              labelFormatter={(label: string) => `Frente: ${label}`}
            />
            <Legend iconSize={10} wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
            <Bar dataKey="previousPercent" name="% Anterior (2018)" fill="#a0aec0" barSize={12} radius={[3, 3, 0, 0]} />
            <Bar dataKey="currentPercent" name="% Atual (2022)" barSize={12} radius={[3, 3, 0, 0]}>
              {barChartData.map((entry, index) => (
                <Cell key={`cell-current-${index}`} fill={colorMap[entry.legend] || FALLBACK_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Coluna 2: Tabela de Assentos */}
      <div className="p-4 bg-gray-50 rounded-lg shadow-sm h-full">
        {/* ... (conteúdo da tabela como antes) ... */}
        <h4 className="text-lg font-semibold text-gray-700 mb-3 text-center">Movimentação de Assentos Proporcionais</h4>
        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-500 uppercase pb-2 border-b mb-2">
            <span className="col-span-1">Frente</span>
            <span className="text-right">2018</span>
            <span className="text-right">2022</span>
            <span className="text-right">Saldo</span>
          </div>
          {seatTableData.map((item) => {
            const color = colorMap[item.legend] ?? FALLBACK_COLOR;
            let changeTagClasses = 'bg-gray-200 text-gray-700';
            let sign = item.seatChange === 0 ? "" : item.seatChange > 0 ? "+" : "";
            if (item.seatChange > 0) { changeTagClasses = 'bg-green-100 text-green-700'; }
            else if (item.seatChange < 0) { changeTagClasses = 'bg-red-100 text-red-700'; }
            return (
              <div key={item.legend} className="grid grid-cols-4 gap-2 items-center py-1.5 border-b border-gray-200 last:border-b-0 text-sm">
                <div className="flex items-center col-span-1">
                  <span style={{ backgroundColor: color }} className="w-2.5 h-2.5 inline-block mr-2 rounded-sm flex-shrink-0 border border-gray-400"></span>
                  <span className="font-medium text-gray-800 truncate" title={item.legend}>{item.legend}</span>
                </div>
                <span className="text-right text-gray-700">{item.previousSeats}</span>
                <span className="text-right text-gray-700 font-semibold">{item.currentSeats}</span>
                <div className="text-right">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${changeTagClasses}`}>
                        {sign}{item.seatChange}
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