// components/InteractiveMap.tsx
"use client";
import React from 'react';
// Importa apenas as dimensões e o tipo do novo arquivo mapLayout.ts
import { mapDimensions, DistrictLayoutInfo } from '../lib/mapLayout'; // Ajuste o caminho conforme necessário
// Importa tipos necessários (mantenha seus imports originais)
import type { DistrictResultInfo } from '../types/election'; // Exemplo: Ajuste o caminho

interface InteractiveMapProps {
  results: Record<string, DistrictResultInfo>;
  colorMap: Record<string, string>;
  layoutData: DistrictLayoutInfo[]; // <--- Recebe o array com as infos de hexágono (agora com 'points')
  onDistrictHover?: (districtInfo: DistrictResultInfo | null, districtId: string | null) => void;
  onDistrictClick?: (districtInfo: DistrictResultInfo | null, districtId: string) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
    results,
    colorMap,
    layoutData, // <--- Usa os dados recebidos via prop
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
                fill="none" // O fill geral é 'none', o preenchimento será definido em cada polígono
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Agora mapeia o 'layoutData' recebido via props e renderiza <polygon> */}
                {layoutData.map((districtLayout) => {
                    const districtId = districtLayout.id;
                    // Busca as informações de resultado usando o ID do layout
                    const resultInfo = results[districtId] || { winnerLegend: null, districtName: `Distrito ${districtId}` };
                    const winnerLegend = resultInfo.winnerLegend;
                    const fillColor = winnerLegend ? (colorMap[winnerLegend] ?? fallbackColor) : fallbackColor;

                    return (
                        <polygon // <--- Alterado de <rect> para <polygon>
                            key={districtId}
                            id={`map-district-${districtId}`}
                            points={districtLayout.points} // <--- Usa a propriedade 'points' com as coordenadas do hexágono
                            fill={fillColor} // Define a cor de preenchimento individualmente
                            stroke={districtLayout.stroke || 'black'}
                            strokeWidth={districtLayout.strokeWidth || '15'}
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