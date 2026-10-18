// lib/haagar2026/control.ts
// Estado do controle da apuração 2026. É o único dado compartilhado entre o
// painel de controle e o telão: a partir dele (semente + progresso) cada
// tela recalcula exatamente os mesmos resultados.

import type { BrandId } from '@/lib/brand';
import type { Scenario } from './model';

export type SceneId = 'geral' | 'parlamento' | 'proporcional' | 'estado' | 'distrito' | 'viradas' | 'comparativo' | 'idle';

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
  view?: TelaoView;               // o que o telão está mostrando agora (para o CG replicar)
  scenario?: Scenario | null;     // ajuste de votação do operador (null = só a semente)
  stinger?: StingerCue;           // vinheta "ÚLTIMA HORA" em tela cheia, disparada pelo operador
  cgPresets?: CgItem[];           // GCs prontos salvos pelo operador
  cgHistory?: CgItem[];           // últimos GCs que foram ao ar (mais recente primeiro)
}

/** Uma tarja manual do CG que pode ser salva, repetida e posta no ar com um clique. */
export type CgItemKind = 'texto' | 'distrito' | 'proporcional' | 'maioria';
export interface CgItemSpec { kind: CgItemKind; name?: string; text?: CgText; districtId?: number; uf?: string }
export interface CgItem extends CgItemSpec { id: string; at: number }
export const CG_HISTORY_MAX = 3;
export const CG_PRESETS_MAX = 40;

/** Disparo da vinheta de última hora: cada novo `rev` toca uma vez (telão e CG). */
export interface StingerCue { rev: number; at: number }  // at = epoch (ms) no relógio do servidor

/** Cena exibida no telão neste momento (publicada pelo próprio telão). */
export interface TelaoView { scene: SceneId; uf?: string; districtId?: number }

export interface CgVisibility {
  seats: boolean;    // caixas de cadeiras por frente
  ticker: boolean;   // faixa de distritos
  bug: boolean;      // logo da emissora no topo
  count: 'confirmadas' | 'projecao';
  breaking?: boolean; // plantão automático de última hora (viradas, maioria)
  place?: string;     // texto do selo acima do "AO VIVO" (ex.: "São Pedro, MA")
  text?: CgText;     // tarja de texto livre (manchete)
  district?: CgDistrict; // tarja de um distrito escolhido pelo operador
  pr?: CgPr;             // tarja do voto proporcional
  majority?: boolean;    // tarja de maioria (frente que forma/projeta maioria)
  autoResults?: boolean; // cada distrito definido entra sozinho no ar (15 s cada, fila)
  queueSkip?: number;    // incrementar = pula o item urgente atual
  queueClear?: number;   // incrementar = esvazia a fila urgente
}

/** Tarja do proporcional: 'auto' = rodízio (nacional + estados), 'BR' = nacional, ou a UF. */
export interface CgPr { show: boolean; uf: string }

/** Tarja de distrito (líder × 2º, apuração e situação). */
export interface CgDistrict { show: boolean; id: number }

/** Tarja de texto escrita pelo operador (formato "manchete" da News). */
export interface CgText {
  show: boolean;
  label1: string;    // bloco em gradiente, linha 1 (ex.: "edição")
  label2: string;    // bloco em gradiente, linha 2 (ex.: "das 19h")
  headline: string;  // manchete (até 2 linhas)
  sub: string;       // subtítulo (opcional)
}

export const DEFAULT_CG_TEXT: CgText = { show: false, label1: 'eleições', label2: '2026', headline: '', sub: '' };
export const DEFAULT_CG: CgVisibility = { seats: true, ticker: true, bug: true, count: 'confirmadas', breaking: true, autoResults: true, text: DEFAULT_CG_TEXT };

export type ControlAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'setSpeed'; speed: number }
  | { type: 'setProgress'; progress: number }
  | { type: 'step'; delta: number }
  | { type: 'reset' }
  | { type: 'newSeed'; seed?: number; scenario?: Scenario | null }
  | { type: 'setHold'; uf: string; value: number | null }
  | { type: 'clearHolds' }
  | { type: 'setBrand'; brand: BrandId }
  | { type: 'focus'; scene: SceneId; uf?: string; districtId?: number }
  | { type: 'setAutoRotate'; value: boolean }
  | { type: 'setCg'; patch: Partial<CgVisibility> }
  | { type: 'setCgText'; patch: Partial<CgText> }
  | { type: 'setView'; view: TelaoView }
  | { type: 'stinger' }
  | { type: 'cgSave'; item: CgItemSpec }
  | { type: 'cgDelete'; id: string }
  | { type: 'cgPlay'; item: CgItemSpec };

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
      next = { ...rebased, seed: action.seed ?? Math.floor(Math.random() * 1e9), scenario: action.scenario ?? null, baseProgress: 0, running: false, holds: {} };
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
    case 'setView':
      next = { ...prev, view: action.view };
      break;
    case 'cgSave': {
      const item: CgItem = { ...action.item, id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`, at: now };
      next = { ...prev, cgPresets: [...(prev.cgPresets ?? []), item].slice(-CG_PRESETS_MAX) };
      break;
    }
    case 'cgDelete':
      next = { ...prev, cgPresets: (prev.cgPresets ?? []).filter(p => p.id !== action.id) };
      break;
    case 'cgPlay':
      next = { ...prev, cg: playCgItem({ ...DEFAULT_CG, ...prev.cg }, action.item) };
      break;
    case 'stinger':
      next = { ...prev, stinger: { rev: (prev.stinger?.rev ?? 0) + 1, at: now } };
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
  // Histórico: registra toda tarja manual que entra no ar, venha de onde vier.
  const before = currentCgItem(prev.cg);
  const after = currentCgItem(next.cg);
  if (after && (!before || cgItemKey(after) !== cgItemKey(before))) {
    const entry: CgItem = { ...after, id: `h${now.toString(36)}`, at: now };
    next = { ...next, cgHistory: [entry, ...(prev.cgHistory ?? []).filter(h => cgItemKey(h) !== cgItemKey(after))].slice(0, CG_HISTORY_MAX) };
  }
  return { ...next, rev: prev.rev + 1, updatedAt: now };
}

// --------------------------------------------- Tarjas manuais (GCs) ----

/** A tarja manual que está no ar (mesma prioridade do /2026/cg), ou null. */
export function currentCgItem(cgIn: CgVisibility | undefined): CgItemSpec | null {
  const cg = { ...DEFAULT_CG, ...cgIn };
  const text = { ...DEFAULT_CG_TEXT, ...cg.text };
  if (cg.majority) return { kind: 'maioria' };
  if (cg.district?.show) return { kind: 'distrito', districtId: cg.district.id };
  if (cg.pr?.show) return { kind: 'proporcional', uf: cg.pr.uf };
  if (text.show && text.headline.trim()) return { kind: 'texto', text: { ...text, show: true } };
  return null;
}

/** Identidade do conteúdo (ignora nome e datas) — para não repetir no histórico. */
export function cgItemKey(item: CgItemSpec): string {
  switch (item.kind) {
    case 'distrito': return `d:${item.districtId}`;
    case 'proporcional': return `p:${item.uf}`;
    case 'maioria': return 'm';
    default: {
      const t = { ...DEFAULT_CG_TEXT, ...item.text };
      return `t:${t.label1}|${t.label2}|${t.headline}|${t.sub}`;
    }
  }
}

/** Põe uma tarja no ar tirando as outras manuais (uma por vez). */
export function playCgItem(cg: CgVisibility, item: CgItemSpec): CgVisibility {
  const off: CgVisibility = {
    ...cg,
    majority: false,
    district: cg.district ? { ...cg.district, show: false } : undefined,
    pr: cg.pr ? { ...cg.pr, show: false } : undefined,
    text: { ...DEFAULT_CG_TEXT, ...cg.text, show: false },
  };
  switch (item.kind) {
    case 'maioria': return { ...off, majority: true };
    case 'distrito': return item.districtId ? { ...off, district: { show: true, id: item.districtId } } : off;
    case 'proporcional': return { ...off, pr: { show: true, uf: item.uf ?? 'auto' } };
    default: return { ...off, text: { ...DEFAULT_CG_TEXT, ...item.text, show: true } };
  }
}

export function isControlState(v: unknown): v is ControlState {
  const s = v as ControlState;
  return !!s && typeof s.rev === 'number' && typeof s.seed === 'number' && typeof s.baseProgress === 'number';
}
