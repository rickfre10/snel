// lib/haagar2026/sfx.ts
// Motor de áudio (Web Audio) do telão e do CG: trechos de um arquivo com fade,
// trilha de fundo em loop sem emenda e "ducking" (a trilha abaixa enquanto
// uma vinheta toca). Só roda no navegador.
import type { Clip } from './audio';

let ctx: AudioContext | null = null;
let bgVol: GainNode, bgDuck: GainNode, bgFade: GainNode, sfxVol: GainNode;
const buffers = new Map<string, Promise<AudioBuffer>>();
const listeners = new Set<() => void>();
let bg: { src: string; from: number; to: number; node: AudioBufferSourceNode } | null = null;
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

function duck(on: boolean) {
  const c = ctx; if (!c) return;
  ducks = Math.max(0, ducks + (on ? 1 : -1));
  const target = ducks > 0 ? 0.2 : 1;
  bgDuck.gain.cancelScheduledValues(c.currentTime);
  bgDuck.gain.setTargetAtTime(target, c.currentTime, ducks > 0 ? 0.08 : 0.35);
}

/** Toca [from, to] segundos de `src`, com fade no último `fadeOutS`. */
export function playClip({ src, from, to }: Clip, opts: { fadeOutS?: number; duckBg?: boolean } = {}) {
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
    g.gain.setValueAtTime(1, t0);
    if (fade > 0) { g.gain.setValueAtTime(1, t0 + dur - fade); g.gain.linearRampToValueAtTime(0, t0 + dur); }
    s.start(t0, from, dur);
    if (opts.duckBg) { duck(true); s.onended = () => duck(false); }
  }).catch(() => {});
}

/** Liga a trilha de fundo em loop (sem emenda) no trecho [from, to]. */
export function startBg({ src, from, to }: Clip) {
  const c = ensure();
  if (!c || c.state !== 'running') return;
  if (bg && bg.src === src && bg.from === from && bg.to === to) return;
  stopBg(0.3);
  load(src).then(buf => {
    if (bg) return; // outro start ganhou a corrida
    const s = c.createBufferSource();
    s.buffer = buf; s.loop = true; s.loopStart = from; s.loopEnd = to;
    s.connect(bgFade);
    bgFade.gain.cancelScheduledValues(c.currentTime);
    bgFade.gain.setValueAtTime(0, c.currentTime);
    bgFade.gain.linearRampToValueAtTime(1, c.currentTime + 1);
    s.start(0, from);
    bg = { src, from, to, node: s };
  }).catch(() => {});
}

export function stopBg(fadeS = 0.6) {
  const c = ctx; const cur = bg;
  if (!c || !cur) return;
  bg = null;
  bgFade.gain.cancelScheduledValues(c.currentTime);
  bgFade.gain.setValueAtTime(bgFade.gain.value, c.currentTime);
  bgFade.gain.linearRampToValueAtTime(0, c.currentTime + fadeS);
  cur.node.stop(c.currentTime + fadeS + 0.05);
}

export function setVolumes(v: { bg: number; sfx: number }) {
  vols = v;
  if (!ctx) return;
  bgVol.gain.setTargetAtTime(v.bg, ctx.currentTime, 0.05);
  sfxVol.gain.setTargetAtTime(v.sfx, ctx.currentTime, 0.05);
}
