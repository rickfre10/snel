// lib/haagar2026/sfx.ts
// Motor de áudio (Web Audio) do telão e do CG: trechos de um arquivo com fade,
// trilha de fundo em loop sem emenda e "ducking" (a trilha abaixa enquanto
// uma vinheta toca). Só roda no navegador.
import type { Clip } from './audio';

let ctx: AudioContext | null = null;
let bgVol: GainNode, bgDuck: GainNode, bgFade: GainNode, sfxVol: GainNode;
const buffers = new Map<string, Promise<AudioBuffer>>();
const listeners = new Set<() => void>();
let ducks = 0;
let vols = { bg: 0.35, sfx: 1 };

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  bgFade = ctx.createGain(); bgDuck = ctx.createGain(); bgVol = ctx.createGain(); sfxVol = ctx.createGain();
  bgFade.connect(bgDuck); bgDuck.connect(bgVol); bgVol.connect(ctx.destination); sfxVol.connect(ctx.destination);
  bgVol.gain.value = vols.bg; sfxVol.gain.value = vols.sfx;
  ctx.addEventListener('statechange', () => listeners.forEach(l => l()));
  // Navegadores só liberam áudio depois de um gesto do usuário na página.
  const unlock = () => { ctx?.resume().catch(() => {}); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  return ctx;
}

/** Cria o contexto cedo (para o primeiro toque na página já liberar o som). */
export function initAudio() { ensure(); }
export const audioRunning = () => ctx?.state === 'running';
export function onAudioState(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }

function load(src: string): Promise<AudioBuffer> {
  let p = buffers.get(src);
  if (!p) {
    p = fetch(src).then(r => r.arrayBuffer()).then(b => new Promise<AudioBuffer>((res, rej) => ensure()!.decodeAudioData(b, res, rej)));
    p.catch(() => buffers.delete(src));
    buffers.set(src, p);
  }
  return p;
}
export const preload = (src: string) => { if (ensure()) load(src).catch(() => {}); };

/** A trilha abaixa rápido quando um efeito entra e VOLTA devagar (`releaseS`, rampa linear) quando todos acabam. */
function duck(on: boolean, releaseS = 1.5) {
  const c = ctx; if (!c) return;
  ducks = Math.max(0, ducks + (on ? 1 : -1));
  bgDuck.gain.cancelScheduledValues(c.currentTime);
  if (ducks > 0) { bgDuck.gain.setTargetAtTime(0.2, c.currentTime, 0.08); return; }
  bgDuck.gain.setValueAtTime(bgDuck.gain.value, c.currentTime);
  bgDuck.gain.linearRampToValueAtTime(1, c.currentTime + releaseS);
}

/** Toca [from, to] segundos de `src`, com fade no último `fadeOutS`. */
export function playClip({ src, from, to }: Clip, opts: { fadeInS?: number; fadeOutS?: number; duckBg?: boolean; releaseS?: number } = {}) {
  const c = ensure();
  if (!c || c.state !== 'running') return;   // sem gesto ainda: não enfileira som velho
  load(src).then(buf => {
    const dur = Math.max(0.1, to - from);
    const g = c.createGain();
    const s = c.createBufferSource();
    s.buffer = buf;
    s.connect(g); g.connect(sfxVol);
    const t0 = c.currentTime + 0.02;
    const fade = Math.min(opts.fadeOutS ?? 0, dur);
    const fin = Math.min(opts.fadeInS ?? 0, dur / 2);
    if (fin > 0) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + fin); } else g.gain.setValueAtTime(1, t0);
    if (fade > 0) { g.gain.setValueAtTime(1, t0 + dur - fade); g.gain.setValueCurveAtTime(curve(false), t0 + dur - fade, fade); } // curva suave (cosseno)
    s.start(t0, from, dur);
    if (opts.duckBg) { duck(true); s.onended = () => duck(false, opts.releaseS); }
  }).catch(() => {});
}

// ---- Trilha de fundo: loop com crossfade (a volta seguinte entra por baixo do fim da anterior)
const BG_XFADE_S = 3;
interface BgLayer { node: AudioBufferSourceNode; gain: GainNode }
let bgState: { src: string; from: number; to: number; layers: BgLayer[]; timer: ReturnType<typeof setInterval>; nextAt: number } | null = null;

const curve = (up: boolean) => Float32Array.from({ length: 64 }, (_, i) => { const t = i / 63; return up ? Math.sin(t * Math.PI / 2) : Math.cos(t * Math.PI / 2); });

/** Uma volta do trecho a partir de `at`; sobe em curva de potência constante (exceto a 1ª) e desce no fim. */
function bgLayer(c: AudioContext, buf: AudioBuffer, from: number, to: number, at: number, fadeIn: boolean): { layer: BgLayer; nextAt: number } {
  const dur = to - from;
  const x = Math.min(BG_XFADE_S, dur / 3);
  const g = c.createGain();
  const node = c.createBufferSource();
  node.buffer = buf; node.connect(g); g.connect(bgFade);
  g.gain.setValueAtTime(fadeIn ? 0 : 1, at);
  if (fadeIn) g.gain.setValueCurveAtTime(curve(true), at, x);
  g.gain.setValueAtTime(1, at + dur - x);
  g.gain.setValueCurveAtTime(curve(false), at + dur - x, x);
  node.start(at, from, dur);
  node.stop(at + dur + 0.05);
  return { layer: { node, gain: g }, nextAt: at + dur - x };
}

/** Liga a trilha de fundo em loop (com crossfade) no trecho [from, to]. */
export function startBg({ src, from, to }: Clip) {
  const c = ensure();
  if (!c || c.state !== 'running') return;
  if (bgState && bgState.src === src && bgState.from === from && bgState.to === to) return;
  stopBg(0.3);
  const key = {} as object;
  bgKey = key;
  load(src).then(buf => {
    if (bgKey !== key) return; // outro start/stop ganhou a corrida
    const first = bgLayer(c, buf, from, to, c.currentTime + 0.05, false);
    const st = { src, from, to, layers: [first.layer], nextAt: first.nextAt, timer: 0 as unknown as ReturnType<typeof setInterval> };
    bgFade.gain.cancelScheduledValues(c.currentTime);
    bgFade.gain.setValueAtTime(0, c.currentTime);
    bgFade.gain.linearRampToValueAtTime(1, c.currentTime + 1);
    // agenda a próxima volta um pouco antes de ela entrar (relógio de áudio = sem emenda)
    st.timer = setInterval(() => {
      if (bgState !== st) return;
      if (st.nextAt - c.currentTime < 1.5) {
        const nx = bgLayer(c, buf, from, to, st.nextAt, true);
        st.layers = st.layers.filter(l => l.node !== undefined).slice(-2).concat(nx.layer);
        st.nextAt = nx.nextAt;
      }
    }, 250);
    bgState = st;
  }).catch(() => {});
}
let bgKey: object | null = null;

export function stopBg(fadeS = 0.6) {
  bgKey = null;
  const c = ctx; const cur = bgState;
  if (!c || !cur) return;
  bgState = null;
  clearInterval(cur.timer);
  bgFade.gain.cancelScheduledValues(c.currentTime);
  bgFade.gain.setValueAtTime(bgFade.gain.value, c.currentTime);
  bgFade.gain.linearRampToValueAtTime(0, c.currentTime + fadeS);
  cur.layers.forEach(l => { try { l.node.stop(c.currentTime + fadeS + 0.05); } catch { /* já parou */ } });
}

export function setVolumes(v: { bg: number; sfx: number }) {
  vols = v;
  if (!ctx) return;
  bgVol.gain.setTargetAtTime(v.bg, ctx.currentTime, 0.05);
  sfxVol.gain.setTargetAtTime(v.sfx, ctx.currentTime, 0.05);
}
