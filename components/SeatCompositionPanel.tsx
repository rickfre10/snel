// components/SeatCompositionPanel.tsx
"use client";
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';

// Props esperadas pelo componente
interface SeatCompositionPanelProps {
  seatData: Record<string, number>; // { "TDS": 40, "UNI": 55, ... }
  colorMap: Record<string, string>; // { "TDS": "#19cf7d", "UNI": "#f5cf11", ... }
  totalSeats: number; // Total de assentos (ex: 120)
}

// Cores fallback caso uma frente não tenha cor no colorMap
const FALLBACK_COLORS = ['#A9A9A9', '#808080', '#696969', '#778899', '#708090', '#C0C0C0'];

const SeatCompositionPanel: React.FC<SeatCompositionPanelProps> = ({ seatData, colorMap, totalSeats }) => {

  // Prepara os dados para o formato do gráfico de Pizza/Rosca
  // E também calcula a porcentagem para a legenda
  const chartData = useMemo(() => {
    return Object.entries(seatData)
      // Ordena (opcional, mas pode ajudar na legenda visual)
      .sort(([, seatsA], [, seatsB]) => seatsB - seatsA)
      // Mapeia para o formato { name, value, percentage, color }
      .map(([legend, seats], index) => {
        const color = colorMap[legend] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
        const percentage = totalSeats > 0 ? ((seats / totalSeats) * 100) : 0;
        return {
          name: legend, // Nome da fatia/legenda (ex: "TDS")
          value: seats, // Valor numérico para o tamanho da fatia
          percentage: percentage.toFixed(1), // Porcentagem formatada
          color: color, // Cor associada
        };
      });
  }, [seatData, colorMap, totalSeats]);

  // Calcula maioria simples (metade + 1), arredondando para cima
  const majorityThreshold = Math.floor(totalSeats / 2) + 1;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-4 text-center text-gray-700">
        Composição da Câmara (Distrital)
      </h3>

      {/* Container do Gráfico */}
      <div className="w-full flex-grow" style={{ minHeight: '250px' }}> {/* Altura mínima */}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* O componente Pie cria a rosca/pizza */}
            <Pie
              data={chartData}
              // Posicionamento central
              cx="50%"
              cy="50%"
              // Raios para criar o efeito "Rosca" (donut)
              innerRadius={70} // Raio interno (aumentar para rosca mais fina)
              outerRadius={100} // Raio externo
              paddingAngle={1} // Pequeno espaço entre as fatias
              dataKey="value" // Propriedade dos dados que define o tamanho
              nameKey="name" // Propriedade usada no tooltip padrão
              // startAngle={180} // Descomente para tentar fazer meia-lua (pode precisar ajustar cy)
              // endAngle={0}   // Descomente para tentar fazer meia-lua
            >
              {/* Mapeia os dados para criar cada 'Cell' (fatia) com sua cor */}
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
              ))}

               {/* Label no centro do gráfico (opcional) */}
               <Label
                   value={`${totalSeats} Assentos`}
                   position="center"
                   dy={-10} // Ajuste vertical
                   fill="#374151" // Cor do texto (gray-700)
                   fontSize={16}
                   fontWeight="bold"
                />
                 <Label
                   value={`Maioria: ${majorityThreshold}`}
                   position="center"
                   dy={15} // Ajuste vertical
                   fill="#6b7280" // Cor do texto (gray-500)
                   fontSize={12}
                />
            </Pie>
            {/* Tooltip que aparece ao passar o mouse */}
            <Tooltip formatter={(value: number, name: string) => [`${value} assento(s)`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda Detalhada (Lista abaixo do gráfico) */}
      <div className="mt-4 space-y-1">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <span style={{ backgroundColor: entry.color }} className="w-3 h-3 inline-block mr-2 rounded-sm flex-shrink-0"></span>
              <span className="text-gray-800 font-medium">{entry.name}</span>
            </div>
            <div className="text-right">
                 <span className="font-semibold text-gray-900">{entry.value}</span>
                 <span className="text-gray-500 ml-1">({entry.percentage}%)</span>
            </div>
          </div>
        ))}
        {/* Linha Total */}
        <div className="flex items-center justify-between text-sm font-bold pt-2 border-t mt-2">
            <span>TOTAL</span>
            <span>{totalSeats}</span>
        </div>
      </div>
    </div>
  );
};

export default SeatCompositionPanel;