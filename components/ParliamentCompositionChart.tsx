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
  totalSeatsInLayout: number; 
  majorityThreshold: number;
  title?: string;
}

interface CircleLayoutInfo { cx: string; cy: string; r: string; }

const SVG_CIRCLE_POSITIONS: CircleLayoutInfo[] = [
  // Círculos do primeiro grupo <g id="0-Party-1"> (102 círculos)
  { cx: "10.93", cy: "174.17", r: "4.67"}, { cx: "22.61", cy: "174.17", r: "4.67"},
  { cx: "34.28", cy: "174.17", r: "4.67"}, { cx: "45.96", cy: "174.17", r: "4.67"},
  { cx: "57.64", cy: "174.17", r: "4.67"}, { cx: "69.32", cy: "174.17", r: "4.67"},
  { cx: "81.01", cy: "174.17", r: "4.67"}, { cx: "92.69", cy: "174.17", r: "4.67"},
  { cx: "12.15", cy: "158.93", r: "4.67"}, { cx: "23.89", cy: "159.13", r: "4.67"},
  { cx: "35.64", cy: "159.35", r: "4.67"}, { cx: "47.48", cy: "159.07", r: "4.67"},
  { cx: "59.36", cy: "158.72", r: "4.67"}, { cx: "71.18", cy: "159.00", r: "4.67"},
  { cx: "14.74", cy: "143.87", r: "4.67"}, { cx: "83.18", cy: "158.55", r: "4.67"},
  { cx: "26.60", cy: "144.28", r: "4.67"}, { cx: "95.08", cy: "158.89", r: "4.67"},
  { cx: "38.49", cy: "144.75", r: "4.67"}, { cx: "50.69", cy: "144.24", r: "4.67"},
  { cx: "63.03", cy: "143.62", r: "4.67"}, { cx: "18.67", cy: "129.10", r: "4.67"},
  { cx: "30.73", cy: "129.77", r: "4.67"}, { cx: "75.10", cy: "144.22", r: "4.67"},
  { cx: "42.82", cy: "130.52", r: "4.67"}, { cx: "87.80", cy: "143.48", r: "4.67"},
  { cx: "55.55", cy: "129.87", r: "4.67"}, { cx: "23.92", cy: "114.75", r: "4.67"},
  { cx: "36.22", cy: "115.71", r: "4.67"}, { cx: "100.13", cy: "144.27", r: "4.67"},
  { cx: "68.57", cy: "129.11", r: "4.67"}, { cx: "48.57", cy: "116.80", r: "4.67"},
  { cx: "81.02", cy: "130.13", r: "4.67"}, { cx: "30.45", cy: "100.93", r: "4.67"},
  { cx: "62.00", cy: "116.15", r: "4.67"}, { cx: "43.03", cy: "102.24", r: "4.67"},
  { cx: "94.76", cy: "129.33", r: "4.67"}, { cx: "55.69", cy: "103.74", r: "4.67"},
  { cx: "75.91", cy: "115.41", r: "4.67"}, { cx: "38.19", cy: "87.76", r: "4.67"},
  { cx: "107.66", cy: "130.77", r: "4.67"}, { cx: "88.82", cy: "116.99", r: "4.67"},
  { cx: "69.97", cy: "103.23", r: "4.67"}, { cx: "51.10", cy: "89.49", r: "4.67"},
  { cx: "64.11", cy: "91.47", r: "4.67"}, { cx: "47.10", cy: "75.34", r: "4.67"},
  { cx: "84.92", cy: "102.76", r: "4.67"}, { cx: "103.86", cy: "116.46", r: "4.67"},
  { cx: "60.36", cy: "77.57", r: "4.67"}, { cx: "79.34", cy: "91.30", r: "4.67"},
  { cx: "98.36", cy: "105.04", r: "4.67"}, { cx: "73.73", cy: "80.13", r: "4.67"},
  { cx: "57.09", cy: "63.77", r: "4.67"}, { cx: "117.46", cy: "118.80", r: "4.67"},
  { cx: "70.71", cy: "66.59", r: "4.67"}, { cx: "95.47", cy: "91.34", r: "4.67"},
  { cx: "89.99", cy: "80.50", r: "4.67"}, { cx: "68.08", cy: "53.15", r: "4.67"},
  { cx: "114.90", cy: "105.20", r: "4.67"}, { cx: "84.46", cy: "69.82", r: "4.67"},
  { cx: "109.45", cy: "94.52", r: "4.67"}, { cx: "82.07", cy: "56.65", r: "4.67"},
  { cx: "107.37", cy: "81.35", r: "4.67"}, { cx: "79.98", cy: "43.57", r: "4.67"},
  { cx: "101.80", cy: "70.98", r: "4.67"}, { cx: "129.21", cy: "108.75", r: "4.67"},
  { cx: "96.18", cy: "60.66", r: "4.67"}, { cx: "94.33", cy: "47.84", r: "4.67"},
  { cx: "127.57", cy: "95.82", r: "4.67"}, { cx: "121.88", cy: "85.63", r: "4.67"},
  { cx: "92.70", cy: "35.10", r: "4.67"}, { cx: "108.77", cy: "52.74", r: "4.67"},
  { cx: "114.61", cy: "62.85", r: "4.67"}, { cx: "120.44", cy: "72.95", r: "4.67"},
  { cx: "107.37", cy: "40.25", r: "4.67"}, { cx: "106.14", cy: "27.81", r: "4.67"},
  { cx: "142.54", cy: "100.92", r: "4.67"}, { cx: "135.41", cy: "78.53", r: "4.67"},
  { cx: "122.11", cy: "46.15", r: "4.67"}, { cx: "141.58", cy: "88.58", r: "4.67"},
  { cx: "128.25", cy: "56.21", r: "4.67"}, { cx: "121.08", cy: "33.94", r: "4.67"},
  { cx: "134.47", cy: "66.27", r: "4.67"}, { cx: "120.17", cy: "21.77", r: "4.67"},
  { cx: "136.05", cy: "40.95", r: "4.67"}, { cx: "135.33", cy: "28.97", r: "4.67"},
  { cx: "142.56", cy: "51.16", r: "4.67"}, { cx: "149.79", cy: "73.36", r: "4.67"},
  { cx: "134.70", cy: "17.01", r: "4.67"}, { cx: "157.05", cy: "95.56", r: "4.67"},
  { cx: "149.24", cy: "61.43", r: "4.67"}, { cx: "156.55", cy: "83.65", r: "4.67"},
  { cx: "150.44", cy: "37.19", r: "4.67"}, { cx: "149.99", cy: "25.39", r: "4.67"},
  { cx: "149.59", cy: "13.59", r: "4.67"}, { cx: "157.34", cy: "47.76", r: "4.67"},
  { cx: "164.75", cy: "70.22", r: "4.67"}, { cx: "164.49", cy: "58.49", r: "4.67"},
  { cx: "165.14", cy: "34.93", r: "4.67"}, { cx: "164.93", cy: "23.22", r: "4.67"},
  { cx: "164.73", cy: "11.52", r: "4.67"}, { cx: "172.27", cy: "92.84", r: "4.67"},
  { cx: "172.12", cy: "81.15", r: "4.67"}, { cx: "172.41", cy: "46.05", r: "4.67"},
  { cx: "180.00", cy: "57.50", r: "4.67"}, { cx: "180.00", cy: "69.17", r: "4.67"},
  { cx: "180.00", cy: "34.17", r: "4.67"}, { cx: "180.00", cy: "22.50", r: "4.67"},
  { cx: "180.00", cy: "10.83", r: "4.67"},
  { cx: "187.59", cy: "46.05", r: "4.67"}, { cx: "187.88", cy: "81.15", r: "4.67"}, 
  { cx: "187.73", cy: "92.84", r: "4.67"}, { cx: "195.27", cy: "11.52", r: "4.67"},
  { cx: "195.07", cy: "23.22", r: "4.67"}, { cx: "194.86", cy: "34.93", r: "4.67"},
  { cx: "195.51", cy: "58.49", r: "4.67"}, { cx: "195.25", cy: "70.22", r: "4.67"},
  { cx: "202.66", cy: "47.76", r: "4.67"}, { cx: "210.41", cy: "13.59", r: "4.67"},
  { cx: "210.01", cy: "25.39", r: "4.67"}, { cx: "209.56", cy: "37.19", r: "4.67"},
  { cx: "203.45", cy: "83.65", r: "4.67"}, { cx: "210.76", cy: "61.43", r: "4.67"},
  { cx: "202.95", cy: "95.56", r: "4.67"}, { cx: "225.30", cy: "17.01", r: "4.67"},
  { cx: "210.21", cy: "73.36", r: "4.67"}, { cx: "217.44", cy: "51.16", r: "4.67"},
  { cx: "224.67", cy: "28.97", r: "4.67"}, { cx: "223.95", cy: "40.95", r: "4.67"},
  { cx: "239.83", cy: "21.77", r: "4.67"}, { cx: "225.53", cy: "66.27", r: "4.67"},
  { cx: "238.92", cy: "33.94", r: "4.67"}, { cx: "231.75", cy: "56.21", r: "4.67"},
  { cx: "218.42", cy: "88.58", r: "4.67"}, { cx: "237.89", cy: "46.15", r: "4.67"},
  { cx: "224.59", cy: "78.53", r: "4.67"}, { cx: "217.46", cy: "100.92", r: "4.67"},
  { cx: "253.86", cy: "27.81", r: "4.67"}, { cx: "252.63", cy: "40.25", r: "4.67"},
  { cx: "239.56", cy: "72.95", r: "4.67"}, { cx: "245.39", cy: "62.85", r: "4.67"},
  { cx: "251.23", cy: "52.74", r: "4.67"}, { cx: "267.30", cy: "35.10", r: "4.67"},
  { cx: "238.12", cy: "85.63", r: "4.67"}, { cx: "232.43", cy: "95.82", r: "4.67"},
  { cx: "265.67", cy: "47.84", r: "4.67"}, { cx: "263.82", cy: "60.66", r: "4.67"},
  { cx: "230.79", cy: "108.75", r: "4.67"}, { cx: "258.20", cy: "70.98", r: "4.67"},
  { cx: "280.02", cy: "43.57", r: "4.67"}, { cx: "252.63", cy: "81.35", r: "4.67"},
  { cx: "277.93", cy: "56.65", r: "4.67"}, { cx: "250.55", cy: "94.52", r: "4.67"},
  { cx: "275.54", cy: "69.82", r: "4.67"}, { cx: "245.10", cy: "105.20", r: "4.67"},
  { cx: "291.92", cy: "53.15", r: "4.67"}, { cx: "270.01", cy: "80.50", r: "4.67"},
  { cx: "264.53", cy: "91.34", r: "4.67"}, { cx: "289.29", cy: "66.59", r: "4.67"},
  { cx: "242.54", cy: "118.80", r: "4.67"}, { cx: "302.91", cy: "63.77", r: "4.67"},
  { cx: "286.27", cy: "80.13", r: "4.67"}, { cx: "261.64", cy: "105.04", r: "4.67"},
  { cx: "280.66", cy: "91.30", r: "4.67"}, { cx: "299.64", cy: "77.57", r: "4.67"},
  { cx: "256.14", cy: "116.46", r: "4.67"}, { cx: "275.08", cy: "102.76", r: "4.67"},
  { cx: "312.90", cy: "75.34", r: "4.67"}, { cx: "295.89", cy: "91.47", r: "4.67"},
  { cx: "308.90", cy: "89.49", r: "4.67"}, { cx: "290.03", cy: "103.23", r: "4.67"},
  { cx: "271.18", cy: "116.99", r: "4.67"}, { cx: "252.34", cy: "130.77", r: "4.67"},
  { cx: "321.81", cy: "87.76", r: "4.67"}, { cx: "284.09", cy: "115.41", r: "4.67"},
  { cx: "304.31", cy: "103.74", r: "4.67"}, { cx: "265.24", cy: "129.33", r: "4.67"},
  { cx: "316.97", cy: "102.24", r: "4.67"}, { cx: "298.00", cy: "116.15", r: "4.67"},
  { cx: "329.55", cy: "100.93", r: "4.67"}, { cx: "278.98", cy: "130.13", r: "4.67"},
  { cx: "311.43", cy: "116.80", r: "4.67"}, { cx: "291.43", cy: "129.11", r: "4.67"},
  { cx: "259.87", cy: "144.27", r: "4.67"}, { cx: "323.78", cy: "115.71", r: "4.67"},
  { cx: "336.08", cy: "114.75", r: "4.67"}, { cx: "304.45", cy: "129.87", r: "4.67"},
  { cx: "272.20", cy: "143.48", r: "4.67"}, { cx: "317.18", cy: "130.52", r: "4.67"},
  { cx: "284.90", cy: "144.22", r: "4.67"}, { cx: "329.27", cy: "129.77", r: "4.67"},
  { cx: "341.33", cy: "129.10", r: "4.67"}, { cx: "296.97", cy: "143.62", r: "4.67"},
  { cx: "309.31", cy: "144.24", r: "4.67"}, { cx: "321.51", cy: "144.75", r: "4.67"},
  { cx: "264.92", cy: "158.89", r: "4.67"}, { cx: "333.40", cy: "144.28", r: "4.67"},
  { cx: "276.82", cy: "158.55", r: "4.67"}, { cx: "345.26", cy: "143.87", r: "4.67"},
  { cx: "288.82", cy: "159.00", r: "4.67"}, { cx: "300.64", cy: "158.72", r: "4.67"},
  { cx: "312.52", cy: "159.07", r: "4.67"}, { cx: "324.36", cy: "159.35", r: "4.67"},
  { cx: "336.11", cy: "159.13", r: "4.67"}, { cx: "347.85", cy: "158.93", r: "4.67"},
  { cx: "267.31", cy: "174.17", r: "4.67"}, { cx: "278.99", cy: "174.17", r: "4.67"},
  { cx: "290.68", cy: "174.17", r: "4.67"}, { cx: "302.36", cy: "174.17", r: "4.67"},
  { cx: "314.04", cy: "174.17", r: "4.67"}, { cx: "325.72", cy: "174.17", r: "4.67"},
  { cx: "337.39", cy: "174.17", r: "4.67"}, { cx: "349.07", cy: "174.17", r: "4.67"}
];

const SVG_VIEW_BOX = "0 0 360 185";
const SVG_TEXT_INFO = { 
  x: "180.0", y: "175.0", content: "213", 
  style: {
    fontSize:"12px",
    fontWeight: 'bold', 
    // textAlign: 'center', // Removido para corrigir o erro TS
    textAnchor: 'middle' as const, 
    fontFamily: 'sans-serif',
    fill: "#374151"
  } 
};

const ParliamentCompositionChart: React.FC<ParliamentCompositionChartProps> = ({
  seatData,
  totalSeatsInLayout, 
  majorityThreshold,
  title = "Composição do Parlamento Nacional"
}) => {

  if (!seatData || seatData.length === 0 ) {
    return <p className="text-sm text-gray-500 text-center py-4">Dados de assentos indisponíveis.</p>;
  }
  
  const effectiveLayoutSize = SVG_CIRCLE_POSITIONS.length; 
  if (totalSeatsInLayout !== effectiveLayoutSize) {
      console.warn(`Alerta: totalSeatsInLayout (${totalSeatsInLayout}) da prop não corresponde ao número de assentos no layout SVG predefinido (${effectiveLayoutSize}). O gráfico usará ${effectiveLayoutSize} posições.`);
  }

  const renderedCircles: JSX.Element[] = [];
  let currentSeatIndexInLayout = 0;

  for (const party of seatData) { // seatData deve vir na ordem de preenchimento desejada
    for (let i = 0; i < party.seats; i++) {
      if (currentSeatIndexInLayout < effectiveLayoutSize) {
        const pos = SVG_CIRCLE_POSITIONS[currentSeatIndexInLayout];
        renderedCircles.push(
          <circle
            key={`seat-${currentSeatIndexInLayout}`}
            cx={pos.cx}
            cy={pos.cy}
            r={pos.r}
            fill={party.color}
            stroke="#FFFFFF"
            strokeWidth="0.15" 
          >
            <title>{`${party.legend}: Assento ${i + 1} de ${party.seats}`}</title>
          </circle>
        );
        currentSeatIndexInLayout++;
      } else {
        console.warn(`Mais assentos nos dados (${party.legend}: ${party.seats}) do que posições disponíveis no layout SVG (${effectiveLayoutSize}). Alguns assentos de ${party.legend} podem não ser exibidos.`);
        break; 
      }
    }
    if (currentSeatIndexInLayout >= effectiveLayoutSize) break;
  }

  for (let i = currentSeatIndexInLayout; i < effectiveLayoutSize; i++) {
    const pos = SVG_CIRCLE_POSITIONS[i];
    renderedCircles.push(
      <circle
        key={`empty-seat-${i}`}
        cx={pos.cx}
        cy={pos.cy}
        r={pos.r}
        fill="#E5E7EB" 
        stroke="#FFFFFF"
        strokeWidth="0.15"
      >
        <title>Assento não alocado</title>
      </circle>
    );
  }
  
  const sortedSeatDataForLegend = [...seatData].filter(p=>p.seats > 0).sort((a, b) => b.seats - a.seats);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md text-center">
      <svg 
        width="100%" 
        viewBox={SVG_VIEW_BOX} 
        preserveAspectRatio="xMidYMid meet" 
        aria-labelledby="parliamentChartTitleSVG"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="parliamentChartTitleSVG">{title} - {SVG_TEXT_INFO.content} assentos</title>
        <g>
          {renderedCircles}
        </g>
        <text
          x={SVG_TEXT_INFO.x}
          y={SVG_TEXT_INFO.y}
          fontSize={SVG_TEXT_INFO.style.fontSize}
          style={SVG_TEXT_INFO.style}
        >
          {SVG_TEXT_INFO.content}
        </text>
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
        {sortedSeatDataForLegend.map(party => (
          <div key={party.legend} className="flex items-center text-xs text-gray-700">
            <span style={{ backgroundColor: party.color }} className="w-3 h-3 inline-block mr-1.5 rounded-sm border border-gray-300 shadow-xs"></span>
            <span>{party.legend}: {party.seats}</span>
          </div>
        ))}
      </div>
       <p className="text-xs text-gray-600 mt-3 font-medium">Total de Assentos: {totalSeatsInLayout}</p>
       {majorityThreshold && <p className="text-xs text-gray-600 mt-1 font-medium">Maioria Necessária: {majorityThreshold}</p>}
    </div>
  );
};

export default ParliamentCompositionChart;
