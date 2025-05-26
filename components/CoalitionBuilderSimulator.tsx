// components/CoalitionBuilderSimulator.tsx
"use client";

import React, { useState, useMemo } from 'react';

interface PartySeatInfo {
  legend: string;
  seats: number;
  color: string;
}

interface CoalitionBuilderSimulatorProps {
  partySeatData: PartySeatInfo[];
  totalSeatsInParliament: number;
  majorityThreshold: number;
  title?: string;
}

// Função para determinar cor de texto contrastante (copiada de ParliamentCompositionChart)
const getContrastTextColor = (hexcolor: string): string => {
    const TEXT_COLOR_DARK_FOR_CONTRAST = '#1F2937';
    const TEXT_COLOR_LIGHT_FOR_CONTRAST = '#FFFFFF';
    if (!hexcolor || hexcolor.length < 7) return TEXT_COLOR_DARK_FOR_CONTRAST;
    try {
        const r = parseInt(hexcolor.substring(1, 3), 16);
        const g = parseInt(hexcolor.substring(3, 5), 16);
        const b = parseInt(hexcolor.substring(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 135) ? TEXT_COLOR_DARK_FOR_CONTRAST : TEXT_COLOR_LIGHT_FOR_CONTRAST;
    } catch (e) {
        return TEXT_COLOR_DARK_FOR_CONTRAST;
    }
};

const CoalitionBuilderSimulator: React.FC<CoalitionBuilderSimulatorProps> = ({
  partySeatData,
  totalSeatsInParliament,
  majorityThreshold,
  title = "Simulador de Coalizões"
}) => {
  const [selectedLegends, setSelectedLegends] = useState<Set<string>>(new Set());

  const toggleSelection = (legend: string) => {
    setSelectedLegends(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(legend)) newSelected.delete(legend);
      else newSelected.add(legend);
      return newSelected;
    });
  };

  const clearSelection = () => setSelectedLegends(new Set());

  const selectedCoalition = useMemo(() => {
    return partySeatData.filter(party => selectedLegends.has(party.legend));
  }, [selectedLegends, partySeatData]);

  const coalitionTotalSeats = useMemo(() => {
    return selectedCoalition.reduce((sum, party) => sum + party.seats, 0);
  }, [selectedCoalition]);

  const coalitionPercentage = useMemo(() => {
    if (totalSeatsInParliament === 0) return 0;
    return (coalitionTotalSeats / totalSeatsInParliament) * 100;
  }, [coalitionTotalSeats, totalSeatsInParliament]);

  const hasMajority = coalitionTotalSeats >= majorityThreshold;
  const seatsNeededForMajority = majorityThreshold - coalitionTotalSeats;

  const sortedPartyList = [...partySeatData].filter(p=>p.seats > 0).sort((a,b) => b.seats - a.seats);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md space-y-5">
      <h3 className="text-xl font-semibold text-gray-800 text-center">{title}</h3>

      <div className="max-h-72 overflow-y-auto pr-1 space-y-1.5 border rounded-md p-3 bg-gray-50 custom-scrollbar">
        {sortedPartyList.map(party => (
          <button
            key={party.legend}
            onClick={() => toggleSelection(party.legend)}
            className={`w-full flex items-center justify-between p-2.5 rounded-md text-sm transition-all duration-150 ease-in-out shadow-sm border
                        ${selectedLegends.has(party.legend) ? 'ring-2 ring-offset-1' : 'hover:bg-gray-100 focus:bg-gray-100'}
                        ${selectedLegends.has(party.legend) ? 'font-semibold' : 'font-medium'}`}
            style={selectedLegends.has(party.legend) 
                ? { backgroundColor: party.color, color: getContrastTextColor(party.color), borderColor: getContrastTextColor(party.color) === '#FFFFFF' ? party.color : getContrastTextColor(party.color) } 
                : { borderColor: party.color, backgroundColor: '#FFFFFF' }
            }
            title={`Selecionar ${party.legend} (${party.seats} assentos)`}
          >
            <div className="flex items-center">
              {!selectedLegends.has(party.legend) && <span style={{ backgroundColor: party.color}} className="w-3.5 h-3.5 rounded-sm mr-2.5 border border-gray-300"></span>}
              <span className={selectedLegends.has(party.legend) ? '' : 'text-gray-700'}>{party.legend}</span>
            </div>
            <span className={selectedLegends.has(party.legend) ? '' : 'text-gray-600'}>{party.seats}</span>
          </button>
        ))}
      </div>

      <div className="p-3.5 border rounded-md bg-gray-50 space-y-3">
        <h4 className="text-base font-semibold text-gray-700">Resumo da Coalizão:</h4>
        {selectedCoalition.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedCoalition.map(p => (
              <span key={p.legend} className="text-xs font-medium px-2.5 py-1 rounded-full text-white shadow" style={{ backgroundColor: p.color, color: getContrastTextColor(p.color) }}>
                {p.legend}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">Nenhum partido selecionado.</p>
        )}
        
        <p className="text-sm text-gray-700">
          Total de Assentos: <span className="font-bold text-xl text-gray-800">{coalitionTotalSeats}</span> / {totalSeatsInParliament}
        </p>
        <p className="text-sm text-gray-700">
          Percentual: <span className="font-bold text-gray-800">{coalitionPercentage.toFixed(1)}%</span>
        </p>

        <div className="w-full bg-gray-300 rounded-full h-6 my-2 relative shadow-inner overflow-hidden">
          <div
            className="h-6 rounded-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
            style={{ 
                width: `${Math.min(100, coalitionPercentage)}%`,
                backgroundColor: selectedCoalition.length === 1 ? selectedCoalition[0].color : (selectedCoalition.length > 1 ? '#4A5568' : '#E5E7EB' ) // Cor da barra: cor do partido se 1, cinza se >1, cinza claro se 0
            }}
          >
            {coalitionPercentage > 10 && <span className="text-xs font-semibold" style={{color: getContrastTextColor(selectedCoalition.length === 1 ? selectedCoalition[0].color : (selectedCoalition.length > 1 ? '#4A5568' : '#E5E7EB' ))}}>{coalitionTotalSeats}</span>}
          </div>
          <div 
            className="absolute top-0 h-full w-0.5 bg-red-500 opacity-75"
            style={{ left: `${(majorityThreshold / totalSeatsInParliament) * 100}%` }}
            title={`Maioria: ${majorityThreshold} assentos`}
          >
             <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-red-600 font-semibold bg-white px-1 rounded-sm shadow">MAI</span>
          </div>
        </div>

        <div className={`p-3 rounded-md text-center font-bold text-sm shadow-sm ${hasMajority ? 'bg-green-600 text-white' : (coalitionTotalSeats > 0 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-600')}`}>
          {hasMajority
            ? `MAIORIA ALCANÇADA! (${coalitionTotalSeats - majorityThreshold} assento(s) além do necessário)`
            : (coalitionTotalSeats > 0 ? `Faltam ${seatsNeededForMajority} assento(s) para a maioria.` : "Selecione partidos para simular.")}
        </div>

        {selectedLegends.size > 0 && (
          <button
            onClick={clearSelection}
            className="w-full mt-3 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            Limpar Seleção
          </button>
        )}
      </div>
    </div>
  );
};

export default CoalitionBuilderSimulator;