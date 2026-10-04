// components/tv/scenes/SceneProporcional.tsx
"use client";
// Voto proporcional: cadeiras garantidas (já não mudam) × projetadas (ainda
// podem mudar), no país e em cada estado.
import React from 'react';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, PR_BARRIER_PERCENT, PR_SEATS_BY_STATE, STATE_ORDER, TOTAL_PR_SEATS, frontColor, frontName } from '@/lib/haagar/rules';
import { SeatStrip } from '../charts';
import { AnimatedNumber, Delta, Panel, ProgressBar, fmtPct } from '../ui';

export default function SceneProporcional({ snap, onUf }: { snap: ElectionSnapshot; onUf: (uf: string) => void }) {
  const guaranteed: Record<string, number> = {};
  const projected: Record<string, number> = {};
  const prev: Record<string, number> = {};
  STATE_ORDER.forEach(uf => {
    const st = snap.states[uf];
    FRONT_ORDER.forEach(f => {
      guaranteed[f] = (guaranteed[f] ?? 0) + (st.prGuaranteed[f] ?? 0);
      projected[f] = (projected[f] ?? 0) + (st.prSeats[f] ?? 0);
      prev[f] = (prev[f] ?? 0) + (st.prev.prSeats[f] ?? 0);
    });
  });
  const totalG = Object.values(guaranteed).reduce((a, b) => a + b, 0);
  const totalP = Object.values(projected).reduce((a, b) => a + b, 0);
  const fronts = FRONT_ORDER.map(f => snap.frontByLegend[f]).filter(Boolean)
    .sort((a, b) => (projected[b.legend] ?? 0) - (projected[a.legend] ?? 0) || b.prPct - a.prPct);

  return (
    <div className="h-full grid grid-cols-[1fr_1010px] gap-6">
      <Panel kicker={`${TOTAL_PR_SEATS} cadeiras · D'Hondt por estado · barreira de ${PR_BARRIER_PERCENT}%`} title="Voto proporcional"
        right={<div className="w-44"><ProgressBar value={snap.reported} /></div>}
        bodyClassName="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Tile label="Garantidas" value={<AnimatedNumber value={totalG} />} sub="não mudam mais" strong />
          <Tile label="Em aberto" value={<AnimatedNumber value={Math.max(0, totalP - totalG)} />} sub="projeção com votos parciais" />
          <Tile label="Sem projeção" value={TOTAL_PR_SEATS - totalP} sub="estados sem urnas apuradas" />
        </div>
        <div className="rounded-[20px] bg-tv-surface2/40 border border-tv-border/50 p-4">
          <SeatStrip total={TOTAL_PR_SEATS} guaranteed={guaranteed} projected={projected} size={24} gap={4} />
          <Legend />
        </div>
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_120px_100px_150px_80px] text-[13px] uppercase tracking-wider text-tv-muted font-bold pb-1.5 border-b border-tv-border">
            <span>Frente</span><span className="text-right">Votos</span><span className="text-right">vs 2022</span><span className="text-right">Cadeiras</span><span className="text-right">2022</span>
          </div>
          {fronts.map(f => {
            const g = guaranteed[f.legend] ?? 0;
            const p = projected[f.legend] ?? 0;
            return (
              <div key={f.legend} className="grid grid-cols-[1fr_120px_100px_150px_80px] items-center py-1 border-b border-tv-border/40 text-[20px] tabular-nums">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="w-3.5 h-3.5 rounded shrink-0" style={{ background: frontColor(f.legend) }} />
                  <span className="font-black">{f.legend}</span>
                  <span className="text-[14px] text-tv-muted truncate">{frontName(f.legend)}</span>
                  {snap.reported > 0 && f.prPct < PR_BARRIER_PERCENT && <span className="shrink-0 text-[11px] font-bold uppercase rounded border border-tv-border px-1.5 text-tv-muted">abaixo da barreira</span>}
                </span>
                <span className="text-right font-bold">{fmtPct(f.prPct)}</span>
                <span className="text-right">{snap.reported > 0 ? <Delta value={f.prPct - f.prevPrPct} className="text-[16px] justify-end" /> : '—'}</span>
                <span className="text-right"><b className="text-[26px] font-black">{p}</b>{p > g && <span className="text-[14px] text-tv-muted"> ({g}✓)</span>}</span>
                <span className="text-right text-tv-muted">{prev[f.legend] ?? 0}</span>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-2 grid-rows-3 gap-4 min-h-0">
        {STATE_ORDER.map(uf => <StateCard key={uf} snap={snap} uf={uf} onClick={() => onUf(uf)} />)}
      </div>
    </div>
  );
}

function StateCard({ snap, uf, onClick }: { snap: ElectionSnapshot; uf: string; onClick: () => void }) {
  const st = snap.states[uf];
  const seats = PR_SEATS_BY_STATE[uf] ?? 0;
  const g = Object.values(st.prGuaranteed).reduce((a, b) => a + b, 0);
  const top = FRONT_ORDER.filter(f => (st.prPct[f] ?? 0) > 0)
    .sort((a, b) => (st.prSeats[b] ?? 0) - (st.prSeats[a] ?? 0) || (st.prPct[b] ?? 0) - (st.prPct[a] ?? 0)).slice(0, 4);
  const size = seats > 30 ? 17 : seats > 12 ? 22 : 26;
  return (
    <button onClick={onClick} className="text-left rounded-[24px] bg-tv-surface/90 border border-tv-border/70 px-5 py-4 flex flex-col gap-2.5 min-h-0 overflow-hidden hover:border-tv-text/40">
      <div className="flex items-baseline gap-3">
        <span className="text-[24px] font-black truncate">{st.name}</span>
        <span className="text-[14px] text-tv-muted font-bold shrink-0">{seats} {seats === 1 ? 'cadeira' : 'cadeiras'}</span>
        <span className="flex-1" />
        <span className="text-[15px] font-bold tabular-nums shrink-0">{fmtPct(st.reported)}</span>
      </div>
      <SeatStrip total={seats} guaranteed={st.prGuaranteed} projected={st.prSeats} size={size} gap={4} />
      <div className="mt-auto flex flex-col gap-1">
        {top.map(f => (
          <div key={f} className="flex items-center gap-2 text-[16px] tabular-nums">
            <span className="w-3 h-3 rounded shrink-0" style={{ background: frontColor(f) }} />
            <span className="font-black w-12">{f}</span>
            <span className="flex-1 text-tv-muted">{fmtPct(st.prPct[f] ?? 0)}</span>
            <span className="font-black">{st.prSeats[f] ?? 0}</span>
            <span className="text-[13px] text-tv-muted w-12 text-right">{(st.prGuaranteed[f] ?? 0)}✓</span>
          </div>
        ))}
        {top.length === 0 && <div className="text-[15px] text-tv-muted">Aguardando urnas</div>}
      </div>
      <div className="text-[13px] text-tv-muted font-semibold">{st.prSeatsFinal ? 'Resultado final' : `${g} de ${seats} garantidas`}</div>
    </button>
  );
}

function Tile({ label, value, sub, strong }: { label: string; value: React.ReactNode; sub: string; strong?: boolean }) {
  return (
    <div className={`rounded-[20px] px-5 py-3 border ${strong ? 'bg-tv-accent/20 border-tv-accent/50' : 'bg-tv-surface2/50 border-tv-border/50'}`}>
      <div className="text-[13px] uppercase tracking-[0.16em] font-bold text-tv-muted">{label}</div>
      <div className="text-[44px] font-black leading-none mt-1 tabular-nums">{value}</div>
      <div className="text-[13px] text-tv-muted mt-1">{sub}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex gap-5 mt-3 text-[13px] text-tv-muted">
      <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-[4px] bg-tv-text" />Garantida</span>
      <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-[4px]" style={{ boxShadow: 'inset 0 0 0 2px rgb(var(--tv-text))' }} />Projetada (pode mudar)</span>
      <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-[4px] bg-tv-border/60" />Sem projeção</span>
    </div>
  );
}
