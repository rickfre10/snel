// components/ProportionalSeatAllocation.tsx
"use client"; // Pode ser um client component se tiver interatividade ou hooks como useState/useEffect

import React from 'react';

interface ProportionalSeatAllocationProps {
  allocatedSeats: Record<string, number>; // Frente -> nº assentos PR
  colorMap: Record<string, string>;      // parl_front_legend -> cor
  stateName?: string;                     // Nome do estado para título
  totalSeatsInState: number;              // Total de assentos PR em disputa no estado
  majorityThreshold?: number;             // Opcional: número de assentos para maioria
  rawVotes?: Array<{ legend: string; votes: number }>; // Opcional: para mostrar QE/QP
}

const ProportionalSeatAllocation: React.FC<ProportionalSeatAllocationProps> = ({
  allocatedSeats,
  colorMap,
  stateName,
  totalSeatsInState,
  majorityThreshold,
  rawVotes,
}) => {
  const totalAllocated = Object.values(allocatedSeats).reduce((sum, seats) => sum + seats, 0);

  // Calcular QE e QPs se rawVotes estiverem disponíveis
  let totalValidProportionalVotes = 0;
  let quocienteEleitoral: number | null = null;
  const quocientesPartidarios: Record<string, number> = {};

  if (rawVotes && rawVotes.length > 0 && totalSeatsInState > 0) {
    totalValidProportionalVotes = rawVotes.reduce((sum, entry) => sum + entry.votes, 0);
    if (totalValidProportionalVotes > 0) {
        quocienteEleitoral = totalValidProportionalVotes / totalSeatsInState;
        rawVotes.forEach(party => {
            if (quocienteEleitoral && quocienteEleitoral > 0) { // Evita divisão por zero
                 quocientesPartidarios[party.legend] = party.votes / quocienteEleitoral;
            } else {
                quocientesPartidarios[party.legend] = 0;
            }
        });
    }
  }

  const sortedFronts = Object.entries(allocatedSeats)
    .filter(([_, seats]) => seats > 0) // Mostrar apenas frentes com assentos
    .sort(([, seatsA], [, seatsB]) => seatsB - seatsA); // Ordenar por mais assentos

  if (sortedFronts.length === 0 && totalSeatsInState > 0) {
    return (
      <div className="p-4 border rounded-lg shadow bg-white">
        <h3 className="text-lg font-semibold mb-2">
          Alocação Proporcional {stateName ? `em ${stateName}` : ''} (Total: {totalSeatsInState} {totalSeatsInState === 1 ? 'assento' : 'assentos'})
        </h3>
        <p className="text-gray-600">
          Nenhuma frente parlamentar conquistou assentos proporcionais neste estado
          {totalAllocated < totalSeatsInState && totalAllocated > 0 && `, ${totalSeatsInState - totalAllocated} assentos não foram alocados (possivelmente devido à cláusula de barreira ou arredondamentos).`}
          {totalAllocated === 0 && totalSeatsInState > 0 && '.'}
        </p>
      </div>
    );
  }


  return (
    <div className="p-4 border rounded-lg shadow bg-white">

      <div className="space-y-2">
        {sortedFronts.map(([legend, seats]) => (
          <div key={legend} className="p-3 rounded-md" style={{ backgroundColor: colorMap[legend] || '#E0E0E0' }}>
            <div className="flex justify-between items-center">
              <span className="font-medium text-white shadow-sm" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)'}}>
                {legend}
              </span>
              <span className="px-2 py-0.5 bg-black bg-opacity-20 text-white text-sm rounded-full font-semibold">
                {seats} {seats === 1 ? 'assento' : 'assentos'}
              </span>
            </div>
            {quocientesPartidarios[legend] !== undefined && (
                 <p className="text-xs text-white text-opacity-80 mt-0.5" style={{ textShadow: '0px 1px 1px rgba(0,0,0,0.4)'}}>
                    QP: {quocientesPartidarios[legend].toFixed(2)} ({rawVotes?.find(p=>p.legend === legend)?.votes.toLocaleString()} votos)
                 </p>
            )}
          </div>
        ))}
      </div>
      {totalAllocated < totalSeatsInState && totalAllocated > 0 && (
        <p className="text-xs text-amber-700 mt-3">
          Nota: {totalSeatsInState - totalAllocated} assento(s) proporcional(is) não foi(ram) alocado(s), possivelmente devido à cláusula de barreira ou regras de arredondamento do método DHondt quando poucas legendas são elegíveis.
        </p>
      )}
      <br></br>
      <p className="text-sm text-gray-600 mb-3">
        Total em disputa: {totalSeatsInState} | Alocados: {totalAllocated}
        {majorityThreshold && ` | Maioria: ${majorityThreshold}`}
      </p>
      {quocienteEleitoral !== null && (
        <p className="text-xs text-gray-500 mb-1">Quociente Eleitoral (Estimado): {quocienteEleitoral.toFixed(2)}</p>
      )}
    </div>
  );
};

export default ProportionalSeatAllocation;