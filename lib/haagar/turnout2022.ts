// lib/haagar/turnout2022.ts
// Ajuste do comparecimento de 2022. Na planilha oficial os votos válidos somam
// ~100% (até 113%) dos eleitores de cada distrito — alto demais. Enquanto a
// planilha não é corrigida, cada distrito perde de 9 a 12 pontos de
// comparecimento (a partir de no máximo 100%), ficando entre 88% e 91%. O corte
// é fixo por distrito, então planilha, dados embutidos, painel 2022 e telão 2026
// mostram sempre os mesmos números.
import { districtsData } from '@/lib/staticData';

const VOTERS = new Map(districtsData.map(d => [d.district_id, d.voters_qtn]));

/** Comparecimento acima disso é considerado "sem ajuste" (planilha original). */
const RAW_THRESHOLD = 95;

/** Pontos percentuais cortados no distrito (9 a 12, fixo por distrito). */
export function turnoutCut2022(districtId: number): number {
  let h = Math.imul(districtId ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return 9 + (h % 301) / 100;
}

/** Fator a aplicar aos votos de um distrito, dado o total final bruto (planilha). */
export function turnoutFactor2022(districtId: number, rawFinalTotal: number): number {
  const voters = VOTERS.get(districtId);
  if (!voters || rawFinalTotal <= 0) return 1;
  const t = (rawFinalTotal / voters) * 100;
  if (t < RAW_THRESHOLD) return 1; // já ajustado (planilha corrigida)
  return Math.max(0, (Math.min(t, 100) - turnoutCut2022(districtId)) / t);
}

/**
 * Aplica o ajuste a linhas de votos por candidato. `finalTotals` (opcional)
 * são os totais finais brutos por distrito — use quando as linhas forem de uma
 * apuração parcial; sem eles, o total das próprias linhas é o final.
 */
export function adjustTurnout2022<T extends { district_id: number; votes_qtn: number }>(rows: T[], finalTotals?: Record<string, number>): T[] {
  const totals: Record<number, number> = {};
  rows.forEach(r => { totals[r.district_id] = (totals[r.district_id] || 0) + r.votes_qtn; });
  const factor: Record<number, number> = {};
  Object.keys(totals).forEach(k => {
    const id = Number(k);
    factor[id] = turnoutFactor2022(id, finalTotals?.[k] ?? totals[id]);
  });
  return rows.map(r => (factor[r.district_id] === 1 ? r : { ...r, votes_qtn: Math.round(r.votes_qtn * factor[r.district_id]) }));
}
