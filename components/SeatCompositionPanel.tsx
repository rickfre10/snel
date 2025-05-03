// components/SeatCompositionPanel.tsx
"use client";
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';

// Props esperadas pelo componente
interface SeatCompositionPanelProps {
  seatData: Record<string, number>; // { "TDS": 40, "UNI": 55, ... }
  colorMap: Record<string, string>; // { "TDS": "#19cf7d", "UNI": "#f5cf11", ... }
  totalSeats: number; // Total de assentos na câmara/disputa (ex: 120)
}

// Cores fallback
const FALLBACK_COLORS = ['#A9A9A9', '#808080', '#696969', '#778899', '#708090', '#C0C0C0'];
const UNFILLED_COLOR = '#E5E7EB'; // Cinza claro (Tailwind gray-200)

const SeatCompositionPanel: React.FC<SeatCompositionPanelProps> = ({ seatData, colorMap, totalSeats }) => {

  // Prepara os dados para o gráfico E calcula assentos não alocados
  const chartData = useMemo(() => {
    let allocatedSeats = 0;
    // Mapeia e ordena as frentes/partidos com assentos
    const allocatedData = Object.entries(seatData)
      .map(([legend, seats]) => {
        allocatedSeats += seats; // Soma os assentos alocados
        const color = colorMap[legend] ?? FALLBACK_COLORS[Math.floor(Math.random() * FALLBACK_COLORS.length)]; // Cor aleatória fallback se não achar
        const percentage = totalSeats > 0 ? ((seats / totalSeats) * 100) : 0;
        return {
          name: legend,
          value: seats,
          percentage: percentage.toFixed(1),
          color: color,
        };
      })
      .filter(item => item.value > 0) // Garante que só entrem frentes com assentos
      .sort((a, b) => b.value - a.value); // Ordena da maior para a menor

    const unfilledSeats = totalSeats - allocatedSeats;
    const finalData = [...allocatedData]; // Copia os dados alocados

    // Adiciona a fatia de assentos não alocados, se houver
    if (unfilledSeats > 0) {
      const unfilledPercentage = totalSeats > 0 ? ((unfilledSeats / totalSeats) * 100) : 0;
      finalData.push({
        name: 'Não Alocado', // Ou 'Vago', 'Abstenção', etc.
        value: unfilledSeats,
        percentage: unfilledPercentage.toFixed(1),
        color: UNFILLED_COLOR,
      });
    }

    return finalData;
  }, [seatData, colorMap, totalSeats]);

  // Calcula maioria simples (metade + 1)
  const majorityThreshold = Math.floor(totalSeats / 2) + 1;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-1 text-center text-gray-700">
        Composição da Câmara (Distrital)
      </h3>
       {/* Texto Central - pode precisar ajustar a posição vertical (cy, dy) */}
       {/* É mais fácil colocar fora do PieChart com position absolute se for complexo */}
      <div className="relative w-full flex-grow" style={{ minHeight: '180px' }}> {/* Altura ajustada para hemiciclo */}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Centro X/Y e Raios */}
            <Pie
              data={chartData}
              cx="50%"
              cy="95%" // Empurra o centro para baixo para o hemiciclo ficar na base
              innerRadius={60} // Raio interno
              outerRadius={110} // Raio externo
              paddingAngle={1}
              dataKey="value"
              nameKey="name"
              // --- Ângulos para Hemiciclo ---
              startAngle={180} // Começa na esquerda
              endAngle={0}   // Termina na direita
              // -----------------------------
            >
              {/* Aplica as cores */}
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFF" strokeWidth={1}/> // Adiciona pequena borda branca
              ))}
               {/* Labels centrais podem ficar fora de posição com cy="95%", considerar remover ou posicionar com CSS */}
               {/* <Label value={`${totalSeats} Assentos`} position="center" dy={-5} fill="#374151" fontSize={16} fontWeight="bold"/> */}
               {/* <Label value={`Maioria: ${majorityThreshold}`} position="center" dy={15} fill="#6b7280" fontSize={12}/> */}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [`${value} assento(s)`, name]} />
          </PieChart>
        </ResponsiveContainer>
         {/* Texto central posicionado manualmente sobre o gráfico */}
         <div className="absolute inset-x-0 bottom-0 text-center mb-4 pointer-events-none">
            <p className="text-lg font-bold text-gray-800">{totalSeats} Assentos</p>
            <p className="text-xs text-gray-500">Maioria: {majorityThreshold}</p>
        </div>
      </div>

      {/* Legenda Detalhada */}
      <div className="mt-2 space-y-1">
        {/* Mapeia TODOS os dados, incluindo 'Não Alocado' se existir */}
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <span style={{ backgroundColor: entry.color }} className="w-3 h-3 inline-block mr-2 rounded-sm flex-shrink-0 border border-gray-300"></span>
              <span className="text-gray-800 font-medium">{entry.name}</span>
            </div>
            <div className="text-right">
                 <span className="font-semibold text-gray-900">{entry.value}</span>
                 <span className="text-gray-500 ml-1">({entry.percentage}%)</span>
            </div>
          </div>
        ))}
        {/* Total */}
        <div className="flex items-center justify-between text-sm font-bold pt-2 border-t mt-2">
            <span>TOTAL</span>
            <span>{totalSeats}</span>
        </div>
      </div>
    </div>
  );
};

export default SeatCompositionPanel;