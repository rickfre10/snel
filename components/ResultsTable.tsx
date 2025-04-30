// components/ResultsTable.tsx
import React from 'react';

// Interface para definir as propriedades que o componente espera receber
interface ResultsTableProps {
  title: string;
  // Aceita um array de objetos, onde cada objeto tem chaves string e valores quaisquer
  // Isso torna o componente reutilizável para candidateVotes e proportionalVotes
  data: Record<string, any>[];
}

// Define o componente funcional usando React.FC (Functional Component) e a interface de Props
const ResultsTable: React.FC<ResultsTableProps> = ({ title, data }) => {
  // Verifica se há dados para exibir
  if (!data || data.length === 0) {
    return <p>Sem dados para exibir para "{title}".</p>;
  }

  // Pega os cabeçalhos (nomes das colunas) a partir das chaves do primeiro objeto de dados
  const headers = Object.keys(data[0]);

  return (
    <div>
      <h2>{title}</h2>
      <table border={1} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header} style={{ padding: '8px', border: '1px solid #ccc', backgroundColor: '#f2f2f2' }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map(header => (
                <td key={`${rowIndex}-${header}`} style={{ padding: '8px', border: '1px solid #ccc' }}>
                  {/* Converte valores para string para exibição segura */}
                  {String(row[header] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;