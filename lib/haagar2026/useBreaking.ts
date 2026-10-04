// lib/haagar2026/useBreaking.ts
"use client";
// Plantão de "última hora" e fila de resultados: detecta distritos definidos,
// cadeiras que viram e maioria atingida, e entrega um item por vez (usado no
// telão e no CG).
import { useEffect, useRef, useState } from 'react';
import type { ElectionSnapshot } from './model';
import { MAJORITY, frontName } from '@/lib/haagar/rules';
import { fmtPct } from '@/components/tv/ui';

export interface Breaking {
  id: string;
  headline: string;
  sub: string;
  front?: string | null;
  kind?: 'flip' | 'majority' | 'result';
  districtId?: number;
}

export const BREAKING_MS = 7000;
export const RESULT_MS = 15000;

interface Options {
  durationMs?: number;
  /** Também entra na fila cada distrito definido (não só as viradas). */
  results?: boolean;
  /** Tempo de cada resultado de distrito na tela. */
  resultMs?: number;
  /** Tamanho máximo da fila (os mais antigos saem primeiro). */
  maxQueue?: number;
  /** Só começa a observar quando o estado do servidor chegou. */
  ready?: boolean;
  /** Mudar este valor pula o item atual. */
  skipRev?: number;
  /** Mudar este valor esvazia a fila (e tira o item atual). */
  clearRev?: number;
}

export function useBreaking(snap: ElectionSnapshot | null, seed: number, opts: Options | number = {}): Breaking | null {
  const o: Options = typeof opts === 'number' ? { durationMs: opts } : opts;
  const durationMs = o.durationMs ?? BREAKING_MS;
  const resultMs = o.resultMs ?? RESULT_MS;
  const maxQueue = o.maxQueue ?? (o.results ? 12 : 6);
  const ready = o.ready ?? true;

  // `announced`: distritos já anunciados (não repete se a definição oscilar).
  const seen = useRef<{ seed: number; progress: number; announced: Set<number>; majority: string | null } | null>(null);
  const queue = useRef<Breaking[]>([]);
  const [current, setCurrent] = useState<Breaking | null>(null);

  useEffect(() => {
    if (!snap || !ready) return;
    const finals = snap.districts.filter(d => d.isFinal);
    const majorityFront = snap.fronts.find(f => f.confirmed >= MAJORITY)?.legend ?? null;
    // Primeira leitura, novo cenário ou volta clara no tempo: só memoriza.
    // (Pequenas oscilações do relógio não zeram a fila.)
    if (!seen.current || seen.current.seed !== seed || snap.progress < seen.current.progress - 1) {
      seen.current = { seed, progress: snap.progress, announced: new Set(finals.map(d => d.id)), majority: majorityFront };
      queue.current = [];
      setCurrent(null);
      return;
    }
    const prev = seen.current;
    const fresh: Breaking[] = [];
    finals.forEach(d => {
      if (prev.announced.has(d.id) || !d.leader) return;
      prev.announced.add(d.id);
      if (o.results) {
        fresh.push({
          id: `res-${seed}-${d.id}`, kind: 'result', districtId: d.id, front: d.leader.front,
          headline: d.flipped ? `${d.leader.front} toma ${d.name}` : `${d.leader.front} vence em ${d.name}`,
          sub: `${d.ufName} · ${d.leader.name}`,
        });
      } else if (d.flipped) {
        fresh.push({
          id: `flip-${seed}-${d.id}`, kind: 'flip', districtId: d.id, front: d.leader.front,
          headline: `${d.leader.front} toma ${d.name}`,
          sub: `Cadeira era da ${d.prev.front} · ${d.ufName} · ${d.leader.name} ${d.leader.gender === 'F' ? 'eleita' : 'eleito'} com ${fmtPct(d.leader.pct)}`,
        });
      }
    });
    queue.current.push(...fresh);
    if (majorityFront && prev.majority !== majorityFront) {
      const f = snap.frontByLegend[majorityFront];
      queue.current.unshift({
        id: `maj-${seed}-${majorityFront}`, kind: 'majority',
        headline: `${majorityFront} conquista a maioria`,
        sub: `${frontName(majorityFront)} chega a ${f.confirmed} cadeiras confirmadas (maioria: ${MAJORITY})`,
        front: majorityFront,
      });
    }
    // Evita fila gigante em saltos grandes de apuração: descarta os mais
    // antigos, mas preserva a maioria e as viradas.
    while (queue.current.length > maxQueue) {
      const i = queue.current.findIndex(b => b.kind === 'result' && !b.headline.includes(' toma '));
      queue.current.splice(i >= 0 ? i : queue.current.length - 1, 1);
    }
    seen.current = { ...prev, progress: Math.max(prev.progress, snap.progress), majority: majorityFront };
  }, [snap, seed, ready, o.results, maxQueue]);

  // Resultados automáticos desligados: tira da fila os resultados pendentes
  useEffect(() => {
    if (o.results) return;
    queue.current = queue.current.filter(b => b.kind !== 'result');
    setCurrent(c => (c?.kind === 'result' ? queue.current.shift() ?? null : c));
  }, [o.results]);

  // Pular / limpar (comandos do operador)
  const lastSkip = useRef(o.skipRev);
  useEffect(() => {
    if (o.skipRev === lastSkip.current) return;
    lastSkip.current = o.skipRev;
    setCurrent(queue.current.shift() ?? null);
  }, [o.skipRev]);
  const lastClear = useRef(o.clearRev);
  useEffect(() => {
    if (o.clearRev === lastClear.current) return;
    lastClear.current = o.clearRev;
    queue.current = [];
    setCurrent(null);
  }, [o.clearRev]);

  useEffect(() => {
    if (current) {
      const ms = current.kind === 'result' ? resultMs : durationMs;
      const t = setTimeout(() => setCurrent(queue.current.shift() ?? null), ms);
      return () => clearTimeout(t);
    }
    const poll = setInterval(() => {
      const next = queue.current.shift();
      if (next) setCurrent(next);
    }, 500);
    return () => clearInterval(poll);
  }, [current, durationMs, resultMs]);

  return current;
}
