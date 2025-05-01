// components/InteractiveMap.tsx
"use client";
import React from 'react';
// Importa o layout e dimensões que criamos/ajustamos
import { haagarMapLayout, mapDimensions, DistrictLayoutInfo } from '../lib/mapLayout'; // Ajuste o caminho
// Importa tipos necessários (ajuste o caminho se necessário)
import { PartyInfo } from '../types/election';

// Interface para informação de resultado que o mapa espera para cada distrito
export interface DistrictResultInfo {
    winnerLegend: string | null;
    winnerName?: string;
    districtName?: string;
    maxVotes?: number;
}

// Props que o componente do mapa recebe
interface InteractiveMapProps {
    results: Record<string, DistrictResultInfo>; // Objeto: { "101": { winnerLegend: "TDS"}, "201": { winnerLegend: "UNI"} }
    colorMap: Record<string, string>; // Objeto: { "TDS": "#19cf7d", "UNI": "#f5cf11" }
    onDistrictHover?: (districtInfo: DistrictResultInfo | null, districtId: string | null) => void;
    onDistrictClick?: (districtInfo: DistrictResultInfo | null, districtId: string) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
    results,
    colorMap,
    onDistrictHover = () => {},
    onDistrictClick = () => {}
}) => {
    const fallbackColor = '#D9D9D9'; // Cinza padrão para distritos sem vencedor ou cor

    return (
        // Container para o SVG
        // Use aspect-ratio para manter a proporção ou ajuste w/h conforme necessário
        <div className="w-full bg-gray-50 border border-gray-300" style={{ aspectRatio: `${mapDimensions.width} / ${mapDimensions.height}` }}>
            <svg
                // Width e Height 100% para preencher o container div
                width="100%"
                height="100%"
                viewBox={mapDimensions.viewBox} // Essencial para o escalonamento interno
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet" // Garante que o conteúdo escale bem
            >
                {/* Renderiza cada distrito/retângulo dinamicamente */}
                {haagarMapLayout.map((districtLayout) => {
                    const districtId = districtLayout.id;
                    // Pega o resultado para este distrito ou um objeto padrão se não houver
                    const resultInfo = results[districtId] || { winnerLegend: null, districtName: `Distrito ${districtId}` };
                    const winnerLegend = resultInfo.winnerLegend;

                    // Determina a cor de preenchimento
                    const fillColor = winnerLegend ? (colorMap[winnerLegend] ?? fallbackColor) : fallbackColor;

                    return (
                        <rect
                            key={districtId}
                            id={`map-district-${districtId}`} // ID no DOM
                            x={districtLayout.x}
                            y={districtLayout.y}
                            width={districtLayout.width}
                            height={districtLayout.height}
                            fill={fillColor}
                            stroke={districtLayout.stroke || 'black'}
                            strokeWidth={districtLayout.strokeWidth || '15'} // Usa camelCase
                            // Estilo e Interação
                            className="cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-75" // Efeito hover simples
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