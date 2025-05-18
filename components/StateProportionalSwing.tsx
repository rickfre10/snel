// components/StateProportionalSwing.tsx
"use client";
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList
} from 'recharts'; // ReferenceLine não será mais usada aqui, pois o gráfico de swing é custom.
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
const TEXT_COLOR_DARK = '#1F2937'; // Tailwind gray-800
const TEXT_COLOR_MEDIUM = '#4A5568'; // Tailwind gray-600
// const TEXT_COLOR_LIGHT = '#FFFFFF'; // Não usada diretamente neste trecho final

// Função auxiliar (se precisar para outras partes, pode manter)
// function getTextColorForBackground(hexcolor: string): string { ... }


// --- Componente Customizado para o Gráfico de Swing Proporcional ---
interface CustomSwingChartProps {
  data: ProportionalSwingEntry[];
  colorMap: Record<string, string>;
}

const CustomSwingChart: React.FC<CustomSwingChartProps> = ({ data, colorMap }) => {
  if (!data || data.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">Dados de swing indisponíveis.</p>;
  }

  // Constantes de Configuração do Gráfico Customizado
  const BAR_WIDTH = 40; // Largura de cada barra em pixels
  const BAR_SPACING = 15; // Espaço horizontal entre as barras
  const CHART_AREA_HORIZONTAL_PADDING = 10; // Padding nas laterais da área do gráfico
  const CHART_VERTICAL_PADDING = 30; // Espaço acima e abaixo da área das barras para os labels mais externos
  const BAR_AREA_HEIGHT = 160; // Altura total disponível para a representação das barras (metade para positivo, metade para negativo)
  const LABEL_TEXT_HEIGHT_APPROX = 20; // Altura aproximada reservada para o texto do label
  const LABEL_OFFSET_FROM_BAR = 5; // Pequeno offset entre a barra e o label

  const maxAbsSwing = Math.max(...data.map(d => Math.abs(d.swing)), 1); // Evita divisão por zero, mínimo 1

  return (
    <div className="mb-4"> {/* Adiciona margem inferior se necessário */}
      <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">Swing Proporcional de Votos (%)</h4>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center', // Centraliza as barras se o espaço total for maior que o necessário
          alignItems: 'flex-end', // Importante para a linha zero e posicionamento
          width: '100%',
          height: `${BAR_AREA_HEIGHT + CHART_VERTICAL_PADDING * 2}px`,
          position: 'relative',
          padding: `0 ${CHART_AREA_HORIZONTAL_PADDING}px`, // Padding lateral para a área do gráfico
        }}
      >
        {/* Linha Zero de Referência */}
        <div
          style={{
            position: 'absolute',
            left: `${CHART_AREA_HORIZONTAL_PADDING}px`,
            right: `${CHART_AREA_HORIZONTAL_PADDING}px`,
            top: `${CHART_VERTICAL_PADDING + BAR_AREA_HEIGHT / 2}px`, // Centralizada na área das barras
            height: '1px',
            backgroundColor: TEXT_COLOR_MEDIUM,
            zIndex: 1,
          }}
        />

        {data.map((entry, index) => {
          const value = entry.swing;
          const barColor = colorMap[entry.legend] || SWING_BAR_FALLBACK_COLOR;
          const barPixelHeight = (Math.abs(value) / maxAbsSwing) * (BAR_AREA_HEIGHT / 2);
          const labelText = `(${value > 0 ? '+' : ''}${value.toFixed(1)}% - ${entry.legend})`;

          return (
            <div
              key={entry.legend}
              style={{
                width: `${BAR_WIDTH}px`,
                height: '100%', // Ocupa toda a altura da "slot"
                margin: `0 ${BAR_SPACING / 2}px`, // Espaçamento entre as barras
                position: 'relative',
                zIndex: 2,
              }}
            >
              {/* Label */}
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: TEXT_COLOR_DARK,
                  textAlign: 'center',
                  position: 'absolute',
                  width: '200%', // Permite que o label seja mais largo que a barra
                  left: '-50%', // Centraliza o label mais largo
                  whiteSpace: 'nowrap',
                  top: value >= 0
                    ? `${CHART_VERTICAL_PADDING + (BAR_AREA_HEIGHT / 2) - barPixelHeight - LABEL_TEXT_HEIGHT_APPROX}px`
                    : `${CHART_VERTICAL_PADDING + (BAR_AREA_HEIGHT / 2) + barPixelHeight + LABEL_OFFSET_FROM_BAR}px`,
                }}
              >
                {labelText}
              </div>

              {/* Barra */}
              <div
                style={{
                  width: '100%', // Ocupa BAR_WIDTH
                  height: `${barPixelHeight}px`,
                  backgroundColor: barColor,
                  position: 'absolute',
                  left: 0,
                  top: value >= 0
                    ? `${CHART_VERTICAL_PADDING + (BAR_AREA_HEIGHT / 2) - barPixelHeight}px`
                    : `${CHART_VERTICAL_PADDING + (BAR_AREA_HEIGHT / 2)}px`,
                  borderRadius: '2px 2px 0 0', // Leve arredondamento no topo das barras positivas
                   // Para barras negativas, o arredondamento seria '0 0 2px 2px' se visualmente desejado e top/bottom ajustados
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

      {/* Coluna 1: Gráfico de Barras Agrupadas (% Anterior vs % Atual) - Recharts */}
      <div className="lg:col-span-3 p-4 bg-gray-50 rounded-lg shadow-sm h-full">
        <h4 className="text-lg font-semibold text-gray-700 mb-3 text-center">Variação Percentual de Votos</h4>
        <ResponsiveContainer width="100%" height={280 + barChartDataForColumn1.length * 65}>
          <BarChart
            data={barChartDataForColumn1}
            layout="vertical"
            margin={{ left: 10, right: 50, top: 10, bottom: 10 }} // Ajuste de margens
            barCategoryGap={18} // Espaço vertical entre as categorias de barras
            barGap={2} // Espaço entre barras da mesma categoria
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /> {/* Cor do grid mais suave */}
            <XAxis type="number" hide={true} />
            <YAxis
              dataKey="legend"
              type="category"
              width={110} // Aumentar um pouco se os nomes forem longos
              interval={0}
              tick={{ fontSize: 10, fill: TEXT_COLOR_MEDIUM }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="previousPercent" name="% Anterior (2018)" fill="#A0AEC0" barSize={22} radius={[3, 3, 0, 0]}>
              <LabelList
                dataKey="previousPercent"
                position="right"
                offset={5}
                fill={TEXT_COLOR_MEDIUM}
                fontSize={9}
                formatter={(value: number) => value != null ? `${value.toFixed(1)}%` : ""}
              />
            </Bar>
            <Bar dataKey="currentPercent" name="% Atual (2022)" barSize={22} radius={[3, 3, 0, 0]}>
              {barChartDataForColumn1.map((entry: ProportionalSwingEntry, index: number) => (
                <Cell key={`cell-current-${entry.legend}-${index}`} fill={colorMap[entry.legend] || FALLBACK_COLOR} />
              ))}
              <LabelList
                dataKey="currentPercent"
                position="right"
                offset={5}
                fill={TEXT_COLOR_DARK}
                fontSize={9}
                fontWeight="bold"
                formatter={(value: number) => value != null ? `${value.toFixed(1)}%` : ""}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Coluna 2: Gráfico de COLUNAS de Swing (Custom) e Tabela de Assentos - 40% */}
      <div className="lg:col-span-2 p-4 bg-gray-50 rounded-lg shadow-sm h-full space-y-6">
        {/* Gráfico Customizado de Swing Proporcional */}
        <CustomSwingChart data={dataForSwingColumnChart} colorMap={colorMap} />

        {/* Tabela de Movimentação de Assentos */}
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