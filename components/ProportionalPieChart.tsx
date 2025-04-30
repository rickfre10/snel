// components/ProportionalPieChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Interface para os dados esperados (deve corresponder à estrutura em page.tsx)
interface ProportionalVoteData {
  parl_front_legend: string; // Usaremos como nome da fatia
  proportional_votes_qtn: number | string; // Valor da fatia
  // Adicione outras propriedades se precisar delas no tooltip, etc.
  [key: string]: any;
}

interface ProportionalPieChartProps {
  data: ProportionalVoteData[];
}

// Cores de exemplo - idealmente viriam dos seus dados de partido/frente
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

const ProportionalPieChart: React.FC<ProportionalPieChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p>Selecione um estado para ver a distribuição proporcional.</p>;
  }

  // Prepara os dados para o gráfico de pizza, garantindo que o valor seja número
  // Filtra frentes com 0 votos para não poluir o gráfico
  const chartData = data
    .map(item => ({
      name: item.parl_front_legend, // Nome da fatia
      value: parseInt(String(item.proportional_votes_qtn), 10) || 0, // Valor da fatia
    }))
    .filter(item => item.value > 0); // Remove frentes sem votos

  if (chartData.length === 0) {
     return <p>Sem votos proporcionais registrados para este estado.</p>;
  }


  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%" // Centro X
          cy="50%" // Centro Y
          labelLine={false} // Linha conectando ao label externo (opcional)
          // label={renderCustomizedLabel} // Função para customizar o label (opcional)
          outerRadius={120} // Raio externo
          fill="#8884d8" // Cor padrão (será sobrescrita pelos Cells)
          dataKey="value" // Chave do objeto de dados que contém o valor numérico
          nameKey="name" // Chave do objeto de dados que contém o nome da fatia
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`} // Label simples
        >
          {/* Mapeia os dados para criar um 'Cell' (fatia) com cor específica */}
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `${value.toLocaleString('pt-BR')} votos`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ProportionalPieChart;

// Exemplo de função para label customizado (se precisar)
// const RADIAN = Math.PI / 180;
// const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
//   const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
//   const x = cx + radius * Math.cos(-midAngle * RADIAN);
//   const y = cy + radius * Math.sin(-midAngle * RADIAN);

//   return (
//     <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
//       {`${name} (${(percent * 100).toFixed(0)}%)`}
//     </text>
//   );
// };