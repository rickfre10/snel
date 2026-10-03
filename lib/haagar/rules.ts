// lib/haagar/rules.ts
// Regras e metadados eleitorais de Haagar compartilhados entre os pleitos.

import { districtsData, partyData } from '@/lib/staticData';
import { calculateProportionalSeats } from '@/lib/electionCalculations';

/** Cadeiras proporcionais por estado (mesmas de 2022). */
export const PR_SEATS_BY_STATE: Record<string, number> = {
  TP: 1, MA: 40, MP: 23, BA: 16, PB: 9, PN: 4,
};

export const STATE_ORDER = ['TP', 'MA', 'MP', 'BA', 'PB', 'PN'];

export const TOTAL_DISTRICT_SEATS = districtsData.length;
export const TOTAL_PR_SEATS = Object.values(PR_SEATS_BY_STATE).reduce((a, b) => a + b, 0);
export const TOTAL_SEATS = TOTAL_DISTRICT_SEATS + TOTAL_PR_SEATS;
export const MAJORITY = Math.floor(TOTAL_SEATS / 2) + 1;

/** Mínimo de votos (estritamente acima) para disputar cadeiras proporcionais no estado. */
export const prVoteThreshold = (uf: string) => (uf === 'TP' ? 40000 : 250000);
export const PR_BARRIER_PERCENT = 5;

export interface FrontInfo {
  legend: string;
  name: string;
  color: string;
  parties: { legend: string; name: string; color: string; number: number | null }[];
}

/** Frentes parlamentares, na ordem ideológica usada nos gráficos. */
export const FRONT_ORDER = ['PSH', 'TDS', 'PSD', 'UNI', 'NAC', 'CON'];

export const FRONTS: Record<string, FrontInfo> = (() => {
  const map: Record<string, FrontInfo> = {};
  partyData.forEach(p => {
    if (!p.parl_front_legend) return;
    const key = p.parl_front_legend;
    if (!map[key]) {
      map[key] = {
        legend: key,
        name: p.parlamentar_front && p.parlamentar_front !== key ? p.parlamentar_front : (p.party_name ?? key),
        color: p.parl_front_color ?? '#888888',
        parties: [],
      };
    }
    if (p.party_legend) {
      map[key].parties.push({ legend: p.party_legend, name: p.party_name ?? p.party_legend, color: p.party_color ?? map[key].color, number: p.party_number });
    }
  });
  // CON aparece como "Conservadores" e "Frente Conservadora" na tabela — padroniza.
  if (map.CON) map.CON.name = 'Frente Conservadora';
  return map;
})();

export const frontColor = (legend: string | null | undefined) =>
  (legend && FRONTS[legend]?.color) || '#5b6275';

export const frontName = (legend: string | null | undefined) =>
  (legend && FRONTS[legend]?.name) || legend || '—';

export const sortFronts = (legends: string[]) =>
  [...legends].sort((a, b) => {
    const ia = FRONT_ORDER.indexOf(a), ib = FRONT_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

/** Versão legível de uma cor de frente sobre fundo escuro (clareia cores muito escuras). */
export function readableOnDark(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum >= 0.45) return `#${h}`;
  const t = Math.min(0.6, 0.45 - lum + 0.25);
  const mix = (c: number) => Math.round(c + (255 - c) * t).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

/** Cor de texto (claro/escuro) para usar sobre um fundo. */
export function textOn(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#0b0d14' : '#ffffff';
}

/**
 * Cadeiras proporcionais de um estado: mínimo absoluto de votos por frente,
 * cláusula de barreira de 5% e D'Hondt (mesma regra do painel 2022).
 * `countedFraction` (0–1) escala o mínimo absoluto durante a apuração para
 * permitir uma projeção com votos parciais.
 */
export function allocateStatePR(uf: string, votesByFront: Record<string, number>, countedFraction = 1): Record<string, number> {
  const seats = PR_SEATS_BY_STATE[uf] ?? 0;
  const threshold = prVoteThreshold(uf) * Math.max(0, Math.min(1, countedFraction));
  const eligible = Object.entries(votesByFront)
    .filter(([, v]) => v > threshold)
    .map(([legend, votes]) => ({ legend, votes }));
  if (!seats || eligible.length === 0) return {};
  return calculateProportionalSeats(eligible, seats, PR_BARRIER_PERCENT);
}
