// lib/haagar2026/useElection2026.ts
"use client";
import { useEffect, useMemo, useState } from 'react';
import type { Baseline2022 } from '@/lib/haagar/baseline';
import { buildFallbackBaseline } from '@/lib/haagar/baseline';
import { buildModel, snapshotAt, ElectionSnapshot } from './model';
import { progressAt } from './control';
import { useControl } from './useControl';

const TICK_MS = 1000;

/** Base 2022 (planilha) — carregada uma vez. */
export function useBaseline2022() {
  const [baseline, setBaseline] = useState<Baseline2022 | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/baseline/2022')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((b: Baseline2022) => { if (alive) setBaseline(b); })
      .catch(() => { if (alive) setBaseline(buildFallbackBaseline()); });
    return () => { alive = false; };
  }, []);
  return baseline;
}

/** Relógio que avança a cada segundo (para recalcular o progresso). */
export function useNow(intervalMs = TICK_MS) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useElection2026() {
  const control = useControl();
  const baseline = useBaseline2022();
  const now = useNow();
  const { state, clockOffset } = control;

  const model = useMemo(() => (baseline ? buildModel(baseline, state.seed) : null), [baseline, state.seed]);
  const progress = progressAt(state, now + clockOffset);
  // Arredonda para não recalcular sem necessidade quando pausado.
  const progressKey = Math.round(progress * 1000) / 1000;
  const holdsKey = JSON.stringify(state.holds);

  const snapshot: ElectionSnapshot | null = useMemo(
    () => (model && baseline ? snapshotAt(model, baseline, progressKey, JSON.parse(holdsKey)) : null),
    [model, baseline, progressKey, holdsKey],
  );

  return { ...control, baseline, model, snapshot, progress };
}
