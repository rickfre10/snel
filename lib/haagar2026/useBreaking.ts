// lib/haagar2026/useBreaking.ts
"use client";
// Plantão de "última hora": detecta cadeiras que viram e maioria atingida e
// entrega uma manchete por vez (usado no telão e no CG).
import { useEffect, useRef, useState } from 'react';
import type { ElectionSnapshot } from './model';
import { MAJORITY, frontName } from '@/lib/haagar/rules';
import { fmtPct } from '@/components/tv/ui';

export interface Breaking { id: string; headline: string; sub: string; front?: string | null }

export const BREAKING_MS = 7000;

export function useBreaking(snap: ElectionSnapshot | null, seed: number, durationMs = BREAKING_MS): Breaking | null {
  const seen = useRef<{ seed: number; finals: Set<number>; majority: string | null } | null>(null);
  const queue = useRef<Breaking[]>([]);
  const [current, setCurrent] = useState<Breaking | null>(null);

  useEffect(() => {
    if (!snap) return;
    const finals = new Set(snap.districts.filter(d => d.isFinal).map(d => d.id));
    const majorityFront = snap.fronts.find(f => f.confirmed >= MAJORITY)?.legend ?? null;
    // Primeira leitura (ou novo cenário / volta no tempo): só memoriza.
    if (!seen.current || seen.current.seed !== seed || finals.size < seen.current.finals.size) {
      seen.current = { seed, finals, majority: majorityFront };
      queue.current = [];
      return;
    }
    const prev = seen.current;
    snap.districts.forEach(d => {
      if (d.flipped && !prev.finals.has(d.id) && d.leader) {
        queue.current.push({
          id: `flip-${seed}-${d.id}`,
          headline: `${d.leader.front} toma ${d.name}`,
          sub: `Cadeira era da ${d.prev.front} · ${d.ufName} · ${d.leader.name} eleito com ${fmtPct(d.leader.pct)}`,
          front: d.leader.front,
        });
      }
    });
    if (majorityFront && prev.majority !== majorityFront) {
      const f = snap.frontByLegend[majorityFront];
      queue.current.unshift({
        id: `maj-${seed}-${majorityFront}`,
        headline: `${majorityFront} conquista a maioria`,
        sub: `${frontName(majorityFront)} chega a ${f.confirmed} cadeiras confirmadas (maioria: ${MAJORITY})`,
        front: majorityFront,
      });
    }
    // Evita fila gigante em saltos grandes de apuração
    if (queue.current.length > 6) queue.current = queue.current.slice(0, 6);
    seen.current = { seed, finals, majority: majorityFront };
  }, [snap, seed]);

  useEffect(() => {
    if (current) {
      const t = setTimeout(() => setCurrent(queue.current.shift() ?? null), durationMs);
      return () => clearTimeout(t);
    }
    const poll = setInterval(() => {
      const next = queue.current.shift();
      if (next) setCurrent(next);
    }, 800);
    return () => clearInterval(poll);
  }, [current, durationMs]);

  return current;
}

