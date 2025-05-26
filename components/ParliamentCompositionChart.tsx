// components/ParliamentCompositionChart.tsx
"use client";

import React from 'react';

interface SeatEntry {
  legend: string;
  seats: number;
  color: string;
}

interface ParliamentCompositionChartProps {
  seatData: SeatEntry[];
  totalSeatsInParliament: number;
  majorityThreshold?: number; // Opcional, para exibir
  title?: string;
}

interface SeatPosition {
  x: number;
  y: number;
  color: string;
  legend: string;
  originalAngle: number; // Para ordenação
  radius: number;       // Para ordenação
}

// Função para determinar cor de texto contrastante (pode ser movida para utils)
const getContrastTextColorForSVG = (hexcolor: string): string => {
    const TEXT_COLOR_DARK_FOR_CONTRAST = '#111827'; // Quase preto
    const TEXT_COLOR_LIGHT_FOR_CONTRAST = '#FFFFFF'; // Branco
    if (!hexcolor || hexcolor.length < 7) return TEXT_COLOR_DARK_FOR_CONTRAST;
    try {
        const r = parseInt(hexcolor.substring(1, 3), 16);
        const g = parseInt(hexcolor.substring(3, 5), 16);
        const b = parseInt(hexcolor.substring(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 135) ? TEXT_COLOR_DARK_FOR_CONTRAST : TEXT_COLOR_LIGHT_FOR_CONTRAST;
    } catch (e) {
        return TEXT_COLOR_DARK_FOR_CONTRAST;
    }
};

const ParliamentCompositionChart: React.FC<ParliamentCompositionChartProps> = ({
  seatData,
  totalSeatsInParliament,
  majorityThreshold,
  title = "Composição do Parlamento Nacional"
}) => {
  if (!seatData || seatData.length === 0 || totalSeatsInParliament === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">Dados de assentos indisponíveis para o gráfico.</p>;
  }

  // Configurações do Gráfico
  const svgWidth = 600;
  const svgHeight = 380; // Aumentado para legenda e título
  const centerX = svgWidth / 2;
  const baseLineY = svgHeight * 0.8; // Linha base do semicírculo (parte de baixo)
  
  const seatVisualRadius = 6.5; // Raio visual de cada círculo
  const seatEffectiveRadius = seatVisualRadius + 1.5; // Raio + margem para cálculo de espaçamento
  
  const rowSpacing = seatEffectiveRadius * 1.8; // Espaço entre o centro das fileiras
  const initialRadius = 70; // Raio da primeira fileira (mais interna, medida do centro do semicírculo)

  // Configuração de assentos por fileira para 213 assentos
  // Do interior para o exterior. A soma deve ser totalSeatsInParliament.
  const seatsPerRowConfig = [25, 30, 35, 40, 43, 40]; // Soma = 213
  if (seatsPerRowConfig.reduce((a,b) => a+b, 0) !== totalSeatsInParliament && totalSeatsInParliament === 213) {
      console.warn(`Configuração de assentos por fileira (${seatsPerRowConfig.reduce((a,b) => a+b, 0)}) não soma o total de assentos do parlamento (${totalSeatsInParliament}). O visual pode ser afetado.`);
  }
  const numRows = seatsPerRowConfig.length;

  // Ângulos para o semicírculo (arco para cima)
  // Um pouco mais de 180 graus para um efeito de "ferradura" mais aberto
  const startAngleRads = Math.PI * 1.08; // Esquerda (um pouco abaixo da horizontal)
  const endAngleRads = Math.PI * -0.08;  // Direita (um pouco abaixo da horizontal)
  const angleRangeRads = startAngleRads - endAngleRads;

  const allCalculatedSeatPositions: SeatPosition[] = [];
  let seatCounter = 0;

  for (let i = 0; i < numRows; i++) {
    const currentRowRadius = initialRadius + i * rowSpacing;
    const seatsInThisRow = seatsPerRowConfig[i];
    const angleStep = seatsInThisRow > 1 ? angleRangeRads / (seatsInThisRow - 1) : 0;

    for (let j = 0; j < seatsInThisRow; j++) {
      if (seatCounter >= totalSeatsInParliament) break;

      const angle = startAngleRads - j * angleStep;
      const x = centerX + currentRowRadius * Math.cos(angle);
      const y = baseLineY - currentRowRadius * Math.sin(angle); // '-' para o arco ir para cima

      allCalculatedSeatPositions.push({ x, y, color: '#E0E0E0', legend: 'N/A', originalAngle: angle, radius: currentRowRadius });
      seatCounter++;
    }
    if (seatCounter >= totalSeatsInParliament) break;
  }

  // Ordenar posições para preenchimento "colunar" (por ângulo, depois por raio)
  allCalculatedSeatPositions.sort((a, b) => {
    if (a.originalAngle > b.originalAngle) return -1; // Ordena da esquerda (maior ângulo positivo) para direita (menor/negativo ângulo)
    if (a.originalAngle < b.originalAngle) return 1;
    return a.radius - b.radius; // Para mesmo ângulo, da fileira interna para externa
  });
  
  // Atribuir cores e legendas aos assentos calculados
  // A ordem em seatData define a ordem dos blocos de cor da esquerda para a direita
  let currentGlobalSeatIndex = 0;
  for (const party of seatData) { // Assume-se que seatData já está na ordem desejada de exibição (ex: esquerda-direita)
    for (let i = 0; i < party.seats; i++) {
      if (currentGlobalSeatIndex < totalSeatsInParliament && currentGlobalSeatIndex < allCalculatedSeatPositions.length) {
        allCalculatedSeatPositions[currentGlobalSeatIndex].color = party.color;
        allCalculatedSeatPositions[currentGlobalSeatIndex].legend = party.legend;
        currentGlobalSeatIndex++;
      }
    }
  }
  
  const finalSeatPositions = allCalculatedSeatPositions.slice(0, Math.min(seatCounter, totalSeatsInParliament));

  // Ordenar dados para legenda (ex: por número de assentos)
  const sortedSeatDataForLegend = [...seatData].sort((a, b) => b.seats - a.seats);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md text-center">
      <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
      <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} aria-labelledby="parliamentChartTitleSectP">
        <title id="parliamentChartTitleSectP">{title} - {totalSeatsInParliament} assentos</title>
        <g>
          {finalSeatPositions.map((seat, index) => (
            <circle
              key={index}
              cx={seat.x}
              cy={seat.y}
              r={seatVisualRadius}
              fill={seat.color}
              stroke="#F9FAFB" 
              strokeWidth="0.75"
            >
              <title>{`${seat.legend}`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
        {sortedSeatDataForLegend.filter(p => p.seats > 0).map(party => (
          <div key={party.legend} className="flex items-center text-xs text-gray-700">
            <span style={{ backgroundColor: party.color }} className="w-3 h-3 inline-block mr-1.5 rounded-sm border border-gray-300 shadow-xs"></span>
            <span>{party.legend}: {party.seats}</span>
          </div>
        ))}
      </div>
       <p className="text-xs text-gray-600 mt-3 font-medium">Total de Assentos: {totalSeatsInParliament}</p>
       {majorityThreshold && <p className="text-xs text-gray-600 mt-1 font-medium">Maioria Necessária: {majorityThreshold}</p>}
    </div>
  );
};

export default ParliamentCompositionChart;