// components/StateProportionalSwing.tsx
"use client";
import React from 'react';
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
const SWING_BAR_FALLBACK_COLOR = '#A9A9A9';
const TEXT_COLOR_DARK = '#1F2937';
const TEXT_COLOR_MEDIUM = '#4A5568';
const PREVIOUS_BAR_COLOR = '#A0AEC0';

// --- Componente Customizado para o Gráfico de Variação Percentual (Coluna 1) ---
interface CustomVariationChartProps {
  data: ProportionalSwingEntry[];
  colorMap: Record<string, string>;
}

const CustomVariationChart: React.FC<CustomVariationChartProps> = ({ data, colorMap }) => {
  if (!data || data.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">Dados de variação indisponíveis.</p>;
  }

  const CATEGORY_LABEL_WIDTH = 140;
  const BAR_HEIGHT = 43;
  const BAR_VERTICAL_GAP_IN_CATEGORY = 8;
  const CATEGORY_VERTICAL_SPACING = 30;
  const CHART_HORIZONTAL_PADDING = 0;
  const VALUE_LABEL_WIDTH = 65; // Largura reservada para o texto da porcentagem
  const MIN_VISIBLE_BAR_WIDTH = 2; // Largura mínima em pixels para uma barra com valor > 0

  let maxPercentInData = 0;
  data.forEach(entry => {
    if (entry.currentPercent > maxPercentInData) maxPercentInData = entry.currentPercent;
    if (entry.previousPercent > maxPercentInData) maxPercentInData = entry.previousPercent;
  });
  const MAX_PERCENT_FOR_SCALE = maxPercentInData > 0 ? Math.ceil(maxPercentInData / 10) * 10 : 100;

  return (
    <div className="mb-4">
      <div style={{ paddingLeft: `${CHART_HORIZONTAL_PADDING}px`, paddingRight: `${CHART_HORIZONTAL_PADDING}px` }}>
        {data.map((entry, index) => {
          const percentPrevious = entry.previousPercent;
          const percentCurrent = entry.currentPercent;

          const totalWidthStylePrevious = `${Math.max(0, (percentPrevious / MAX_PERCENT_FOR_SCALE)) * 100}%`;
          const totalWidthStyleCurrent = `${Math.max(0, (percentCurrent / MAX_PERCENT_FOR_SCALE)) * 100}%`;

          // Determina a largura da barra visual. Se o espaço total for menor que o rótulo,
          // a barra terá a largura mínima visível (se o valor > 0).
          const barVisualWidthPrevious = `max(${MIN_VISIBLE_BAR_WIDTH}px, calc(100% - ${VALUE_LABEL_WIDTH}px))`;
          const barVisualWidthCurrent = `max(${MIN_VISIBLE_BAR_WIDTH}px, calc(100% - ${VALUE_LABEL_WIDTH}px))`;
          
          // Se o percentual for 0, a barra não deve ter nem o minWidth.
          const finalBarWidthPrev = percentPrevious > 0 ? barVisualWidthPrevious : '0px';
          const finalBarWidthCurr = percentCurrent > 0 ? barVisualWidthCurrent : '0px';

          return (
            <div
              key={entry.legend}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: index < data.length - 1 ? `${CATEGORY_VERTICAL_SPACING}px` : '0px',
              }}
            >
              <div
                style={{
                  width: `${CATEGORY_LABEL_WIDTH}px`,
                  minWidth: `${CATEGORY_LABEL_WIDTH}px`,
                  paddingRight: '10px',
                  fontSize: '16px',
                  color: TEXT_COLOR_MEDIUM,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={entry.legend}
              >
                {entry.legend}
              </div>

              <div style={{ flexGrow: 1 }}> {/* Container que preenche o espaço restante */}
                {/* Linha PreviousPercent */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: `${BAR_HEIGHT}px`,
                  marginBottom: `${BAR_VERTICAL_GAP_IN_CATEGORY}px`,
                  width: totalWidthStylePrevious, // Largura total para este conjunto barra+rótulo
                }}>
                  <div // BARRA VISUAL
                    style={{
                      height: '100%',
                      width: finalBarWidthPrev,
                      backgroundColor: PREVIOUS_BAR_COLOR,
                      borderRadius: '3px',
                    }}
                  />
                  <div // RÓTULO DE VALOR
                    style={{
                      width: `${VALUE_LABEL_WIDTH}px`,
                      minWidth: `${VALUE_LABEL_WIDTH}px`,
                      paddingLeft: '5px', // Pequeno espaço entre barra e texto do rótulo
                      fontSize: '14px',
                      color: TEXT_COLOR_MEDIUM,
                      textAlign: 'right', // Alinha o texto do rótulo à direita
                      boxSizing: 'border-box',
                    }}
                  >
                    {percentPrevious != null ? `${percentPrevious.toFixed(1)}%` : ""}
                  </div>
                </div>

                {/* Linha CurrentPercent */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: `${BAR_HEIGHT}px`,
                  width: totalWidthStyleCurrent,
                }}>
                  <div // BARRA VISUAL
                    style={{
                      height: '100%',
                      width: finalBarWidthCurr,
                      backgroundColor: colorMap[entry.legend] || FALLBACK_COLOR,
                      borderRadius: '3px',
                    }}
                  />
                  <div // RÓTULO DE VALOR
                    style={{
                      width: `${VALUE_LABEL_WIDTH}px`,
                      minWidth: `${VALUE_LABEL_WIDTH}px`,
                      paddingLeft: '5px',
                      fontSize: '14px',
                      color: TEXT_COLOR_DARK,
                      fontWeight: 'bold',
                      textAlign: 'right',
                      boxSizing: 'border-box',
                    }}
                  >
                    {percentCurrent != null ? `${percentCurrent.toFixed(1)}%` : ""}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
// --- Fim do Componente CustomVariationChart ---


// --- Componente Customizado para o Gráfico de Swing Proporcional (Gráfico 2) ---
// (Sem alterações neste componente nesta rodada)
interface CustomSwingChartProps {
  data: ProportionalSwingEntry[];
  colorMap: Record<string, string>;
}

const CustomSwingChart: React.FC<CustomSwingChartProps> = ({ data, colorMap }) => {
  if (!data || data.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">Dados de swing indisponíveis.</p>;
  }

  const BAR_WIDTH = 50;
  const BAR_SPACING = 25;
  const CHART_AREA_HORIZONTAL_PADDING = 10;
  const CHART_VERTICAL_PADDING = 38;
  const BAR_AREA_HEIGHT = 160;
  const LABEL_TEXT_HEIGHT_APPROX = 24;
  const LABEL_OFFSET_FROM_BAR = 5;

  const maxAbsSwing = Math.max(...data.map(d => Math.abs(d.swing)), 1);

  return (
    <div className="mb-4">
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
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: TEXT_COLOR_DARK,
                  textAlign: 'center',
                  position: 'absolute',
                  width: '250%',
                  left: '-75%',
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
      <div className="lg:col-span-3 p-4 bg-gray-50 rounded-lg shadow-sm h-full">
        <CustomVariationChart data={barChartDataForColumn1} colorMap={colorMap} />
      </div>
      <div className="lg:col-span-2 p-4 bg-gray-50 rounded-lg shadow-sm h-full space-y-6">
        <CustomSwingChart data={dataForSwingColumnChart} colorMap={colorMap} />
        <div>
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