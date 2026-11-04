// lib/haagar2026/useSfx.ts
"use client";
// Efeitos sonoros do CG. `useQueueSound` toca o som da urna UMA vez quando a
// fila de resultados começa (primeira cadeira decidida). Se a fila esvazia e
// volta depois, toca de novo.
import { useEffect, useRef } from 'react';
import type { ElectionSnapshot } from './model';
import { MAJORITY } from '@/lib/haagar/rules';
import { useBreaking, type Breaking } from './useBreaking';

export const URNA_SRC = '/audio/urna.mp3';
export const URNA_FROM_S = 3;
export const URNA_TO_S = 5;

/** Toca um trecho [from, to] (segundos) de um arquivo. Devolve função que para. */
function playClip(src: string, from: number, to: number): () => void {
  const a = new Audio(src);
  a.preload = 'auto';
  let stopped = false;
  const stop = () => { if (stopped) return; stopped = true; a.pause(); a.removeEventListener('timeupdate', onTime); };
  const onTime = () => { if (a.currentTime >= to) stop(); };
  a.addEventListener('timeupdate', onTime);
  const start = () => { a.currentTime = from; a.play().catch(() => {}); };
  if (a.readyState >= 1) start(); else a.addEventListener('loadedmetadata', start, { once: true });
  // garante o corte mesmo se o timeupdate demorar
  const t = setTimeout(stop, (to - from) * 1000 + 300);
  return () => { clearTimeout(t); stop(); };
}

export function useQueueSound(urgent: Breaking | null, enabled = true) {
  const inRun = useRef(false);   // já tocou nesta fila?
  const unlocked = useRef(false);

  // Navegadores só liberam áudio depois de um gesto na página: destrava no primeiro toque/tecla.
  useEffect(() => {
    const unlock = () => {
      if (unlocked.current) return;
      unlocked.current = true;
      const a = new Audio(URNA_SRC); a.volume = 0;
      a.play().then(() => a.pause()).catch(() => {});
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  useEffect(() => {
    if (!urgent) { inRun.current = false; return; }          // fila saiu: o próximo item é uma fila nova
    if (inRun.current || !enabled) return;
    // cadeira decidida (resultado ou virada) ou maioria confirmada
    if (urgent.kind !== 'result' && urgent.kind !== 'flip' && urgent.kind !== 'majority') return;
    inRun.current = true;
    playClip(URNA_SRC, URNA_FROM_S, URNA_TO_S);
  }, [urgent, enabled]);
}

/** Toca quando uma frente passa a PROJETAR maioria (ainda sem estar confirmada). */
export function useProjectionSound(snap: ElectionSnapshot | null, seed: number, ready = true, enabled = true) {
  const seen = useRef<{ seed: number; progress: number; fronts: Set<string> } | null>(null);
  useEffect(() => {
    if (!snap || !ready) return;
    const now = new Set(snap.fronts.filter(f => f.projected >= MAJORITY && f.confirmed < MAJORITY).map(f => f.legend));
    // primeira leitura, novo cenário ou volta no tempo: só memoriza
    if (!seen.current || seen.current.seed !== seed || snap.progress < seen.current.progress - 1) {
      seen.current = { seed, progress: snap.progress, fronts: now };
      return;
    }
    const fresh = Array.from(now).some(f => !seen.current!.fronts.has(f));
    seen.current = { seed, progress: Math.max(seen.current.progress, snap.progress), fronts: now };
    if (fresh && enabled) playClip(URNA_SRC, URNA_FROM_S, URNA_TO_S);
  }, [snap, seed, ready, enabled]);
}

/** Telão: mesma regra do CG (fila de resultados + projeção de maioria), com fila própria só para o som. */
export function useTelaoSounds(snap: ElectionSnapshot | null, seed: number, ready = true) {
  const queue = useBreaking(snap, seed, { results: true, ready });
  useQueueSound(queue);
  useProjectionSound(snap, seed, ready);
}
