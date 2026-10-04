// components/tv/charts.tsx
"use client";
import React, { useMemo, useState } from 'react';
import { FRONT_ORDER, MAJORITY, TOTAL_SEATS, frontColor, frontName } from '@/lib/haagar/rules';
import type { FrontTotals } from '@/lib/haagar2026/model';
import { fmtPct } from './ui';

// ------------------------------------------------- Corrida pela maioria ---
/**
 * Barra empilhada de cadeiras: parte sólida = confirmadas, parte hachurada =
 * projeção (liderando / proporcional ainda em apuração). Ordem fixa das
 * frentes para que cada cor fique sempre no mesmo lugar.
 */
export function SeatRaceBar({ fronts, height = 56, showPrev = true }: { fronts: Record<string, FrontTotals>; height?: number; showPrev?: boolean }) {
  const [hover, setHover] = useState<string | null>(null);
  const ordered = FRONT_ORDER.map(f => fronts[f]).filter(Boolean);
  const pct = (n: number) => (n / TOTAL_SEATS) * 100;
  const majorityLeft = pct(MAJORITY);
  const hovered = hover ? fronts[hover] : null;

  return (
    <div className="relative w-full select-none">
      <div className="relative w-full flex gap-[3px]" style={{ height }}>
        {ordered.map(f => {
          const w = pct(f.projected);
          if (w <= 0) return null;
          const c = frontColor(f.legend);
          const solid = f.projected > 0 ? (f.confirmed / f.projected) * 100 : 0;
          return (
            <div key={f.legend} className="relative h-full rounded-[10px] overflow-hidden transition-[width] duration-700 ease-out cursor-pointer"
              style={{ width: `${w}%`, background: `${c}55` }}
              onMouseEnter={() => setHover(f.legend)} onMouseLeave={() => setHover(null)}>
              <div className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out" style={{ width: `${solid}%`, background: c }} />
              <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 6px, transparent 6px 14px)', clipPath: `inset(0 0 0 ${solid}%)` }} />
              {w > 4 && (
                <div className="absolute inset-0 flex items-center px-3 font-black text-white text-[20px] tabular-nums" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  {f.projected}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex-1 rounded-[10px] bg-tv-surface2/70" />
      </div>
      {/* marcador de maioria */}
      <div className="absolute -top-3 -bottom-3 w-[3px] bg-tv-text rounded-full" style={{ left: `calc(${majorityLeft}% - 1px)` }} />
      <div className="absolute -top-9 text-[14px] font-extrabold uppercase tracking-widest whitespace-nowrap" style={{ left: `${majorityLeft}%`, transform: 'translateX(-50%)' }}>
        Maioria · {MAJORITY}
      </div>
      {showPrev && (
        <div className="mt-3 w-full flex gap-[3px] h-2.5 opacity-80" title="Composição 2022">
          {ordered.map(f => f.prev.total > 0 && (
            <div key={f.legend} className="h-full rounded-full" style={{ width: `${pct(f.prev.total)}%`, background: frontColor(f.legend) }} />
          ))}
          <div className="flex-1" />
        </div>
      )}
      {hovered && (
        <div className="absolute z-20 top-full mt-4 rounded-2xl bg-tv-bg/95 border border-tv-border px-4 py-3 text-[15px] shadow-2xl pointer-events-none">
          <div className="font-extrabold text-[18px]">{hovered.legend} · {frontName(hovered.legend)}</div>
          <div className="text-tv-muted">Confirmadas {hovered.confirmed} · Projeção {hovered.projected} · 2022: {hovered.prev.total}</div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------- Hemiciclo -------
interface Seat { x: number; y: number; angle: number }

function hemicycleSeats(total: number, rows: number, inner = 0.38): Seat[] {
  // Distribui as cadeiras por fileira proporcionalmente ao raio.
  const radii = Array.from({ length: rows }, (_, i) => inner + ((1 - inner) * i) / (rows - 1));
  const sumR = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map(r => Math.round((total * r) / sumR));
  let diff = total - counts.reduce((a, b) => a + b, 0);
  for (let i = rows - 1; diff !== 0; i = (i - 1 + rows) % rows) { counts[i] += diff > 0 ? 1 : -1; diff += diff > 0 ? -1 : 1; }
  const seats: Seat[] = [];
  radii.forEach((r, i) => {
    const n = counts[i];
    for (let k = 0; k < n; k++) {
      const angle = Math.PI - (Math.PI * (k + 0.5)) / n;
      seats.push({ x: r * Math.cos(angle), y: r * Math.sin(angle), angle });
    }
  });
  return seats.sort((a, b) => b.angle - a.angle);
}

export function Hemicycle({ assignment, width = 900, highlight = null, majorityLine = true, seatScale = 1 }: {
  assignment: { legend: string; confirmed: number; projected: number }[];  // na ordem de exibição
  width?: number;
  highlight?: Set<string> | null;
  majorityLine?: boolean;
  seatScale?: number;
}) {
  const rows = TOTAL_SEATS > 180 ? 9 : 7;
  const seats = useMemo(() => hemicycleSeats(TOTAL_SEATS, rows), [rows]);
  const R = width / 2;
  const height = R + 20;
  const dot = ((R * (1 - 0.38)) / rows) * 0.42 * seatScale;

  const colored: { color: string; opacity: number; legend: string | null }[] = [];
  assignment.forEach(a => {
    for (let i = 0; i < a.confirmed; i++) colored.push({ color: frontColor(a.legend), opacity: 1, legend: a.legend });
    for (let i = a.confirmed; i < a.projected; i++) colored.push({ color: frontColor(a.legend), opacity: 0.38, legend: a.legend });
  });
  while (colored.length < TOTAL_SEATS) colored.push({ color: 'rgb(var(--tv-surface2))', opacity: 1, legend: null });

  return (
    <svg viewBox={`${-R} ${-R} ${2 * R} ${height}`} width="100%" className="overflow-visible">
      {seats.map((s, i) => {
        const c = colored[i];
        const dim = highlight && c.legend && !highlight.has(c.legend);
        return (
          <circle key={i} cx={s.x * (R - dot)} cy={-s.y * (R - dot)} r={dot}
            fill={c.color} fillOpacity={dim ? 0.12 : c.opacity}
            style={{ transition: 'fill 500ms ease, fill-opacity 500ms ease' }} />
        );
      })}
      {majorityLine && (
        <line x1={0} y1={-R * 1.02} x2={0} y2={-R * 0.3} stroke="rgb(var(--tv-text))" strokeWidth={3} strokeDasharray="6 8" opacity={0.7} />
      )}
    </svg>
  );
}

// --------------------------------------------- Barras pareadas 22 × 26 ---
/** Uma linha por frente: barra cheia = 2026, traço fino = 2022. */
export function PairedShareBars({ rows, max }: { rows: { legend: string; now: number; prev: number; extra?: React.ReactNode }[]; max?: number }) {
  const m = max ?? Math.max(10, ...rows.map(r => Math.max(r.now, r.prev))) * 1.08;
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map(r => {
        const c = frontColor(r.legend);
        return (
          <div key={r.legend} className="grid grid-cols-[64px_1fr_170px] items-center gap-4">
            <div className="font-black text-[19px]">{r.legend}</div>
            <div className="relative h-7">
              <div className="absolute inset-y-0 left-0 rounded-r-[8px] rounded-l-[4px] transition-[width] duration-700 ease-out" style={{ width: `${(r.now / m) * 100}%`, background: c }} />
              <div className="absolute -top-1 -bottom-1 w-[3px] rounded-full bg-tv-text" style={{ left: `${(r.prev / m) * 100}%` }} title={`2022: ${fmtPct(r.prev)}`} />
            </div>
            <div className="flex items-baseline justify-end gap-2.5">
              <span className="font-black text-[22px] tabular-nums leading-none">{fmtPct(r.now)}</span>
              {r.extra}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 text-[13px] text-tv-muted pl-[80px]">
        <span className="inline-flex items-center gap-2"><span className="w-6 h-3 rounded bg-tv-muted" />2026</span>
        <span className="inline-flex items-center gap-2"><span className="w-[3px] h-4 rounded bg-tv-text" />2022</span>
      </div>
    </div>
  );
}

// ------------------------------------------------- Halteres 22 → 26 ------
export function Dumbbells({ rows, max = 40 }: { rows: { legend: string; now: number; prev: number }[]; max?: number }) {
  const m = Math.max(max, ...rows.map(r => Math.max(r.now, r.prev) * 1.05));
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-[72px_1fr] gap-4 text-[13px] text-tv-muted">
        <span />
        <div className="relative h-4">
          {[0, 25, 50, 75].filter(v => v < m).map(v => (
            <span key={v} className="absolute -translate-x-1/2" style={{ left: `${(v / m) * 100}%` }}>{v}%</span>
          ))}
        </div>
      </div>
      {rows.map(r => {
        const c = frontColor(r.legend);
        const a = (Math.min(r.now, r.prev) / m) * 100, b = (Math.max(r.now, r.prev) / m) * 100;
        return (
          <div key={r.legend} className="grid grid-cols-[72px_1fr] items-center gap-4">
            <div className="font-black text-[20px]">{r.legend}</div>
            <div className="relative h-7">
              <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-px bg-tv-border" />
              <div className="absolute top-1/2 -translate-y-1/2 h-[6px] rounded-full transition-all duration-700" style={{ left: `${a}%`, width: `${b - a}%`, background: `${c}88` }} />
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-[3px] bg-tv-surface transition-all duration-700" style={{ left: `${(r.prev / m) * 100}%`, borderColor: c }} title={`2022 ${fmtPct(r.prev)}`} />
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full transition-all duration-700" style={{ left: `${(r.now / m) * 100}%`, background: c, boxShadow: '0 0 0 3px rgb(var(--tv-surface))' }} title={`2026 ${fmtPct(r.now)}`} />
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-5 text-[13px] text-tv-muted pl-[88px]">
        <span className="inline-flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-[3px] border-tv-muted" />2022</span>
        <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-tv-muted" />2026</span>
      </div>
    </div>
  );
}

// --------------------------------------- Cadeiras proporcionais (faixa) --
/**
 * Uma marca por cadeira: cheia = garantida, contorno = projetada (ainda pode
 * mudar), cinza = sem projeção. Ordem pelas frentes com mais cadeiras.
 */
export function SeatStrip({ total, guaranteed, projected, size = 18, gap = 4, columns }: {
  total: number;
  guaranteed: Record<string, number>;
  projected: Record<string, number>;   // total projetado por frente (inclui as garantidas)
  size?: number;
  gap?: number;
  columns?: number;
}) {
  const fronts = Object.keys(projected).filter(f => (projected[f] ?? 0) > 0)
    .sort((a, b) => (projected[b] ?? 0) - (projected[a] ?? 0) || (guaranteed[b] ?? 0) - (guaranteed[a] ?? 0));
  const marks: { front: string | null; sure: boolean }[] = [];
  fronts.forEach(f => {
    const g = Math.min(guaranteed[f] ?? 0, projected[f] ?? 0);
    for (let i = 0; i < g; i++) marks.push({ front: f, sure: true });
  });
  fronts.forEach(f => {
    const g = Math.min(guaranteed[f] ?? 0, projected[f] ?? 0);
    for (let i = g; i < (projected[f] ?? 0); i++) marks.push({ front: f, sure: false });
  });
  // garantidas de cada frente ficam juntas das projetadas da mesma frente
  marks.sort((a, b) => fronts.indexOf(a.front!) - fronts.indexOf(b.front!) || Number(b.sure) - Number(a.sure));
  while (marks.length < total) marks.push({ front: null, sure: false });
  return (
    <div className="flex flex-wrap" style={{ gap, width: columns ? columns * size + (columns - 1) * gap : undefined }}>
      {marks.slice(0, total).map((m, i) => {
        const c = m.front ? frontColor(m.front) : null;
        return (
          <span key={i} className="rounded-[5px] transition-colors duration-700"
            style={{
              width: size, height: size,
              background: c ? (m.sure ? c : `${c}33`) : 'rgb(var(--tv-border) / 0.6)',
              boxShadow: c && !m.sure ? `inset 0 0 0 2px ${c}` : undefined,
            }} />
        );
      })}
    </div>
  );
}
