// components/InteractiveMap.tsx
"use client";
import React from 'react';
// Importa as dimensões e a interface GeoLayoutInfo
import { mapDimensions, GeoLayoutInfo, haagarDistrictLayout, haagarStateLayout } from '../lib/mapLayout'; // Ajuste o caminho conforme necessário
// Importa tipos necessários
// Presume-se que DistrictResultInfo em types/election.ts foi atualizado para incluir:
// isFinal: boolean;
// totalVotesInDistrict: number;
// (e opcionalmente statusLabel: string | null;)
import type { DistrictResultInfo } from '../types/election'; 

// Props atualizadas para refletir a estrutura de dados mais rica de 'results'
interface InteractiveMapProps {
  results: Record<string, DistrictResultInfo & { 
    isFinal?: boolean; // Marcado como opcional para compatibilidade se o tipo base não for atualizado
    totalVotesInDistrict?: number; // Marcado como opcional
    // statusLabel?: string | null; // Se necessário para o mapa
  }>;
  colorMap: Record<string, string>;
  onDistrictHover?: (districtInfo: (DistrictResultInfo & { isFinal?: boolean; totalVotesInDistrict?: number; }) | null, districtId: string | null) => void;
  onDistrictClick?: (districtInfo: (DistrictResultInfo & { isFinal?: boolean; totalVotesInDistrict?: number; }) | null, districtId: string) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
    results,
    colorMap,
    onDistrictHover = () => {},
    onDistrictClick = () => {}
}) => {
    const fallbackColor = '#D9D9D9'; // Cor para distritos sem vencedor/votos ou dados ausentes
    const defaultStrokeColor = 'black';
    // const defaultStrokeWidth = '15'; // Borda padrão para os distritos (não usada diretamente nos paths dos distritos)
    const stateStrokeColor = '#000000'; // Cor da borda grossa dos estados
    const stateStrokeWidth = '40'; // Espessura da borda grossa dos estados

    return (
        <div style={{ width: '100%', aspectRatio: `${mapDimensions.width} / ${mapDimensions.height}` }}>
            <svg
                width="100%"
                height="100%"
                viewBox={mapDimensions.viewBox}
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Camada de Distritos Coloridos - Renderizada PRIMEIRO */}
                {haagarDistrictLayout.map((district) => {
                    const districtId = district.id; // Assume-se que district.id é uma string
                    
                    // Busca as informações de resultado usando o ID do distrito.
                    // Fornece defaults para os novos campos se não estiverem presentes.
                    const resultInfo = results[districtId] || { 
                        winnerLegend: null, 
                        districtName: `Distrito ${districtId}`,
                        maxVotes: 0, // Default do tipo base
                        // Defaults para os novos campos esperados
                        totalVotesInDistrict: 0, 
                        isFinal: false, // ALTERADO: Se não há dados, considerar como não final para aplicar transparência
                        // statusLabel: "Dados não disponíveis" 
                    };

                    // Determina se há votos e um vencedor para colorir o distrito.
                    const hasVotesAndWinner = resultInfo.totalVotesInDistrict && resultInfo.totalVotesInDistrict > 0 && resultInfo.winnerLegend;
                    const districtFillColor = hasVotesAndWinner ? (colorMap[resultInfo.winnerLegend!] ?? fallbackColor) : fallbackColor;

                    // Determina a opacidade com base no status final.
                    // Se isFinal for undefined (por exemplo, se o tipo DistrictResultInfo não foi atualizado), assume-se como não final (opacidade 0.6).
                    // Se isFinal for explicitamente false, aplica transparência.
                    const opacity = (resultInfo.isFinal === undefined || resultInfo.isFinal === false) ? 0.6 : 1;


                    return (
                         <React.Fragment key={district.id}>
                            {district.paths.map((subPath, index) => (
                                <path
                                    key={`district-${district.id}-${index}`}
                                    id={`map-district-${district.id}-${index}`}
                                    d={subPath.d}
                                    fill={districtFillColor}
                                    stroke={subPath.stroke || defaultStrokeColor} 
                                    strokeWidth="1" 
                                    className="cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-80" // Leve ajuste no hover opacity
                                    style={{ opacity: opacity }} // Aplica a opacidade calculada
                                    onClick={() => onDistrictClick(resultInfo, districtId)}
                                    onMouseEnter={() => onDistrictHover(resultInfo, districtId)}
                                    onMouseLeave={() => onDistrictHover(null, null)}
                                />
                            ))}
                        </React.Fragment>
                    );
                })}

                {/* Camada de Bordas dos Estados - Renderizada SEGUNDO (agora por cima dos distritos) */}
                {haagarStateLayout.map((state) => ( 
                    <g key={`state-${state.id}`} id={`state-${state.id}`}>
                        {state.paths.map((subPath, index) => ( 
                            <path
                                key={`state-${state.id}-${index}`} 
                                id={`map-state-${state.id}-${index}`}
                                d={subPath.d} 
                                fill="none" 
                                stroke={stateStrokeColor} 
                                strokeWidth={stateStrokeWidth} 
                            />
                        ))}
                    </g>
                ))}
            </svg>
        </div>
    );
};

export default InteractiveMap;
