// components/DistrictBarChart.tsx
"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList // Para mostrar o valor em cima da barra (opcional)
} from 'recharts';

// Interface para os dados esperados (deve corresponder à estrutura em page.tsx)
interface DistrictVoteData {
  candidate_name: string;
  party_legend?: string; // Usado para legenda ou cor, se disponível
  votes_qtn: number | string; // Pode vir como string, converteremos para número
  // Adicione outras propriedades se precisar delas no tooltip, etc.
  [key: string]: any;
}

interface DistrictBarChartProps {
  data: DistrictVoteData[];
  colorMap: Record<string, string>;
}

const DistrictBarChart: React.FC<DistrictBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p>Selecione um distrito para ver os resultados.</p>;
  }

  // Prepara os dados, garantindo que 'votes_qtn' seja número
  const chartData = data.map(item => ({
    ...item,
    votes_qtn: parseInt(String(item.votes_qtn), 10) || 0, // Converte para número, 0 se falhar
  }))
  // Opcional: Ordenar do maior para o menor
  .sort((a, b) => b.votes_qtn - a.votes_qtn);

  return (
    // ResponsiveContainer ajusta o gráfico ao tamanho do container pai
    <ResponsiveContainer width="100%" height={500}>
      <BarChart
        data={chartData}
        layout="vertical" // Barras horizontais, melhor para nomes longos
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }} // Ajuste margens conforme necessário
      >
        <CartesianGrid strokeDasharray="3 3" />
        {/* Eixo X (valores) */}
        <XAxis type="number" />
        {/* Eixo Y (nomes dos candidatos) */}
        <YAxis
            dataKey="candidate_name"
            type="category"
            width={150} // Largura reservada para os nomes
            tick={{ fontSize: 12 }}
        />
        <Tooltip formatter={(value) => `${value.toLocaleString('pt-BR')} votos`} />
        <Legend />
        {/* Define a barra. dataKey="votes_qtn" usa essa coluna para o tamanho */}
        {/* 'name' é o que aparece na legenda e tooltip */}
        <Bar dataKey="votes_qtn" name="Votos" fill="#8884d8">
             {/* Opcional: mostra o valor em cima/dentro da barra */}
             <LabelList dataKey="votes_qtn" position="right" formatter={(value: number) => value.toLocaleString('pt-BR')} style={{ fill: '#333', fontSize: 10 }}/>
        
        </Bar>
         {/* Você poderia adicionar mais <Bar> se tivesse outros dados a comparar */}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DistrictBarChart;