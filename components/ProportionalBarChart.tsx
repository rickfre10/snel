// components/ProportionalBarChart.tsx
import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList,
  Cell
} from 'recharts';
// Importação necessária para a tipagem correta do Tooltip formatter
import { Payload } from 'recharts/types/component/DefaultTooltipContent';

// Interface para os dados de ENTRADA que o componente espera
interface InputChartData {
  name: string;            // Nome do segmento/barra (ex: o que antes era parl_front_legend)
  value: string | number;  // Valor numérico do segmento/barra (ex: o que antes era proportional_votes_qtn)
                           // Será convertido para número se for string.
  [key: string]: any;      // Permite outras propriedades não usadas diretamente pelo gráfico principal
}

// Interface para as props do componente
interface ProportionalBarChartProps {
  data: InputChartData[]; // Espera dados no formato InputChartData
  colorMap: Record<string, string>; // Mapeamento de nomes de 'frentes' para cores
}

// Interface para os dados processados INTERNAMENTE, prontos para o gráfico Recharts
interface ProcessedBarData {
  name: string;            // Nome original do segmento (usado para colorMap e Tooltip)
  value: number;           // Valor numérico processado
  yAxisLabel: string;      // Rótulo para o eixo Y (geralmente o mesmo que 'name')
  percentageValue: number; // Valor percentual calculado
}

// Cores de fallback caso uma cor não seja encontrada no colorMap
const COLORS_FALLBACK = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];
// Cor de fallback para uma barra individual se todas as outras falharem
const FALLBACK_COLOR_BAR = '#8884d8';

const ProportionalBarChart: React.FC<ProportionalBarChartProps> = ({ data, colorMap }) => {
  const chartData = useMemo(() => {
    // Validação inicial dos dados de entrada
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    // 1. Mapeamento inicial: normaliza os dados de entrada.
    //    Converte 'value' para número e usa 'name' diretamente.
    const initialProcessedData = data
      .map(item => ({
        name: item.name, // Usa item.name diretamente
        value: typeof item.value === 'string' ? parseInt(item.value, 10) : Number(item.value) || 0, // Garante que item.value seja um número
      }))
      .filter(item => item.value > 0) // Remove itens com valor zero ou negativo
      .sort((a, b) => b.value - a.value); // Ordena as barras da maior para a menor

    // Se não houver dados após a filtragem inicial
    if (initialProcessedData.length === 0) {
        return [];
    }

    // 2. Calcula o valor total para o cálculo das porcentagens
    const totalValue = initialProcessedData.reduce((sum, item) => sum + item.value, 0);

    // 3. Mapeamento final: adiciona yAxisLabel e percentageValue.
    //    O resultado é um array de ProcessedBarData.
    return initialProcessedData.map(item => ({
      name: item.name,         // Nome original
      value: item.value,       // Valor numérico
      yAxisLabel: item.name,   // Rótulo do eixo Y (pode ser customizado se necessário)
      percentageValue: totalValue > 0 ? (item.value / totalValue) * 100 : 0, // Calcula a porcentagem
    })) as ProcessedBarData[];
  }, [data]); // Dependência do useMemo: recalcula apenas se 'data' mudar

  // Se não houver dados para exibir no gráfico (após todo o processamento)
  if (chartData.length === 0) {
    return <p className="text-center text-gray-500 py-4">Sem votos proporcionais registrados para exibir o gráfico.</p>;
  }

  // Configurações dinâmicas para a altura do gráfico e das barras
  const barHeight = 50; // Altura de cada barra em pixels
  const verticalPadding = 60; // Espaço vertical total para margens, eixos, etc.
  const chartHeight = Math.max(250, chartData.length * barHeight + verticalPadding); // Altura mínima de 250px

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData} // Dados processados para o gráfico
        layout="vertical" // Barras horizontais
        margin={{ top: 20, right: 70, left: 20, bottom: 20 }} // Margens para acomodar rótulos
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} /> {/* Linhas de grade horizontais */}
        <XAxis type="number" dataKey="value" hide={true} /> {/* Eixo X (valores) oculto, mostrado nos rótulos/tooltips */}
        <YAxis
            dataKey="yAxisLabel" // Usa 'yAxisLabel' (nome da frente) para as categorias
            type="category"      // Tipo de eixo
            width={180}          // Largura reservada para os rótulos do eixo Y. Ajuste conforme necessário.
            interval={0}         // Mostra todos os rótulos de categoria
            axisLine={false}     // Esconde a linha do eixo Y
            tickLine={false}     // Esconde as marcas de tick do eixo Y
            tick={{ fontSize: 12, fill: '#666' }} // Estilo dos rótulos do eixo Y
         />
        <Tooltip
          formatter={(
            value: number, // Valor numérico da barra (dataKey da Bar)
            name: string,  // Nome da série da Bar (prop "name" da <Bar /> - ex: "Votos Proporcionais")
            itemProps: Payload<number, string> // Objeto Payload completo do Recharts
          ) => {
            // 'itemProps.payload' contém o objeto de dados original (ProcessedBarData) para esta barra
            const originalDataPoint = itemProps.payload as ProcessedBarData;

            if (
              originalDataPoint &&
              typeof originalDataPoint.name === 'string' &&
              typeof originalDataPoint.percentageValue === 'number'
            ) {
              const displayValue = value.toLocaleString('pt-BR');
              // Retorna um array: [linha1 do tooltip, linha2 (título) do tooltip]
              return [
                `${displayValue} votos (${originalDataPoint.percentageValue.toFixed(1)}%)`,
                originalDataPoint.name, // Nome da frente/segmento
              ];
            }

            // Tooltip de fallback
            return [
              `${value.toLocaleString('pt-BR')} votos`,
              name, // Nome da série da barra
            ];
          }}
          cursor={{ fill: 'rgba(204,204,204,0.3)' }} // Cor de fundo ao passar o mouse sobre a barra
        />
        <Bar dataKey="value" name="Votos Proporcionais" barSize={barHeight * 0.7}> {/* Define a chave de dados e nome da série */}
          {chartData.map((entry, index) => {
            // Determina a cor da barra usando o colorMap ou fallbacks
            const color = colorMap[entry.name] || COLORS_FALLBACK[index % COLORS_FALLBACK.length] || FALLBACK_COLOR_BAR;
            return <Cell key={`cell-${index}`} fill={color} />;
          })}
          {/* Rótulo DENTRO da barra mostrando a PORCENTAGEM */}
          <LabelList
            dataKey="percentageValue"
            position="insideRight" // Posição do rótulo
            offset={10}             // Deslocamento da borda direita
            fill="#ffffff"          // Cor do texto do rótulo
            style={{ fontWeight: 'bold', fontSize: 14 }} // Estilo do texto
            formatter={(value: number) => value > 2 ? `${value.toFixed(1)}%` : ''} // Formata e mostra se > 2%
          />
          {/* Rótulo FORA da barra mostrando o VALOR ABSOLUTO de votos */}
          <LabelList
            dataKey="value"
            position="right" // Posição à direita da barra
            offset={5}       // Deslocamento da borda
            fill="#333"      // Cor do texto
            style={{ fontSize: 11 }} // Estilo do texto
            formatter={(value: number) => value.toLocaleString('pt-BR')} // Formata o número
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ProportionalBarChart;