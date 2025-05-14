// components/InteractiveMap.tsx
"use client";
import React from 'react';
// Importa as dimensões e a interface (agora com 'paths')
import { mapDimensions, DistrictLayoutInfo } from '../lib/mapLayout'; // Ajuste o caminho conforme necessário
// Importa tipos necessários (mantenha seus imports originais)
import type { DistrictResultInfo } from '../types/election'; // Exemplo: Ajuste o caminho

interface InteractiveMapProps {
  results: Record<string, DistrictResultInfo>;
  colorMap: Record<string, string>;
  layoutData: DistrictLayoutInfo[]; // <--- Recebe o array com a estrutura aninhada { id, paths: [...] }
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
                // fill="none" // O fill geral pode continuar none
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Mapeia o 'layoutData' recebido via props (cada item é um distrito {id, paths:[]}) */}
                {layoutData.map((district) => { // <-- Cada 'district' é um objeto {id, paths:[]}
                    const districtId = district.id; // O ID do distrito (único nesta lista principal)
                    // Busca as informações de resultado usando o ID do distrito principal
                    const resultInfo = results[districtId] || { winnerLegend: null, districtName: `Distrito ${districtId}` };
                    const winnerLegend = resultInfo.winnerLegend;
                    // Calcula a cor de preenchimento com base no resultado para TODO o distrito
                    const districtFillColor = winnerLegend ? (colorMap[winnerLegend] ?? fallbackColor) : fallbackColor;

                    return (
                         // Fragmento ou <g> para agrupar logicamente os paths de um distrito, chaveada pelo ID do distrito
                         // Usar <g> pode ser semanticamente melhor aqui, mas Fragment funciona para agrupar no React
                         <React.Fragment key={district.id}>
                            {/* Mapeia os paths DENTRO deste distrito */}
                            {district.paths.map((subPath, index) => ( // <-- Itera sobre o array de paths do distrito
                                <path // <--- Elemento path para cada sub-path
                                    key={`${district.id}-${index}`} // <-- CHAVE ÚNICA combinando ID do distrito e índice do sub-path
                                    // O ID do elemento no DOM pode ser apenas o ID do distrito se não precisar de unicidade para cada sub-path no DOM
                                    // Mas para garantir, podemos manter uma combinação
                                    id={`map-district-${district.id}-${index}`}
                                    d={subPath.d} // <--- Usa o 'd' do sub-path
                                    // === LÓGICA CORRIGIDA PARA O FILL ===
                                    // Prioriza a cor do distrito baseada nos resultados (districtFillColor),
                                    // caso não haja (winnerLegend nulo/ID não encontrado), usa a cor original do subPath (se houver),
                                    // e por último, usa a cor de fallback.
                                    fill={districtFillColor || subPath.fill || fallbackColor}
                                    // ==================================
                                     // Aplica stroke/strokeWidth do sub-path se definidos, senão usa defaults
                                    stroke={subPath.stroke || 'black'}
                                    strokeWidth={subPath.strokeWidth || '15'}
                                    className="cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-75"
                                    // Eventos no nível de CADA path, mas passando o ID do distrito principal e as info do resultado do distrito
                                    onClick={() => onDistrictClick(resultInfo, districtId)}
                                    onMouseEnter={() => onDistrictHover(resultInfo, districtId)}
                                    onMouseLeave={() => onDistrictHover(null, null)}
                                />
                            ))}
                        </React.Fragment>
                    );
                })}
            </svg>
        </div>
    );
};

export default InteractiveMap;