// components/DistrictBarChart.tsx
"use client";
// Adicionado 'useMemo' ao import do React
import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList,
  Cell
} from 'recharts';
import { Payload } from 'recharts/types/component/DefaultTooltipContent';

// Interface para os dados esperados
interface DistrictVoteData {
  candidate_name: string;
  party_legend?: string;
  parl_front_legend: string | null;
  numericVotes: number;
  percentage?: number;
  yAxisLabel?: string;
  [key: string]: any;
}

interface DistrictBarChartProps {
  data: DistrictVoteData[];
  colorMap: Record<string, string>;
}

// Componente Customizado para o Tick do Eixo Y (sem alterações aqui)
const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const label = payload.value as string;
    if (!label) return null;
    const parts = label.split('\n');
    const name = parts[0];
    const coalition = parts[1] || '';
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={0} textAnchor="end" fill="#666" fontSize={24}>
           <tspan x={0} dy="0.355em">{name}</tspan>
           <tspan x={0} dy="1.1em" fill="#999">{coalition}</tspan>
        </text>
      </g>
    );
};

const DistrictBarChart: React.FC<DistrictBarChartProps> = ({ data, colorMap }) => {
  if (!data || data.length === 0) {
    return <p>Selecione um distrito para ver os resultados.</p>;
  }

  // Prepara os dados (usando useMemo corretamente agora)
  const chartData = useMemo(() => {
    return data
      .map(item => ({
        ...item,
        yAxisLabel: `${item.candidate_name}\n(${item.parl_front_legend || 'N/A'})`,
        percentageValue: typeof item.percentage === 'number' ? item.percentage : 0,
      }))
      .sort((a, b) => b.numericVotes - a.numericVotes);
  }, [data]); // Dependência correta

  const fallbackColor = '#8884d8';

  return (
    <ResponsiveContainer width="100%" height={300 + chartData.length * 40}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="numericVotes" hide={true} />
        <YAxis
            dataKey="yAxisLabel"
            type="category"
            width={180}
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={<CustomYAxisTick />}
         />
        <Tooltip formatter={(value: number) => `${value.toLocaleString('pt-BR')} votos`} />
        {/* <Legend /> */}

        <Bar dataKey="numericVotes" name="Votos" >
          {/* Tipos explícitos adicionados ao callback do map */}
          {chartData.map((entry: typeof chartData[0], index: number) => {
            const color = entry.parl_front_legend ? colorMap[entry.parl_front_legend] : fallbackColor;
            return <Cell key={`cell-${index}`} fill={color || fallbackColor} />;
          })}
          <LabelList
            dataKey="percentageValue"
            position="insideRight"
            offset={5}
            fill="#ffffff"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)', fontSize: 50 }}
            formatter={(value: number) => `${value.toFixed(1)}%`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DistrictBarChart;