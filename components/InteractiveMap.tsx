// components/InteractiveMap.tsx
"use client";
import React from 'react';
// Importa apenas as dimensões e o tipo, não o layout completo
import { mapDimensions, DistrictLayoutInfo } from '../lib/mapLayout'; // Ajuste o caminho
// Importa tipos necessários
import type { DistrictResultInfo } from '../types/election'; // Ou de onde você exporta este tipo

interface InteractiveMapProps {
  results: Record<string, DistrictResultInfo>;
  colorMap: Record<string, string>;
  layoutData: DistrictLayoutInfo[]; // <-- NOVA PROP: Array com os layouts dos distritos a serem exibidos
  onDistrictHover?: (districtInfo: DistrictResultInfo | null, districtId: string | null) => void;
  onDistrictClick?: (districtInfo: DistrictResultInfo | null, districtId: string) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
    results,
    colorMap,
    layoutData, // <-- RECEBE A NOVA PROP
    onDistrictHover = () => {},
    onDistrictClick = () => {}
}) => {
    const fallbackColor = '#D9D9D9';

    return (
        <div className="w-full bg-gray-50 border border-gray-300" style={{ aspectRatio: `${mapDimensions.width} / ${mapDimensions.height}` }}>
            <svg
                width="100%"
                height="100%"
                viewBox={mapDimensions.viewBox}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Agora mapeia o 'layoutData' recebido via props */}
                {layoutData.map((districtLayout) => {
                    const districtId = districtLayout.id;
                    const resultInfo = results[districtId] || { winnerLegend: null, districtName: `Distrito ${districtId}` };
                    const winnerLegend = resultInfo.winnerLegend;
                    const fillColor = winnerLegend ? (colorMap[winnerLegend] ?? fallbackColor) : fallbackColor;

                    return (
                        <rect
                            key={districtId}
                            id={`map-district-${districtId}`}
                            x={districtLayout.x}
                            y={districtLayout.y}
                            width={districtLayout.width}
                            height={districtLayout.height}
                            fill={fillColor}
                            stroke={districtLayout.stroke || 'black'}
                            strokeWidth={districtLayout.strokeWidth || '15'} // camelCase
                            className="cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-75"
                            onClick={() => onDistrictClick(resultInfo, districtId)}
                            onMouseEnter={() => onDistrictHover(resultInfo, districtId)}
                            onMouseLeave={() => onDistrictHover(null, null)}
                        />
                    );
                })}
            </svg>
        </div>
    );
};

export default InteractiveMap;