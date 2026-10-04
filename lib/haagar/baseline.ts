// lib/haagar/baseline.ts
// Resultado consolidado da eleição de 2022 — usado como base de comparação
// (e como ponto de partida da simulação) do painel 2026.

import { adjustTurnout2022 } from './turnout2022';
import { districtsData, partyData } from '@/lib/staticData';
import {
  previousDistrictResultsData,
  previousStateProportionalPercentagesData,
} from '@/lib/previousElectionData';
import { allocateStatePR } from './rules';
import { rngFor, pick } from '@/lib/haagar2026/random';
import { fictionalName } from '@/lib/haagar2026/names';

export interface BaselineCandidate {
  name: string;
  party: string | null;
  front: string;
  votes: number;
  photo: string | null;
  gender?: 'F' | 'M' | null;
}

export interface BaselineDistrict {
  id: number;
  total: number;
  votes: Record<string, number>;   // votos por frente
  candidates: BaselineCandidate[]; // ordenados por votos (desc)
  winnerFront: string | null;
  winnerName: string | null;
  winnerParty: string | null;
}

export interface BaselineState {
  uf: string;
  total: number;
  votes: Record<string, number>;   // votos proporcionais por frente
  seats: Record<string, number>;   // cadeiras proporcionais conquistadas
}

export interface Baseline2022 {
  source: 'sheets' | 'embedded' | 'fallback';
  note?: string;
  districts: Record<number, BaselineDistrict>;
  states: Record<string, BaselineState>;
}

const frontOfParty: Record<string, string> = {};
partyData.forEach(p => { if (p.party_legend && p.parl_front_legend) frontOfParty[p.party_legend] = p.parl_front_legend; });

export interface RawCandidateRow {
  district_id: number;
  candidate_name: string;
  party_legend?: string | null;
  parl_front_legend?: string | null;
  votes_qtn: number;
  candidate_photo?: string | null;
  gender?: string | null;
}
export interface RawProportionalRow {
  uf: string;
  parl_front_legend: string;
  proportional_votes_qtn: number;
}

/** Monta a base a partir das linhas (já numéricas) da planilha de 2022, aba 100%. */
export function buildBaselineFromRows(rawCandidates: RawCandidateRow[], proportional: RawProportionalRow[]): Baseline2022 {
  // Comparecimento de 2022 ajustado (a planilha soma ~100% dos eleitores)
  const candidates = adjustTurnout2022(rawCandidates);
  const districts: Record<number, BaselineDistrict> = {};
  districtsData.forEach(d => {
    districts[d.district_id] = { id: d.district_id, total: 0, votes: {}, candidates: [], winnerFront: null, winnerName: null, winnerParty: null };
  });
  candidates.forEach(c => {
    const d = districts[c.district_id];
    if (!d) return;
    const front = c.parl_front_legend || (c.party_legend ? frontOfParty[c.party_legend] : null) || c.party_legend || 'OUT';
    const g = (c.gender || '').trim().toLowerCase();
    d.candidates.push({
      name: c.candidate_name, party: c.party_legend ?? null, front, votes: c.votes_qtn, photo: c.candidate_photo || null,
      gender: g.startsWith('f') ? 'F' : g.startsWith('m') ? 'M' : null,
    });
    d.votes[front] = (d.votes[front] || 0) + c.votes_qtn;
    d.total += c.votes_qtn;
  });
  Object.values(districts).forEach(d => {
    d.candidates.sort((a, b) => b.votes - a.votes);
    const w = d.candidates[0];
    if (w) { d.winnerFront = w.front; d.winnerName = w.name; d.winnerParty = w.party; }
  });

  const states: Record<string, BaselineState> = {};
  proportional.forEach(p => {
    if (!states[p.uf]) states[p.uf] = { uf: p.uf, total: 0, votes: {}, seats: {} };
    states[p.uf].votes[p.parl_front_legend] = (states[p.uf].votes[p.parl_front_legend] || 0) + p.proportional_votes_qtn;
    states[p.uf].total += p.proportional_votes_qtn;
  });
  Object.values(states).forEach(s => { s.seats = allocateStatePR(s.uf, s.votes); });

  // Se a planilha não trouxe algum distrito, completa com a estimativa.
  const fallback = buildFallbackBaseline();
  Object.values(districts).forEach(d => {
    if (d.total === 0) districts[d.id] = fallback.districts[d.id];
  });
  Object.keys(fallback.states).forEach(uf => { if (!states[uf]) states[uf] = fallback.states[uf]; });

  return { source: 'sheets', districts, states };
}

/**
 * Estimativa usada quando a planilha não está acessível: reconstrói a votação
 * a partir dos vencedores e percentuais estaduais guardados no projeto.
 */
export function buildFallbackBaseline(): Baseline2022 {
  const districts: Record<number, BaselineDistrict> = {};
  const states: Record<string, BaselineState> = {};
  const prBy: Record<string, Record<string, number>> = {};
  previousStateProportionalPercentagesData.forEach(s => { prBy[s.uf] = s.percentages; });

  districtsData.forEach(d => {
    const prev = previousDistrictResultsData.find(p => p.district_id === d.district_id);
    const statePct = prBy[d.uf] || {};
    const winner = prev?.winner_2018_legend ?? Object.entries(statePct).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'TDS';
    const winnerPct = prev?.winner_2018_percentage ?? 40;
    const others = Object.entries(statePct).filter(([f]) => f !== winner);
    const othersSum = others.reduce((s, [, v]) => s + v, 0) || 1;
    const shares: Record<string, number> = { [winner]: winnerPct };
    others.forEach(([f, v]) => { shares[f] = Math.min(winnerPct - 1, (v / othersSum) * (100 - winnerPct)); });
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    const total = Math.round(d.voters_qtn * 0.895);
    const votes: Record<string, number> = {};
    Object.entries(shares).forEach(([f, v]) => { votes[f] = Math.round((v / sum) * total); });
    // Candidatos fictícios (sempre os mesmos) para a estimativa de 2022
    const candidates: BaselineCandidate[] = Object.entries(votes)
      .map(([front, v]) => {
        const r = rngFor('baseline2022', d.district_id, front);
        const parties = partyData.filter(p => p.parl_front_legend === front && p.party_legend);
        return { name: fictionalName(r), party: parties.length ? pick(r, parties).party_legend : front, front, votes: v, photo: null };
      })
      .sort((a, b) => b.votes - a.votes);
    const w = candidates.find(c => c.front === winner) ?? candidates[0];
    districts[d.district_id] = {
      id: d.district_id,
      total: Object.values(votes).reduce((a, b) => a + b, 0),
      votes,
      candidates,
      winnerFront: winner,
      winnerName: w?.name ?? null,
      winnerParty: w?.party ?? null,
    };
    if (!states[d.uf]) states[d.uf] = { uf: d.uf, total: 0, votes: {}, seats: {} };
    states[d.uf].total += total;
  });
  Object.values(states).forEach(s => {
    const pct = prBy[s.uf] || {};
    Object.entries(pct).forEach(([f, v]) => { s.votes[f] = Math.round((v / 100) * s.total); });
    s.seats = allocateStatePR(s.uf, s.votes);
  });
  return {
    source: 'fallback',
    note: 'Planilha de 2022 indisponível — comparações usam estimativa a partir dos dados salvos no projeto.',
    districts,
    states,
  };
}

/**
 * Resultado oficial de 2022 embutido no projeto (lib/data/haagar2022.json,
 * exportado da BASE_Haagar_Vota_2022.xlsx). Usado quando a planilha online
 * não está configurada ou não responde.
 */
export async function buildEmbeddedBaseline(): Promise<Baseline2022> {
  const data = (await import('@/lib/data/haagar2022.json')).default as unknown as {
    candidates: [number, string, string | null, string | null, number, 'F' | 'M' | null, string | null][];
    proportional: [string, string, number][];
  };
  const b = buildBaselineFromRows(
    data.candidates.map(([district_id, candidate_name, party_legend, parl_front_legend, votes_qtn, gender, candidate_photo]) => ({
      district_id, candidate_name, party_legend, parl_front_legend, votes_qtn, candidate_photo, gender,
    })),
    data.proportional.map(([uf, parl_front_legend, proportional_votes_qtn]) => ({ uf, parl_front_legend, proportional_votes_qtn })),
  );
  return { ...b, source: 'embedded' };
}
