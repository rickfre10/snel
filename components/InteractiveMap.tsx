// components/InteractiveMap.tsx
"use client";
import React from 'react';
// Importa as dimensões e a interface GeoLayoutInfo
import { mapDimensions, GeoLayoutInfo, haagarDistrictLayout, haagarStateLayout } from '../lib/mapLayout'; // Ajuste o caminho conforme necessário
// Importa tipos necessários (mantenha seus imports originais)
import type { DistrictResultInfo } from '../types/election'; // Exemplo: Ajuste o caminho

interface InteractiveMapProps {
  results: Record<string, DistrictResultInfo>;
  colorMap: Record<string, string>;
  // Não precisamos mais passar o layoutData como prop, vamos importar direto do mapLayout.ts
  // layoutData: GeoLayoutInfo[];
  onDistrictHover?: (districtInfo: DistrictResultInfo | null, districtId: string | null) => void;
  onDistrictClick?: (districtInfo: DistrictResultInfo | null, districtId: string) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
    results,
    colorMap,
    // Remova layoutData das props
    onDistrictHover = () => {},
    onDistrictClick = () => {}
}) => {
    const fallbackColor = '#D9D9D9';
    const defaultStrokeColor = 'black';
    const defaultStrokeWidth = '15'; // Borda padrão para os distritos
    const stateStrokeColor = '#000000'; // Cor da borda grossa dos estados
    const stateStrokeWidth = '40'; // Espessura da borda grossa dos estados (ajuste conforme necessário)


    return (
        <div style={{ width: '100%', aspectRatio: `${mapDimensions.width} / ${mapDimensions.height}` }}>
            <svg
                width="100%"
                height="100%"
                viewBox={mapDimensions.viewBox}
                // fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Camada de Distritos Coloridos - Renderizada PRIMEIRO */}
                {haagarDistrictLayout.map((district) => { // Itera sobre os dados de layout dos distritos
                    const districtId = district.id; // O ID do distrito
                    // Busca as informações de resultado usando o ID do distrito
                    const resultInfo = results[districtId] || { winnerLegend: null, districtName: `Distrito ${districtId}` };
                    const winnerLegend = resultInfo.winnerLegend;
                    // Calcula a cor de preenchimento com base no resultado para o distrito
                    const districtFillColor = winnerLegend ? (colorMap[winnerLegend] ?? fallbackColor) : fallbackColor;

                    return (
                         // Fragmento ou <g> para agrupar logicamente os paths de um distrito, chaveada pelo ID do distrito
                         <React.Fragment key={district.id}>
                            {/* Mapeia os paths DENTRO deste distrito */}
                            {district.paths.map((subPath, index) => ( // Itera sobre o array de paths do distrito
                                <path // Elemento path para cada sub-path do distrito
                                    key={`district-${district.id}-${index}`} // Chave única
                                    id={`map-district-${district.id}-${index}`}
                                    d={subPath.d} // Usa o 'd' do sub-path do distrito
                                    // Aplica a cor do resultado do distrito
                                    fill={districtFillColor}
                                     // Define uma borda fina ou nenhuma borda para os distritos
                                    // Podemos até remover o stroke dos distritos aqui se a borda do estado for suficiente
                                    stroke={subPath.stroke || defaultStrokeColor} // Mantém stroke original ou padrão fino
                                    strokeWidth="1" // Reduz a espessura da borda do distrito para não cobrir a borda do estado
                                    className="cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-75"
                                    // Eventos no nível de CADA path do distrito
                                    onClick={() => onDistrictClick(resultInfo, districtId)}
                                    onMouseEnter={() => onDistrictHover(resultInfo, districtId)}
                                    onMouseLeave={() => onDistrictHover(null, null)}
                                />
                            ))}
                        </React.Fragment>
                    );
                })}

                {/* Camada de Bordas dos Estados - Renderizada SEGUNDO (agora por cima dos distritos) */}
                {haagarStateLayout.map((state) => ( // Itera sobre os dados de layout dos estados
                     // Usar <g> para agrupar logicamente os paths de um estado, chaveada pelo ID do estado
                    <g key={`state-${state.id}`} id={`state-${state.id}`}>
                        {state.paths.map((subPath, index) => ( // Itera sobre os paths DENTRO deste estado
                            <path
                                key={`state-${state.id}-${index}`} // Chave única
                                // O ID do elemento no DOM pode ser apenas o ID do estado se não precisar de unicidade para cada sub-path no DOM
                                // Mas para garantir, podemos manter uma combinação
                                id={`map-state-${state.id}-${index}`}
                                d={subPath.d} // Usa o 'd' do sub-path do estado
                                fill="none" // Estados não têm preenchimento nesta camada de borda
                                stroke={stateStrokeColor} // Aplica a cor da borda do estado (preto)
                                strokeWidth={stateStrokeWidth} // Aplica a espessura da borda do estado (40)
                                // Remova eventos de hover/click desta camada para evitar conflito com os distritos
                                // className="cursor-pointer transition-opacity duration-150 ease-in-out hover:opacity-75"
                            />
                        ))}
                    </g>
                ))}

            </svg>
        </div>
    );
};

export default InteractiveMap;