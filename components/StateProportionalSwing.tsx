// components/StateProportionalSwing.tsx
"use client";
import React from 'react';
// Nenhum import de 'recharts' é mais necessário aqui, a menos que usado em outro lugar no projeto.
import type { ProportionalSwingEntry } from '@/types/election';
import type { PreviousStateProportionalSeats } from '@/lib/previousElectionData';

interface StateProportionalSwingProps {
  swingDataPercent: ProportionalSwingEntry[];
  currentPRSeatsByFront: Record<string, number>;
  previousPRSeatsDataForState: PreviousStateProportionalSeats | null | undefined;
  colorMap: Record<string, string>;
  stateName: string;
}

interface SeatTableEntry {
  legend: string;
  previousSeats: number;
  currentSeats: number;
  seatChange: number;
  swingPercent: number;
}

// Constantes Globais
const FALLBACK_COLOR = '#B0B0B0';
const SWING_BAR_FALLBACK_COLOR = '#A9A9A9'; // Pode ser unificado com FALLBACK_COLOR se desejado
const TEXT_COLOR_DARK = '#1F2937'; // Tailwind gray-800
const TEXT_COLOR_MEDIUM = '#4A5568'; // Tailwind gray-600
const PREVIOUS_BAR_COLOR = '#A0AEC0'; // Cor para barras de "percentual anterior"

// --- Componente Customizado para o Gráfico de Variação Percentual (Substitui Gráfico 1) ---
interface CustomVariationChartProps {
  data: ProportionalSwingEntry[];
  colorMap: Record<string, string>;
}

const CustomVariationChart: React.FC<CustomVariationChartProps> = ({ data, colorMap }) => {
  if (!data || data.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">Dados de variação indisponíveis.</p>;
  }

  const CATEGORY_LABEL_WIDTH = 110; // px, Largura para o label da legenda/frente
  const BAR_HEIGHT = 20; // px, Altura de cada barra individual (anterior/atual)
  const BAR_VERTICAL_GAP_IN_CATEGORY = 4; // px, Espaço vertical entre as duas barras (anterior/atual) de uma mesma legenda
  const CATEGORY_VERTICAL_SPACING = 16; // px, Espaço vertical entre diferentes legendas
  const CHART_HORIZONTAL_PADDING = 0; // px, Padding lateral geral se necessário (0 para usar toda a largura)
  const VALUE_LABEL_WIDTH = 45; // px, Espaço reservado para o label de % à direita da barra

  let maxPercentInData = 0;
  data.forEach(entry => {
    if (entry.currentPercent > maxPercentInData) maxPercentInData = entry.currentPercent;
    if (entry.previousPercent > maxPercentInData) maxPercentInData = entry.previousPercent;
  });
  const MAX_PERCENT_FOR_SCALE = maxPercentInData > 0 ? Math.ceil(maxPercentInData / 10) * 10 : 100; // Arredonda para próxima dezena ou 100

  return (
    <div className="mb-4">
      <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">Variação Percentual de Votos</h4>
      <div style={{ paddingLeft: `${CHART_HORIZONTAL_PADDING}px`, paddingRight: `${CHART_HORIZONTAL_PADDING}px` }}>
        {data.map((entry, index) => (
          <div
            key={entry.legend}
            style={{
              display: 'flex',
              alignItems: 'center', // Alinha verticalmente o label da legenda com o bloco das duas barras
              marginBottom: index < data.length - 1 ? `${CATEGORY_VERTICAL_SPACING}px` : '0px',
            }}
          >
            <div
              style={{
                width: `${CATEGORY_LABEL_WIDTH}px`,
                minWidth: `${CATEGORY_LABEL_WIDTH}px`,
                paddingRight: '10px',
                fontSize: '10px',
                color: TEXT_COLOR_MEDIUM,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={entry.legend}
            >
              {entry.legend}
            </div>

            <div style={{ flexGrow: 1 }}>
              {/* Barra PreviousPercent */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: `${BAR_VERTICAL_GAP_IN_CATEGORY}px` }}>
                <div
                  style={{
                    height: `${BAR_HEIGHT}px`,
                    width: `calc(${Math.max(0, (entry.previousPercent / MAX_PERCENT_FOR_SCALE)) * 100}% - ${VALUE_LABEL_WIDTH}px)`,
                    backgroundColor: PREVIOUS_BAR_COLOR,
                    borderRadius: '3px',
                  }}
                />
                <div style={{ width: `${VALUE_LABEL_WIDTH}px`, paddingLeft: '5px', fontSize: '9px', color: TEXT_COLOR_MEDIUM }}>
                  {entry.previousPercent != null ? `${entry.previousPercent.toFixed(1)}%` : ""}
                </div>
              </div>

              {/* Barra CurrentPercent */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    height: `${BAR_HEIGHT}px`,
                    width: `calc(${Math.max(0, (entry.currentPercent / MAX_PERCENT_FOR_SCALE)) * 100}% - ${VALUE_LABEL_WIDTH}px)`,
                    backgroundColor: colorMap[entry.legend] || FALLBACK_COLOR,
                    borderRadius: '3px',
                  }}
                />
                <div style={{ width: `${VALUE_LABEL_WIDTH}px`, paddingLeft: '5px', fontSize: '9px', color: TEXT_COLOR_DARK, fontWeight: 'bold' }}>
                  {entry.currentPercent != null ? `${entry.currentPercent.toFixed(1)}%` : ""}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
// --- Fim do Componente CustomVariationChart ---


// --- Componente Customizado para o Gráfico de Swing Proporcional (Gráfico 2) ---
interface CustomSwingChartProps {
  data: ProportionalSwingEntry[];
  colorMap: Record<string, string>;
}

const CustomSwingChart: React.FC<CustomSwingChartProps> = ({ data, colorMap }) => {
  if (!data || data.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">Dados de swing indisponíveis.</p>;
  }

  const BAR_WIDTH = 50; // Aumentado
  const BAR_SPACING = 25; // Aumentado
  const CHART_AREA_HORIZONTAL_PADDING = 10;
  const CHART_VERTICAL_PADDING = 35; // Aumentado um pouco para mais respiro do label
  const BAR_AREA_HEIGHT = 160;
  const LABEL_TEXT_HEIGHT_APPROX = 20;
  const LABEL_OFFSET_FROM_BAR = 5;

  const maxAbsSwing = Math.max(...data.map(d => Math.abs(d.swing)), 1);

  return (
    <div className="mb-4">
      <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">Swing Proporcional de Votos (%)</h4>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          width: '100%',
          height: `${BAR_AREA_HEIGHT + CHART_VERTICAL_PADDING * 2}px`,
          position: 'relative',
          padding: `0 ${CHART_AREA_HORIZONTAL_PADDING}px`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${CHART_AREA_HORIZONTAL_PADDING}px`,
            right: `${CHART_AREA_HORIZONTAL_PADDING}px`,
            top: `${CHART_VERTICAL_PADDING + BAR_AREA_HEIGHT / 2}px`,
            height: '1px',
            backgroundColor: TEXT_COLOR_MEDIUM,
            zIndex: 1,
          }}
        />
        {data.map((entry) => {
          const value = entry.swing;
          const barColor = colorMap[entry.legend] || SWING_BAR_FALLBACK_COLOR;
          const barPixelHeight = (Math.abs(value) / maxAbsSwing) * (BAR_AREA_HEIGHT / 2);
          // Label sem parênteses
          const labelText = `${value > 0 ? '+' : ''}${value.toFixed(1)}% - ${entry.legend}`;

          return (
            <div
              key={entry.legend}
              style={{
                width: `${BAR_WIDTH}px`,
                height: '100%',
                margin: `0 ${BAR_SPACING / 2}px`,
                position: 'relative',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: TEXT_COLOR_DARK,
                  textAlign: 'center',
                  position: 'absolute',
                  width: '250%', // Aumentado para permitir labels mais longos ainda
                  left: '-75%', // Ajustado para centralizar com width: 250%
                  whiteSpace: 'nowrap',
                  top: value >= 0
                    ? `${CHART_VERTICAL_PADDING + (BAR_AREA_HEIGHT / 2) - barPixelHeight - LABEL_TEXT_HEIGHT_APPROX}px`
                    : `${CHART_VERTICAL_PADDING + (BAR_AREA_HEIGHT / 2) + barPixelHeight + LABEL_OFFSET_FROM_BAR}px`,
                }}
              >
                {labelText}
              </div>
              <div
                style={{
                  width: '100%',
                  height: `${barPixelHeight}px`,
                  backgroundColor: barColor,
                  position: 'absolute',
                  left: 0,
                  top: value >= 0
                    ? `${CHART_VERTICAL_PADDING + (BAR_AREA_HEIGHT / 2) - barPixelHeight}px`
                    : `${CHART_VERTICAL_PADDING + (BAR_AREA_HEIGHT / 2)}px`,
                  borderRadius: '3px 3px 0 0',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
// --- Fim do Componente CustomSwingChart ---

// --- Componente Principal StateProportionalSwing ---
const StateProportionalSwing: React.FC<StateProportionalSwingProps> = ({
  swingDataPercent,
  currentPRSeatsByFront,
  previousPRSeatsDataForState,
  colorMap,
  stateName,
}) => {
  if (!swingDataPercent || swingDataPercent.length === 0) {
    return <p className="text-gray-500 text-center py-4">Dados de swing proporcional de votos não disponíveis para {stateName}.</p>;
  }

  // Ordenação dos dados permanece útil para a ordem de exibição
  const barChartDataForColumn1 = [...swingDataPercent].sort((a,b) => b.currentPercent - a.currentPercent);
  const dataForSwingColumnChart = [...swingDataPercent].sort((a, b) => b.swing - a.swing);
  
  const seatTableData: SeatTableEntry[] = barChartDataForColumn1.map((item: ProportionalSwingEntry) => {
    const previousSeats = previousPRSeatsDataForState?.seats[item.legend] || 0;
    const currentSeats = currentPRSeatsByFront[item.legend] || 0;
    const seatChange = currentSeats - previousSeats;
    return {
      legend: item.legend,
      previousSeats,
      currentSeats,
      seatChange,
      swingPercent: item.swing,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Coluna 1: Gráfico Customizado de Variação Percentual */}
      <div className="lg:col-span-3 p-4 bg-gray-50 rounded-lg shadow-sm h-full">
        <CustomVariationChart data={barChartDataForColumn1} colorMap={colorMap} />
      </div>

      {/* Coluna 2: Gráfico Customizado de Swing e Tabela de Assentos */}
      <div className="lg:col-span-2 p-4 bg-gray-50 rounded-lg shadow-sm h-full space-y-6">
        <CustomSwingChart data={dataForSwingColumnChart} colorMap={colorMap} />
        <div>
            <h4 className="text-lg font-semibold text-gray-700 mb-3 text-center">Movimentação de Assentos Proporcionais</h4>
            <div className="space-y-1">
              <div className="grid grid-cols-5 gap-1 text-xs font-semibold text-gray-500 uppercase pb-2 border-b mb-2">
                <span className="col-span-1 truncate">Frente</span>
                <span className="text-right">2018</span>
                <span className="text-right">2022</span>
                <span className="text-right">Saldo</span>
                <span className="text-right col-span-1 truncate">Swing Votos %</span>
              </div>
              {seatTableData.map((item: SeatTableEntry) => {
                const color = colorMap[item.legend] ?? FALLBACK_COLOR;
                let seatChangeTagClasses = 'bg-gray-200 text-gray-700';
                let percentChangeTagClasses = 'bg-gray-200 text-gray-700';
                let seatSign = item.seatChange === 0 ? "" : item.seatChange > 0 ? "+" : "";
                const swingPercentNum = typeof item.swingPercent === 'number' ? item.swingPercent : 0;
                let percentSign = swingPercentNum === 0 ? "" : swingPercentNum > 0 ? "+" : "";

                if (item.seatChange > 0) seatChangeTagClasses = 'bg-green-100 text-green-700';
                else if (item.seatChange < 0) seatChangeTagClasses = 'bg-red-100 text-red-700';
                if (swingPercentNum > 0.05) percentChangeTagClasses = 'bg-green-100 text-green-700';
                else if (swingPercentNum < -0.05) percentChangeTagClasses = 'bg-red-100 text-red-700';
                
                return (
                  <div key={item.legend} className="grid grid-cols-5 gap-1 items-center py-1.5 border-b border-gray-200 last:border-b-0 text-sm">
                    <div className="flex items-center col-span-1">
                      <span style={{ backgroundColor: color }} className="w-2.5 h-2.5 inline-block mr-1.5 rounded-sm flex-shrink-0 border border-gray-400"></span>
                      <span className="font-medium text-gray-800 truncate" title={item.legend}>{item.legend}</span>
                    </div>
                    <span className="text-right text-gray-700">{item.previousSeats}</span>
                    <span className="text-right text-gray-700 font-semibold">{item.currentSeats}</span>
                    <div className="text-right">
                        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${seatChangeTagClasses}`}>
                            {seatSign}{item.seatChange}
                        </span>
                    </div>
                    <div className="text-right col-span-1">
                        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${percentChangeTagClasses}`}>
                            {percentSign}{swingPercentNum.toFixed(1)}%
                        </span>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </div>
    </div>
  );
};
export default StateProportionalSwing;