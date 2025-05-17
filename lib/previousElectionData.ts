// lib/previousElectionData.ts

// --- Interfaces para os Dados da Eleição Anterior ---

export interface PreviousDistrictResult {
    district_id: number; // Identificador numérico do distrito
    winner_2018_legend: string; // Sigla da frente/coalizão vencedora em 2018
    winner_2018_percentage: number; // Porcentagem do vencedor em 2018
  }
  
  export interface PreviousStateProportionalPercentage {
    uf: string; // Sigla do estado
    // Record<string, number> -> { "FRENTE1": percentual, "FRENTE2": percentual, ... }
    percentages: Record<string, number>;
  }
  
  export interface PreviousStateProportionalSeats {
    uf: string; // Sigla do estado
    // Record<string, number> -> { "FRENTE1": num_assentos, "FRENTE2": num_assentos, ... }
    seats: Record<string, number>;
    total_previous_pr_seats: number; // Total de assentos proporcionais naquele estado na eleição anterior
  }
  
  // --- Dados Estáticos da Eleição Anterior ---
  
  // Helper para converter string de porcentagem (ex: "49,8" ou "2,47%") para número
  const parsePercentage = (percentageStr: string): number => {
    if (!percentageStr) return 0;
    // Remove o '%' e substitui vírgula por ponto
    const cleanedStr = percentageStr.replace('%', '').replace(',', '.');
    const num = parseFloat(cleanedStr);
    return isNaN(num) ? 0 : num;
  };
  
  // Dados dos resultados distritais da eleição anterior
  export const previousDistrictResultsData: PreviousDistrictResult[] = [
    { district_id: 101, winner_2018_legend: "UNI", winner_2018_percentage: 49.8 },
    { district_id: 201, winner_2018_legend: "UNI", winner_2018_percentage: 34.8 },
    { district_id: 202, winner_2018_legend: "TDS", winner_2018_percentage: 44.5 },
    { district_id: 203, winner_2018_legend: "TDS", winner_2018_percentage: 45.1 },
    { district_id: 204, winner_2018_legend: "TDS", winner_2018_percentage: 42.3 },
    { district_id: 205, winner_2018_legend: "TDS", winner_2018_percentage: 46.0 },
    { district_id: 206, winner_2018_legend: "TDS", winner_2018_percentage: 41.8 },
    { district_id: 207, winner_2018_legend: "TDS", winner_2018_percentage: 43.2 },
    { district_id: 208, winner_2018_legend: "UNI", winner_2018_percentage: 37.5 },
    { district_id: 209, winner_2018_legend: "TDS", winner_2018_percentage: 42.9 },
    { district_id: 210, winner_2018_legend: "TDS", winner_2018_percentage: 47.2 },
    { district_id: 211, winner_2018_legend: "TDS", winner_2018_percentage: 44.8 },
    { district_id: 212, winner_2018_legend: "TDS", winner_2018_percentage: 40.3 },
    { district_id: 213, winner_2018_legend: "TDS", winner_2018_percentage: 41.1 },
    { district_id: 214, winner_2018_legend: "PSH", winner_2018_percentage: 39.5 },
    { district_id: 215, winner_2018_legend: "TDS", winner_2018_percentage: 48.1 },
    { district_id: 216, winner_2018_legend: "TDS", winner_2018_percentage: 47.5 },
    { district_id: 217, winner_2018_legend: "TDS", winner_2018_percentage: 48.8 },
    { district_id: 218, winner_2018_legend: "TDS", winner_2018_percentage: 49.3 },
    { district_id: 219, winner_2018_legend: "TDS", winner_2018_percentage: 43.7 },
    { district_id: 220, winner_2018_legend: "TDS", winner_2018_percentage: 41.5 },
    { district_id: 221, winner_2018_legend: "TDS", winner_2018_percentage: 44.1 },
    { district_id: 222, winner_2018_legend: "TDS", winner_2018_percentage: 47.9 },
    { district_id: 223, winner_2018_legend: "TDS", winner_2018_percentage: 45.3 },
    { district_id: 224, winner_2018_legend: "PSH", winner_2018_percentage: 40.2 },
    { district_id: 225, winner_2018_legend: "TDS", winner_2018_percentage: 43.6 },
    { district_id: 226, winner_2018_legend: "UNI", winner_2018_percentage: 43.1 },
    { district_id: 227, winner_2018_legend: "UNI", winner_2018_percentage: 44.0 },
    { district_id: 228, winner_2018_legend: "TDS", winner_2018_percentage: 39.2 },
    { district_id: 229, winner_2018_legend: "TDS", winner_2018_percentage: 38.5 },
    { district_id: 230, winner_2018_legend: "TDS", winner_2018_percentage: 44.3 },
    { district_id: 231, winner_2018_legend: "UNI", winner_2018_percentage: 46.5 },
    { district_id: 232, winner_2018_legend: "UNI", winner_2018_percentage: 41.2 },
    { district_id: 233, winner_2018_legend: "NAC", winner_2018_percentage: 48.9 },
    { district_id: 234, winner_2018_legend: "NAC", winner_2018_percentage: 50.3 },
    { district_id: 235, winner_2018_legend: "TDS", winner_2018_percentage: 39.7 },
    { district_id: 236, winner_2018_legend: "NAC", winner_2018_percentage: 49.6 },
    { district_id: 237, winner_2018_legend: "TDS", winner_2018_percentage: 40.8 },
    { district_id: 238, winner_2018_legend: "PSD", winner_2018_percentage: 34.1 },
    { district_id: 239, winner_2018_legend: "TDS", winner_2018_percentage: 40.1 },
    { district_id: 240, winner_2018_legend: "NAC", winner_2018_percentage: 51.3 },
    { district_id: 241, winner_2018_legend: "NAC", winner_2018_percentage: 52.0 },
    { district_id: 242, winner_2018_legend: "NAC", winner_2018_percentage: 50.7 },
    { district_id: 243, winner_2018_legend: "UNI", winner_2018_percentage: 47.4 },
    { district_id: 244, winner_2018_legend: "UNI", winner_2018_percentage: 48.2 },
    { district_id: 245, winner_2018_legend: "TDS", winner_2018_percentage: 39.9 },
    { district_id: 246, winner_2018_legend: "PSD", winner_2018_percentage: 35.3 },
    { district_id: 247, winner_2018_legend: "TDS", winner_2018_percentage: 37.6 },
    { district_id: 248, winner_2018_legend: "UNI", winner_2018_percentage: 49.1 },
    { district_id: 249, winner_2018_legend: "NAC", winner_2018_percentage: 50.1 },
    { district_id: 250, winner_2018_legend: "UNI", winner_2018_percentage: 51.6 },
    { district_id: 251, winner_2018_legend: "UNI", winner_2018_percentage: 52.3 },
    { district_id: 252, winner_2018_legend: "PSH", winner_2018_percentage: 38.9 },
    { district_id: 301, winner_2018_legend: "TDS", winner_2018_percentage: 46.4 },
    { district_id: 302, winner_2018_legend: "TDS", winner_2018_percentage: 47.0 },
    { district_id: 303, winner_2018_legend: "TDS", winner_2018_percentage: 45.6 },
    { district_id: 304, winner_2018_legend: "TDS", winner_2018_percentage: 44.7 },
    { district_id: 305, winner_2018_legend: "TDS", winner_2018_percentage: 46.9 },
    { district_id: 306, winner_2018_legend: "TDS", winner_2018_percentage: 47.3 },
    { district_id: 307, winner_2018_legend: "TDS", winner_2018_percentage: 44.0 },
    { district_id: 308, winner_2018_legend: "PSD", winner_2018_percentage: 36.0 },
    { district_id: 309, winner_2018_legend: "TDS", winner_2018_percentage: 43.3 },
    { district_id: 310, winner_2018_legend: "TDS", winner_2018_percentage: 41.6 },
    { district_id: 311, winner_2018_legend: "TDS", winner_2018_percentage: 46.5 },
    { district_id: 312, winner_2018_legend: "UNI", winner_2018_percentage: 38.1 },
    { district_id: 313, winner_2018_legend: "TDS", winner_2018_percentage: 47.3 },
    { district_id: 314, winner_2018_legend: "TDS", winner_2018_percentage: 46.8 },
    { district_id: 315, winner_2018_legend: "UNI", winner_2018_percentage: 44.9 },
    { district_id: 316, winner_2018_legend: "UNI", winner_2018_percentage: 45.4 },
    { district_id: 317, winner_2018_legend: "TDS", winner_2018_percentage: 46.6 },
    { district_id: 318, winner_2018_legend: "TDS", winner_2018_percentage: 45.9 },
    { district_id: 319, winner_2018_legend: "TDS", winner_2018_percentage: 47.1 },
    { district_id: 320, winner_2018_legend: "TDS", winner_2018_percentage: 49.7 },
    { district_id: 321, winner_2018_legend: "TDS", winner_2018_percentage: 38.3 },
    { district_id: 322, winner_2018_legend: "UNI", winner_2018_percentage: 52.8 },
    { district_id: 323, winner_2018_legend: "UNI", winner_2018_percentage: 51.0 },
    { district_id: 324, winner_2018_legend: "UNI", winner_2018_percentage: 50.4 },
    { district_id: 325, winner_2018_legend: "UNI", winner_2018_percentage: 50.9 },
    { district_id: 326, winner_2018_legend: "TDS", winner_2018_percentage: 39.0 },
    { district_id: 327, winner_2018_legend: "TDS", winner_2018_percentage: 41.9 },
    { district_id: 328, winner_2018_legend: "TDS", winner_2018_percentage: 42.7 },
    { district_id: 329, winner_2018_legend: "TDS", winner_2018_percentage: 37.9 },
    { district_id: 330, winner_2018_legend: "TDS", winner_2018_percentage: 47.9 },
    { district_id: 401, winner_2018_legend: "TDS", winner_2018_percentage: 48.0 },
    { district_id: 402, winner_2018_legend: "TDS", winner_2018_percentage: 47.6 },
    { district_id: 403, winner_2018_legend: "TDS", winner_2018_percentage: 46.2 },
    { district_id: 404, winner_2018_legend: "PSD", winner_2018_percentage: 36.7 },
    { district_id: 405, winner_2018_legend: "TDS", winner_2018_percentage: 45.2 },
    { district_id: 406, winner_2018_legend: "TDS", winner_2018_percentage: 46.8 },
    { district_id: 407, winner_2018_legend: "PSD", winner_2018_percentage: 35.6 },
    { district_id: 408, winner_2018_legend: "UNI", winner_2018_percentage: 38.0 },
    { district_id: 409, winner_2018_legend: "TDS", winner_2018_percentage: 50.2 },
    { district_id: 410, winner_2018_legend: "TDS", winner_2018_percentage: 48.4 },
    { district_id: 411, winner_2018_legend: "UNI", winner_2018_percentage: 45.7 },
    { district_id: 412, winner_2018_legend: "UNI", winner_2018_percentage: 52.5 },
    { district_id: 413, winner_2018_legend: "UNI", winner_2018_percentage: 53.1 },
    { district_id: 414, winner_2018_legend: "UNI", winner_2018_percentage: 51.5 },
    { district_id: 415, winner_2018_legend: "UNI", winner_2018_percentage: 44.4 },
    { district_id: 416, winner_2018_legend: "UNI", winner_2018_percentage: 43.8 },
    { district_id: 417, winner_2018_legend: "PSD", winner_2018_percentage: 35.9 },
    { district_id: 418, winner_2018_legend: "TDS", winner_2018_percentage: 48.2 },
    { district_id: 419, winner_2018_legend: "PSH", winner_2018_percentage: 39.3 },
    { district_id: 420, winner_2018_legend: "TDS", winner_2018_percentage: 38.7 },
    { district_id: 421, winner_2018_legend: "UNI", winner_2018_percentage: 50.0 },
    { district_id: 501, winner_2018_legend: "TDS", winner_2018_percentage: 46.1 },
    { district_id: 502, winner_2018_legend: "TDS", winner_2018_percentage: 47.7 },
    { district_id: 503, winner_2018_legend: "UNI", winner_2018_percentage: 38.8 },
    { district_id: 504, winner_2018_legend: "PSD", winner_2018_percentage: 36.3 },
    { district_id: 505, winner_2018_legend: "TDS", winner_2018_percentage: 45.5 },
    { district_id: 506, winner_2018_legend: "NAC", winner_2018_percentage: 49.4 },
    { district_id: 507, winner_2018_legend: "UNI", winner_2018_percentage: 48.0 },
    { district_id: 508, winner_2018_legend: "UNI", winner_2018_percentage: 47.2 },
    { district_id: 509, winner_2018_legend: "UNI", winner_2018_percentage: 48.7 },
    { district_id: 510, winner_2018_legend: "PSD", winner_2018_percentage: 37.0 },
    { district_id: 511, winner_2018_legend: "PSD", winner_2018_percentage: 37.4 },
    { district_id: 601, winner_2018_legend: "PSD", winner_2018_percentage: 34.8 },
    { district_id: 602, winner_2018_legend: "PSD", winner_2018_percentage: 35.4 },
    { district_id: 603, winner_2018_legend: "NAC", winner_2018_percentage: 41.3 },
    { district_id: 604, winner_2018_legend: "UNI", winner_2018_percentage: 51.2 },
    { district_id: 605, winner_2018_legend: "UNI", winner_2018_percentage: 51.9 },
  ];
  
  // Dados das porcentagens proporcionais por estado da eleição anterior
  export const previousStateProportionalPercentagesData: PreviousStateProportionalPercentage[] = [
    { uf: "BA", percentages: { "CON": 2.47, "NAC": 7.58, "PSD": 6.42, "PSH": 14.13, "TDS": 44.85, "UNI": 24.55 } },
    { uf: "MA", percentages: { "CON": 1.08, "NAC": 7.62, "PSD": 3.15, "PSH": 5.27, "TDS": 69.33, "UNI": 13.55 } },
    { uf: "MP", percentages: { "CON": 1.16, "NAC": 5.38, "PSD": 16.91, "PSH": 4.57, "TDS": 55.09, "UNI": 16.89 } },
    { uf: "PB", percentages: { "CON": 12.58, "NAC": 3.42, "PSD": 31.13, "PSH": 9.47, "TDS": 18.36, "UNI": 25.04 } },
    { uf: "PN", percentages: { "CON": 7.44, "NAC": 5.37, "PSD": 22.61, "PSH": 2.15, "TDS": 16.48, "UNI": 45.95 } },
    { uf: "TP", percentages: { "CON": 20.42, "NAC": 8.39, "PSD": 15.57, "PSH": 4.13, "TDS": 12.46, "UNI": 39.03 } },
  ];
  
  // Dados dos assentos proporcionais por estado da eleição anterior
  export const previousStateProportionalSeatsData: PreviousStateProportionalSeats[] = [
    { uf: "BA", seats: { "CON": 0, "NAC": 1, "PSD": 1, "PSH": 2, "TDS": 8, "UNI": 4 }, total_previous_pr_seats: 16 },
    { uf: "MA", seats: { "CON": 0, "NAC": 3, "PSD": 1, "PSH": 2, "TDS": 29, "UNI": 5 }, total_previous_pr_seats: 40 }, 
    { uf: "MP", seats: { "CON": 0, "NAC": 1, "PSD": 4, "PSH": 1, "TDS": 13, "UNI": 4 }, total_previous_pr_seats: 23 }, 
    { uf: "PB", seats: { "CON": 1, "NAC": 0, "PSD": 3, "PSH": 1, "TDS": 2, "UNI": 2 }, total_previous_pr_seats: 9 },
    { uf: "PN", seats: { "CON": 0, "NAC": 0, "PSD": 1, "PSH": 0, "TDS": 1, "UNI": 2 }, total_previous_pr_seats: 4 },
    { uf: "TP", seats: { "CON": 0, "NAC": 0, "PSD": 0, "PSH": 0, "TDS": 1, "UNI": 1 }, total_previous_pr_seats: 2 }
  ];