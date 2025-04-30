// components/DistrictBarChart.tsx
"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList // Para mostrar o valor em cima da barra (opcional)
} from 'recharts';

// --- Interface Atualizada ---
// Agora espera numericVotes e percentage, que vêm de districtResults
interface DistrictVoteData {
    candidate_name: string;
    party_legend?: string;
    parl_front_legend: string | null;
    numericVotes: number; // <-- Espera o número diretamente
    percentage?: number; // <-- Opcional, se quiser usar no tooltip
    [key: string]: any;
  }
  
  interface DistrictBarChartProps {
    data: DistrictVoteData[];
    colorMap: Record<string, string>;
  }
  
  const DistrictBarChart: React.FC<DistrictBarChartProps> = ({ data, colorMap }) => {
    if (!data || data.length === 0) {
      // Mantida a mensagem original, ou pode ajustar
      return <p>Selecione um distrito para ver os resultados.</p>;
    }
  
    // --- Preparo dos dados simplificado ---
    // Apenas ordena, já que os votos já são numéricos
    const chartData = [...data].sort((a, b) => b.numericVotes - a.numericVotes);
  
    const fallbackColor = '#8884d8';
  
    return (
      <ResponsiveContainer width="100%" height={300 + data.length * 25}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {/* --- Usar numericVotes --- */}
          <XAxis type="number" dataKey="numericVotes" />
          <YAxis dataKey="candidate_name" type="category" width={150} tick={{ fontSize: 12 }}/>
          {/* Tooltip agora pode usar numericVotes */}
          <Tooltip formatter={(value: number) => `${value.toLocaleString('pt-BR')} votos`} />
          <Legend />
          {/* --- Usar numericVotes --- */}
          <Bar dataKey="numericVotes" name="Votos">
            {chartData.map((entry, index) => {
              const color = entry.parl_front_legend ? colorMap[entry.parl_front_legend] : fallbackColor;
              return <Cell key={`cell-${index}`} fill={color || fallbackColor} />;
            })}
            {/* --- Usar numericVotes --- */}
            <LabelList dataKey="numericVotes" position="right" formatter={(value: number) => value.toLocaleString('pt-BR')} style={{ fill: '#333', fontSize: 10 }}/>
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  export default DistrictBarChart;