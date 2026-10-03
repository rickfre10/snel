// lib/haagar2026/control.ts
// Estado do controle da apuração 2026. É o único dado compartilhado entre o
// painel de controle e o telão: a partir dele (semente + progresso) cada
// tela recalcula exatamente os mesmos resultados.

import type { BrandId } from '@/lib/brand';

export type SceneId = 'geral' | 'parlamento' | 'estado' | 'distrito' | 'viradas' | 'comparativo' | 'idle';

export interface ControlFocus {
  scene: SceneId;
  uf?: string;
  districtId?: number;
  rev: number;
}

export interface ControlState {
  rev: number;
  updatedAt: number;
  seed: number;
  running: boolean;
  baseProgress: number;   // % apurado no instante `anchorAt`
  anchorAt: number;       // epoch (ms) no relógio do servidor
  speed: number;          // pontos percentuais por minuto
  holds: Record<string, number | null>; // teto de apuração por UF (null = livre)
  brand: BrandId;
  focus: ControlFocus | null;     // cena enviada pelo operador para o telão
  autoRotate: boolean;            // telão alterna cenas sozinho
  cg?: CgVisibility;              // o que o CG (/2026/cg) mostra no ar
}

export interface CgVisibility {
  seats: boolean;    // caixas de cadeiras por frente
  ticker: boolean;   // faixa de distritos
  bug: boolean;      // logo da emissora no topo
  count: 'confirmadas' | 'projecao';
  text?: CgText;     // tarja de texto livre (manchete)
}

/** Tarja de texto escrita pelo operador (formato "manchete" da News). */
export interface CgText {
  show: boolean;
  label1: string;    // bloco em gradiente, linha 1 (ex.: "edição")
  label2: string;    // bloco em gradiente, linha 2 (ex.: "das 19h")
  headline: string;  // manchete (até 2 linhas)
  sub: string;       // subtítulo (opcional)
}

export const DEFAULT_CG_TEXT: CgText = { show: false, label1: 'eleições', label2: '2026', headline: '', sub: '' };
export const DEFAULT_CG: CgVisibility = { seats: true, ticker: true, bug: true, count: 'confirmadas', text: DEFAULT_CG_TEXT };

export type ControlAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'setSpeed'; speed: number }
  | { type: 'setProgress'; progress: number }
  | { type: 'step'; delta: number }
  | { type: 'reset' }
  | { type: 'newSeed'; seed?: number }
  | { type: 'setHold'; uf: string; value: number | null }
  | { type: 'clearHolds' }
  | { type: 'setBrand'; brand: BrandId }
  | { type: 'focus'; scene: SceneId; uf?: string; districtId?: number }
  | { type: 'setAutoRotate'; value: boolean }
  | { type: 'setCg'; patch: Partial<CgVisibility> }
  | { type: 'setCgText'; patch: Partial<CgText> };

export const SPEED_PRESETS = [
  { label: 'Lento', speed: 1 },      // ~1h40 até 100%
  { label: 'Normal', speed: 3 },     // ~33 min
  { label: 'Rápido', speed: 8 },     // ~12 min
  { label: 'Turbo', speed: 25 },     // ~4 min
  { label: 'Ensaio', speed: 100 },   // 1 min
];

export function initialControlState(now = Date.now()): ControlState {
  return {
    rev: 1,
    updatedAt: now,
    seed: 2026,
    running: false,
    baseProgress: 0,
    anchorAt: now,
    speed: 3,
    holds: {},
    brand: 'smartv',
    focus: null,
    autoRotate: false,
    cg: DEFAULT_CG,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Progresso global (0–100) em um instante, no relógio do servidor. */
export function progressAt(state: ControlState, now: number): number {
  const elapsedMin = state.running ? Math.max(0, now - state.anchorAt) / 60000 : 0;
  return clamp(state.baseProgress + elapsedMin * state.speed, 0, 100);
}

export function applyControlAction(prev: ControlState, action: ControlAction, now = Date.now()): ControlState {
  const current = progressAt(prev, now);
  const rebased = { ...prev, baseProgress: current, anchorAt: now };
  let next: ControlState;
  switch (action.type) {
    case 'play':
      next = { ...rebased, running: current < 100 };
      break;
    case 'pause':
      next = { ...rebased, running: false };
      break;
    case 'setSpeed':
      next = { ...rebased, speed: clamp(action.speed, 0.1, 600) };
      break;
    case 'setProgress':
      next = { ...rebased, baseProgress: clamp(action.progress, 0, 100) };
      break;
    case 'step':
      next = { ...rebased, baseProgress: clamp(current + action.delta, 0, 100) };
      break;
    case 'reset':
      next = { ...rebased, baseProgress: 0, running: false, holds: {} };
      break;
    case 'newSeed':
      next = { ...rebased, seed: action.seed ?? Math.floor(Math.random() * 1e9), baseProgress: 0, running: false, holds: {} };
      break;
    case 'setHold': {
      const holds = { ...prev.holds };
      if (action.value === null) delete holds[action.uf];
      else holds[action.uf] = clamp(action.value, 0, 100);
      next = { ...rebased, holds };
      break;
    }
    case 'clearHolds':
      next = { ...rebased, holds: {} };
      break;
    case 'setBrand':
      next = { ...prev, brand: action.brand };
      break;
    case 'focus':
      next = { ...prev, focus: { scene: action.scene, uf: action.uf, districtId: action.districtId, rev: (prev.focus?.rev ?? 0) + 1 } };
      break;
    case 'setAutoRotate':
      next = { ...prev, autoRotate: action.value };
      break;
    case 'setCg':
      next = { ...prev, cg: { ...DEFAULT_CG, ...prev.cg, ...action.patch } };
      break;
    case 'setCgText': {
      const cg = { ...DEFAULT_CG, ...prev.cg };
      next = { ...prev, cg: { ...cg, text: { ...DEFAULT_CG_TEXT, ...cg.text, ...action.patch } } };
      break;
    }
    default:
      next = prev;
  }
  if (next.running && next.baseProgress >= 100) next.running = false;
  return { ...next, rev: prev.rev + 1, updatedAt: now };
}

export function isControlState(v: unknown): v is ControlState {
  const s = v as ControlState;
  return !!s && typeof s.rev === 'number' && typeof s.seed === 'number' && typeof s.baseProgress === 'number';
}
