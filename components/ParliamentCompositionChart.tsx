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
  title?: string;
}

interface SeatPosition {
  x: number;
  y: number;
  color: string;
  legend: string;
}

// Função para determinar cor de texto contrastante
const getContrastTextColor = (hexcolor: string): string => {
    const TEXT_COLOR_DARK_FOR_CONTRAST = '#1F2937'; // Um cinza escuro
    const TEXT_COLOR_LIGHT_FOR_CONTRAST = '#FFFFFF'; // Branco
    if (!hexcolor || hexcolor.length < 7) return TEXT_COLOR_DARK_FOR_CONTRAST;
    try {
        const r = parseInt(hexcolor.substring(1, 3), 16);
        const g = parseInt(hexcolor.substring(3, 5), 16);
        const b = parseInt(hexcolor.substring(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 135) ? TEXT_COLOR_DARK_FOR_CONTRAST : TEXT_COLOR_LIGHT_FOR_CONTRAST; // Ajustado threshold
    } catch (e) {
        return TEXT_COLOR_DARK_FOR_CONTRAST;
    }
};


const ParliamentCompositionChart: React.FC<ParliamentCompositionChartProps> = ({
  seatData,
  totalSeatsInParliament,
  title = "Composição do Parlamento Nacional"
}) => {
  if (!seatData || seatData.length === 0 || totalSeatsInParliament === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">Dados de assentos indisponíveis para o gráfico.</p>;
  }

  const svgWidth = 600;
  const svgHeight = 380; // Aumentado para legenda e título
  const centerX = svgWidth / 2;
  const centerY = svgHeight * 0.7; // Ajustado para caber o semicírculo
  const seatRadius = 6.5; 
  const seatMargin = 2.5; 
  const rowSpacing = seatRadius * 2 + seatMargin;
  const startAngle = Math.PI; 
  const endAngle = 0; 
  const angleRange = startAngle - endAngle;

  const seatsPerRowConfig = [25, 30, 35, 40, 43, 40]; // Soma = 213
  if (seatsPerRowConfig.reduce((a,b) => a+b, 0) !== totalSeatsInParliament && totalSeatsInParliament === 213) {
      console.warn(`Configuração de assentos por fileira (${seatsPerRowConfig.reduce((a,b) => a+b, 0)}) não soma o total de assentos do parlamento (${totalSeatsInParliament}). Ajuste 'seatsPerRowConfig'.`);
      // Poderia tentar uma redistribuição dinâmica aqui, mas é complexo.
      // Por enquanto, o gráfico pode não mostrar todos os assentos se a config estiver errada.
  }
  const numRows = seatsPerRowConfig.length;
  const initialRadius = 75;

  const seatPositions: SeatPosition[] = [];
  let seatCounter = 0;

  for (let i = 0; i < numRows; i++) {
    const currentRowRadius = initialRadius + i * rowSpacing;
    const seatsInThisRow = seatsPerRowConfig[i];
    const angleStep = seatsInThisRow > 1 ? angleRange / (seatsInThisRow - 1) : 0;

    for (let j = 0; j < seatsInThisRow; j++) {
      if (seatCounter >= totalSeatsInParliament) break;
      const angle = startAngle - j * angleStep;
      const x = centerX + currentRowRadius * Math.cos(angle);
      const y = centerY + currentRowRadius * Math.sin(angle);
      seatPositions.push({ x, y, color: '#E0E0E0', legend: 'N/A' });
      seatCounter++;
    }
    if (seatCounter >= totalSeatsInParliament) break;
  }
  
  const sortedSeatData = [...seatData].sort((a, b) => b.seats - a.seats);
  let currentSeatIndex = 0;
  for (const party of sortedSeatData) {
    for (let i = 0; i < party.seats; i++) {
      if (currentSeatIndex < totalSeatsInParliament && currentSeatIndex < seatPositions.length) { // Garante que não estouramos o array de posições
        seatPositions[currentSeatIndex].color = party.color;
        seatPositions[currentSeatIndex].legend = party.legend;
        currentSeatIndex++;
      }
    }
  }
  // Assegurar que estamos usando apenas o número correto de posições
  const finalSeatPositions = seatPositions.slice(0, Math.min(seatCounter, totalSeatsInParliament));


  return (
    <div className="p-4 bg-white rounded-lg shadow-md text-center">
      <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
      <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} aria-labelledby="parliamentChartTitleSect">
        <title id="parliamentChartTitleSect">{title} - {totalSeatsInParliament} assentos</title>
        <g>
          {finalSeatPositions.map((seat, index) => (
            <circle
              key={index}
              cx={seat.x}
              cy={seat.y}
              r={seatRadius}
              fill={seat.color}
              stroke="#F9FAFB" // Um off-white para borda sutil
              strokeWidth="0.75"
            >
              <title>{`${seat.legend}`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
        {sortedSeatData.filter(p => p.seats > 0).map(party => (
          <div key={party.legend} className="flex items-center text-xs text-gray-700">
            <span style={{ backgroundColor: party.color }} className="w-3 h-3 inline-block mr-1.5 rounded-sm border border-gray-300"></span>
            <span>{party.legend}: {party.seats}</span>
          </div>
        ))}
      </div>
       <p className="text-xs text-gray-600 mt-3">Total de Assentos: {totalSeatsInParliament}</p>
       <p className="text-xs text-gray-600 mt-1">Maioria Necessária: {Math.floor(totalSeatsInParliament / 2) + 1}</p>
    </div>
  );
};

export default ParliamentCompositionChart;