// lib/haagar2026/scenario.ts
// Cenários montados pelo operador: swing nacional extra por frente sobre a
// semente. Código compartilhável ("2026:TDS-8,UNI+5.5") e ajuste automático
// do swing para chegar perto de uma meta de cadeiras.
import type { Baseline2022 } from '@/lib/haagar/baseline';
import { FRONT_ORDER } from '@/lib/haagar/rules';
import { buildModel, snapshotAt, ElectionSnapshot, Scenario } from './model';

export const SWING_LIMIT = 30;

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Swing sem zeros, arredondado (para o código e para o estado). */
export function cleanScenario(s: Scenario | null | undefined): Scenario | null {
  if (!s) return null;
  const swing: Record<string, number> = {};
  FRONT_ORDER.forEach(f => {
    const v = round1(Math.max(-SWING_LIMIT, Math.min(SWING_LIMIT, s.swing[f] ?? 0)));
    if (v !== 0) swing[f] = v;
  });
  return Object.keys(swing).length ? { swing } : null;
}

export function scenarioCode(seed: number, s: Scenario | null | undefined): string {
  const c = cleanScenario(s);
  if (!c) return String(seed);
  return `${seed}:${FRONT_ORDER.filter(f => c.swing[f] !== undefined).map(f => `${f}${c.swing[f] > 0 ? '+' : ''}${c.swing[f]}`).join(',')}`;
}

/** Aceita "2026" ou "2026:TDS-8,UNI+5.5" (vírgula decimal também). */
export function parseScenarioCode(code: string): { seed: number; scenario: Scenario | null } | null {
  const m = code.trim().match(/^(\d{1,10})\s*(?::\s*(.*))?$/);
  if (!m) return null;
  const seed = parseInt(m[1], 10);
  if (!m[2]) return { seed, scenario: null };
  const swing: Record<string, number> = {};
  for (const part of m[2].split(/[;\s]+|,(?=[A-Za-z])/).filter(Boolean)) {
    const p = part.match(/^([A-Za-z]{2,4})\s*([+-]?\d+(?:[.,]\d+)?)$/);
    if (!p) return null;
    const f = p[1].toUpperCase();
    if (!FRONT_ORDER.includes(f)) return null;
    swing[f] = parseFloat(p[2].replace(',', '.'));
  }
  return { seed, scenario: cleanScenario({ swing }) };
}

/** Resultado final (100% apurado) de uma semente + cenário. */
export function finalResult(baseline: Baseline2022, seed: number, scenario: Scenario | null): ElectionSnapshot {
  return snapshotAt(buildModel(baseline, seed, null, scenario), baseline, 100);
}

const seatsOf = (s: ElectionSnapshot) => Object.fromEntries(FRONT_ORDER.map(f => [f, s.frontByLegend[f]?.confirmed ?? 0]));
const distance = (a: Record<string, number>, b: Record<string, number>) => FRONT_ORDER.reduce((d, f) => d + Math.abs((a[f] ?? 0) - (b[f] ?? 0)), 0);

/**
 * Ajusta o swing de cada frente até as cadeiras finais chegarem perto da meta.
 * Roda em pequenos passos (cede a vez ao navegador) e devolve o melhor achado.
 */
export async function fitSeats(
  baseline: Baseline2022, seed: number, target: Record<string, number>, start: Scenario | null,
  onStep?: (best: { scenario: Scenario | null; seats: Record<string, number>; distance: number }, i: number) => void,
  iterations = 40,
) {
  const swing: Record<string, number> = { ...(start?.swing ?? {}) };
  FRONT_ORDER.forEach(f => { swing[f] = swing[f] ?? 0; });
  let best = { scenario: cleanScenario({ swing }), seats: seatsOf(finalResult(baseline, seed, cleanScenario({ swing }))), distance: Infinity };
  best.distance = distance(best.seats, target);
  let step = 0.3;
  for (let i = 0; i < iterations && best.distance > 0; i++) {
    const seats = i === 0 ? best.seats : seatsOf(finalResult(baseline, seed, cleanScenario({ swing })));
    const d = distance(seats, target);
    if (d < best.distance) best = { scenario: cleanScenario({ swing }), seats, distance: d };
    else step *= 0.85;                       // passou do ponto: passos menores
    FRONT_ORDER.forEach(f => {
      swing[f] = Math.max(-SWING_LIMIT, Math.min(SWING_LIMIT, swing[f] + step * ((target[f] ?? 0) - seats[f])));
    });
    // o swing é relativo: mantém a média em zero
    const mean = FRONT_ORDER.reduce((a, f) => a + swing[f], 0) / FRONT_ORDER.length;
    FRONT_ORDER.forEach(f => { swing[f] -= mean; });
    onStep?.(best, i);
    await new Promise(r => setTimeout(r, 0));
  }
  return best;
}
